class Bot {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.radius = 20 + Math.random() * 15;
    this.color = `hsl(${Math.random() * 360}, 70%, 55%)`;
    this.speed = 2;
    this.targetX = this.x;
    this.targetY = this.y;
  }

  distancia(obj) {
    return Math.hypot(this.x - obj.x, this.y - obj.y);
  }

  decidir(comidas, celdas) {
    let prioridad = 'comida';

    for (let c of celdas) {
      if (c === this) continue;
      if (c.radius > this.radius * 1.1 && this.distancia(c) < 200) {
        this.targetX = this.x - (c.x - this.x);
        this.targetY = this.y - (c.y - this.y);
        prioridad = 'huir';
        break;
      }
    }

    if (prioridad !== 'huir') {
      for (let c of celdas) {
        if (c === this) continue;
        if (c.radius < this.radius * 0.9 && this.distancia(c) < 250) {
          this.targetX = c.x;
          this.targetY = c.y;
          prioridad = 'atacar';
          break;
        }
      }
    }

    if (prioridad === 'comida') {
      let mejor = null;
      let menorDist = Infinity;
      for (let c of comidas) {
        let d = this.distancia(c);
        if (d < menorDist) {
          menorDist = d;
          mejor = c;
        }
      }
      if (mejor) {
        this.targetX = mejor.x;
        this.targetY = mejor.y;
      }
    }
  }

  mover() {
    let dx = this.targetX - this.x;
    let dy = this.targetY - this.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }

  comerComida(comidas) {
    for (let i = comidas.length - 1; i >= 0; i--) {
      if (Math.hypot(this.x - comidas[i].x, this.y - comidas[i].y) < this.radius) {
        comidas.splice(i, 1);
        this.radius += 0.5;
        generarComida(1);
      }
    }
  }
}