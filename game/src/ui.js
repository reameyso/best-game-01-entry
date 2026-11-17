// The DOM screens over the canvas: title, level-up cards, pause, victory, game over.
// The game keeps running behind none of them — the main loop pauses the world
// whenever one is shown, so a click can never cost the player a life.
export class Ui {
  constructor() {
    this.el = {
      title: document.getElementById('overlay-title'),
      upgrade: document.getElementById('overlay-upgrade'),
      pause: document.getElementById('overlay-pause'),
      over: document.getElementById('overlay-over'),
      victory: document.getElementById('overlay-victory'),
      cards: document.getElementById('upgrade-cards'),
      overStats: document.getElementById('over-stats'),
      victoryStats: document.getElementById('victory-stats'),
    };
    this._pick = null;
  }

  hideAll() {
    for (const key of ['title', 'upgrade', 'pause', 'over', 'victory']) {
      this.el[key].classList.add('hidden');
    }
  }

  showTitle(onStart) {
    this.hideAll();
    this.el.title.classList.remove('hidden');
    const btn = document.getElementById('btn-start');
    btn.onclick = () => { onStart(); };
  }

  showUpgrade(choices, onPick) {
    this.hideAll();
    this._pick = onPick;
    this.el.cards.innerHTML = '';
    choices.forEach((up, i) => {
      const card = document.createElement('button');
      card.className = 'card';
      card.innerHTML =
        `<span class="glyph">${up.glyph}</span>` +
        `<span class="card-name">${up.name}</span>` +
        `<span class="card-desc">${up.desc}</span>` +
        `<span class="card-key">${i + 1}</span>`;
      card.onclick = () => { this.hideAll(); onPick(up.id); };
      this.el.cards.appendChild(card);
    });
    this.el.upgrade.classList.remove('hidden');
  }

  pickByIndex(i) {
    const card = this.el.cards.children[i];
    if (card) card.click();
  }

  showPause(onResume, onRestart) {
    this.hideAll();
    this.el.pause.classList.remove('hidden');
    document.getElementById('btn-resume').onclick = () => { this.hideAll(); onResume(); };
    document.getElementById('btn-restart-pause').onclick = () => { this.hideAll(); onRestart(); };
  }

  showGameOver(stats, onRestart) {
    this.hideAll();
    this.el.overStats.innerHTML =
      `<div><b>${stats.score.toLocaleString('en-US')}</b><span>score</span></div>` +
      `<div><b>${stats.wave}</b><span>wave reached</span></div>` +
      `<div><b>${stats.kills}</b><span>gloom banished</span></div>` +
      `<div><b>${stats.level}</b><span>level</span></div>` +
      `<div><b>${stats.time}</b><span>survived</span></div>`;
    this.el.over.classList.remove('hidden');
    document.getElementById('btn-restart').onclick = () => { this.hideAll(); onRestart(); };
  }

  showVictory(stats, onContinue, onRestart) {
    this.hideAll();
    this.el.victoryStats.innerHTML =
      `<div><b>${stats.score.toLocaleString('en-US')}</b><span>score</span></div>` +
      `<div><b>${stats.kills}</b><span>gloom banished</span></div>` +
      `<div><b>${stats.level}</b><span>level</span></div>` +
      `<div><b>${stats.time}</b><span>survived</span></div>`;
    this.el.victory.classList.remove('hidden');
    document.getElementById('btn-continue').onclick = () => { this.hideAll(); onContinue(); };
    document.getElementById('btn-restart-victory').onclick = () => { this.hideAll(); onRestart(); };
  }
}
