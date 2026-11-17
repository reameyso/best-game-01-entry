// EMBERFALL — a lone Lantern Warden holds a dark arena against the Gloom.
// Bootstrap, state machine and the requestAnimationFrame loop. The world does the
// simulation, render.js draws it, ui.js owns the DOM screens.
//
// ?shot=start|play|upgrade|end&seed=N renders one fixed scene for screenshots:
// the same scene every time for the same seed, straight from the game's own code.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { World } from './world.js';
import { drawWorld } from './render.js';
import { Ui } from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.arena.w;
canvas.height = CONFIG.arena.h;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;
const rng = makeRng(shot ? seed : (Date.now() % 2147483647));

const input = new Input(canvas);
const audio = new AudioSys();
const world = new World(rng, audio);
const ui = new Ui();

let state = 'title'; // title | playing | levelup | paused | gameover | victory
let victoryShown = false;

function fmtTime(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

function stats() {
  const p = world.player;
  return { score: p.score, wave: world.wave, kills: p.kills, level: p.level, time: fmtTime(p.timeAlive) };
}

function startRun() {
  world.startRun();
  victoryShown = false;
  state = 'playing';
  ui.hideAll();
  if (audio.ensure()) audio.startMusic();
}

function openLevelUp() {
  state = 'levelup';
  ui.showUpgrade(world.rollUpgrades(), (id) => {
    world.applyUpgrade(id);
    state = 'playing';
  });
}

function gameOver() {
  state = 'gameover';
  ui.showGameOver(stats(), () => startRun());
}

function showVictory() {
  state = 'victory';
  victoryShown = true;
  ui.showVictory(stats(), () => { state = 'playing'; }, () => startRun());
}

// --- keyboard shortcuts -----------------------------------------------------
window.addEventListener('keydown', (e) => {
  audio.ensure();
  const k = e.key.toLowerCase();
  if (k === 'm') audio.setMuted(!audio.muted);
  if (state === 'title' && (k === 'enter' || k === ' ')) startRun();
  else if (state === 'playing' && (k === 'p' || k === 'escape')) {
    state = 'paused';
    ui.showPause(() => { state = 'playing'; }, () => startRun());
  } else if (state === 'paused' && (k === 'p' || k === 'escape')) {
    state = 'playing';
    ui.hideAll();
  } else if (state === 'levelup' && ['1', '2', '3'].includes(k)) {
    ui.pickByIndex(Number(k) - 1);
  } else if (state === 'gameover' && k === 'r') startRun();
  else if (state === 'victory' && k === 'r') startRun();
});
window.addEventListener('pointerdown', () => audio.ensure(), { once: true });

// --- screenshot scenes (?shot=...) -------------------------------------------
function setupShot(kind) {
  ui.hideAll();
  if (kind === 'start') {
    ui.showTitle(() => startRun());
    return;
  }
  world.startRun();
  const p = world.player;
  if (kind === 'play') {
    // A busy mid-run scene: level 5, wave 4, upgrades in hand, the swarm closing in.
    p.level = 5;
    p.xpNext = CONFIG.xp.next(5);
    p.score = 1250;
    p.kills = 42;
    p.timeAlive = 154;
    p.damage *= 1.25;
    p.projectiles = 2;
    p.fireRate *= 1.2;
    p.hp = p.maxHp;
    p.regen = 8; // stay alive while the camera is running
    world.wave = 4;
    world.spawnQueue = 0;
    const spots = [
      [200, 140, 'wisp'], [1080, 120, 'wisp'], [1120, 560, 'husk'], [160, 580, 'wisp'],
      [640, 90, 'brute'], [980, 300, 'husk'], [300, 300, 'wisp'], [760, 620, 'wisp'],
      [420, 140, 'husk'], [900, 620, 'brute'], [120, 360, 'wisp'], [1180, 380, 'wisp'],
      [560, 420, 'husk'], [820, 180, 'wisp'],
    ];
    // (enemies are spawned through the world so their ids and scaling are right)
    for (const [x, y, type] of spots) world.spawnAt(type, x, y, false);
    world.spawnQueue = 6;
    stepShot(150);
    state = 'playing';
  } else if (kind === 'upgrade') {
    // A few foes already closing in, so the backdrop shows a run in progress.
    world.wave = 2;
    world.spawnQueue = 0;
    for (const [x, y, type] of [[240, 160, 'wisp'], [1020, 130, 'wisp'], [1080, 540, 'husk'], [180, 560, 'wisp'], [640, 110, 'husk']]) {
      world.spawnAt(type, x, y, false);
    }
    stepShot(90);
    p.xp = p.xpNext - 1;
    world.gainXp(2); // pushes the warden over the level line
    openLevelUp();
  } else if (kind === 'end') {
    p.score = 2340;
    p.kills = 87;
    p.level = 7;
    p.timeAlive = 252;
    world.wave = 6;
    world.spawnQueue = 0;
    for (const [x, y, type] of [[220, 150, 'brute'], [1050, 560, 'husk'], [900, 140, 'wisp'], [360, 600, 'husk']]) {
      world.spawnAt(type, x, y, false);
    }
    p.hp = 1;
    world.damagePlayer(9999, p.x - 50, p.y);
    gameOver();
  }
}

// Step the simulation with scripted input so a ?shot=play frame is mid-action:
// the warden circles slowly and aims at the nearest foe.
function stepShot(steps) {
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    input.fakeMove(Math.cos(a), Math.sin(a));
    let best = null;
    let bestD = Infinity;
    for (const e of world.enemies) {
      const d = (e.x - world.player.x) ** 2 + (e.y - world.player.y) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) input.fakeAim(best.x, best.y);
    world.update(1 / 60, input);
    input.endFrame();
  }
}

// --- main loop ---------------------------------------------------------------
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state === 'playing') {
    world.update(dt, input);
    if (world.pendingUpgrade) openLevelUp();
    if (world.over) gameOver();
    if (world.victory && !victoryShown) showVictory();
  } else if (state === 'title' || state === 'gameover') {
    world.tickAmbient(dt);
  }

  drawWorld(ctx, world, now);
  input.endFrame();
  requestAnimationFrame(frame);
}

if (shot) {
  setupShot(shot);
} else {
  ui.showTitle(() => startRun());
}
requestAnimationFrame(frame);

// Exposed for play-testing in the console, nothing else reads it.
window.__emberfall = { world, get state() { return state; } };
