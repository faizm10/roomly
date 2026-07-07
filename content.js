/**
 * Playground content script entry point.
 * Boots the playground layer when enabled on a supported site.
 */

(function () {
  const STORAGE_KEY = 'playground_enabled';
  const SWIPE_KEY = 'playground_swipe_feed';
  let playground = null;
  let swipeDeck = null;
  let swipeLauncher = null;

  function getTheme() {
    return window.PlaygroundThemes?.getThemeForHost(window.location.hostname) ?? null;
  }

  function isSupported() {
    return Boolean(getTheme());
  }

  function isLinkedIn() {
    return getTheme()?.id === 'linkedin';
  }

  function isLinkedInFeed() {
    const path = window.location.pathname;
    if (path === '/' || path === '/feed' || path === '/feed/' || path.startsWith('/feed')) {
      return true;
    }
    return Boolean(document.querySelector('.scaffold-finite-scroll__content'));
  }

  function mountPlayground() {
    if (playground || !isSupported()) return;
    playground = new Playground(getTheme());
    if (isLinkedIn() && isLinkedInFeed() && !swipeDeck) {
      showSwipeLauncher();
    }
  }

  function unmountPlayground() {
    if (playground) {
      playground.destroy();
      playground = null;
    }
    hideSwipeLauncher();
  }

  function showSwipeLauncher() {
    if (swipeLauncher || swipeDeck || !isLinkedInFeed()) return;

    swipeLauncher = document.createElement('button');
    swipeLauncher.id = 'pg-swipe-launcher';
    swipeLauncher.className = 'pg-swipe-launcher';
    swipeLauncher.type = 'button';
    swipeLauncher.innerHTML =
      '<span class="pg-swipe-launcher__icon">🎴</span> Swipe Feed';
    swipeLauncher.title = 'Tinder-style LinkedIn posts';
    swipeLauncher.addEventListener('click', () => {
      chrome.storage.sync.set({ [SWIPE_KEY]: true }, () => {
        mountSwipe();
      });
    });
    document.documentElement.appendChild(swipeLauncher);
  }

  function hideSwipeLauncher() {
    swipeLauncher?.remove();
    swipeLauncher = null;
  }

  function mountSwipe() {
    if (swipeDeck || !isLinkedIn() || !window.LinkedInSwipeDeck) return;
    hideSwipeLauncher();
    swipeDeck = new LinkedInSwipeDeck();
  }

  function unmountSwipe() {
    if (swipeDeck) {
      swipeDeck.destroy();
      swipeDeck = null;
    }
    if (playground && isLinkedInFeed()) {
      showSwipeLauncher();
    }
  }

  function unmount() {
    unmountPlayground();
    unmountSwipe();
  }

  function getStatus() {
    const theme = getTheme();
    return {
      supported: Boolean(theme),
      enabled: Boolean(playground),
      themeId: theme?.id ?? null,
      themeName: theme?.name ?? null,
      accent: theme?.accent ?? null,
      animalCount: playground?.animals.length ?? 0,
      hostname: window.location.hostname,
      linkedIn: isLinkedIn(),
      swipeEnabled: Boolean(swipeDeck),
      swipePostCount: swipeDeck?.getStatus().postCount ?? 0,
    };
  }

  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([STORAGE_KEY, SWIPE_KEY], (result) => {
        resolve({
          enabled: result[STORAGE_KEY] !== false,
          swipe: result[SWIPE_KEY] === true,
        });
      });
    });
  }

  async function applySettings(settings) {
    if (settings.enabled && isSupported()) {
      mountPlayground();
    } else {
      unmountPlayground();
    }

    if (settings.swipe && settings.enabled && isLinkedIn()) {
      mountSwipe();
    } else {
      unmountSwipe();
    }
  }

  async function init() {
    const settings = await loadSettings();
    await applySettings(settings);
  }

  window.addEventListener('playground:swipe-close', () => {
    chrome.storage.sync.set({ [SWIPE_KEY]: false }, () => {
      unmountSwipe();
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync') return;
    if (!changes[STORAGE_KEY] && !changes[SWIPE_KEY]) return;
    loadSettings().then(applySettings);
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.action) {
      case 'get-status':
        sendResponse(getStatus());
        break;

      case 'toggle':
        if (message.enabled && isSupported()) {
          mountPlayground();
          loadSettings().then((s) => {
            if (s.swipe && isLinkedIn()) mountSwipe();
          });
        } else {
          unmount();
        }
        sendResponse(getStatus());
        break;

      case 'toggle-swipe':
        if (message.enabled && isLinkedIn()) {
          loadSettings().then((s) => {
            if (s.enabled !== false) mountSwipe();
            else unmountSwipe();
            sendResponse(getStatus());
          });
        } else {
          unmountSwipe();
          sendResponse(getStatus());
        }
        return true;

      case 'spawn-more':
        if (playground) playground.spawnMore(message.count || 1);
        sendResponse(getStatus());
        break;

      case 'clear-animals':
        if (playground) playground.clearAll();
        sendResponse(getStatus());
        break;

      default:
        sendResponse({ error: 'unknown-action' });
    }
    return true;
  });

  let lastPath = window.location.href;
  const observer = new MutationObserver(() => {
    if (window.location.href !== lastPath) {
      lastPath = window.location.href;
      const hadSwipe = Boolean(swipeDeck);
      unmountSwipe();
      loadSettings().then((settings) => {
        if (settings.enabled && isSupported()) mountPlayground();
        if (settings.swipe && settings.enabled && isLinkedIn() && hadSwipe) {
          mountSwipe();
        }
      });
    } else if (playground && isLinkedInFeed() && !swipeDeck && !swipeLauncher) {
      showSwipeLauncher();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
