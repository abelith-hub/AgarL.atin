const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));

const jugadores = {};
const ADMIN_PASS = 'admin123';
let comidas = [];
for(let i = 0; i < 300; i++) {
  comidas.push({
    x: Math.random() * 4000,
    y: Math.random() * 4000,
    radius: 6,
    color: `hsl(${Math.random()*360},80%,60%)`
  });
}

io.on('connection', socket => {
  socket.emit('miId', socket.id);
  socket.emit('comidas', comidas);

  socket.on('unirse', data => {
    jugadores[socket.id] = { ...data, x: Math.random()*4000, y: Math.random()*4000, radius: 30 };
    io.emit('jugadores', jugadores);
    io.emit('ranking', Object.values(jugadores).sort((a,b) => b.radius - a.radius).slice(0,10));
  });

  socket.on('mover', data => {
    if(jugadores[socket.id]) {
      jugadores[socket.id] = { ...jugadores[socket.id], ...data };
      io.emit('jugadores', jugadores);
      io.emit('ranking', Object.values(jugadores).sort((a,b) => b.radius - a.radius).slice(0,10));
    }
  });

  socket.on('adminLogin', pass => {
    if(pass === ADMIN_PASS) socket.emit('adminOk');
    else socket.emit('adminFail');
  });

  socket.on('adminCmd', data => {
    if(data.tipo === 'masComida') {
      for(let i = 0; i < 100; i++) comidas.push({ x: Math.random()*4000, y: Math.random()*4000, radius: 6, color: `hsl(${Math.random()*360},80%,60%)` });
      io.emit('comidas', comidas);
    }
    if(data.tipo === 'kickAll') {
      Object.keys(jugadores).forEach(id => { if(id !== socket.id) io.to(id).emit('muerto', {}); });
    }
    if(data.tipo === 'mensaje') {
      io.emit('mensajeAdmin', data.texto);
    }
  });

  socket.on('disconnect', () => {
    delete jugadores[socket.id];
    io.emit('jugadores', jugadores);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Servidor en puerto ' + PORT));