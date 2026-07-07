/**
 * Playground background service worker.
 * Relays popup commands to the active tab's content script.
 */

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.target !== 'background') return;

  if (message.action === 'ping-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'no-tab' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, { action: 'get-status' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true, tab: { url: tab.url, title: tab.title }, ...response });
      });
    });
    return true;
  }

  if (message.action === 'send-to-tab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ ok: false, error: 'no-tab' });
        return;
      }
      chrome.tabs.sendMessage(tab.id, message.payload, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true, ...response });
      });
    });
    return true;
  }
});
