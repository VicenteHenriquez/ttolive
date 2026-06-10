"use strict";

/* ================================================================
   TILT! — homenaje web a Tilt to Live
   Canvas 2D, sin dependencias. Controles: inclinación / mouse / WASD.
   ================================================================ */

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/* ---------------- Temas (paletas) ----------------
   Cada tema define todos los colores del canvas y se refleja
   en las variables CSS para que la UI acompañe. */
const THEMES = {
  papel: {
    name: "Papel", paper: "#f3e7d3", paperDeep: "#e8d8bc", ink: "#3a2f24", inkSoft: "#7a6a52",
    outline: "#3a2f24", playerFill: "#fdf6e9", trail: "253,246,233", redDeep: "#b22418",
    dot: { normal: "#e03c2f", runner: "#f0612f", tank: "#8e1d12" }, frostLight: "#9fd8ef",
    orb: { nuke: "#e03c2f", frost: "#3aa7d9", wave: "#8a5fd6", bolt: "#f2a93b", sword: "#3fa45b" },
    grid: "rgba(58,47,36,0.05)", vignette: "rgba(90,60,30,0.14)",
    joyBase: "rgba(58,47,36,0.08)", joyLine: "rgba(58,47,36,0.25)",
  },
  noche: {
    name: "Noche", paper: "#221f31", paperDeep: "#16141f", ink: "#ece6f2", inkSoft: "#8d86a8",
    outline: "#13111c", playerFill: "#f6f1e4", trail: "246,241,228", redDeep: "#a32014",
    dot: { normal: "#ff5a4d", runner: "#ff8a3d", tank: "#c22f1f" }, frostLight: "#aee4f7",
    orb: { nuke: "#ff5a4d", frost: "#5ec8f2", wave: "#a98af0", bolt: "#ffc14d", sword: "#5ed68a" },
    grid: "rgba(236,230,242,0.05)", vignette: "rgba(0,0,0,0.35)",
    joyBase: "rgba(236,230,242,0.08)", joyLine: "rgba(236,230,242,0.25)",
  },
  oceano: {
    name: "Océano", paper: "#dff2ef", paperDeep: "#c5e4de", ink: "#103c40", inkSoft: "#4f7f7d",
    outline: "#103c40", playerFill: "#fdfffb", trail: "253,255,251", redDeep: "#d14a36",
    dot: { normal: "#ff6f59", runner: "#ff9f1c", tank: "#b23a48" }, frostLight: "#a3dcf0",
    orb: { nuke: "#ff6f59", frost: "#2a9dd6", wave: "#7d6ce0", bolt: "#f4b942", sword: "#2f9e62" },
    grid: "rgba(16,60,64,0.06)", vignette: "rgba(10,60,70,0.12)",
    joyBase: "rgba(16,60,64,0.08)", joyLine: "rgba(16,60,64,0.25)",
  },
  atardecer: {
    name: "Atardecer", paper: "#fbd9b0", paperDeep: "#f3c48e", ink: "#4a2335", inkSoft: "#8c5a64",
    outline: "#4a2335", playerFill: "#fff4e3", trail: "255,244,227", redDeep: "#a02355",
    dot: { normal: "#d6336c", runner: "#f06543", tank: "#8e2155" }, frostLight: "#a9d3ef",
    orb: { nuke: "#d6336c", frost: "#3a86c9", wave: "#7b4fd0", bolt: "#e8871e", sword: "#2f8f5b" },
    grid: "rgba(74,35,53,0.06)", vignette: "rgba(120,50,40,0.16)",
    joyBase: "rgba(74,35,53,0.08)", joyLine: "rgba(74,35,53,0.25)",
  },
};

let theme = THEMES.papel;

function applyTheme(key) {
  theme = THEMES[key] || THEMES.papel;
  localStorage.setItem("tilt-theme", key);
  const r = document.documentElement.style;
  r.setProperty("--paper", theme.paper);
  r.setProperty("--paper-deep", theme.paperDeep);
  r.setProperty("--ink", theme.ink);
  r.setProperty("--ink-soft", theme.inkSoft);
  r.setProperty("--red", theme.dot.normal);
  r.setProperty("--red-deep", theme.redDeep);
  r.setProperty("--frost", theme.orb.frost);
  r.setProperty("--wave", theme.orb.wave);
  r.setProperty("--bolt", theme.orb.bolt);
  r.setProperty("--sword", theme.orb.sword);
  document.querySelector('meta[name="theme-color"]').content = theme.paper;
  document.querySelectorAll("#theme-row .swatch").forEach((b) =>
    b.classList.toggle("sel", b.dataset.theme === key)
  );
}

/* ---------------- Modos de juego ---------------- */
const MODES = {
  classic: {
    name: "Clásico", desc: "El original: armas, y la cosa se pone fea de a poco.",
    ramp: 120, startDiff: 0, spawnMul: 1, orbs: true, scorePerSec: 0, scoreMul: 1,
  },
  chaos: {
    name: "Caos", desc: "Empieza fuerte y empeora rápido. Puntos ×2.",
    ramp: 50, startDiff: 0.35, spawnMul: 1.5, orbs: true, scorePerSec: 0, scoreMul: 2,
  },
  zen: {
    name: "Pacifista", desc: "Sin armas: solo tú y tu agilidad. Sobrevivir puntúa.",
    ramp: 150, startDiff: 0, spawnMul: 0.85, orbs: false, scorePerSec: 15, scoreMul: 1,
  },
};

let modeKey = MODES[localStorage.getItem("tilt-mode")] ? localStorage.getItem("tilt-mode") : "classic";

function bestKey() { return "tilt-best-" + modeKey; }
function loadBest() {
  // migración: el récord antiguo (sin modos) cuenta como récord de Clásico
  const legacy = modeKey === "classic" ? localStorage.getItem("tilt-best") : null;
  return +(localStorage.getItem(bestKey()) || legacy || 0);
}

/* ---------------- Audio: sintetizadores + música ---------------- */
const sound = {
  ctx: null,
  muted: localStorage.getItem("tilt-muted") === "1",
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  },
  blip(freq, dur = 0.08, type = "square", vol = 0.12, when = 0) {
    if (this.muted || !this.ctx) return;
    const t = (when || this.ctx.currentTime);
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.5), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  },
  note(freq, dur, type, vol, when) {
    // nota musical: sin caída de tono, envolvente corta
    if (this.muted || !this.ctx || !freq) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.ctx.destination);
    o.start(when); o.stop(when + dur);
  },
  pickup() { this.blip(660, 0.12, "triangle", 0.18); this.blip(990, 0.18, "triangle", 0.12); },
  kill(chain) { this.blip(220 + Math.min(chain, 24) * 30, 0.06, "square", 0.07); },
  boom() { this.blip(90, 0.5, "sawtooth", 0.25); this.blip(55, 0.7, "sine", 0.3); },
  freeze() { this.blip(1400, 0.4, "sine", 0.1); this.blip(1900, 0.5, "sine", 0.06); },
  zap() { this.blip(1200, 0.1, "sawtooth", 0.1); },
  slash() { this.blip(500, 0.1, "triangle", 0.14); this.blip(750, 0.14, "triangle", 0.1); },
  death() { this.blip(300, 0.3, "sawtooth", 0.2); this.blip(150, 0.6, "sawtooth", 0.2); },

  /* --- loop chiptune: secuenciador de 32 pasos en La menor --- */
  BASS:   [110,0,110,0, 110,0,165,0, 131,0,131,0, 131,0,196,0,
           98,0,98,0,  98,0,147,0,  82,0,82,0,   110,0,123,0],
  MELODY: [440,0,523,587, 659,0,587,523, 523,0,659,0, 784,659,587,523,
           440,523,0,440, 392,0,440,523, 330,0,392,440, 523,0,587,659],
  musicOn: false, musicStep: 0, musicNext: 0, musicTimer: null,
  startMusic() {
    this.ensure();
    if (this.musicOn) return;
    this.musicOn = true;
    this.musicStep = 0;
    this.musicNext = this.ctx.currentTime + 0.1;
    this.musicTimer = setInterval(() => this.musicTick(), 90);
  },
  stopMusic() {
    this.musicOn = false;
    clearInterval(this.musicTimer);
  },
  musicTick() {
    const STEP = 60 / 138 / 2; // corcheas a 138 bpm
    while (this.musicNext < this.ctx.currentTime + 0.35) {
      const i = this.musicStep;
      this.note(this.BASS[i],   STEP * 1.8, "square",   0.045, this.musicNext);
      this.note(this.MELODY[i], STEP * 1.1, "triangle", 0.055, this.musicNext);
      if (i % 8 === 4) this.note(2200, 0.03, "square", 0.02, this.musicNext); // "hi-hat"
      this.musicStep = (i + 1) % 32;
      this.musicNext += STEP;
    }
  },
};

/* ---------------- Entrada ---------------- */
const input = {
  mode: "mouse",            // "mouse" | "keys" | "tilt"
  ax: 0, ay: 0,             // aceleración normalizada [-1, 1]
  mouseX: null, mouseY: null,
  keys: new Set(),
  tiltBase: null,           // calibración {beta, gamma}
  lastTilt: null,
};

/* Joystick flotante (móvil): la base aparece donde apoyas el dedo */
const JOY_R = 60;
const joy = { id: null, active: false, bx: 0, by: 0, sx: 0, sy: 0 };

window.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return; // en táctil manda el joystick
  input.mouseX = e.clientX;
  input.mouseY = e.clientY;
  if (input.mode !== "tilt" && input.mode !== "joy") input.mode = "mouse";
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup","arrowdown","arrowleft","arrowright","w","a","s","d"].includes(k)) {
    input.keys.add(k);
    input.mode = "keys";
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => input.keys.delete(e.key.toLowerCase()));

function handleOrientation(e) {
  if (e.beta == null || e.gamma == null) return;
  input.lastTilt = { beta: e.beta, gamma: e.gamma };
  if (input.mode !== "tilt" || !input.tiltBase) return;
  // Sensibilidad: ~22° de inclinación = aceleración máxima
  const SENS = 22;
  input.ax = clamp((e.gamma - input.tiltBase.gamma) / SENS, -1, 1);
  input.ay = clamp((e.beta - input.tiltBase.beta) / SENS, -1, 1);
}
window.addEventListener("deviceorientation", handleOrientation);

function readInput() {
  if (input.mode === "tilt") return; // ax/ay ya vienen del sensor
  if (input.mode === "joy") {
    if (joy.active) {
      input.ax = clamp((joy.sx - joy.bx) / JOY_R, -1, 1);
      input.ay = clamp((joy.sy - joy.by) / JOY_R, -1, 1);
    } else {
      input.ax = input.ay = 0;
    }
    return;
  }
  if (input.mode === "keys") {
    let x = 0, y = 0;
    if (input.keys.has("arrowleft") || input.keys.has("a")) x -= 1;
    if (input.keys.has("arrowright") || input.keys.has("d")) x += 1;
    if (input.keys.has("arrowup") || input.keys.has("w")) y -= 1;
    if (input.keys.has("arrowdown") || input.keys.has("s")) y += 1;
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    input.ax = x; input.ay = y;
    if (!x && !y && input.mouseX != null) input.mode = "mouse";
    return;
  }
  // Mouse: el puntero "inclina" el mundo hacia él
  if (input.mouseX == null) { input.ax = input.ay = 0; return; }
  const dx = input.mouseX - player.x;
  const dy = input.mouseY - player.y;
  const d = Math.hypot(dx, dy);
  const dead = 14;
  if (d < dead) { input.ax = input.ay = 0; return; }
  const f = clamp((d - dead) / 120, 0, 1);
  input.ax = (dx / d) * f;
  input.ay = (dy / d) * f;
}

/* ---------------- Estado del juego ---------------- */
const player = { x: 0, y: 0, vx: 0, vy: 0, angle: 0, r: 11 };

let dots = [];        // {x,y,vx,vy,r,frozen,wob,kind}
let orbs = [];        // power-ups {x,y,type,age}
let waves = [];       // ondas expansivas {x,y,r,maxR}
let bolts = [];       // rayos visuales {x1,y1,x2,y2,life}
let particles = [];   // {x,y,vx,vy,life,maxLife,color,size}
let floaters = [];    // texto flotante {x,y,text,life,color}
let trail = [];       // estela del jugador {x,y,life}
let sword = null;     // espada orbital {timer, angle}

let running = false;
let elapsed = 0;
let score = 0; // float en Pacifista (puntúa por segundo); se muestra con floor
let best = loadBest();
let chain = 0;            // kills encadenados
let chainTimer = 0;
let multiplier = 1;
let freezeTimer = 0;
let shake = 0;
let slowmo = 0;           // tiempo restante en cámara lenta
let timeScale = 1;
let spawnClock = 0;
let patternClock = 0;
let killsTotal = 0;

/* Tipos de enemigo: corredores rápidos y tanques aparecen al subir
   la dificultad. minDiff controla desde cuándo entran al sorteo. */
const DOT_KINDS = {
  normal: { speed: 1,    rMin: 5.5, rMax: 7.5,  pts: 10, minDiff: 0 },
  runner: { speed: 1.75, rMin: 3.5, rMax: 4.8,  pts: 20, minDiff: 0.15 },
  tank:   { speed: 0.5,  rMin: 10,  rMax: 13,   pts: 30, minDiff: 0.3 },
};

function pickKind() {
  const d = difficulty();
  const roll = Math.random();
  if (d >= DOT_KINDS.tank.minDiff && roll < 0.12 + d * 0.1) return "tank";
  if (d >= DOT_KINDS.runner.minDiff && roll < 0.32 + d * 0.18) return "runner";
  return "normal";
}

const ORB_KEYS = ["nuke", "frost", "wave", "bolt", "sword"];

function difficulty() {
  const M = MODES[modeKey];
  return Math.min(1, M.startDiff + elapsed / M.ramp);
}
function maxDots() { return Math.floor(30 + difficulty() * 130); }
function dotSpeed() { return 36 + difficulty() * 54; }

/* ---------------- Spawning ---------------- */
function edgePoint(margin = 30) {
  const side = Math.floor(rand(0, 4));
  if (side === 0) return { x: rand(0, W), y: -margin };
  if (side === 1) return { x: rand(0, W), y: H + margin };
  if (side === 2) return { x: -margin, y: rand(0, H) };
  return { x: W + margin, y: rand(0, H) };
}

function spawnDot(x, y, kind = pickKind()) {
  const k = DOT_KINDS[kind];
  dots.push({ x, y, vx: 0, vy: 0, r: rand(k.rMin, k.rMax), frozen: 0, wob: rand(0, TAU), kind });
}

function spawnPattern() {
  const roll = Math.random();
  const room = maxDots() - dots.length;
  if (room <= 0) return;

  if (roll < 0.35) {
    // goteo: varios puntos sueltos por los bordes
    const n = Math.min(room, Math.floor(rand(4, 9 + difficulty() * 8)));
    for (let i = 0; i < n; i++) { const p = edgePoint(); spawnDot(p.x, p.y); }
  } else if (roll < 0.6) {
    // muro: una línea que entra por un lado (siempre normales)
    const n = Math.min(room, Math.floor(rand(10, 16 + difficulty() * 14)));
    const vertical = Math.random() < 0.5;
    const far = Math.random() < 0.5;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (vertical) spawnDot(far ? W + 30 : -30, t * H, "normal");
      else spawnDot(t * W, far ? H + 30 : -30, "normal");
    }
  } else if (roll < 0.8) {
    // anillo alrededor del jugador (lejos)
    const n = Math.min(room, Math.floor(rand(10, 14 + difficulty() * 10)));
    const R = Math.max(W, H) * 0.7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rand(-0.1, 0.1);
      spawnDot(player.x + Math.cos(a) * R, player.y + Math.sin(a) * R);
    }
  } else {
    // enjambre compacto desde una esquina
    const n = Math.min(room, Math.floor(rand(12, 18 + difficulty() * 12)));
    const c = edgePoint(60);
    for (let i = 0; i < n; i++) spawnDot(c.x + rand(-70, 70), c.y + rand(-70, 70));
  }
}

function spawnOrb() {
  const margin = 70;
  const type = ORB_KEYS[Math.floor(rand(0, ORB_KEYS.length))];
  let x, y, tries = 0;
  do {
    x = rand(margin, W - margin);
    y = rand(margin, H - margin);
    tries++;
  } while (dist2(x, y, player.x, player.y) < 150 ** 2 && tries < 20);
  orbs.push({ x, y, type, age: 0 });
}

/* ---------------- Efectos ---------------- */
function burst(x, y, color, n = 10, speed = 160) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(speed * 0.3, speed);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.25, 0.6), maxLife: 0.6, color, size: rand(1.5, 4),
    });
  }
}

function floatText(x, y, text, color = theme.ink) {
  floaters.push({ x, y, text, life: 0.9, color });
}

function killDot(i, cause) {
  const d = dots[i];
  dots.splice(i, 1);
  killsTotal++;
  chain++;
  chainTimer = 1.6;
  multiplier = 1 + Math.floor(chain / 8);
  score += DOT_KINDS[d.kind].pts * multiplier * MODES[modeKey].scoreMul;
  burst(d.x, d.y, d.frozen > 0 ? theme.frostLight : theme.dot[d.kind], 8, 140);
  if (chain % 8 === 0) {
    floatText(d.x, d.y - 14, "×" + multiplier, theme.dot.normal);
    bumpMultiplier();
  }
  sound.kill(chain);
}

/* ---------------- Armas ---------------- */
function fireOrb(orb) {
  sound.pickup();
  burst(orb.x, orb.y, theme.orb[orb.type], 16, 220);

  if (orb.type === "nuke") {
    sound.boom();
    shake = 14;
    slowmo = Math.max(slowmo, 0.3);
    const R = 190 + difficulty() * 60;
    waves.push({ x: orb.x, y: orb.y, r: 10, maxR: R, kills: true, color: theme.orb.nuke, width: 26 });
  }

  if (orb.type === "frost") {
    sound.freeze();
    freezeTimer = 3.2;
    for (const d of dots) d.frozen = 3.2;
    floatText(orb.x, orb.y, "¡CONGELADOS!", theme.orb.frost);
  }

  if (orb.type === "wave") {
    shake = 8;
    waves.push({ x: player.x, y: player.y, r: 10, maxR: Math.max(W, H) * 0.55, kills: true, color: theme.orb.wave, width: 14 });
  }

  if (orb.type === "bolt") {
    sound.zap();
    shake = 6;
    // alcanza a los 14 puntos más cercanos
    const sorted = dots
      .map((d, i) => ({ i, d2: dist2(d.x, d.y, player.x, player.y) }))
      .sort((a, b) => a.d2 - b.d2)
      .slice(0, 14)
      .sort((a, b) => b.i - a.i); // borrar de mayor a menor índice
    for (const { i } of sorted) {
      const d = dots[i];
      bolts.push({ x1: player.x, y1: player.y, x2: d.x, y2: d.y, life: 0.22 });
      killDot(i, "bolt");
    }
  }

  if (orb.type === "sword") {
    sound.slash();
    sword = { timer: 9, angle: rand(0, TAU) };
    floatText(orb.x, orb.y, "¡ESPADA!", theme.orb.sword);
  }
}

const SWORD_ORBIT = 52;   // radio de la órbita
const SWORD_REACH = 30;   // radio de corte alrededor de la hoja
const SWORD_SPIN = 4.6;   // rad/s

function swordTip() {
  return {
    x: player.x + Math.cos(sword.angle) * SWORD_ORBIT,
    y: player.y + Math.sin(sword.angle) * SWORD_ORBIT,
  };
}

/* ---------------- Update ---------------- */
function update(dt) {
  const M = MODES[modeKey];
  elapsed += dt;
  if (M.scorePerSec) score += M.scorePerSec * dt;
  readInput();

  // Jugador: física tipo "canica sobre mesa inclinada"
  const ACCEL = 1300, FRICTION = 3.2, MAXV = 480;
  player.vx += input.ax * ACCEL * dt;
  player.vy += input.ay * ACCEL * dt;
  player.vx -= player.vx * FRICTION * dt;
  player.vy -= player.vy * FRICTION * dt;
  const v = Math.hypot(player.vx, player.vy);
  if (v > MAXV) { player.vx = (player.vx / v) * MAXV; player.vy = (player.vy / v) * MAXV; }
  player.x += player.vx * dt;
  player.y += player.vy * dt;
  // rebote suave en los bordes
  const m = player.r + 2;
  if (player.x < m) { player.x = m; player.vx *= -0.4; }
  if (player.x > W - m) { player.x = W - m; player.vx *= -0.4; }
  if (player.y < m) { player.y = m; player.vy *= -0.4; }
  if (player.y > H - m) { player.y = H - m; player.vy *= -0.4; }
  if (v > 30) player.angle = Math.atan2(player.vy, player.vx);

  // Estela cuando va rápido
  if (v > 140) trail.push({ x: player.x, y: player.y, life: 0.35 });
  for (let i = trail.length - 1; i >= 0; i--) {
    trail[i].life -= dt;
    if (trail[i].life <= 0) trail.splice(i, 1);
  }

  // Cadena / multiplicador
  if (chainTimer > 0) {
    chainTimer -= dt;
    if (chainTimer <= 0) { chain = 0; multiplier = 1; }
  }
  if (freezeTimer > 0) freezeTimer -= dt;

  // Director de spawns
  spawnClock -= dt;
  if (spawnClock <= 0) {
    spawnPattern();
    spawnClock = (rand(1.6, 3.2) - difficulty() * 1.1) / M.spawnMul;
  }
  if (M.orbs) {
    patternClock -= dt;
    if (patternClock <= 0) {
      if (orbs.length < 3) spawnOrb();
      patternClock = rand(3.5, 6);
    }
  }

  // Puntos rojos
  const sp = dotSpeed();
  for (const d of dots) {
    if (d.frozen > 0) { d.frozen -= dt; continue; }
    const kSpeed = sp * DOT_KINDS[d.kind].speed;
    const dx = player.x - d.x, dy = player.y - d.y;
    const dd = Math.hypot(dx, dy) || 1;
    d.wob += dt * 3;
    const wob = Math.sin(d.wob) * 0.35;
    const tx = dx / dd, ty = dy / dd;
    d.vx += (tx + -ty * wob) * kSpeed * 2.4 * dt;
    d.vy += (ty + tx * wob) * kSpeed * 2.4 * dt;
    const dv = Math.hypot(d.vx, d.vy);
    if (dv > kSpeed) { d.vx = (d.vx / dv) * kSpeed; d.vy = (d.vy / dv) * kSpeed; }
    d.x += d.vx * dt;
    d.y += d.vy * dt;
  }

  // Espada orbital
  if (sword) {
    sword.timer -= dt;
    sword.angle += SWORD_SPIN * dt;
    if (sword.timer <= 0) {
      sword = null;
    } else {
      const tip = swordTip();
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        if (dist2(d.x, d.y, tip.x, tip.y) < (SWORD_REACH + d.r) ** 2) {
          killDot(i, "sword");
        }
      }
    }
  }

  // Colisión jugador vs puntos
  for (let i = dots.length - 1; i >= 0; i--) {
    const d = dots[i];
    const rr = (d.r + player.r - 2) ** 2;
    if (dist2(d.x, d.y, player.x, player.y) < rr) {
      if (d.frozen > 0) {
        killDot(i, "smash"); // los congelados se rompen al tocarlos
        shake = Math.max(shake, 3);
      } else {
        return gameOver();
      }
    }
  }

  // Power-ups
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.age += dt;
    if (o.age > 9) { orbs.splice(i, 1); continue; } // caducan
    if (dist2(o.x, o.y, player.x, player.y) < (16 + player.r) ** 2) {
      orbs.splice(i, 1);
      fireOrb(o);
    }
  }

  // Ondas expansivas
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i];
    const prev = w.r;
    w.r += (w.maxR * 2.2) * dt;
    if (w.kills) {
      for (let j = dots.length - 1; j >= 0; j--) {
        const d = dots[j];
        const dd = Math.hypot(d.x - w.x, d.y - w.y);
        if (dd >= prev - w.width && dd <= w.r + w.width) killDot(j, "wave");
      }
    }
    if (w.r > w.maxR) waves.splice(i, 1);
  }

  updateFx(dt);
  updateHUD();
}

function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.92; p.vy *= 0.92;
  }
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.life -= dt;
    f.y -= 30 * dt;
    if (f.life <= 0) floaters.splice(i, 1);
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].life -= dt;
    if (bolts[i].life <= 0) bolts.splice(i, 1);
  }
  if (shake > 0) shake = Math.max(0, shake - dt * 30);
}

/* ---------------- Render ---------------- */
function drawBackground() {
  ctx.fillStyle = theme.paper;
  ctx.fillRect(0, 0, W, H);
  // cuadrícula de papel sutil
  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  const g = 48;
  ctx.beginPath();
  for (let x = g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // viñeta
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, theme.vignette);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (freezeTimer > 0) {
    ctx.fillStyle = `rgba(120,190,230,${Math.min(0.16, freezeTimer * 0.08)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function drawTrail() {
  if (trail.length < 2) return;
  ctx.lineCap = "round";
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1], b = trail[i];
    ctx.strokeStyle = `rgba(${theme.trail},0.9)`;
    ctx.globalAlpha = clamp(b.life / 0.35, 0, 1) * 0.55;
    ctx.lineWidth = clamp(b.life / 0.35, 0, 1) * 7;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(t) {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(player.angle);
  // flecha estilo cartoon
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, 9);
  ctx.lineTo(-5, 0);
  ctx.lineTo(-10, -9);
  ctx.closePath();
  ctx.fillStyle = theme.playerFill;
  ctx.strokeStyle = theme.outline;
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSword() {
  if (!sword) return;
  const blink = sword.timer < 2 && Math.sin(sword.timer * 18) > 0;
  ctx.save();
  ctx.globalAlpha = blink ? 0.35 : 1;
  ctx.translate(player.x, player.y);
  ctx.rotate(sword.angle);
  // hoja
  ctx.beginPath();
  ctx.moveTo(SWORD_ORBIT - 26, -5);
  ctx.lineTo(SWORD_ORBIT + 22, 0);
  ctx.lineTo(SWORD_ORBIT - 26, 5);
  ctx.closePath();
  ctx.fillStyle = theme.orb.sword;
  ctx.strokeStyle = theme.outline;
  ctx.lineWidth = 2.5;
  ctx.fill();
  ctx.stroke();
  // arco de barrido
  ctx.beginPath();
  ctx.arc(0, 0, SWORD_ORBIT, -0.7, 0);
  ctx.strokeStyle = theme.orb.sword;
  ctx.globalAlpha *= 0.35;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function draw(t) {
  ctx.save();
  if (shake > 0) ctx.translate(rand(-shake, shake), rand(-shake, shake));

  drawBackground();

  // ondas
  for (const w of waves) {
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r, 0, TAU);
    ctx.strokeStyle = w.color;
    ctx.globalAlpha = clamp(1 - w.r / w.maxR, 0, 1) * 0.8 + 0.1;
    ctx.lineWidth = w.width;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // power-ups
  for (const o of orbs) {
    const pulse = 1 + Math.sin(t / 180 + o.age * 4) * 0.12;
    const fade = o.age > 7 ? (Math.sin(t / 70) > 0 ? 0.35 : 1) : 1; // parpadeo al caducar
    ctx.globalAlpha = fade;
    ctx.beginPath();
    ctx.arc(o.x, o.y, 13 * pulse, 0, TAU);
    ctx.fillStyle = theme.orb[o.type];
    ctx.strokeStyle = theme.outline;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
    // halo
    ctx.beginPath();
    ctx.arc(o.x, o.y, 20 * pulse, 0, TAU);
    ctx.strokeStyle = theme.orb[o.type];
    ctx.globalAlpha = fade * 0.35;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // puntos rojos
  for (const d of dots) {
    const frozen = d.frozen > 0;
    const pulse = frozen ? 1 : 1 + Math.sin(d.wob * 2) * 0.1;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r * pulse, 0, TAU);
    ctx.fillStyle = frozen ? theme.frostLight : theme.dot[d.kind];
    ctx.fill();
    if (frozen) {
      ctx.strokeStyle = theme.orb.frost;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (d.kind === "tank") {
      ctx.strokeStyle = theme.outline;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  // rayos
  for (const b of bolts) {
    ctx.strokeStyle = theme.orb.bolt;
    ctx.globalAlpha = b.life / 0.22;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    const midX = (b.x1 + b.x2) / 2 + rand(-14, 14);
    const midY = (b.y1 + b.y2) / 2 + rand(-14, 14);
    ctx.lineTo(midX, midY);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // partículas
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // textos flotantes
  ctx.font = "800 18px Nunito, sans-serif";
  ctx.textAlign = "center";
  for (const f of floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  if (running) {
    drawTrail();
    drawSword();
    drawPlayer(t);
  }

  ctx.restore();

  // Joystick fuera del save/restore: no le afecta el screen shake
  if (running && input.mode === "joy" && joy.active) {
    ctx.beginPath();
    ctx.arc(joy.bx, joy.by, JOY_R, 0, TAU);
    ctx.fillStyle = theme.joyBase;
    ctx.strokeStyle = theme.joyLine;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(joy.sx, joy.sy, 24, 0, TAU);
    ctx.fillStyle = `rgba(${theme.trail},0.85)`;
    ctx.strokeStyle = theme.outline;
    ctx.lineWidth = 3;
    ctx.fill();
    ctx.stroke();
  }
}

/* ---------------- HUD ---------------- */
const $score = document.getElementById("score");
const $mult = document.getElementById("multiplier");
const $bestInline = document.getElementById("best-inline");
let lastShownScore = -1;

function updateHUD() {
  const shown = Math.floor(score);
  if (shown !== lastShownScore) {
    $score.textContent = shown.toLocaleString("es-CL");
    lastShownScore = shown;
  }
  $mult.textContent = "×" + multiplier;
  $mult.classList.toggle("mult-hidden", multiplier <= 1);
}

function bumpMultiplier() {
  $mult.classList.remove("bump");
  void $mult.offsetWidth;
  $mult.classList.add("bump");
}

/* ---------------- Ciclo de vida ---------------- */
const $overlay = document.getElementById("overlay");
const $start = document.getElementById("screen-start");
const $over = document.getElementById("screen-over");
const $hud = document.getElementById("hud");

function startGame() {
  sound.ensure();
  sound.startMusic();
  dots = []; orbs = []; waves = []; bolts = []; particles = []; floaters = []; trail = [];
  sword = null;
  elapsed = 0; score = 0; chain = 0; chainTimer = 0; multiplier = 1;
  freezeTimer = 0; shake = 0; killsTotal = 0; slowmo = 0; timeScale = 1;
  spawnClock = 1.2; patternClock = 2;
  joy.id = null; joy.active = false;
  lastShownScore = -1;
  player.x = W / 2; player.y = H / 2;
  player.vx = player.vy = 0; player.angle = -Math.PI / 2;
  $overlay.classList.add("gone");
  $hud.hidden = false;
  $bestInline.textContent = best ? `RÉCORD ${MODES[modeKey].name.toUpperCase()} ${best.toLocaleString("es-CL")}` : MODES[modeKey].name.toUpperCase();
  running = true;
  updateHUD();
}

function gameOver() {
  running = false;
  sound.stopMusic();
  sound.death();
  shake = 16;
  slowmo = 0.5;
  burst(player.x, player.y, theme.playerFill, 30, 320);
  burst(player.x, player.y, theme.dot.normal, 20, 240);

  const finalScore = Math.floor(score);
  const isRecord = finalScore > best;
  if (isRecord) {
    best = finalScore;
    localStorage.setItem(bestKey(), String(best));
  }

  setTimeout(() => {
    document.getElementById("over-title").textContent = isRecord ? "¡NUEVO RÉCORD!" : "TE ATRAPARON";
    document.getElementById("final-score").textContent = finalScore.toLocaleString("es-CL");
    document.getElementById("over-detail").textContent =
      `${MODES[modeKey].name} · ${killsTotal} puntos eliminados · sobreviviste ${Math.floor(elapsed)}s` +
      (isRecord ? "" : ` · récord: ${best.toLocaleString("es-CL")}`);
    $start.hidden = true;
    $over.hidden = false;
    $overlay.classList.remove("gone");
    $hud.hidden = true;
  }, 900);
}

/* ---------------- Botones ---------------- */
const isTouch = "ontouchstart" in window;
const $btnStart = document.getElementById("btn-start");
const $btnTilt = document.getElementById("btn-tilt");
const $hint = document.getElementById("controls-hint");
const $best = document.getElementById("best");

if (isTouch) {
  document.body.classList.add("touch");
  $btnTilt.hidden = false;
  $btnStart.textContent = "JUGAR CON JOYSTICK";
  $hint.textContent = "Apoya el dedo donde quieras: ahí aparece el joystick. Con inclinación: sostén el teléfono plano al empezar.";
} else {
  $hint.textContent = "Mueve con el mouse o con WASD / flechas.";
}
/* Selector de modo */
const $modeDesc = document.getElementById("mode-desc");

function setMode(key) {
  modeKey = key;
  localStorage.setItem("tilt-mode", key);
  best = loadBest();
  $modeDesc.textContent = MODES[key].desc;
  document.querySelector(".weapons-legend").style.visibility = MODES[key].orbs ? "visible" : "hidden";
  $best.textContent = best ? `Tu récord en ${MODES[key].name}: ${best.toLocaleString("es-CL")}` : "";
  document.querySelectorAll("#mode-row .chip").forEach((b) =>
    b.classList.toggle("sel", b.dataset.mode === key)
  );
}

document.querySelectorAll("#mode-row .chip").forEach((b) =>
  b.addEventListener("click", () => setMode(b.dataset.mode))
);

/* Selector de tema: swatches generados desde THEMES */
const $themeRow = document.getElementById("theme-row");
for (const [key, t] of Object.entries(THEMES)) {
  const b = document.createElement("button");
  b.className = "swatch";
  b.dataset.theme = key;
  b.title = t.name;
  b.setAttribute("aria-label", "Tema " + t.name);
  b.style.background = t.paper;
  b.innerHTML = `<i style="background:${t.dot.normal}"></i>`;
  b.addEventListener("click", () => applyTheme(key));
  $themeRow.appendChild(b);
}

setMode(modeKey);
applyTheme(localStorage.getItem("tilt-theme") || "papel");

$btnStart.addEventListener("click", () => {
  input.mode = isTouch ? "joy" : input.mode;
  startGame();
});

// Joystick flotante: la base nace bajo el dedo y el stick lo sigue
window.addEventListener("touchstart", (e) => {
  if (input.mode !== "joy" || !running || joy.id !== null) return;
  const t = e.changedTouches[0];
  joy.id = t.identifier;
  joy.active = true;
  joy.bx = joy.sx = t.clientX;
  joy.by = joy.sy = t.clientY;
}, { passive: true });

window.addEventListener("touchmove", (e) => {
  if (!joy.active) return;
  for (const t of e.changedTouches) {
    if (t.identifier !== joy.id) continue;
    const dx = t.clientX - joy.bx, dy = t.clientY - joy.by;
    const d = Math.hypot(dx, dy);
    if (d > JOY_R) {
      joy.sx = joy.bx + (dx / d) * JOY_R;
      joy.sy = joy.by + (dy / d) * JOY_R;
    } else {
      joy.sx = t.clientX;
      joy.sy = t.clientY;
    }
  }
}, { passive: true });

const joyEnd = (e) => {
  for (const t of e.changedTouches) {
    if (t.identifier === joy.id) { joy.id = null; joy.active = false; }
  }
};
window.addEventListener("touchend", joyEnd);
window.addEventListener("touchcancel", joyEnd);

$btnTilt.addEventListener("click", async () => {
  // iOS 13+ requiere permiso explícito
  try {
    if (typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function") {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== "granted") {
        $hint.textContent = "Permiso denegado: juega con el dedo.";
        return;
      }
    }
  } catch {
    $hint.textContent = "No se pudo activar el sensor: juega con el dedo.";
    return;
  }
  input.mode = "tilt";
  // calibrar con la postura actual del teléfono
  input.tiltBase = input.lastTilt ? { ...input.lastTilt } : { beta: 40, gamma: 0 };
  setTimeout(() => {
    if (input.lastTilt) input.tiltBase = { ...input.lastTilt };
    startGame();
  }, 150);
});

document.getElementById("btn-retry").addEventListener("click", () => {
  if (input.mode === "tilt" && input.lastTilt) input.tiltBase = { ...input.lastTilt };
  startGame();
});

const $mute = document.getElementById("mute");
$mute.classList.toggle("muted", sound.muted);
$mute.addEventListener("click", () => {
  sound.muted = !sound.muted;
  localStorage.setItem("tilt-muted", sound.muted ? "1" : "0");
  $mute.classList.toggle("muted", sound.muted);
});

/* ---------------- Loop principal ---------------- */
let lastT = performance.now();
function frame(t) {
  const rawDt = Math.min((t - lastT) / 1000, 1 / 20); // cap para pestañas en segundo plano
  lastT = t;

  // Cámara lenta: frena el tiempo y lo recupera suavemente
  if (slowmo > 0) {
    slowmo -= rawDt;
    timeScale = 0.28;
  } else {
    timeScale += (1 - timeScale) * Math.min(1, rawDt * 5);
  }
  const dt = rawDt * timeScale;

  // En móvil el juego es horizontal: en vertical se pausa (overlay #rotate)
  const portraitPause = isTouch && H > W;
  if (running && !portraitPause) update(dt);
  else updateFx(dt); // efectos residuales en pantallas de menú
  draw(t);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------------- PWA ---------------- */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
