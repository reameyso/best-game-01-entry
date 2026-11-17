// Synthesized sound: no audio files, no network. Everything is an oscillator or a
// filtered noise burst through a master gain. Created lazily on the first gesture,
// because browsers block audio before the player interacts.
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this._musicTimer = null;
    this._musicStep = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.12;
      this.musicGain.connect(this.master);
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _tone({ type = 'sine', from = 440, to = null, dur = 0.12, vol = 0.25, when = 0, dest = null }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.08, vol = 0.2, freq = 1200, when = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  shoot() { this._tone({ type: 'square', from: 880, to: 320, dur: 0.07, vol: 0.08 }); }
  hit() { this._noise({ dur: 0.05, vol: 0.1, freq: 2400 }); }
  kill() {
    this._tone({ type: 'triangle', from: 520, to: 140, dur: 0.14, vol: 0.16 });
    this._noise({ dur: 0.09, vol: 0.12, freq: 900 });
  }
  pickup(step = 0) {
    const base = 660 + Math.min(step, 12) * 28;
    this._tone({ type: 'sine', from: base, to: base * 1.5, dur: 0.09, vol: 0.12 });
  }
  hurt() {
    this._tone({ type: 'sawtooth', from: 160, to: 60, dur: 0.22, vol: 0.22 });
    this._noise({ dur: 0.12, vol: 0.14, freq: 500 });
  }
  dash() { this._noise({ dur: 0.14, vol: 0.1, freq: 3200 }); }
  levelup() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone({ type: 'triangle', from: f, dur: 0.16, vol: 0.14, when: i * 0.07 }));
  }
  waveStart() {
    this._tone({ type: 'sine', from: 392, dur: 0.18, vol: 0.14 });
    this._tone({ type: 'sine', from: 587, dur: 0.22, vol: 0.14, when: 0.1 });
  }
  victory() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => this._tone({ type: 'triangle', from: f, dur: 0.3, vol: 0.15, when: i * 0.11 }));
  }
  gameover() {
    [392, 330, 262, 196].forEach((f, i) => this._tone({ type: 'sawtooth', from: f, dur: 0.32, vol: 0.12, when: i * 0.16 }));
  }

  // A slow, quiet minor-key arpeggio that loops while the run lasts.
  startMusic() {
    if (!this.ctx || this._musicTimer) return;
    const scale = [220, 261.6, 329.6, 392, 440, 523.3];
    this._musicTimer = window.setInterval(() => {
      if (this.muted || !this.ctx) return;
      const f = scale[this._musicStep % scale.length];
      this._tone({ type: 'sine', from: f, dur: 0.9, vol: 0.05, dest: this.musicGain });
      if (this._musicStep % 4 === 2) {
        this._tone({ type: 'sine', from: f / 2, dur: 1.4, vol: 0.05, dest: this.musicGain });
      }
      this._musicStep++;
    }, 320);
  }

  stopMusic() {
    if (this._musicTimer) {
      window.clearInterval(this._musicTimer);
      this._musicTimer = null;
    }
  }
}
