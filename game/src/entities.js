// Every moving thing in the arena. Entities hold state only; the world updates them
// and the renderer draws them. Plain data, no DOM, no audio here.
import { CONFIG } from './config.js';

export class Player {
  constructor(x, y) {
    const p = CONFIG.player;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = p.radius;
    this.hp = p.maxHp;
    this.maxHp = p.maxHp;
    this.level = 1;
    this.xp = 0;
    this.xpNext = CONFIG.xp.next(1);
    this.damage = p.boltDamage;
    this.fireRate = p.fireRate;
    this.boltSpeed = p.boltSpeed;
    this.projectiles = p.projectiles;
    this.pierce = p.pierce;
    this.speed = p.speed;
    this.magnetRadius = p.magnetRadius;
    this.lanternRadius = p.lanternRadius;
    this.dashCooldown = p.dashCooldown;
    this.xpGain = p.xpGain;
    this.regen = 0;
    this.fireTimer = 0;
    this.dashTimer = 0; // time left on the current dash burst
    this.dashRecharge = 0; // time until the next dash is ready
    this.invuln = 0; // seconds of no damage left
    this.aim = -Math.PI / 2;
    this.kills = 0;
    this.score = 0;
    this.timeAlive = 0;
    this.walkPhase = 0;
    this.upgradeCounts = {};
  }
}

let enemyId = 0;

export class Enemy {
  constructor(type, x, y, wave, elite, rng) {
    const base = CONFIG.enemies[type];
    const hpScale = 1 + (wave - 1) * 0.12;
    this.id = ++enemyId;
    this.type = type;
    this.elite = elite;
    this.x = x;
    this.y = y;
    this.r = base.radius * (elite ? CONFIG.elite.sizeMult : 1);
    this.hp = Math.round(base.hp * hpScale * (elite ? CONFIG.elite.hpMult : 1));
    this.maxHp = this.hp;
    this.speed = base.speed * rng.range(0.9, 1.1);
    this.damage = base.damage;
    this.xp = base.xp * (elite ? CONFIG.elite.xpMult : 1);
    this.score = base.score * (elite ? CONFIG.elite.scoreMult : 1);
    this.color = base.color;
    this.hitFlash = 0; // frames of white flash after taking a hit
    this.wobble = rng.range(0, Math.PI * 2);
    this.touchTimer = 0; // per-enemy cooldown between hits on the player
  }
}

export class Bolt {
  constructor(x, y, angle, speed, damage, pierce) {
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.r = CONFIG.player.boltRadius;
    this.damage = damage;
    this.pierce = pierce;
    this.life = 1.1; // seconds before it fades out
    this.hitIds = new Set();
  }
}

export class Gem {
  constructor(x, y, value, rng) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.vx = rng.range(-40, 40);
    this.vy = rng.range(-40, 40);
    this.r = 6 + Math.min(6, value);
    this.bob = rng.range(0, Math.PI * 2);
    this.magnetized = false;
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, size, color) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
  }
}

export class FloatText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.life = 0.9;
    this.maxLife = 0.9;
  }
}
