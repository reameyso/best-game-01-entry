// Everything the player sees, drawn on one canvas: the dark arena, the warden's
// warm lantern light, the gloom, the bolts, and the HUD. No images, no fonts
// from the network — shapes, gradients and system fonts only.
import { CONFIG } from './config.js';

const W = CONFIG.arena.w;
const H = CONFIG.arena.h;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

export function drawWorld(ctx, world, nowMs) {
  const p = world.player;
  const t = nowMs / 1000;

  ctx.save();
  // Screen shake on hits and kills.
  if (world.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }

  // --- backdrop: deep indigo with a faint grid and drifting embers
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b1026');
  bg.addColorStop(0.6, '#101736');
  bg.addColorStop(1, '#0a0d20');
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, W + 40, H + 40);

  ctx.strokeStyle = 'rgba(120, 140, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (const a of world.ambient) {
    ctx.globalAlpha = a.o;
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(a.x, a.y, a.s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- gems (embers)
  for (const g of world.gems) {
    const bob = Math.sin(g.bob) * 2;
    const glow = ctx.createRadialGradient(g.x, g.y + bob, 1, g.x, g.y + bob, 16);
    glow.addColorStop(0, 'rgba(255, 179, 71, 0.85)');
    glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(g.x, g.y + bob, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(g.x, g.y + bob, g.r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- enemies
  for (const e of world.enemies) {
    drawEnemy(ctx, e, t);
  }

  // --- bolts
  for (const b of world.bolts) {
    const glow = ctx.createRadialGradient(b.x, b.y, 1, b.x, b.y, 14);
    glow.addColorStop(0, 'rgba(255, 220, 120, 0.95)');
    glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- the warden, lit by the lantern
  drawPlayer(ctx, world, t);

  // --- particles
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- floating texts
  ctx.textAlign = 'center';
  for (const ft of world.texts) {
    ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  // --- vignette, and a red pulse when the warden is nearly out
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.85);
  vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vg.addColorStop(1, 'rgba(2, 4, 16, 0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  const hpFrac = p.hp / p.maxHp;
  if (hpFrac < CONFIG.feel.lowHpPulseBelow && !world.over) {
    const pulse = 0.10 + 0.08 * Math.sin(t * 6);
    const red = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
    red.addColorStop(0, 'rgba(255, 40, 60, 0)');
    red.addColorStop(1, `rgba(255, 40, 60, ${pulse})`);
    ctx.fillStyle = red;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  drawHud(ctx, world);
}

function drawPlayer(ctx, world, t) {
  const p = world.player;
  const bob = Math.sin(p.walkPhase) * 1.5;

  // Warm lantern light spilling over the dark.
  const lr = p.lanternRadius * (1 + 0.04 * Math.sin(t * 2.2));
  const glow = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, lr);
  glow.addColorStop(0, 'rgba(255, 196, 90, 0.30)');
  glow.addColorStop(0.55, 'rgba(255, 170, 70, 0.10)');
  glow.addColorStop(1, 'rgba(255, 170, 70, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(p.x, p.y, lr, 0, Math.PI * 2);
  ctx.fill();

  // Dash trail.
  if (p.dashTimer > 0) {
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#9be7ff';
    ctx.beginPath();
    ctx.arc(p.x - p.vx * 0.03, p.y - p.vy * 0.03, p.r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Body: a hooded warden, cloak and lantern.
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.fillStyle = p.invuln > 0 && Math.floor(t * 14) % 2 === 0 ? 'rgba(255,255,255,0.85)' : '#2b3a67';
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.stroke();
  // Hood point and face.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(0, -p.r - 6);
  ctx.lineTo(-8, -4);
  ctx.lineTo(8, -4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0b1026';
  ctx.beginPath();
  ctx.arc(-4, -2, 2.2, 0, Math.PI * 2);
  ctx.arc(4, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, held toward the aim.
  const lx = Math.cos(p.aim) * (p.r + 8);
  const ly = Math.sin(p.aim) * (p.r + 8);
  ctx.strokeStyle = '#8a6a2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  const lg = ctx.createRadialGradient(lx, ly, 1, lx, ly, 12);
  lg.addColorStop(0, '#fff3c4');
  lg.addColorStop(0.6, '#ffb347');
  lg.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lx, ly, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Dash cooldown ring under the warden.
  if (p.dashRecharge > 0) {
    const frac = 1 - p.dashRecharge / p.dashCooldown;
    ctx.strokeStyle = 'rgba(155, 231, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 7, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
    ctx.stroke();
  }
}

function drawEnemy(ctx, e, t) {
  const wob = Math.sin(e.wobble * 2) * 1.5;
  ctx.save();
  ctx.translate(e.x + wob, e.y);

  if (e.type === 'wisp') {
    // A drifting violet flame with a pale core.
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, e.r * 1.6);
    g.addColorStop(0, 'rgba(190, 160, 255, 0.9)');
    g.addColorStop(0.5, 'rgba(143, 123, 255, 0.45)');
    g.addColorStop(1, 'rgba(143, 123, 255, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#6a4dff';
    ctx.beginPath();
    ctx.arc(0, 0, e.r * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e2ff';
    ctx.beginPath();
    ctx.arc(-3, -3, 2.4, 0, Math.PI * 2);
    ctx.arc(3, -3, 2.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 'husk') {
    // A slow teal crawler, plated.
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#2e8f7a';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4ec9a7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.r - 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#0b1026';
    ctx.beginPath();
    ctx.arc(-6, -3, 3, 0, Math.PI * 2);
    ctx.arc(6, -3, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4ec9a7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 7);
    ctx.lineTo(8, 7);
    ctx.stroke();
  } else {
    // A hulking red brute with horns.
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#a32330';
    ctx.beginPath();
    ctx.arc(0, 0, e.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a94';
    ctx.beginPath();
    ctx.moveTo(-e.r * 0.7, -e.r * 0.6);
    ctx.lineTo(-e.r * 1.05, -e.r * 1.1);
    ctx.lineTo(-e.r * 0.3, -e.r * 0.85);
    ctx.closePath();
    ctx.moveTo(e.r * 0.7, -e.r * 0.6);
    ctx.lineTo(e.r * 1.05, -e.r * 1.1);
    ctx.lineTo(e.r * 0.3, -e.r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(-8, -4, 3.4, 0, Math.PI * 2);
    ctx.arc(8, -4, 3.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Elite crown.
  if (e.elite) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -e.r - 2);
    ctx.lineTo(-5, -e.r - 10);
    ctx.lineTo(0, -e.r - 3);
    ctx.lineTo(5, -e.r - 10);
    ctx.lineTo(10, -e.r - 2);
    ctx.stroke();
  }

  // HP bar for tough foes.
  if (e.maxHp >= 70) {
    bar(ctx, -e.r, -e.r - 12, e.r * 2, 5, e.hp / e.maxHp, '#ff5d6c', 'rgba(0,0,0,0.55)');
  }
  ctx.restore();
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Top-left: HP and XP.
  ctx.fillStyle = 'rgba(6, 10, 28, 0.72)';
  roundRect(ctx, 14, 12, 300, 58, 10);
  ctx.fill();
  ctx.fillStyle = '#cfd6ff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(`HP  ${Math.ceil(p.hp)} / ${p.maxHp}`, 26, 32);
  bar(ctx, 26, 38, 276, 10, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#ff5d6c' : '#4ec9a7', 'rgba(255,255,255,0.12)');
  ctx.fillStyle = '#ffd166';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(`LV ${p.level}`, 26, 62);
  bar(ctx, 66, 53, 236, 7, p.xp / p.xpNext, '#ffb347', 'rgba(255,255,255,0.12)');

  // Top-center: wave and timer.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(6, 10, 28, 0.72)';
  roundRect(ctx, W / 2 - 110, 12, 220, 58, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px system-ui, sans-serif';
  const mins = Math.floor(p.timeAlive / 60);
  const secs = Math.floor(p.timeAlive % 60);
  ctx.fillText(`WAVE ${Math.max(1, world.wave)}`, W / 2, 36);
  ctx.fillStyle = '#9fb0ff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}  •  ${world.enemies.length + world.spawnQueue} left`, W / 2, 58);

  // Top-right: score and kills.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(6, 10, 28, 0.72)';
  roundRect(ctx, W - 314, 12, 300, 58, 10);
  ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`${p.score.toLocaleString('en-US')} pts`, W - 26, 36);
  ctx.fillStyle = '#9fb0ff';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${p.kills} gloom banished`, W - 26, 58);

  // Bottom-left: dash status and controls reminder.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(6, 10, 28, 0.6)';
  roundRect(ctx, 14, H - 44, 250, 30, 8);
  ctx.fill();
  ctx.fillStyle = p.dashRecharge <= 0 ? '#9be7ff' : '#7d86b3';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(
    p.dashRecharge <= 0 ? 'DASH ready  [Space]' : `Dash in ${p.dashRecharge.toFixed(1)}s`,
    26, H - 24,
  );
  ctx.fillStyle = '#7d86b3';
  ctx.textAlign = 'right';
  ctx.fillText('WASD move  •  Mouse aim  •  P pause  •  M mute', W - 26, H - 24);
  ctx.restore();
}
