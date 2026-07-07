/**
 * Individual playground animal with organic movement, states, and speech.
 */

const ANIMAL_STATES = {
  WANDERING: 'wandering',
  IDLE: 'idle',
  WAVING: 'waving',
  SITTING: 'sitting',
  SLEEPING: 'sleeping',
  HIDING: 'hiding',
  JUMPING: 'jumping',
  FLOATING: 'floating',
};

class PlaygroundAnimal {
  /**
   * @param {object} config - Animal definition from theme
   * @param {object} theme - Parent theme
   * @param {HTMLElement} layer - Playground layer root
   */
  constructor(config, theme, layer) {
    this.config = config;
    this.theme = theme;
    this.layer = layer;
    this.id = `pg-animal-${config.id}-${Math.random().toString(36).slice(2, 8)}`;
    this.state = ANIMAL_STATES.WANDERING;
    this.facingRight = Math.random() > 0.5;
    this.size = config.size || 48;

    // Position & movement
    this.x = Math.random() * (window.innerWidth - this.size);
    this.y = Math.random() * (window.innerHeight - this.size);
    this.targetX = this.x;
    this.targetY = this.y;
    this.wanderPhase = Math.random() * Math.PI * 2;
    this.bouncePhase = Math.random() * Math.PI * 2;
    this.speed = 0.4 + Math.random() * 0.5;
    this.waveTimer = 0;
    this.stateTimer = 0;
    this.speechTimer = 4 + Math.random() * 8;
    this.blinkTimer = 2 + Math.random() * 4;
    this.isBlinking = false;
    this.anchorElement = null;
    this.hideOffset = 0;
    this.floatPhase = Math.random() * Math.PI * 2;
    this.emojiParticles = [];

    this._buildDOM();
    this._pickNewTarget();
  }

  _buildDOM() {
    this.el = document.createElement('div');
    this.el.className = 'pg-animal';
    this.el.dataset.animalId = this.config.id;
    this.el.dataset.state = this.state;
    this.el.style.setProperty('--pg-size', `${this.size}px`);
    this.el.style.setProperty('--pg-accent', this.theme.accent);

    this.shadow = document.createElement('div');
    this.shadow.className = 'pg-animal__shadow';

    this.body = document.createElement('div');
    this.body.className = 'pg-animal__body';

    this.face = document.createElement('div');
    this.face.className = 'pg-animal__face';
    this.face.textContent = this.config.emoji;

    this.accessory = document.createElement('div');
    this.accessory.className = 'pg-animal__accessory';
    this.accessory.textContent = this.config.accessory || '';

    this.bubble = document.createElement('div');
    this.bubble.className = 'pg-animal__bubble';
    this.bubble.setAttribute('aria-hidden', 'true');

    this.body.append(this.face, this.accessory);
    this.el.append(this.bubble, this.body, this.shadow);
    this.layer.appendChild(this.el);

    this._updateTransform();
  }

  _updateTransform() {
    const bounce =
      this.state === ANIMAL_STATES.WANDERING || this.state === ANIMAL_STATES.JUMPING
        ? Math.sin(this.bouncePhase) * 4
        : this.state === ANIMAL_STATES.FLOATING
          ? Math.sin(this.floatPhase) * 8
          : 0;

    const hideY = this.state === ANIMAL_STATES.HIDING ? this.hideOffset : 0;
    const scaleX = this.facingRight ? 1 : -1;

    this.el.style.transform = `translate3d(${this.x}px, ${this.y + bounce - hideY}px, 0) scaleX(${scaleX})`;
    this.el.dataset.state = this.state;
  }

  _pickNewTarget() {
    const margin = this.size + 20;
    const anchors = this._getAnchorRects();

    if (anchors.length > 0 && Math.random() < 0.55) {
      const rect = anchors[Math.floor(Math.random() * anchors.length)];
      this.targetX = rect.left + rect.width * (0.2 + Math.random() * 0.6) - this.size / 2;
      this.targetY = rect.top + rect.height * (0.3 + Math.random() * 0.5) - this.size / 2;
    } else {
      this.targetX = margin + Math.random() * (window.innerWidth - margin * 2);
      this.targetY = margin + Math.random() * (window.innerHeight - margin * 2);
    }

    this.targetX = this._clamp(this.targetX, 8, window.innerWidth - this.size - 8);
    this.targetY = this._clamp(this.targetY, 8, window.innerHeight - this.size - 8);
    this.wanderPhase = Math.random() * Math.PI * 2;
  }

  _getAnchorRects() {
    const rects = [];
    const selectors = this._getRelevantSelectors();
    selectors.forEach((sel) => {
      try {
        document.querySelectorAll(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 40 && r.height > 20 && r.top < window.innerHeight && r.bottom > 0) {
            rects.push(r);
          }
        });
      } catch (_) {
        /* invalid selector on some pages */
      }
    });
    return rects;
  }

  _getRelevantSelectors() {
    const a = this.theme.anchors || {};
    const behaviors = this.config.behaviors || [];

    if (behaviors.includes('sit-on-cards') && a.profileCards) return a.profileCards;
    if (behaviors.includes('sleep-near-experience') && a.experience) return a.experience;
    if (behaviors.includes('hide-behind-code') && a.codeBlocks) return a.codeBlocks;
    if (behaviors.includes('run-conflicts') && a.conflicts) return a.conflicts;
    if (behaviors.includes('jump-comments') && a.comments) return a.comments;
    if (behaviors.includes('float-thumbnails') && a.thumbnails) return a.thumbnails;
    if (a.repos) return a.repos;
    return [];
  }

  _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  _setState(next) {
    if (this.state === next) return;
    this.state = next;
    this.stateTimer = 0;
    this.el.dataset.state = next;

    if (next === ANIMAL_STATES.HIDING) {
      this.hideOffset = 12 + Math.random() * 8;
      const codes = this._getAnchorRects();
      if (codes.length) {
        const r = codes[Math.floor(Math.random() * codes.length)];
        this.x = r.left + r.width * 0.5 - this.size / 2;
        this.y = r.top + r.height - this.size * 0.6;
      }
    }

    if (next === ANIMAL_STATES.SITTING) {
      const cards = this._getAnchorRects();
      if (cards.length) {
        const r = cards[Math.floor(Math.random() * cards.length)];
        this.x = r.left + 16;
        this.y = r.top + r.height - this.size - 8;
      }
    }

    if (next === ANIMAL_STATES.SLEEPING) {
      const exp = this._getAnchorRects();
      if (exp.length) {
        const r = exp[Math.floor(Math.random() * exp.length)];
        this.x = r.left + 24;
        this.y = r.top + Math.min(r.height - this.size, 40);
      }
    }
  }

  _maybeTransitionState(dt) {
    this.stateTimer += dt;

    const behaviors = this.config.behaviors || [];
    const roll = Math.random();

    if (this.state === ANIMAL_STATES.WANDERING && this.stateTimer > 2.5) {
      if (behaviors.includes('hide-behind-code') && roll < 0.12) {
        this._setState(ANIMAL_STATES.HIDING);
        return;
      }
      if (behaviors.includes('sit-on-cards') && roll < 0.15) {
        this._setState(ANIMAL_STATES.SITTING);
        return;
      }
      if (behaviors.includes('sleep-near-experience') && roll < 0.1) {
        this._setState(ANIMAL_STATES.SLEEPING);
        return;
      }
      if (behaviors.includes('jump-comments') && roll < 0.18) {
        this._setState(ANIMAL_STATES.JUMPING);
        return;
      }
      if (behaviors.includes('float-thumbnails') && roll < 0.14) {
        this._setState(ANIMAL_STATES.FLOATING);
        return;
      }
      if (behaviors.includes('wave') && roll < 0.12) {
        this._setState(ANIMAL_STATES.WAVING);
        return;
      }
      if (roll < 0.25) {
        this._setState(ANIMAL_STATES.IDLE);
        return;
      }
      this._pickNewTarget();
      this.stateTimer = 0;
    }

    if (this.state === ANIMAL_STATES.HIDING && this.stateTimer > 2 + Math.random() * 2) {
      if (behaviors.includes('pop-out') && Math.random() < 0.7) {
        this.hideOffset = 0;
        this._setState(ANIMAL_STATES.WAVING);
        this._showSpeech('peek!');
      } else {
        this._setState(ANIMAL_STATES.WANDERING);
      }
    }

    if (
      this.state === ANIMAL_STATES.SITTING ||
      this.state === ANIMAL_STATES.SLEEPING ||
      this.state === ANIMAL_STATES.IDLE
    ) {
      const duration = this.state === ANIMAL_STATES.SLEEPING ? 6 : 2.5;
      if (this.stateTimer > duration) {
        this._setState(ANIMAL_STATES.WANDERING);
        this._pickNewTarget();
      }
    }

    if (this.state === ANIMAL_STATES.WAVING && this.stateTimer > 1.8) {
      this._setState(ANIMAL_STATES.WANDERING);
      this._pickNewTarget();
    }

    if (this.state === ANIMAL_STATES.JUMPING && this.stateTimer > 2) {
      this._setState(ANIMAL_STATES.WANDERING);
      if (behaviors.includes('throw-emoji')) this._throwEmoji();
    }

    if (this.state === ANIMAL_STATES.FLOATING && this.stateTimer > 3.5) {
      this._setState(ANIMAL_STATES.WANDERING);
      this._pickNewTarget();
    }
  }

  _moveWander(dt) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 6) {
      this._pickNewTarget();
      return;
    }

    // Organic path: base direction + sine-wave perpendicular drift
    this.wanderPhase += dt * 2.2;
    const perpX = -dy / (dist || 1);
    const perpY = dx / (dist || 1);
    const wobble = Math.sin(this.wanderPhase) * 18;

    const moveSpeed = this.speed * (60 * dt);
    const nx = dx / dist + perpX * wobble * 0.02;
    const ny = dy / dist + perpY * wobble * 0.02;
    const len = Math.hypot(nx, ny) || 1;

    this.x += (nx / len) * moveSpeed;
    this.y += (ny / len) * moveSpeed;
    this.bouncePhase += dt * 12;

    if (Math.abs(nx) > 0.05) {
      this.facingRight = nx > 0;
    }

    // Viewport bounds — bounce back
    const m = 8;
    if (this.x < m) {
      this.x = m;
      this.targetX = m + 80 + Math.random() * 120;
    }
    if (this.y < m) {
      this.y = m;
      this.targetY = m + 80 + Math.random() * 120;
    }
    if (this.x > window.innerWidth - this.size - m) {
      this.x = window.innerWidth - this.size - m;
      this.targetX = this.x - 80 - Math.random() * 120;
    }
    if (this.y > window.innerHeight - this.size - m) {
      this.y = window.innerHeight - this.size - m;
      this.targetY = this.y - 80 - Math.random() * 120;
    }
  }

  _moveJump(dt) {
    const comments = this._getAnchorRects();
    if (comments.length) {
      const r = comments[Math.floor(Math.random() * comments.length)];
      this.targetX = r.left + Math.random() * r.width;
      this.targetY = r.top + Math.random() * Math.min(r.height, 200);
    }
    this._moveWander(dt * 1.4);
    this.bouncePhase += dt * 20;
  }

  _moveFloat(dt) {
    const thumbs = this._getAnchorRects();
    if (thumbs.length) {
      const r = thumbs[Math.floor(Math.random() * thumbs.length)];
      this.targetX = r.left + r.width * 0.5 - this.size / 2;
      this.targetY = r.top - this.size * 0.3;
    }
    this.floatPhase += dt * 3;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    this.x += dx * dt * 2;
    this.y += dy * dt * 2 + Math.sin(this.floatPhase) * 0.3;
  }

  _throwEmoji() {
    const emojis = this.theme.emojiReactions || ['✨', '🔥', '💫'];
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const particle = document.createElement('div');
    particle.className = 'pg-emoji-particle';
    particle.textContent = emoji;
    particle.style.left = `${this.x + this.size / 2}px`;
    particle.style.top = `${this.y}px`;
    this.layer.appendChild(particle);

    const angle = (Math.random() * 0.8 + 0.1) * Math.PI;
    const power = 60 + Math.random() * 80;
    let vx = Math.cos(angle) * power * (this.facingRight ? 1 : -1);
    let vy = -Math.abs(Math.sin(angle) * power) - 40;
    let px = this.x + this.size / 2;
    let py = this.y;
    let life = 0;

    const tick = () => {
      life += 0.016;
      vy += 180 * 0.016;
      px += vx * 0.016;
      py += vy * 0.016;
      particle.style.transform = `translate(${px}px, ${py}px) scale(${1 - life * 0.5})`;
      particle.style.opacity = String(1 - life);
      if (life < 1.2) {
        requestAnimationFrame(tick);
      } else {
        particle.remove();
      }
    };
    requestAnimationFrame(tick);
  }

  _showSpeech(text) {
    this.bubble.textContent = text;
    this.bubble.classList.add('pg-animal__bubble--visible');
    clearTimeout(this._speechHide);
    this._speechHide = setTimeout(() => {
      this.bubble.classList.remove('pg-animal__bubble--visible');
    }, 2800);
  }

  _maybeSpeak(dt) {
    this.speechTimer -= dt;
    if (this.speechTimer <= 0) {
      const lines = this.theme.speech || [];
      if (lines.length) {
        this._showSpeech(lines[Math.floor(Math.random() * lines.length)]);
      }
      this.speechTimer = 6 + Math.random() * 10;
    }
  }

  _maybeBlink(dt) {
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) {
      this.isBlinking = true;
      this.face.classList.add('pg-animal__face--blink');
      setTimeout(() => {
        this.isBlinking = false;
        this.face.classList.remove('pg-animal__face--blink');
      }, 120);
      this.blinkTimer = 2.5 + Math.random() * 5;
    }
  }

  update(dt) {
    this._maybeTransitionState(dt);

    switch (this.state) {
      case ANIMAL_STATES.WANDERING:
        this._moveWander(dt);
        break;
      case ANIMAL_STATES.JUMPING:
        this._moveJump(dt);
        break;
      case ANIMAL_STATES.FLOATING:
        this._moveFloat(dt);
        break;
      case ANIMAL_STATES.HIDING:
        // subtle peek
        this.hideOffset = 10 + Math.sin(Date.now() / 400) * 3;
        break;
      default:
        break;
    }

    this._maybeSpeak(dt);
    this._maybeBlink(dt);
    this._updateTransform();
  }

  destroy() {
    clearTimeout(this._speechHide);
    this.el?.remove();
  }
}

window.PlaygroundAnimal = PlaygroundAnimal;
window.ANIMAL_STATES = ANIMAL_STATES;
