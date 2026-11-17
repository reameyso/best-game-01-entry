// EMBERFALL tuning: one place for every number the game balances on.
// The arena is a fixed 1280x720 logical canvas, scaled by CSS to fit the window.
export const CONFIG = {
  arena: { w: 1280, h: 720 },

  player: {
    radius: 16,
    speed: 265, // px per second
    maxHp: 100,
    boltDamage: 24,
    fireRate: 2.4, // bolts per second
    boltSpeed: 660,
    boltRadius: 6,
    projectiles: 1,
    pierce: 0,
    magnetRadius: 95,
    lanternRadius: 240, // warm light radius around the warden
    dashSpeed: 760,
    dashTime: 0.2, // seconds of burst
    dashCooldown: 2.2, // seconds
    dashInvuln: 0.3, // seconds of no damage after a dash
    xpGain: 1,
  },

  // Enemy types. hp/speed/damage scale a little with the wave (see world.js).
  enemies: {
    wisp: { hp: 26, speed: 98, damage: 8, radius: 13, xp: 1, score: 10, color: '#8f7bff' },
    husk: { hp: 78, speed: 56, damage: 14, radius: 20, xp: 3, score: 25, color: '#4ec9a7' },
    brute: { hp: 230, speed: 40, damage: 22, radius: 30, xp: 6, score: 60, color: '#ff5d6c' },
  },
  elite: { hpMult: 2.3, sizeMult: 1.35, xpMult: 3, scoreMult: 3, chanceFromWave: 4, chance: 0.08 },

  waves: {
    baseCount: 8, // enemies in wave 1
    perWave: 4, // extra enemies per wave
    spawnIntervalStart: 1.1, // seconds between spawns at wave 1
    spawnIntervalStep: 0.07, // faster each wave, down to the floor
    spawnIntervalMin: 0.35,
    breather: 3, // seconds between waves
    victoryWave: 10, // clearing wave 10 wins the run (then endless)
    huskFromWave: 2,
    bruteFromWave: 3,
    huskShare: 0.25,
    bruteShare: 0.12,
  },

  xp: {
    // xp needed to go from level L to L+1
    next: (level) => 10 + (level - 1) * 8,
  },

  // Upgrade pool shown 3-at-a-time on level up. `max` caps how often one can repeat.
  upgrades: [
    { id: 'damage', name: 'Ember Bolts', desc: '+25% bolt damage', glyph: '✦', max: 5, apply: (p) => { p.damage *= 1.25; } },
    { id: 'rate', name: 'Rapid Wick', desc: '+20% fire rate', glyph: '≋', max: 5, apply: (p) => { p.fireRate *= 1.2; } },
    { id: 'speed', name: 'Swift Boots', desc: '+12% move speed', glyph: '➤', max: 4, apply: (p) => { p.speed *= 1.12; } },
    { id: 'vitality', name: 'Lantern Heart', desc: '+25 max HP and heal 25', glyph: '♥', max: 5, apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
    { id: 'multishot', name: 'Split Flame', desc: '+1 bolt per shot', glyph: '✧', max: 3, apply: (p) => { p.projectiles += 1; } },
    { id: 'pierce', name: 'Piercing Light', desc: 'Bolts pass through +1 enemy', glyph: '↗', max: 3, apply: (p) => { p.pierce += 1; } },
    { id: 'dash', name: 'Ghost Step', desc: 'Dash recharges 25% faster', glyph: '➰', max: 4, apply: (p) => { p.dashCooldown *= 0.75; } },
    { id: 'magnet', name: 'Ember Lure', desc: '+60% ember pickup radius', glyph: '◎', max: 3, apply: (p) => { p.magnetRadius *= 1.6; } },
    { id: 'lantern', name: 'Bright Lantern', desc: '+20% light radius, +10% XP', glyph: '☀', max: 3, apply: (p) => { p.lanternRadius *= 1.2; p.xpGain *= 1.1; } },
    { id: 'regen', name: 'Warm Hearth', desc: 'Regenerate 1.2 HP per second', glyph: '♨', max: 3, apply: (p) => { p.regen = (p.regen || 0) + 1.2; } },
  ],

  feel: {
    shakeOnHurt: 7, // px of screen shake when the warden is hit
    shakeOnKill: 2.5,
    hitStopMs: 0, // (kept at 0: no freeze frames, the loop stays smooth)
    lowHpPulseBelow: 0.3, // HP fraction under which the vignette pulses
  },
};
