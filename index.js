// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["https://whatsweb-frontend.azurewebsites.net"],
    methods: ["GET", "POST"]
  },
  allowRequest: (req, callback) => {
    const origin = req.headers.origin;
    console.log(origin);
    if (origin === "https://whatsweb-frontend.azurewebsites.net") {
      callback(null, true);
    } else {
      callback("Origin not allowed", false);
    }
  }
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

io.on('connection', socket => {
  socketRooms.set(socket.id, new Set());
  console.log(`User connected: ${socket.id}`);

  socket.on('joinRoom', room => {
    socket.join(room);
    socketRooms.get(socket.id).add(room);
    io.to(room).emit('message', `${socket.id.substr(0, 2)} joined room "${room}"`);
  });

  socket.on('leaveRoom', room => {
    const rooms = socketRooms.get(socket.id);
    if (!rooms.has(room)) return socket.emit('message', `You are not in room "${room}"`);
    socket.leave(room);
    rooms.delete(room);
    io.to(room).emit('message', `${socket.id.substr(0, 2)} left room "${room}"`);
    socket.emit('message', `You left room "${room}"`);
  });

  socket.on('roomMessage', ({ room, message }) => {
    const rooms = socketRooms.get(socket.id);
    if (!rooms.has(room)) return socket.emit('message', `You are not in room "${room}"!`);
    io.to(room).emit('message', `[${room}] ${socket.id.substr(0, 2)}: ${message}`);
  });

  socket.on('privateMessage', ({ targetId, message }) => {
    const target = io.sockets.sockets.get(targetId);
    if (!target) return socket.emit('message', `Target ${targetId} not found`);
    target.emit('message', `${socket.id.substr(0, 2)} (private): ${message}`);
    socket.emit('message', `Message sent to ${targetId}`);
  });

  socket.on('disconnect', () => {
    socketRooms.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 8080;
const HOST = process.env.WEBSITE_HOSTNAME || `localhost:${PORT}`;
const PROTOCOL = process.env.WEBSITE_HOSTNAME ? 'https' : 'http';

server.listen(PORT, () => console.log(`Server running on ${PROTOCOL}://${HOST}`));