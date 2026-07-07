/**
 * LinkedIn "Tinder for posts" swipe deck.
 * Extracts post content into clean cards — never reparents raw LinkedIn DOM.
 */

class LinkedInSwipeDeck {
  constructor() {
    /** @type {{ id: string, source: Element, card: HTMLElement }[]} */
    this.posts = [];
    this.index = 0;
    this.active = false;
    this._seenIds = new Set();

    this.drag = { active: false, startX: 0, startY: 0, x: 0, y: 0, pointerId: null };

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._scan = this._scan.bind(this);

    this._prescan();
    this._buildUI();
    this._activate();
    if (this.posts.length > 0) this._showCurrent();
    this._startScanning();
  }

  _prescan() {
    this._findPostSources().forEach((source) => this._addPost(source));
  }

  _buildUI() {
    this.root = document.createElement('div');
    this.root.id = 'pg-linkedin-swipe';
    this.root.className = 'pg-swipe';
    this.root.innerHTML = `
      <div class="pg-swipe__backdrop"></div>
      <div class="pg-swipe__shell">
        <button type="button" class="pg-swipe__close" id="pg-swipe-close" title="Exit swipe mode">✕</button>
        <header class="pg-swipe__header">
          <span class="pg-swipe__badge">Corporate Park</span>
          <h2 class="pg-swipe__title">Network or Next?</h2>
          <p class="pg-swipe__counter" id="pg-swipe-counter">scanning…</p>
        </header>
        <div class="pg-swipe__deck" id="pg-swipe-deck">
          <div class="pg-swipe__card" id="pg-swipe-card">
            <div class="pg-swipe__stamp pg-swipe__stamp--pass" id="pg-stamp-pass">PASS</div>
            <div class="pg-swipe__stamp pg-swipe__stamp--connect" id="pg-stamp-connect">CONNECT</div>
            <div class="pg-swipe__slot" id="pg-swipe-slot">
              <div class="pg-swipe__loading" id="pg-swipe-loading">
                <span class="pg-swipe__loading-emoji">🎴</span>
                <p>Finding posts…</p>
                <button type="button" class="pg-swipe__rescan" id="pg-btn-rescan">Scan feed again</button>
              </div>
            </div>
          </div>
          <div class="pg-swipe__card pg-swipe__card--behind" id="pg-swipe-card-next" aria-hidden="true"></div>
        </div>
        <p class="pg-swipe__hint" id="pg-swipe-hint">← pass · connect → · or drag the card</p>
        <div class="pg-swipe__actions">
          <button type="button" class="pg-swipe__btn pg-swipe__btn--pass" id="pg-btn-pass" title="Pass">✕</button>
          <button type="button" class="pg-swipe__btn pg-swipe__btn--undo" id="pg-btn-undo" title="Undo" disabled>↩</button>
          <button type="button" class="pg-swipe__btn pg-swipe__btn--connect" id="pg-btn-connect" title="Connect">♥</button>
        </div>
      </div>
    `;
    document.documentElement.appendChild(this.root);

    this.card = this.root.querySelector('#pg-swipe-card');
    this.slot = this.root.querySelector('#pg-swipe-slot');
    this.loading = this.root.querySelector('#pg-swipe-loading');
    this.counter = this.root.querySelector('#pg-swipe-counter');
    this.stampPass = this.root.querySelector('#pg-stamp-pass');
    this.stampConnect = this.root.querySelector('#pg-stamp-connect');
    this.hint = this.root.querySelector('#pg-swipe-hint');

    this.card.addEventListener('pointerdown', this._onPointerDown);
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('keydown', this._onKeyDown);

    this.root.querySelector('#pg-btn-pass').addEventListener('click', () => this._flyOut('left'));
    this.root.querySelector('#pg-btn-connect').addEventListener('click', () => this._flyOut('right'));
    this.root.querySelector('#pg-btn-undo').addEventListener('click', () => this._undo());
    this.root.querySelector('#pg-swipe-close').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('playground:swipe-close'));
    });
    this.root.querySelector('#pg-btn-rescan').addEventListener('click', () => this._rescanFeed());

    this._history = [];
  }

  _rescanFeed() {
    document.documentElement.classList.remove('pg-swipe-active');
    this.root.style.visibility = 'hidden';

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.posts = [];
        this.index = 0;
        this._seenIds.clear();
        this.slot.innerHTML = `
          <div class="pg-swipe__loading" id="pg-swipe-loading">
            <span class="pg-swipe__loading-emoji">🎴</span>
            <p>Finding posts…</p>
            <button type="button" class="pg-swipe__rescan" id="pg-btn-rescan">Scan feed again</button>
          </div>`;
        this.loading = this.slot.querySelector('#pg-swipe-loading');
        this.slot.querySelector('#pg-btn-rescan')?.addEventListener('click', () => this._rescanFeed());

        this._prescan();
        this._scan();

        this.root.style.visibility = '';
        document.documentElement.classList.add('pg-swipe-active');
        if (this.posts.length > 0) this._showCurrent();
      }, 400);
    });
  }

  _startScanning() {
    this._scan();
    this.observer = new MutationObserver(() => this._scan());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this._retryTimer = setInterval(() => this._scan(), 2500);
  }

  /** Center feed column only — not sidebars */
  _getFeedColumn() {
    const selectors = [
      '.scaffold-layout__main .scaffold-finite-scroll__content',
      'main .scaffold-finite-scroll__content',
      '.core-rail .scaffold-finite-scroll__content',
      '[data-view-name="feed-full-update"]',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && !el.closest('aside')) return el;
    }
    return null;
  }

  _isComposer(el) {
    if (!el) return true;
    const t = (el.innerText || '').toLowerCase();
    if (t.includes('start a post') && el.offsetHeight < 200) return true;
    return Boolean(
      el.querySelector(
        '[data-view-name="share-box"], .share-box, [class*="share-box"], button[aria-label*="Start a post"]'
      ) && !el.querySelector('.feed-shared-update-v2, .occludable-update')
    );
  }

  _isValidPostSource(el) {
    if (!el || el.closest('#pg-linkedin-swipe') || el.closest('aside')) return false;
    if (this._isComposer(el)) return false;

    const h = el.offsetHeight;
    if (h < 100 || h > 900) return false;

    const text = (el.innerText || '').toLowerCase();
    if (text.includes('profile viewers') && text.includes('post impressions')) return false;
    if (text.includes('my pages') && text.includes('grow your business')) return false;
    if (text.includes("today's puzzles") || text.includes('linkedin news')) return false;

    const actors = el.querySelectorAll(
      '.update-components-actor, [class*="update-components-actor"]'
    );
    if (actors.length === 0) return false;

    const hasPostBody = Boolean(
      el.querySelector(
        '.feed-shared-update-v2__description, [class*="feed-shared-inline-show-more-text"], .update-components-text, [class*="update-components-text"], .feed-shared-image, [class*="feed-shared-image"], video'
      )
    );
    return hasPostBody;
  }

  _getPostId(source) {
    const urn =
      source.getAttribute('data-urn') ||
      source.querySelector('[data-urn*="activity"], [data-urn*="ugcPost"]')?.getAttribute('data-urn');
    if (urn) return urn;

    const actor = source.querySelector('.update-components-actor__name, a[href*="/in/"]');
    const snippet = (source.querySelector('[class*="description"], .update-components-text')?.innerText || '')
      .trim()
      .slice(0, 60);
    return `${actor?.textContent?.trim() || 'post'}-${snippet}`;
  }

  _findPostSources() {
    const feed = this._getFeedColumn();
    if (!feed) return [];

    const sources = [];
    const seen = new Set();

    const add = (el) => {
      if (!el || seen.has(el) || !this._isValidPostSource(el)) return;
      seen.add(el);
      sources.push(el);
    };

    // Best: tight post wrappers
    feed.querySelectorAll('.occludable-update, .feed-shared-update-v2').forEach(add);

    // Feed direct children (one post per child)
    Array.from(feed.children).forEach((child) => {
      if (child.matches('.occludable-update, .feed-shared-update-v2')) return;
      const inner = child.querySelector('.occludable-update, .feed-shared-update-v2');
      add(inner || child);
    });

    // Walk up from actors — stop at first valid tight wrapper
    feed.querySelectorAll('.update-components-actor, [class*="update-components-actor"]').forEach((actor) => {
      let node = actor.parentElement;
      for (let i = 0; i < 8 && node && node !== feed; i++) {
        const cls = node.className?.toString() || '';
        if (cls.includes('occludable-update') || cls.includes('feed-shared-update-v2')) {
          add(node);
          break;
        }
        if (node.parentElement === feed && this._isValidPostSource(node)) {
          add(node);
          break;
        }
        node = node.parentElement;
      }
    });

    return sources;
  }

  _text(el) {
    return (el?.innerText || el?.textContent || '').trim();
  }

  _buildCard(source) {
    const card = document.createElement('article');
    card.className = 'pg-post-card';

    const actor = source.querySelector('.update-components-actor, [class*="update-components-actor"]');

    // ── Header ──
    const header = document.createElement('header');
    header.className = 'pg-post-card__header';

    const avatarSrc = actor?.querySelector('img')?.src;
    if (avatarSrc) {
      const av = document.createElement('img');
      av.className = 'pg-post-card__avatar';
      av.src = avatarSrc;
      av.alt = '';
      header.appendChild(av);
    }

    const authorBlock = document.createElement('div');
    authorBlock.className = 'pg-post-card__author';

    const nameEl =
      actor?.querySelector(
        '.update-components-actor__name span[aria-hidden="true"], .update-components-actor__title span:first-child, a.app-aware-link span:first-child'
      ) || actor?.querySelector('a[href*="/in/"] span');
    const name = document.createElement('div');
    name.className = 'pg-post-card__name';
    name.textContent = this._text(nameEl).split('\n')[0] || 'LinkedIn Member';
    authorBlock.appendChild(name);

    const metaEl = actor?.querySelector(
      '.update-components-actor__description, .update-components-actor__sub-description, [class*="actor__description"]'
    );
    if (metaEl) {
      const meta = document.createElement('div');
      meta.className = 'pg-post-card__meta';
      meta.textContent = this._text(metaEl).slice(0, 100);
      authorBlock.appendChild(meta);
    }

    header.appendChild(authorBlock);
    card.appendChild(header);

    // ── Body ──
    const descEl = source.querySelector(
      '.feed-shared-update-v2__description, [class*="feed-shared-inline-show-more-text"], .update-components-text span[dir], .update-components-text'
    );
    const bodyText = this._text(descEl);
    if (bodyText) {
      const body = document.createElement('div');
      body.className = 'pg-post-card__body';
      body.textContent = bodyText.length > 500 ? bodyText.slice(0, 497) + '…' : bodyText;
      card.appendChild(body);
    }

    // ── Media ──
    const imgEl = source.querySelector(
      '.feed-shared-image__image img, .update-components-image img, img.ivm-view-attr__img--centered, img[src*="media.licdn"]'
    );
    const videoEl = source.querySelector('video');

    if (videoEl?.src) {
      const media = document.createElement('div');
      media.className = 'pg-post-card__media';
      const v = document.createElement('video');
      v.src = videoEl.src;
      v.controls = true;
      v.playsInline = true;
      media.appendChild(v);
      card.appendChild(media);
    } else if (imgEl?.src && !imgEl.src.includes('profile-displayphoto')) {
      const media = document.createElement('div');
      media.className = 'pg-post-card__media';
      const img = document.createElement('img');
      img.src = imgEl.src;
      img.alt = '';
      media.appendChild(img);
      card.appendChild(media);
    }

    // ── Link preview ──
    if (!imgEl && !videoEl) {
      const articleEl = source.querySelector('.feed-shared-article, [class*="feed-shared-article"]');
      if (articleEl) {
        const preview = document.createElement('div');
        preview.className = 'pg-post-card__preview';
        const title = articleEl.querySelector('[class*="title"], h2, strong');
        preview.textContent = this._text(title).slice(0, 120) || 'Shared link';
        card.appendChild(preview);
      }
    }

    // ── Footer ──
    const footer = document.createElement('footer');
    footer.className = 'pg-post-card__footer';
    footer.innerHTML =
      '<span class="pg-post-card__reaction">👍 Like</span><span class="pg-post-card__reaction">💬 Comment</span><span class="pg-post-card__reaction">↗ Share</span>';
    card.appendChild(footer);

    return card;
  }

  _addPost(source) {
    const id = this._getPostId(source);
    if (this._seenIds.has(id)) return false;
    this._seenIds.add(id);
    this.posts.push({ id, source, card: this._buildCard(source) });
    return true;
  }

  _scan() {
    let added = false;
    this._findPostSources().forEach((source) => {
      if (this._addPost(source)) added = true;
    });

    if (added || (this.posts.length > 0 && this.loading)) {
      this._updateCounter();
      if (this.loading || !this.slot.querySelector('.pg-post-card')) {
        this._showCurrent();
      }
    } else if (this.posts.length === 0) {
      this.counter.textContent = 'scanning…';
      this.hint.textContent = 'Scroll the feed once, then tap Scan feed again.';
    }
  }

  _activate() {
    if (this.active) return;
    this.active = true;
    document.documentElement.classList.add('pg-swipe-active');
    document.getElementById('playground-layer')?.classList.add('pg-layer--hidden');
    document.getElementById('pg-swipe-launcher')?.remove();
  }

  _showCurrent() {
    const entry = this.posts[this.index];
    if (!entry) {
      if (this.posts.length === 0) return;
      this.hint.textContent = 'No more posts — scroll to load more.';
      this._scan();
      return;
    }

    this.loading?.remove();
    this._resetCardTransform();

    this.slot.innerHTML = '';
    this.slot.appendChild(entry.card);

    this.hint.textContent = '← pass · connect → · or drag the card';
    this._updateCounter();
    this._prefetchNext();
  }

  _prefetchNext() {
    const next = this.posts[this.index + 1];
    const nextSlot = this.root.querySelector('#pg-swipe-card-next');
    nextSlot.innerHTML = '';
    if (next) {
      const clone = next.card.cloneNode(true);
      clone.classList.add('pg-swipe-clone');
      nextSlot.appendChild(clone);
    }
  }

  _updateCounter() {
    const total = this.posts.length;
    const current = total === 0 ? 0 : Math.min(this.index + 1, total);
    this.counter.textContent = total === 0 ? 'scanning…' : `${current} / ${total}`;
    this.root.querySelector('#pg-btn-undo').disabled = this._history.length === 0;
  }

  _onPointerDown(e) {
    if (!this.posts[this.index] || e.button > 0) return;
    if (e.target.closest('button, a, input, textarea, video, [role="button"]')) return;

    this.drag.active = true;
    this.drag.pointerId = e.pointerId;
    this.drag.startX = e.clientX;
    this.drag.startY = e.clientY;
    this.drag.x = 0;
    this.drag.y = 0;
    this.card.setPointerCapture(e.pointerId);
    this.card.classList.add('pg-swipe__card--dragging');
  }

  _onPointerMove(e) {
    if (!this.drag.active || e.pointerId !== this.drag.pointerId) return;
    this.drag.x = e.clientX - this.drag.startX;
    this.drag.y = e.clientY - this.drag.startY;
    this._applyDragTransform();
    const opacity = Math.min(Math.abs(this.drag.x) / 120, 1);
    this.stampPass.style.opacity = this.drag.x < -20 ? opacity : 0;
    this.stampConnect.style.opacity = this.drag.x > 20 ? opacity : 0;
  }

  _onPointerUp(e) {
    if (!this.drag.active || e.pointerId !== this.drag.pointerId) return;
    this.drag.active = false;
    this.card.classList.remove('pg-swipe__card--dragging');
    this.stampPass.style.opacity = 0;
    this.stampConnect.style.opacity = 0;

    const threshold = 100;
    if (this.drag.x > threshold) this._flyOut('right');
    else if (this.drag.x < -threshold) this._flyOut('left');
    else this._resetCardTransform();
  }

  _applyDragTransform() {
    const rot = this.drag.x * 0.06;
    this.card.style.transform = `translate(${this.drag.x}px, ${this.drag.y}px) rotate(${rot}deg)`;
  }

  _resetCardTransform() {
    this.card.style.transform = '';
    this.card.style.transition = '';
  }

  _flyOut(direction) {
    if (!this.posts[this.index]) return;

    const flyX = direction === 'right' ? window.innerWidth : -window.innerWidth;
    this.card.style.transition = 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.35s ease';
    this.card.style.transform = `translate(${flyX}px, ${this.drag.y}px) rotate(${direction === 'right' ? 18 : -18}deg)`;
    this.card.style.opacity = '0';

    this._history.push({ index: this.index, direction });

    setTimeout(() => {
      this.index += 1;
      this.card.style.opacity = '';
      this._resetCardTransform();
      if (this.index >= this.posts.length) this._scan();
      this._showCurrent();
    }, 320);
  }

  _undo() {
    if (this._history.length === 0) return;
    const { index } = this._history.pop();
    this.index = index;
    this._showCurrent();
  }

  _onKeyDown(e) {
    if (!this.active) return;
    if (e.key === 'Escape') window.dispatchEvent(new CustomEvent('playground:swipe-close'));
    if (e.key === 'ArrowLeft') this._flyOut('left');
    if (e.key === 'ArrowRight') this._flyOut('right');
  }

  destroy() {
    clearInterval(this._retryTimer);
    this.observer?.disconnect();
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('keydown', this._onKeyDown);
    document.documentElement.classList.remove('pg-swipe-active');
    document.getElementById('playground-layer')?.classList.remove('pg-layer--hidden');
    this.root?.remove();
    this.active = false;
  }

  getStatus() {
    return {
      active: this.active,
      postCount: this.posts.length,
      currentIndex: this.index,
    };
  }
}

window.LinkedInSwipeDeck = LinkedInSwipeDeck;
