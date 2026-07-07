/**
 * Playground manager — spawns animals, runs animation loop, handles lifecycle.
 */

class Playground {
  constructor(theme) {
    this.theme = theme;
    this.animals = [];
    this.running = false;
    this.lastTime = 0;
    this._rafId = null;

    this._createLayer();
    this._spawnInitial();
    this.start();
  }

  _createLayer() {
    this.layer = document.createElement('div');
    this.layer.id = 'playground-layer';
    this.layer.className = 'pg-layer';
    this.layer.dataset.theme = this.theme.id;
    this.layer.style.setProperty('--pg-theme-accent', this.theme.accent);

    // Ambient decorations per theme
    this._addAmbientDecor();

    document.documentElement.appendChild(this.layer);
  }

  _addAmbientDecor() {
    const decor = document.createElement('div');
    decor.className = 'pg-ambient';
    decor.setAttribute('aria-hidden', 'true');

    const labels = {
      linkedin: ['☕', '📎', '📊', '💼'],
      github: ['🌿', '🍄', '🐛', '🌲'],
      youtube: ['✨', '🔥', '💫', '📺'],
    };

    const items = labels[this.theme.id] || ['✨'];
    for (let i = 0; i < 6; i++) {
      const span = document.createElement('span');
      span.className = 'pg-ambient__bit';
      span.textContent = items[i % items.length];
      span.style.left = `${8 + Math.random() * 84}%`;
      span.style.top = `${5 + Math.random() * 90}%`;
      span.style.animationDelay = `${Math.random() * 4}s`;
      span.style.animationDuration = `${4 + Math.random() * 4}s`;
      decor.appendChild(span);
    }
    this.layer.appendChild(decor);
  }

  _spawnInitial() {
    const count = this.theme.spawnCount || 2;
    for (let i = 0; i < count; i++) {
      this.spawnOne(i);
    }
  }

  /**
   * Spawn a single animal from the theme roster.
   * @param {number} [index] - Optional index into animals array
   */
  spawnOne(index) {
    const roster = this.theme.animals;
    const cfg = roster[index !== undefined ? index % roster.length : Math.floor(Math.random() * roster.length)];
    const animal = new PlaygroundAnimal(cfg, this.theme, this.layer);
    this.animals.push(animal);
    return animal;
  }

  spawnMore(count = 1) {
    for (let i = 0; i < count; i++) {
      this.spawnOne();
    }
  }

  clearAll() {
    this.animals.forEach((a) => a.destroy());
    this.animals = [];
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this._tick = this._tick.bind(this);
    this._rafId = requestAnimationFrame(this._tick);
  }

  stop() {
    this.running = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  _tick(now) {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.animals.forEach((a) => a.update(dt));

    this._rafId = requestAnimationFrame(this._tick);
  }

  destroy() {
    this.stop();
    this.clearAll();
    this.layer?.remove();
    this.layer = null;
  }

  getStatus() {
    return {
      themeId: this.theme.id,
      themeName: this.theme.name,
      animalCount: this.animals.length,
      accent: this.theme.accent,
    };
  }
}

window.Playground = Playground;
