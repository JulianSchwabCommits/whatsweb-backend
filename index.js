// index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// Serve static files (HTML, JS)
app.use(express.static(__dirname));

const socketRooms = new Map();

io.on('connection', socket => {
  socketRooms.set(socket.id, new Set());
  console.log(`User connected: ${socket.id}`);

  socket.on('joinRoom', room => {
    socket.join(room);
    socketRooms.get(socket.id).add(room);
    io.to(room).emit('message', `${socket.id.substr(0,2)} joined room "${room}"`);
  });

  socket.on('leaveRoom', room => {
    const rooms = socketRooms.get(socket.id);
    if (!rooms.has(room)) return socket.emit('message', `You are not in room "${room}"`);
    socket.leave(room);
    rooms.delete(room);
    io.to(room).emit('message', `${socket.id.substr(0,2)} left room "${room}"`);
    socket.emit('message', `You left room "${room}"`);
  });

  socket.on('roomMessage', ({ room, message }) => {
    const rooms = socketRooms.get(socket.id);
    if (!rooms.has(room)) return socket.emit('message', `You are not in room "${room}"!`);
    io.to(room).emit('message', `[${room}] ${socket.id.substr(0,2)}: ${message}`);
  });

  socket.on('privateMessage', ({ targetId, message }) => {
    const target = io.sockets.sockets.get(targetId);
    if (!target) return socket.emit('message', `Target ${targetId} not found`);
    target.emit('message', `${socket.id.substr(0,2)} (private): ${message}`);
    socket.emit('message', `Message sent to ${targetId}`);
  });

  socket.on('disconnect', () => {
    socketRooms.delete(socket.id);
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(8080, () => console.log('Server running on http://localhost:8080'));
