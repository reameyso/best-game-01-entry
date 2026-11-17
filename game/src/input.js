// Keyboard + mouse state, in canvas coordinates. The game reads this every frame;
// the shot harness can drive it with fake input instead of a real player.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.mouseX = 640;
    this.mouseY = 360;
    this.mouseDown = false;
    this.mouseSeen = false; // true once the pointer has actually moved
    this._pressed = new Set(); // edge-triggered keys, consumed once
    this._dashQueued = false;

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        this._pressed.add(e.key.toLowerCase());
        if (e.key === ' ' || e.key.toLowerCase() === 'shift') this._dashQueued = true;
      }
      this.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
      this.mouseSeen = true;
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.mouseDown = true;
      if (e.button === 2) this._dashQueued = true;
      const r = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
      this.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
      this.mouseSeen = true;
    });
    window.addEventListener('pointerup', () => { this.mouseDown = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  axisX() {
    let x = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    return x;
  }

  axisY() {
    let y = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    return y;
  }

  // True once when the key goes down; the game consumes it each frame.
  wasPressed(key) {
    return this._pressed.has(key.toLowerCase());
  }

  consumeDash() {
    const d = this._dashQueued;
    this._dashQueued = false;
    return d;
  }

  endFrame() {
    this._pressed.clear();
  }

  // Drive the game without a human (used by the ?shot= screenshot scenes).
  fakeMove(x, y) {
    this.keys.clear();
    if (x < 0) this.keys.add('a');
    if (x > 0) this.keys.add('d');
    if (y < 0) this.keys.add('w');
    if (y > 0) this.keys.add('s');
  }

  fakeAim(x, y) {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseSeen = true;
  }
}
