cat > server.js << 'EOF'
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

const WORLD_W = 4000;
const WORLD_H = 4000;
const ADMIN_PASSWORD = 'admin123';

const jugadores = {};
const comidas = [];
const TOTAL_COMIDA = 300;

function generarComida() {
  return {
    id: Math.random().toString(36).substr(2,9),
    x: Math.random() * WORLD_W,
    y: Math.random() * WORLD_H,
    radius: 6,
    color: `hsl(${Math.random() * 360}, 80%, 60%)`
  };
}

for (let i = 0; i < TOTAL_COMIDA; i++) comidas.push(generarComida());

function distancia(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getRanking() {
  return Object.values(jugadores)
    .sort((a, b) => b.radius - a.radius)
    .slice(0, 10)
    .map(j => ({ nombre: j.nombre, radius: Math.floor(j.radius), color: j.color }));
}

io.on('connection', (socket) => {
  console.log('Conectado:', socket.id);

  socket.on('unirse', (data) => {
    jugadores[socket.id] = {
      x: Math.random() * WORLD_W,
      y: Math.random() * WORLD_H,
      radius: 30,
      color: `hsl(${Math.random() * 360}, 70%, 55%)`,
      nombre: data.nombre || 'Jugador',
      isAdmin: false,
      score: 0
    };
    socket.emit('miId', socket.id);
    socket.emit('comidas', comidas);
    io.emit('jugadores', jugadores);
    io.emit('ranking', getRanking());
  });

  socket.on('mover', (data) => {
    if (!jugadores[socket.id]) return;
    const yo = jugadores[socket.id];
    yo.x = Math.max(0, Math.min(WORLD_W, data.x));
    yo.y = Math.max(0, Math.min(WORLD_H, data.y));
    yo.radius = data.radius;

    for (let otherId in jugadores) {
      if (otherId === socket.id) continue;
      const otro = jugadores[otherId];
      const dist = distancia(yo, otro);
      if (dist < yo.radius && yo.radius > otro.radius * 1.1) {
        yo.radius = Math.sqrt(yo.radius ** 2 + otro.radius ** 2);
        yo.score += Math.floor(otro.radius);
        delete jugadores[otherId];
        io.to(otherId).emit('muerto', { killer: yo.nombre });
        io.emit('jugadores', jugadores);
        io.emit('ranking', getRanking());
      }
    }

    for (let i = comidas.length - 1; i >= 0; i--) {
      if (distancia(yo, comidas[i]) < yo.radius) {
        comidas.splice(i, 1);
        yo.radius += 0.8;
        const nueva = generarComida();
        comidas.push(nueva);
        socket.emit('comerComida', { index: i, nueva });
      }
    }

    io.emit('jugadores', jugadores);
    io.emit('ranking', getRanking());
  });

  socket.on('adminLogin', (pass) => {
    if (pass === ADMIN_PASSWORD && jugadores[socket.id]) {
      jugadores[socket.id].isAdmin = true;
      socket.emit('adminOk');
    } else {
      socket.emit('adminFail');
    }
  });

  socket.on('adminCmd', (cmd) => {
    if (!jugadores[socket.id] || !jugadores[socket.id].isAdmin) return;
    if (cmd.tipo === 'kickAll') {
      for (let id in jugadores) {
        if (id !== socket.id) {
          io.to(id).emit('muerto', { killer: 'Admin' });
          delete jugadores[id];
        }
      }
      io.emit('jugadores', jugadores);
    }
    if (cmd.tipo === 'gigante') {
      if (jugadores[socket.id]) jugadores[socket.id].radius = 300;
      io.emit('jugadores', jugadores);
    }
    if (cmd.tipo === 'masComida') {
      for (let i = 0; i < 100; i++) comidas.push(generarComida());
      io.emit('comidas', comidas);
    }
    if (cmd.tipo === 'mensaje') {
      io.emit('mensajeAdmin', cmd.texto);
    }
  });

  socket.on('disconnect', () => {
    delete jugadores[socket.id];
    io.emit('jugadores', jugadores);
    io.emit('ranking', getRanking());
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Servidor en puerto', process.env.PORT || 3000);
});
EOF