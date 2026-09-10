const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const waiting = new Set();
const partners = new Map();

app.get('/', (req, res) => {
  res.json({
    app: 'Juic TV',
    status: 'online',
    waiting: waiting.size,
    users: io.engine.clientsCount
  });
});

function removeFromWaiting(id) {
  waiting.delete(id);
}

function leavePartner(id) {
  const partnerId = partners.get(id);
  if (!partnerId) return;

  partners.delete(id);
  partners.delete(partnerId);

  const partner = io.sockets.sockets.get(partnerId);
  if (partner) {
    partner.emit('partner-left');
  }
}

function findPartner(socket) {
  removeFromWaiting(socket.id);

  const available = Array.from(waiting)
    .filter(id => id !== socket.id)
    .filter(id => io.sockets.sockets.has(id))
    .filter(id => !partners.has(id));

  if (available.length === 0) {
    waiting.add(socket.id);
    socket.emit('waiting', {
      message: 'Searching for someone...'
    });
    console.log(`WAITING ${socket.id}`);
    return;
  }

  const partnerId =
    available[Math.floor(Math.random() * available.length)];

  waiting.delete(partnerId);
  waiting.delete(socket.id);

  const partner = io.sockets.sockets.get(partnerId);

  if (!partner) {
    findPartner(socket);
    return;
  }

  partners.set(socket.id, partnerId);
  partners.set(partnerId, socket.id);

  socket.emit('matched', { initiator: true });
  partner.emit('matched', { initiator: false });

  console.log(`MATCH ${socket.id} <-> ${partnerId}`);
}

io.on('connection', socket => {
  console.log(`CONNECTED ${socket.id}`);

  socket.on('find-partner', () => {
    leavePartner(socket.id);
    findPartner(socket);
  });

  socket.on('next', () => {
    const partnerId = partners.get(socket.id);

    if (partnerId) {
      partners.delete(socket.id);
      partners.delete(partnerId);

      const partner = io.sockets.sockets.get(partnerId);
      if (partner) {
        partner.emit('partner-left');
      }
    }

    findPartner(socket);
  });

  socket.on('signal', data => {
    const partnerId = partners.get(socket.id);
    if (!partnerId) return;

    const partner = io.sockets.sockets.get(partnerId);
    if (!partner) return;

    partner.emit('signal', data);
  });

  socket.on('chat-message', message => {
    const partnerId = partners.get(socket.id);
    if (!partnerId) return;

    const partner = io.sockets.sockets.get(partnerId);
    if (!partner) return;

    partner.emit('chat-message', {
      message: String(message).slice(0, 1000)
    });
  });

  socket.on('disconnect', () => {
    console.log(`DISCONNECTED ${socket.id}`);
    waiting.delete(socket.id);
    leavePartner(socket.id);
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Juic TV server running on port ${PORT}`);
});
