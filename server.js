const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

const jugadores = {};

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

io.on('connection', (socket) => {
  console.log('Jugador conectado:', socket.id);

  jugadores[socket.id] = {
    x: Math.random() * 800,
    y: Math.random() * 600,
    radius: 30,
    color: `hsl(${Math.random() * 360}, 70%, 55%)`,
  };

  socket.emit('miId', socket.id);
  io.emit('jugadores', jugadores);

  socket.on('mover', (data) => {
    if (!jugadores[socket.id]) return;

    jugadores[socket.id].x = data.x;
    jugadores[socket.id].y = data.y;
    jugadores[socket.id].radius = data.radius;

    for (let otherId in jugadores) {
      if (otherId === socket.id) continue;
      let yo = jugadores[socket.id];
      let otro = jugadores[otherId];
      let dist = distancia(yo, otro);

      if (dist < yo.radius && yo.radius > otro.radius * 1.1) {
        yo.radius = Math.sqrt(yo.radius ** 2 + otro.radius ** 2);
        delete jugadores[otherId];
        io.to(otherId).emit('muerto');
        io.emit('jugadores', jugadores);
      }
    }

    io.emit('jugadores', jugadores);
  });

  socket.on('disconnect', () => {
    delete jugadores[socket.id];
    io.emit('jugadores', jugadores);
  });
});

server.listen(3000, () => {
  console.log('Servidor corriendo en http://localhost:3000');
});