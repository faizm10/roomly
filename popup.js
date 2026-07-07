/**
 * Playground extension popup controller.
 */

const STORAGE_KEY = 'playground_enabled';
const SWIPE_KEY = 'playground_swipe_feed';

const $ = (sel) => document.querySelector(sel);

const toggle = $('#toggle-enabled');
const toggleState = $('#toggle-state');
const toggleSwipe = $('#toggle-swipe');
const swipeState = $('#swipe-state');
const swipeCard = $('#swipe-card');
const siteStatus = $('#site-status');
const themeStatus = $('#theme-status');
const animalCount = $('#animal-count');
const statusCard = $('#status-card');
const btnSpawn = $('#btn-spawn');
const btnClear = $('#btn-clear');

function sendToTab(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { target: 'background', action: 'send-to-tab', payload },
      (response) => resolve(response || { ok: false })
    );
  });
}

function pingTab() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ target: 'background', action: 'ping-tab' }, (response) => {
      resolve(response || { ok: false });
    });
  });
}

function setToggleUI(enabled) {
  toggle.checked = enabled;
  toggleState.textContent = enabled ? 'ON' : 'OFF';
}

function setSwipeUI(enabled) {
  toggleSwipe.checked = enabled;
  swipeState.textContent = enabled ? 'ON' : 'OFF';
}

function formatHostname(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return 'Unknown';
  }
}

function updateUI(data) {
  const {
    ok,
    tab,
    supported,
    enabled,
    linkedIn,
    swipeEnabled,
    themeName,
    accent,
    animalCount: count,
    error,
  } = data;

  if (!ok) {
    siteStatus.textContent = error?.includes('Receiving end') ? 'Reload page' : 'No active tab';
    siteStatus.className = 'status-value status-value--unsupported';
    themeStatus.textContent = '—';
    animalCount.textContent = '0';
    statusCard.removeAttribute('data-accent');
    swipeCard.hidden = true;
    btnSpawn.disabled = true;
    btnClear.disabled = true;
    toggleSwipe.disabled = true;
    return;
  }

  const host = tab?.url ? formatHostname(tab.url) : '—';
  siteStatus.textContent = supported ? host : `${host} (unsupported)`;
  siteStatus.className = supported
    ? 'status-value status-value--supported'
    : 'status-value status-value--unsupported';

  themeStatus.textContent = supported ? themeName || '—' : 'Not available';
  animalCount.textContent = String(count ?? 0);

  if (accent && supported) {
    statusCard.style.setProperty('--card-accent', accent);
    statusCard.setAttribute('data-accent', 'true');
  } else {
    statusCard.removeAttribute('data-accent');
  }

  // LinkedIn-only swipe toggle
  swipeCard.hidden = !linkedIn;
  toggleSwipe.disabled = !linkedIn || !enabled;
  if (linkedIn) setSwipeUI(Boolean(swipeEnabled));

  const canInteract = supported && enabled;
  btnSpawn.disabled = !canInteract;
  btnClear.disabled = !canInteract;
}

async function refresh() {
  const stored = await chrome.storage.sync.get([STORAGE_KEY, SWIPE_KEY]);
  const enabled = stored[STORAGE_KEY] !== false;
  const swipe = stored[SWIPE_KEY] === true;
  setToggleUI(enabled);
  setSwipeUI(swipe);

  const response = await pingTab();
  if (response.ok) {
    updateUI({ ...response, enabled });
  } else {
    updateUI(response);
  }
}

toggle.addEventListener('change', async () => {
  const enabled = toggle.checked;
  setToggleUI(enabled);
  await chrome.storage.sync.set({ [STORAGE_KEY]: enabled });

  if (!enabled) {
    await chrome.storage.sync.set({ [SWIPE_KEY]: false });
    setSwipeUI(false);
  }

  const response = await sendToTab({ action: 'toggle', enabled });
  if (response.ok) {
    updateUI({ ...response, enabled });
  }
});

toggleSwipe.addEventListener('change', async () => {
  const enabled = toggleSwipe.checked;
  setSwipeUI(enabled);
  await chrome.storage.sync.set({ [SWIPE_KEY]: enabled });

  const response = await sendToTab({ action: 'toggle-swipe', enabled });
  if (response.ok) updateUI(response);
});

btnSpawn.addEventListener('click', async () => {
  btnSpawn.disabled = true;
  const response = await sendToTab({ action: 'spawn-more', count: 1 });
  if (response.ok) updateUI(response);
  btnSpawn.disabled = false;
  refresh();
});

btnClear.addEventListener('click', async () => {
  btnClear.disabled = true;
  const response = await sendToTab({ action: 'clear-animals' });
  if (response.ok) updateUI(response);
  btnClear.disabled = false;
  refresh();
});

document.addEventListener('DOMContentLoaded', refresh);
