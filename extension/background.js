/**
 * SiteLens AI - Manifest V3 Background Service Worker
 * Handles default settings initialization, badge status updates, and reliable file downloads.
 */

const DEFAULT_SETTINGS = {
  deviceMode: 'both', // 'both' | 'desktop' | 'mobile'
  categories: {
    performance: true,
    accessibility: true,
    'best-practices': true,
    seo: true
  },
  formats: {
    json: true,
    html: false,
    aiSummary: true
  },
  autoDownload: true,
  psiApiKey: ''
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(['settings']);
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});

/**
 * Converts a UTF-8 string into a base64 Data URL (safe inside MV3 Service Workers where URL.createObjectURL is unavailable)
 */
function stringToDataUrl(content, mimeType = 'application/json') {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  const base64 = btoa(binary);
  return `data:${mimeType};charset=utf-8;base64,${base64}`;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  if (message.action === 'SET_BADGE') {
    const { text = '', color = '#0ea5e9' } = message;
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    sendResponse({ ok: true });
    return false;
  }

  if (message.action === 'DOWNLOAD_FILE') {
    const { filename, content, mimeType } = message;
    try {
      const dataUrl = stringToDataUrl(content, mimeType || 'application/octet-stream');
      chrome.downloads.download(
        {
          url: dataUrl,
          filename,
          saveAs: false,
          conflictAction: 'uniquify'
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ ok: true, downloadId });
          }
        }
      );
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
    return true; // async response
  }

  return false;
});
