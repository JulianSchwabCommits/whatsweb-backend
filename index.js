// index.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.get("/", (_, res) => {
  res.send("Running");
});

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    io.to(room).emit("message", `${socket.id.slice(0, 2)} joined ${room}`);
  });

  socket.on("leaveRoom", (room) => {
    socket.leave(room);
    socket.emit("message", `Left ${room}`);
  });

  socket.on("roomMessage", ({ room, message }) => {
    io.to(room).emit(
      "message",
      `[${room}] ${socket.id.slice(0, 2)}: ${message}`
    );
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
