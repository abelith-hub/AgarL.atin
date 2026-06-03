const socket = io();
let miId = null;
let jugadoresRemotos = {};

socket.on('miId', (id) => {
  miId = id;
});

socket.on('jugadores', (data) => {
  jugadoresRemotos = data;
});
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- JUGADOR ---
const jugador = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 30,
  color: '#4af',
  speed: 3
};

let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// --- COMIDA ---
const comidas = [];

function generarComida(cantidad) {
  for (let i = 0; i < cantidad; i++) {
    comidas.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 6,
      color: `hsl(${Math.random() * 360}, 80%, 60%)`
    });
  }
}

generarComida(100);
const bots = [];
for (let i = 0; i < 5; i++) bots.push(new Bot());

// --- FUNCIONES ---
function dibujarCelula(obj) {
  ctx.beginPath();
  ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
  ctx.fillStyle = obj.color;
  ctx.fill();
  ctx.closePath();
}

function moverJugador() {
  let dx = mouseX - jugador.x;
  let dy = mouseY - jugador.y;
  let dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > 5) {
    jugador.x += (dx / dist) * jugador.speed;
    jugador.y += (dy / dist) * jugador.speed;
  }
}

function comerComida() {
  for (let i = comidas.length - 1; i >= 0; i--) {
    let c = comidas[i];
    let dist = Math.hypot(jugador.x - c.x, jugador.y - c.y);
    if (dist < jugador.radius) {
      comidas.splice(i, 1);
      jugador.radius += 1;
      generarComida(1);
    }
  }
}

// --- LOOP PRINCIPAL ---
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  moverJugador();
  comerComida();

  for (let c of comidas) dibujarCelula(c);
  dibujarCelula(jugador);

  for (let bot of bots) {
  bot.decidir(comidas, [...bots, jugador]);
  bot.mover();
  bot.comerComida(comidas);
  dibujarCelula(bot);
}
// Dibujar jugadores remotos
for (let id in jugadoresRemotos) {
  if (id !== miId) {
    dibujarCelula(jugadoresRemotos[id]);
  }
}

// Enviar posición al servidor
if (miId) {
  socket.emit('mover', {
    x: jugador.x,
    y: jugador.y,
    radius: jugador.radius
  });
}  
requestAnimationFrame(gameLoop);
}

gameLoop();