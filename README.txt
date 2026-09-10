JUIC TV - Render Backend

This package is the Node.js + Socket.IO backend for Juic TV.

Render settings:
- Service type: Web Service
- Runtime: Node
- Root Directory: server
- Build Command: npm install
- Start Command: npm start
- Plan: Free

The server listens on process.env.PORT and 0.0.0.0, which is suitable for Render.

After deployment, test:
https://YOUR-SERVICE.onrender.com/

Expected:
{"app":"Juic TV","status":"online","waiting":0,"users":0}

Important:
The backend handles matchmaking, WebRTC signaling, and chat.
Video/audio should be carried by WebRTC peer-to-peer, not through this server.

The frontend Web and Android APK can use the same Socket.IO server URL.
