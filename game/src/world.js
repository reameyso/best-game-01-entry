// The run itself: spawning, waves, movement, combat, pickups, level-ups.
// The world never touches the DOM; it reports events (level-up, wave clear, death)
// and the main loop turns them into screens and sounds.
import { CONFIG } from './config.js';
import { clamp, dist2, angleTo } from './random.js';
import { Player, Enemy, Bolt, Gem, Particle, FloatText } from './entities.js';

export class World {
  constructor(rng, audio) {
    this.rng = rng;
    this.audio = audio;
    this.reset();
  }

  reset() {
    const { w, h } = CONFIG.arena;
    this.player = new Player(w / 2, h / 2);
    this.enemies = [];
    this.bolts = [];
    this.gems = [];
    this.particles = [];
    this.texts = [];
    this.wave = 0;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.breather = 0;
    this.waveActive = false;
    this.shake = 0;
    this.pickupStreak = 0;
    this.pickupStreakTimer = 0;
    this.pendingUpgrade = false; // a level-up is waiting for the player's pick
    this.victory = false;
    this.over = false;
    this.ambient = []; // drifting background embers
    for (let i = 0; i < 46; i++) {
      this.ambient.push({
        x: this.rng.range(0, w),
        y: this.rng.range(0, h),
        s: this.rng.range(0.4, 1.6),
        v: this.rng.range(4, 14),
        o: this.rng.range(0.15, 0.5),
      });
    }
  }

  startRun() {
    this.reset();
    this.nextWave();
  }

  // ---- waves ---------------------------------------------------------------

  nextWave() {
    this.wave += 1;
    const wv = CONFIG.waves;
    this.spawnQueue = wv.baseCount + (this.wave - 1) * wv.perWave;
    this.spawnTimer = 0.5;
    this.waveActive = true;
    this.audio.waveStart();
  }

  pickType() {
    const wv = CONFIG.waves;
    const roll = this.rng.next();
    if (this.wave >= wv.bruteFromWave && roll < wv.bruteShare) return 'brute';
    if (this.wave >= wv.huskFromWave && roll < wv.bruteShare + wv.huskShare) return 'husk';
    return 'wisp';
  }

  spawnEnemy() {
    const { w, h } = CONFIG.arena;
    const side = this.rng.int(0, 3);
    const m = 30;
    let x, y;
    if (side === 0) { x = this.rng.range(0, w); y = -m; }
    else if (side === 1) { x = w + m; y = this.rng.range(0, h); }
    else if (side === 2) { x = this.rng.range(0, w); y = h + m; }
    else { x = -m; y = this.rng.range(0, h); }
    const type = this.pickType();
    const elite = this.wave >= CONFIG.elite.chanceFromWave && this.rng.chance(CONFIG.elite.chance);
    this.enemies.push(new Enemy(type, x, y, this.wave, elite, this.rng));
  }

  // Place one enemy of a chosen type at a chosen spot (screenshot scenes use it).
  spawnAt(type, x, y, elite = false) {
    this.enemies.push(new Enemy(type, x, y, this.wave, elite, this.rng));
  }

  // Drift the backdrop only: title and game-over screens stay alive behind their panels.
  tickAmbient(dt) {
    const { w, h } = CONFIG.arena;
    for (const a of this.ambient) {
      a.y -= a.v * dt;
      if (a.y < -4) { a.y = h + 4; a.x = this.rng.range(0, w); }
    }
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.shake = Math.max(0, this.shake - dt * 26);
  }

  // ---- upgrades ------------------------------------------------------------

  rollUpgrades() {
    const pool = CONFIG.upgrades.filter((u) => (this.player.upgradeCounts[u.id] || 0) < u.max);
    const picks = [];
    const bag = [...pool];
    while (picks.length < 3 && bag.length > 0) {
      const i = Math.floor(this.rng.next() * bag.length);
      picks.push(bag.splice(i, 1)[0]);
    }
    return picks;
  }

  applyUpgrade(id) {
    const up = CONFIG.upgrades.find((u) => u.id === id);
    if (!up) return;
    up.apply(this.player);
    this.player.upgradeCounts[id] = (this.player.upgradeCounts[id] || 0) + 1;
    this.pendingUpgrade = false;
    this.audio.levelup();
    this.burst(this.player.x, this.player.y, 26, '#ffd166', 260);
  }

  gainXp(amount) {
    const p = this.player;
    p.xp += amount * p.xpGain;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level += 1;
      p.xpNext = CONFIG.xp.next(p.level);
      this.pendingUpgrade = true;
    }
  }

  // ---- combat helpers ------------------------------------------------------

  burst(x, y, n, color, speed) {
    for (let i = 0; i < n; i++) {
      const a = this.rng.range(0, Math.PI * 2);
      const s = this.rng.range(speed * 0.3, speed);
      this.particles.push(new Particle(
        x, y, Math.cos(a) * s, Math.sin(a) * s,
        this.rng.range(0.25, 0.6), this.rng.range(2, 5), color,
      ));
    }
  }

  addText(x, y, text, color) {
    this.texts.push(new FloatText(x, y, text, color));
  }

  damagePlayer(amount, fromX, fromY) {
    const p = this.player;
    if (p.invuln > 0 || this.over) return;
    p.hp -= amount;
    p.invuln = 0.6;
    this.shake = Math.max(this.shake, CONFIG.feel.shakeOnHurt);
    this.audio.hurt();
    this.burst(p.x, p.y, 14, '#ff5d6c', 200);
    const a = angleTo(fromX, fromY, p.x, p.y);
    p.vx += Math.cos(a) * 260;
    p.vy += Math.sin(a) * 260;
    if (p.hp <= 0) {
      p.hp = 0;
      this.over = true;
      this.audio.gameover();
      this.audio.stopMusic();
      this.burst(p.x, p.y, 60, '#ffd166', 380);
      this.burst(p.x, p.y, 40, '#ff5d6c', 300);
    }
  }

  killEnemy(e, index) {
    const p = this.player;
    p.kills += 1;
    p.score += e.score;
    this.shake = Math.max(this.shake, CONFIG.feel.shakeOnKill);
    this.audio.kill();
    this.burst(e.x, e.y, e.elite ? 26 : 14, e.color, 240);
    this.addText(e.x, e.y - e.r - 6, `+${e.score}`, '#ffd166');
    // Drop embers: one gem per xp point, capped so the field stays readable.
    const drops = Math.min(e.xp, 6);
    for (let i = 0; i < drops; i++) {
      this.gems.push(new Gem(
        clamp(e.x + this.rng.range(-14, 14), 10, CONFIG.arena.w - 10),
        clamp(e.y + this.rng.range(-14, 14), 10, CONFIG.arena.h - 10),
        1, this.rng,
      ));
    }
    this.enemies.splice(index, 1);
  }

  // ---- per-frame update ----------------------------------------------------

  update(dt, input) {
    const p = this.player;
    const { w, h } = CONFIG.arena;

    // Ambient drift never stops, even on the title screen.
    for (const a of this.ambient) {
      a.y -= a.v * dt;
      if (a.y < -4) { a.y = h + 4; a.x = this.rng.range(0, w); }
    }
    this.updateParticles(dt);
    this.updateTexts(dt);
    this.shake = Math.max(0, this.shake - dt * 26);

    if (this.over || this.pendingUpgrade) return;
    p.timeAlive += dt;

    // Regeneration from the Warm Hearth upgrade.
    if (p.regen > 0 && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    // --- movement + dash
    let mx = input.axisX();
    let my = input.axisY();
    const len = Math.hypot(mx, my);
    if (len > 0) { mx /= len; my /= len; }
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
    } else {
      p.vx = mx * p.speed;
      p.vy = my * p.speed;
      if (input.consumeDash() && p.dashRecharge <= 0 && len > 0) {
        p.dashTimer = CONFIG.player.dashTime;
        p.dashRecharge = p.dashCooldown;
        p.invuln = Math.max(p.invuln, CONFIG.player.dashInvuln);
        p.vx = mx * CONFIG.player.dashSpeed;
        p.vy = my * CONFIG.player.dashSpeed;
        this.audio.dash();
        this.burst(p.x, p.y, 10, '#9be7ff', 160);
      }
    }
    if (p.dashTimer > 0) {
      p.vx = mx * CONFIG.player.dashSpeed;
      p.vy = my * CONFIG.player.dashSpeed;
    }
    p.dashRecharge = Math.max(0, p.dashRecharge - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.x = clamp(p.x + p.vx * dt, p.r, w - p.r);
    p.y = clamp(p.y + p.vy * dt, p.r, h - p.r);
    p.walkPhase += dt * (len > 0 ? 11 : 0);

    // --- aim: the mouse when it has moved, else the nearest enemy
    if (input.mouseSeen) {
      p.aim = angleTo(p.x, p.y, input.mouseX, input.mouseY);
    } else if (this.enemies.length > 0) {
      let best = null;
      let bestD = Infinity;
      for (const e of this.enemies) {
        const d = dist2(p.x, p.y, e.x, e.y);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best) p.aim = angleTo(p.x, p.y, best.x, best.y);
    }

    // --- auto-fire
    p.fireTimer -= dt;
    if (p.fireTimer <= 0) {
      p.fireTimer = 1 / p.fireRate;
      const spread = 0.14;
      const n = p.projectiles;
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
        this.bolts.push(new Bolt(p.x, p.y, p.aim + off, p.boltSpeed, p.damage, p.pierce));
      }
      this.audio.shoot();
    }

    // --- spawning
    if (this.waveActive) {
      if (this.spawnQueue > 0) {
        this.spawnTimer -= dt;
        const interval = Math.max(
          CONFIG.waves.spawnIntervalMin,
          CONFIG.waves.spawnIntervalStart - (this.wave - 1) * CONFIG.waves.spawnIntervalStep,
        );
        if (this.spawnTimer <= 0) {
          this.spawnTimer = interval;
          this.spawnEnemy();
          this.spawnQueue -= 1;
        }
      } else if (this.enemies.length === 0) {
        // Wave cleared.
        p.score += 50 * this.wave;
        this.addText(p.x, p.y - 44, `WAVE ${this.wave} CLEAR  +${50 * this.wave}`, '#7CFC9A');
        this.waveActive = false;
        this.breather = CONFIG.waves.breather;
        if (this.wave >= CONFIG.waves.victoryWave && !this.victory) {
          this.victory = true;
          this.audio.victory();
        }
      }
    } else if (!this.victory && !this.over) {
      this.breather -= dt;
      if (this.breather <= 0) this.nextWave();
    }

    this.updateBolts(dt);
    this.updateEnemies(dt);
    this.updateGems(dt);

    // Pickup streak pitch rises while the player keeps collecting.
    this.pickupStreakTimer -= dt;
    if (this.pickupStreakTimer <= 0) this.pickupStreak = 0;
  }

  updateBolts(dt) {
    const { w, h } = CONFIG.arena;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      let dead = b.life <= 0 || b.x < -20 || b.x > w + 20 || b.y < -20 || b.y > h + 20;
      if (!dead) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (b.hitIds.has(e.id)) continue;
          const rr = b.r + e.r;
          if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
            b.hitIds.add(e.id);
            e.hp -= b.damage;
            e.hitFlash = 3;
            this.audio.hit();
            this.burst(b.x, b.y, 5, '#ffd166', 140);
            this.addText(e.x, e.y - e.r - 4, `${Math.round(b.damage)}`, '#ffffff');
            if (e.hp <= 0) this.killEnemy(e, j);
            if (b.pierce <= 0) { dead = true; break; }
            b.pierce -= 1;
          }
        }
      }
      if (dead) this.bolts.splice(i, 1);
    }
  }

  updateEnemies(dt) {
    const p = this.player;
    const list = this.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      e.wobble += dt * 3;
      e.hitFlash = Math.max(0, e.hitFlash - 1);
      e.touchTimer = Math.max(0, e.touchTimer - dt);
      // Chase the warden with a slight wobble so the swarm does not stack.
      const a = angleTo(e.x, e.y, p.x, p.y) + Math.sin(e.wobble) * 0.25;
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
      // Keep the swarm from piling onto one point.
      for (let j = i + 1; j < list.length; j++) {
        const o = list[j];
        const rr = e.r + o.r;
        const d2 = dist2(e.x, e.y, o.x, o.y);
        if (d2 < rr * rr && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const push = (rr - d) / 2;
          const nx = (o.x - e.x) / d;
          const ny = (o.y - e.y) / d;
          e.x -= nx * push;
          e.y -= ny * push;
          o.x += nx * push;
          o.y += ny * push;
        }
      }
      // Touching the warden hurts, with a per-enemy cooldown.
      const rr = e.r + p.r;
      if (e.touchTimer <= 0 && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        e.touchTimer = 0.8;
        this.damagePlayer(e.damage, e.x, e.y);
        if (this.over) return;
      }
    }
  }

  updateGems(dt) {
    const p = this.player;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      g.bob += dt * 4;
      const d2 = dist2(g.x, g.y, p.x, p.y);
      const magnetR = p.magnetRadius;
      if (d2 < magnetR * magnetR) {
        g.magnetized = true;
        const a = angleTo(g.x, g.y, p.x, p.y);
        const pull = 520 * (1 - Math.sqrt(d2) / magnetR) + 140;
        g.x += Math.cos(a) * pull * dt;
        g.y += Math.sin(a) * pull * dt;
      } else {
        g.x += g.vx * dt;
        g.y += g.vy * dt;
        g.vx *= 0.92;
        g.vy *= 0.92;
      }
      if (d2 < (p.r + g.r + 4) * (p.r + g.r + 4)) {
        this.gems.splice(i, 1);
        this.pickupStreak += 1;
        this.pickupStreakTimer = 1.2;
        this.audio.pickup(this.pickupStreak);
        this.gainXp(g.value);
        this.burst(g.x, g.y, 4, '#ffb347', 90);
      }
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.life -= dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateTexts(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.y -= 34 * dt;
      t.life -= dt;
      if (t.life <= 0) this.texts.splice(i, 1);
    }
  }
}
