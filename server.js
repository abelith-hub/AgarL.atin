const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('.'));
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/agarlatin');

const UsuarioSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  username: String,
  password: String,
  oro: { type: Number, default: 0 },
  prima: { type: Number, default: 0 },
  skins: { type: Array, default: [] },
  partidasJugadas: { type: Number, default: 0 },
  mejorPuntaje: { type: Number, default: 0 },
  victorias: { type: Number, default: 0 },
  historialVictorias: { type: Array, default: [] }, // [{sala, prize, fecha}]
  creado: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);
const JWT_SECRET = process.env.JWT_SECRET || 'agarlatin_secret_2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASS || 'admin123';

// API REGISTRO
app.post('/api/registro', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.json({ ok: false, msg: 'Rellena todos los campos' });
    const existe = await Usuario.findOne({ email });
    if (existe) return res.json({ ok: false, msg: 'Este correo ya está registrado' });
    const hash = await bcrypt.hash(password, 10);
    const user = new Usuario({ email, username, password: hash });
    await user.save();
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ ok: true, token, username: user.username, oro: user.oro, prima: user.prima, userId: user._id });
  } catch (e) {
    res.json({ ok: false, msg: 'Error al registrarse' });
  }
});

// API LOGIN
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Usuario.findOne({ email });
    if (!user) return res.json({ ok: false, msg: 'Correo o contraseña incorrectos' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.json({ ok: false, msg: 'Correo o contraseña incorrectos' });
    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET);
    res.json({ ok: true, token, username: user.username, oro: user.oro, prima: user.prima, victorias: user.victorias, userId: user._id });
  } catch (e) {
    res.json({ ok: false, msg: 'Error al iniciar sesión' });
  }
});

// API PERFIL
app.get('/api/perfil/:username', async (req, res) => {
  try {
    const user = await Usuario.findOne({ username: req.params.username }, '-password');
    if (!user) return res.json({ ok: false, msg: 'Usuario no encontrado' });
    res.json({ ok: true, user });
  } catch (e) {
    res.json({ ok: false, msg: 'Error' });
  }
});

// PÁGINA DE PERFIL HTML
app.get('/perfil/:username', async (req, res) => {
  try {
    const user = await Usuario.findOne({ username: req.params.username }, '-password');
    if (!user) return res.status(404).send('<h1>Usuario no encontrado</h1>');
    
    const victoriasSalas = user.historialVictorias.slice(-20).reverse().map(v => 
      `<div class="victoria-item">
        <span class="sala-badge">${v.sala}</span>
        <span class="prize-txt">+${v.prize.toLocaleString()} gold</span>
        <span class="fecha-txt">${new Date(v.fecha).toLocaleDateString()}</span>
      </div>`
    ).join('');

    const salasGanadas = [...new Set(user.historialVictorias.map(v => v.sala))];
    const salasBadges = salasGanadas.map(s => `<span class="sala-tag">${s}</span>`).join('');

    res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${user.username} - AgarL</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a1a; color: #fff; font-family: Arial, sans-serif; min-height: 100vh; }
    .header { background: rgba(0,0,0,0.8); padding: 15px 30px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #333; }
    .logo { font-size: 1.8em; font-weight: 900; color: #4af; letter-spacing: 2px; text-decoration: none; }
    .back-btn { background: #333; color: #fff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; }
    .back-btn:hover { background: #444; }
    .container { max-width: 700px; margin: 40px auto; padding: 0 20px; }
    .perfil-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 30px; margin-bottom: 20px; border: 1px solid #333; }
    .avatar { width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center; font-size: 2em; font-weight: bold; color: #fff; }
    .username { font-size: 1.8em; font-weight: bold; text-align: center; color: #fff; margin-bottom: 5px; }
    .fecha-union { color: #888; font-size: 12px; text-align: center; margin-bottom: 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }
    .stat-box { background: rgba(255,255,255,0.05); border-radius: 8px; padding: 15px; text-align: center; border: 1px solid #333; }
    .stat-num { font-size: 1.8em; font-weight: bold; color: #ffd700; }
    .stat-label { font-size: 11px; color: #888; margin-top: 4px; }
    .section-title { font-size: 1em; font-weight: bold; color: #4af; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #333; }
    .salas-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
    .sala-tag { background: #1a3a5a; color: #4af; padding: 5px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; }
    .victoria-item { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid #222; }
    .sala-badge { background: #1a3a1a; color: #4f4; padding: 3px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; min-width: 70px; text-align: center; }
    .prize-txt { color: #ffd700; font-weight: bold; font-size: 13px; flex: 1; }
    .fecha-txt { color: #666; font-size: 11px; }
    .no-victorias { color: #555; text-align: center; padding: 20px; font-size: 13px; }
  </style>
</head>
<body>
  <div class="header">
    <a href="/" class="logo">AgarL</a>
    <a href="/" class="back-btn">← Volver al juego</a>
  </div>
  <div class="container">
    <div class="perfil-card">
      <div class="avatar" style="background:hsl(${Math.abs(user.username.charCodeAt(0)*15)%360},70%,45%)">${user.username[0].toUpperCase()}</div>
      <div class="username">${user.username}</div>
      <div class="fecha-union">Se unió el ${new Date(user.creado).toLocaleDateString()}</div>
      <div class="stats-grid">
        <div class="stat-box"><div class="stat-num">${user.oro.toLocaleString()}</div><div class="stat-label">💰 Gold total</div></div>
        <div class="stat-box"><div class="stat-num">${user.victorias}</div><div class="stat-label">🏆 Victorias</div></div>
        <div class="stat-box"><div class="stat-num">${user.mejorPuntaje.toLocaleString()}</div><div class="stat-label">⭐ Mejor puntaje</div></div>
      </div>
      ${salasGanadas.length > 0 ? `
      <div class="section-title">🎮 Salas donde ha ganado</div>
      <div class="salas-grid">${salasBadges}</div>
      ` : ''}
      <div class="section-title">📋 Últimas victorias</div>
      ${victoriasSalas.length > 0 ? victoriasSalas : '<div class="no-victorias">Aún no ha ganado ninguna sala</div>'}
    </div>
  </div>
</body>
</html>`);
  } catch (e) {
    res.status(500).send('<h1>Error</h1>');
  }
});

// JUEGO
const WORLD_W = 14142, WORLD_H = 14142;
const SALA_DURACION = 600;
const salas = {};

const LISTA_SALAS = [
  'Etkinlik-1','Alan-1',
  ...Array.from({length:77},(_,i)=>`FFA-${i+1}`),
  'CFFA-1','CFFA-2','VS-CFFA','VS-FFA','VS-GSZ','EKP-1','GSZ-1'
];

function generarComida() {
  return { x: Math.random()*WORLD_W, y: Math.random()*WORLD_H, radius: 6, color: `hsl(${Math.random()*360},80%,60%)` };
}

function crearSala(nombre) {
  const comidas = [];
  for (let i = 0; i < 300; i++) comidas.push(generarComida());
  salas[nombre] = { nombre, jugadores: {}, comidas, tiempo: SALA_DURACION, prize: Math.floor(Math.random()*900000)+100000, ganador: null };
  iniciarTimer(nombre);
  return salas[nombre];
}

function iniciarTimer(nombre) {
  const interval = setInterval(() => {
    if (!salas[nombre]) { clearInterval(interval); return; }
    salas[nombre].tiempo--;
    io.to(nombre).emit('timer', { tiempo: salas[nombre].tiempo, sala: nombre });
    if (salas[nombre].tiempo <= 0) { clearInterval(interval); terminarSala(nombre); }
  }, 1000);
  salas[nombre]._interval = interval;
}

async function terminarSala(nombre) {
  if (!salas[nombre]) return;
  const jug = Object.values(salas[nombre].jugadores);
  if (jug.length > 0) {
    const ganador = jug.sort((a,b) => b.radius - a.radius)[0];
    salas[nombre].ganador = ganador.nombre;
    const prize = salas[nombre].prize;
    io.to(nombre).emit('ganadorSala', { ganador: ganador.nombre, sala: nombre, prize });
    // Guardar victoria en MongoDB
    if (ganador.userId) {
      await Usuario.findByIdAndUpdate(ganador.userId, {
        $inc: { oro: prize, victorias: 1 },
        $push: { historialVictorias: { sala: nombre, prize, fecha: new Date() } }
      });
    }
  }
  setTimeout(() => {
    if (salas[nombre]) {
      salas[nombre].tiempo = SALA_DURACION;
      salas[nombre].prize = Math.floor(Math.random()*900000)+100000;
      salas[nombre].ganador = null;
      iniciarTimer(nombre);
    }
  }, 30000);
}

function getRanking(sala) {
  return Object.values(sala.jugadores).sort((a,b)=>b.radius-a.radius).slice(0,20).map(j=>({nombre:j.nombre,radius:Math.floor(j.radius),color:j.color}));
}

LISTA_SALAS.forEach(s => crearSala(s));

io.on('connection', (socket) => {
  let salaActual = null;

  socket.on('unirse', (data) => {
    const nombreSala = data.sala || 'FFA-1';
    if (!salas[nombreSala]) crearSala(nombreSala);
    salaActual = nombreSala;
    socket.join(nombreSala);
    salas[nombreSala].jugadores[socket.id] = {
      x: Math.random()*WORLD_W, y: Math.random()*WORLD_H, radius: 30,
      color: data.color || `hsl(${Math.random()*360},70%,55%)`,
      nombre: data.nombre || 'Jugador',
      isAdmin: false, score: 0, userId: data.userId || null
    };
    socket.emit('miId', socket.id);
    socket.emit('comidas', salas[nombreSala].comidas);
    socket.emit('timer', { tiempo: salas[nombreSala].tiempo, sala: nombreSala });
    socket.emit('prizeInfo', { prize: salas[nombreSala].prize, sala: nombreSala });
    io.to(nombreSala).emit('jugadores', salas[nombreSala].jugadores);
    io.to(nombreSala).emit('ranking', getRanking(salas[nombreSala]));
  });

  socket.on('mover', (data) => {
    if (!salaActual || !salas[salaActual]) return;
    const sala = salas[salaActual];
    const yo = sala.jugadores[socket.id];
    if (!yo) return;
    yo.x = Math.max(0, Math.min(WORLD_W, data.x));
    yo.y = Math.max(0, Math.min(WORLD_H, data.y));
    yo.radius = data.radius;
    for (let otherId in sala.jugadores) {
      if (otherId === socket.id) continue;
      const otro = sala.jugadores[otherId];
      const dist = Math.hypot(yo.x-otro.x, yo.y-otro.y);
      if (dist < yo.radius && yo.radius > otro.radius*1.1) {
        yo.radius = Math.sqrt(yo.radius**2 + otro.radius**2);
        yo.score += Math.floor(otro.radius);
        delete sala.jugadores[otherId];
        io.to(otherId).emit('muerto', { killer: yo.nombre });
      }
    }
    for (let i = sala.comidas.length-1; i >= 0; i--) {
      if (Math.hypot(yo.x-sala.comidas[i].x, yo.y-sala.comidas[i].y) < yo.radius) {
        sala.comidas.splice(i, 1);
        yo.radius += 0.8;
        sala.comidas.push(generarComida());
        socket.emit('comerComida', { index: i, nueva: sala.comidas[sala.comidas.length-1] });
      }
    }
    io.to(salaActual).emit('jugadores', sala.jugadores);
    io.to(salaActual).emit('ranking', getRanking(sala));
  });

  socket.on('chat', (data) => {
    if (!salaActual || !salas[salaActual]) return;
    const yo = salas[salaActual].jugadores[socket.id];
    if (!yo) return;
    io.to(salaActual).emit('chatMsg', { nombre: yo.nombre, msg: data.msg.substring(0,100), color: yo.color });
  });

  socket.on('adminLogin', (pass) => {
    if (pass === ADMIN_PASSWORD && salaActual && salas[salaActual]?.jugadores[socket.id]) {
      salas[salaActual].jugadores[socket.id].isAdmin = true;
      socket.emit('adminOk');
    } else socket.emit('adminFail');
  });

  socket.on('adminCmd', (cmd) => {
    if (!salaActual || !salas[salaActual]) return;
    const yo = salas[salaActual].jugadores[socket.id];
    if (!yo?.isAdmin) return;
    const sala = salas[salaActual];
    if (cmd.tipo==='kickAll') { for (let id in sala.jugadores) { if(id!==socket.id){io.to(id).emit('muerto',{killer:'Admin'});delete sala.jugadores[id];} } io.to(salaActual).emit('jugadores',sala.jugadores); }
    if (cmd.tipo==='gigante') { yo.radius=300; io.to(salaActual).emit('jugadores',sala.jugadores); }
    if (cmd.tipo==='masComida') { for(let i=0;i<100;i++) sala.comidas.push(generarComida()); io.to(salaActual).emit('comidas',sala.comidas); }
    if (cmd.tipo==='mensaje') { io.to(salaActual).emit('mensajeAdmin',cmd.texto); }
    if (cmd.tipo==='setPrize') { sala.prize=parseInt(cmd.valor)||sala.prize; io.to(salaActual).emit('prizeInfo',{prize:sala.prize,sala:salaActual}); }
    if (cmd.tipo==='resetTimer') { sala.tiempo=SALA_DURACION; io.to(salaActual).emit('timer',{tiempo:sala.tiempo,sala:salaActual}); }
    if (cmd.tipo==='darOro') {
      for (let id in sala.jugadores) {
        if (sala.jugadores[id].nombre === cmd.user) { io.to(id).emit('darOro', { cantidad: cmd.cantidad }); break; }
      }
    }
  });

  socket.on('salirSala', () => {
    if (salaActual && salas[salaActual]) {
      delete salas[salaActual].jugadores[socket.id];
      io.to(salaActual).emit('jugadores', salas[salaActual].jugadores);
    }
    socket.leave(salaActual);
    salaActual = null;
  });

  socket.on('disconnect', () => {
    if (salaActual && salas[salaActual]) {
      delete salas[salaActual].jugadores[socket.id];
      io.to(salaActual).emit('jugadores', salas[salaActual].jugadores);
      io.to(salaActual).emit('ranking', getRanking(salas[salaActual]));
    }
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Servidor AgarL en puerto', process.env.PORT || 3000);
});