/**
 * AutoLighthouse Dual Auditor (Desktop + Mobile) - Popup Controller
 */

const LOCAL_SERVER_URL = 'http://localhost:9876';
const PSI_API_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

const CATEGORY_META = [
  { key: 'performance', label: 'Perf' },
  { key: 'accessibility', label: 'A11y' },
  { key: 'best-practices', label: 'Best Prac' },
  { key: 'seo', label: 'SEO' }
];

const CORE_METRICS = [
  { id: 'first-contentful-paint', key: 'FCP', label: 'First Contentful Paint (FCP)' },
  { id: 'largest-contentful-paint', key: 'LCP', label: 'Largest Contentful Paint (LCP)' },
  { id: 'total-blocking-time', key: 'TBT', label: 'Total Blocking Time (TBT)' },
  { id: 'cumulative-layout-shift', key: 'CLS', label: 'Cumulative Layout Shift (CLS)' },
  { id: 'speed-index', key: 'SI', label: 'Speed Index (SI)' },
  { id: 'interactive', key: 'TTI', label: 'Time to Interactive (TTI)' }
];

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
  autoDownload: true
};

// State
let currentSettings = structuredClone(DEFAULT_SETTINGS);
let isServerOnline = false;
let isAuditing = false;
let lastAuditPayload = null;
let timerInterval = null;

// DOM Elements
const els = {
  serverStatusPill: document.getElementById('serverStatusPill'),
  serverStatusDot: document.getElementById('serverStatusDot'),
  serverStatusText: document.getElementById('serverStatusText'),
  fallbackBanner: document.getElementById('fallbackBanner'),
  fallbackMessage: document.getElementById('fallbackMessage'),
  urlInput: document.getElementById('urlInput'),
  useActiveTabBtn: document.getElementById('useActiveTabBtn'),
  deviceBoth: document.getElementById('deviceBoth'),
  deviceDesktop: document.getElementById('deviceDesktop'),
  deviceMobile: document.getElementById('deviceMobile'),
  deviceLabelBoth: document.getElementById('deviceLabelBoth'),
  deviceLabelDesktop: document.getElementById('deviceLabelDesktop'),
  deviceLabelMobile: document.getElementById('deviceLabelMobile'),
  catPerformance: document.getElementById('catPerformance'),
  catAccessibility: document.getElementById('catAccessibility'),
  catBestPractices: document.getElementById('catBestPractices'),
  catSeo: document.getElementById('catSeo'),
  autoDownloadToggle: document.getElementById('autoDownloadToggle'),
  fmtAiSummary: document.getElementById('fmtAiSummary'),
  fmtJson: document.getElementById('fmtJson'),
  fmtHtml: document.getElementById('fmtHtml'),
  runAuditBtn: document.getElementById('runAuditBtn'),
  runAuditBtnText: document.getElementById('runAuditBtnText'),
  progressSection: document.getElementById('progressSection'),
  progressStatusText: document.getElementById('progressStatusText'),
  progressTimer: document.getElementById('progressTimer'),
  progressBarFill: document.getElementById('progressBarFill'),
  progressSubText: document.getElementById('progressSubText'),
  errorSection: document.getElementById('errorSection'),
  errorMessage: document.getElementById('errorMessage'),
  dashboardSection: document.getElementById('dashboardSection'),
  dashboardMeta: document.getElementById('dashboardMeta'),
  dashboardSourceBadge: document.getElementById('dashboardSourceBadge'),
  comparisonColumns: document.getElementById('comparisonColumns'),
  desktopScoreCol: document.getElementById('desktopScoreCol'),
  mobileScoreCol: document.getElementById('mobileScoreCol'),
  desktopGauges: document.getElementById('desktopGauges'),
  mobileGauges: document.getElementById('mobileGauges'),
  desktopCwvList: document.getElementById('desktopCwvList'),
  mobileCwvList: document.getElementById('mobileCwvList'),
  copyAiPromptBtn: document.getElementById('copyAiPromptBtn'),
  downloadSelectedBtn: document.getElementById('downloadSelectedBtn'),
  downloadAiMdBtn: document.getElementById('downloadAiMdBtn'),
  clearResultsBtn: document.getElementById('clearResultsBtn')
};

/* ==========================================================================
   Initialization & Persistence
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await detectActiveTabUrl();
  await checkLocalServerHealth();
  await restorePreviousDashboard();
  bindEvents();
});

async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['settings']);
    if (data && data.settings) {
      currentSettings = {
        ...DEFAULT_SETTINGS,
        ...data.settings,
        categories: { ...DEFAULT_SETTINGS.categories, ...(data.settings.categories || {}) },
        formats: { ...DEFAULT_SETTINGS.formats, ...(data.settings.formats || {}) }
      };
    }
  } catch (err) {
    console.warn('Could not load settings from storage:', err);
  }
  applySettingsToUI();
}

async function saveSettings() {
  try {
    await chrome.storage.local.set({ settings: currentSettings });
  } catch (err) {
    console.warn('Could not save settings:', err);
  }
}

function applySettingsToUI() {
  setDeviceModeUI(currentSettings.deviceMode);

  els.catPerformance.checked = Boolean(currentSettings.categories.performance);
  els.catAccessibility.checked = Boolean(currentSettings.categories.accessibility);
  els.catBestPractices.checked = Boolean(currentSettings.categories['best-practices']);
  els.catSeo.checked = Boolean(currentSettings.categories.seo);

  els.autoDownloadToggle.checked = Boolean(currentSettings.autoDownload);
  els.fmtAiSummary.checked = Boolean(currentSettings.formats.aiSummary);
  els.fmtJson.checked = Boolean(currentSettings.formats.json);
  els.fmtHtml.checked = Boolean(currentSettings.formats.html);

  updateRunButtonLabel();
}

function setDeviceModeUI(mode) {
  currentSettings.deviceMode = mode;
  els.deviceBoth.checked = mode === 'both';
  els.deviceDesktop.checked = mode === 'desktop';
  els.deviceMobile.checked = mode === 'mobile';

  els.deviceLabelBoth.classList.toggle('active', mode === 'both');
  els.deviceLabelDesktop.classList.toggle('active', mode === 'desktop');
  els.deviceLabelMobile.classList.toggle('active', mode === 'mobile');
  updateRunButtonLabel();
}

function updateRunButtonLabel() {
  if (isAuditing) return;
  const mode = currentSettings.deviceMode;
  const modeLabel =
    mode === 'both'
      ? 'Dual Lighthouse Audit (Desktop + Mobile)'
      : mode === 'desktop'
      ? 'Desktop Lighthouse Audit'
      : 'Mobile Lighthouse Audit';

  els.runAuditBtnText.textContent = isServerOnline
    ? `Run ${modeLabel}`
    : `Run ${modeLabel} (Server / Fallback)`;
}

async function detectActiveTabUrl() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    if (tab && tab.url && /^https?:\/\//i.test(tab.url)) {
      els.urlInput.value = tab.url;
    } else if (!els.urlInput.value) {
      els.urlInput.value = 'https://example.com';
    }
  } catch (err) {
    console.warn('Failed to detect active tab URL:', err);
  }
}

async function checkLocalServerHealth() {
  els.serverStatusDot.className = 'status-dot';
  els.serverStatusText.textContent = 'Checking...';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`${LOCAL_SERVER_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      isServerOnline = true;
      els.serverStatusDot.className = 'status-dot online';
      els.serverStatusText.textContent = 'Local Engine: Online';
      els.fallbackBanner.classList.add('hidden');
      updateRunButtonLabel();
      return true;
    }
  } catch (_) {
    // Server offline
  }

  isServerOnline = false;
  els.serverStatusDot.className = 'status-dot offline';
  els.serverStatusText.textContent = 'Local Offline (PSI Ready)';
  els.fallbackBanner.classList.remove('hidden');
  updateRunButtonLabel();
  return false;
}

async function restorePreviousDashboard() {
  try {
    const stored = await chrome.storage.local.get(['lastAuditCache']);
    if (stored && stored.lastAuditCache) {
      lastAuditPayload = stored.lastAuditCache;
      renderDashboard(lastAuditPayload);
    }
  } catch (_) {
    // ignore
  }
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

function bindEvents() {
  els.serverStatusPill.addEventListener('click', () => {
    checkLocalServerHealth();
  });

  els.useActiveTabBtn.addEventListener('click', () => {
    detectActiveTabUrl();
  });

  // Device mode checkboxes acting as radio-like selector
  const deviceMap = [
    { input: els.deviceBoth, mode: 'both' },
    { input: els.deviceDesktop, mode: 'desktop' },
    { input: els.deviceMobile, mode: 'mobile' }
  ];
  for (const { input, mode } of deviceMap) {
    input.addEventListener('change', () => {
      setDeviceModeUI(mode);
      saveSettings();
    });
  }

  // Categories
  const onCategoryChange = () => {
    currentSettings.categories = {
      performance: els.catPerformance.checked,
      accessibility: els.catAccessibility.checked,
      'best-practices': els.catBestPractices.checked,
      seo: els.catSeo.checked
    };
    // Ensure at least one category remains checked
    if (!Object.values(currentSettings.categories).some(Boolean)) {
      currentSettings.categories.performance = true;
      els.catPerformance.checked = true;
    }
    saveSettings();
  };
  els.catPerformance.addEventListener('change', onCategoryChange);
  els.catAccessibility.addEventListener('change', onCategoryChange);
  els.catBestPractices.addEventListener('change', onCategoryChange);
  els.catSeo.addEventListener('change', onCategoryChange);

  // Formats & Auto-Download
  const onFormatChange = () => {
    currentSettings.autoDownload = els.autoDownloadToggle.checked;
    currentSettings.formats = {
      aiSummary: els.fmtAiSummary.checked,
      json: els.fmtJson.checked,
      html: els.fmtHtml.checked
    };
    saveSettings();
  };
  els.autoDownloadToggle.addEventListener('change', onFormatChange);
  els.fmtAiSummary.addEventListener('change', onFormatChange);
  els.fmtJson.addEventListener('change', onFormatChange);
  els.fmtHtml.addEventListener('change', onFormatChange);

  // Run Audit Button
  els.runAuditBtn.addEventListener('click', () => {
    runAuditFlow();
  });

  // Copy AI Prompt + Report
  els.copyAiPromptBtn.addEventListener('click', async () => {
    if (!lastAuditPayload || !lastAuditPayload.aiReport?.markdown) return;
    const promptHeader = [
      'Please act as a Principal Web Performance & Accessibility Engineer.',
      'Below is my Google Lighthouse Dual Audit Report (Desktop + Mobile).',
      'Analyze the failing audits, Core Web Vitals bottlenecks, wasted bytes/ms, DOM selectors, console errors, and CSP issues, then give me exact code fixes to achieve 95+ scores across all categories:\n\n'
    ].join(' ');
    const fullClipboardText = promptHeader + lastAuditPayload.aiReport.markdown;
    try {
      await navigator.clipboard.writeText(fullClipboardText);
      const originalText = els.copyAiPromptBtn.innerHTML;
      els.copyAiPromptBtn.innerHTML = '<span>✅ Copied AI Prompt + Report to Clipboard!</span>';
      setTimeout(() => {
        els.copyAiPromptBtn.innerHTML = originalText;
      }, 2400);
    } catch (err) {
      showError('Failed to copy to clipboard: ' + err.message);
    }
  });

  // Manual download buttons
  els.downloadSelectedBtn.addEventListener('click', () => {
    if (lastAuditPayload) {
      triggerReportDownloads(lastAuditPayload, true);
    }
  });

  els.downloadAiMdBtn.addEventListener('click', () => {
    if (lastAuditPayload && lastAuditPayload.aiReport?.markdown) {
      const prefix = buildFilePrefix(lastAuditPayload.url, lastAuditPayload.timestamp);
      downloadFileViaBackground(
        `${prefix}-combined-ai-report.md`,
        lastAuditPayload.aiReport.markdown,
        'text/markdown'
      );
    }
  });

  // Clear Audit Results Button
  els.clearResultsBtn.addEventListener('click', async () => {
    lastAuditPayload = null;
    els.desktopGauges.innerHTML = '';
    els.mobileGauges.innerHTML = '';
    els.desktopCwvList.innerHTML = '';
    els.mobileCwvList.innerHTML = '';
    els.dashboardMeta.textContent = '';
    els.dashboardSection.classList.add('hidden');
    clearError();
    try {
      await chrome.storage.local.remove(['lastAuditCache']);
      chrome.runtime.sendMessage({ action: 'SET_BADGE', text: '' });
    } catch (_) {
      // ignore
    }
  });
}

/* ==========================================================================
   Audit Execution (Local Lighthouse Engine + PageSpeed Insights Fallback)
   ========================================================================== */

function getSelectedDevices() {
  if (currentSettings.deviceMode === 'desktop') return ['desktop'];
  if (currentSettings.deviceMode === 'mobile') return ['mobile'];
  return ['desktop', 'mobile'];
}

function getSelectedCategories() {
  return Object.entries(currentSettings.categories)
    .filter(([, checked]) => checked)
    .map(([key]) => key);
}

function getSelectedFormats() {
  const list = [];
  if (currentSettings.formats.json) list.push('json');
  if (currentSettings.formats.html) list.push('html');
  if (currentSettings.formats.aiSummary) list.push('ai-summary');
  return list.length > 0 ? list : ['ai-summary'];
}

function isLocalhostUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    return (
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      parsed.hostname === '0.0.0.0' ||
      parsed.hostname.endsWith('.local')
    );
  } catch {
    return false;
  }
}

function startProgressTimer() {
  stopProgressTimer();
  const start = Date.now();
  els.progressTimer.textContent = '0s';
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - start) / 1000);
    els.progressTimer.textContent = `${elapsed}s`;
  }, 500);
}

function stopProgressTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function setProgressUI(step, totalSteps, statusText, subText, percentOverride = null) {
  els.progressSection.classList.remove('hidden');
  els.progressStatusText.textContent = statusText;
  if (subText) els.progressSubText.textContent = subText;
  const pct =
    percentOverride !== null
      ? percentOverride
      : totalSteps > 0
      ? Math.min(95, Math.max(15, Math.round(((step - 0.35) / totalSteps) * 100)))
      : 25;
  els.progressBarFill.style.width = `${pct}%`;
}

function showError(msg) {
  els.errorSection.classList.remove('hidden');
  els.errorMessage.textContent = msg;
}

function clearError() {
  els.errorSection.classList.add('hidden');
  els.errorMessage.textContent = '';
}

async function runAuditFlow() {
  if (isAuditing) return;

  const targetUrl = (els.urlInput.value || '').trim();
  if (!/^https?:\/\//i.test(targetUrl)) {
    showError('Please enter a valid http:// or https:// URL to audit.');
    return;
  }

  clearError();
  isAuditing = true;
  els.runAuditBtn.disabled = true;
  els.runAuditBtnText.textContent = 'Auditing in Progress...';
  chrome.runtime.sendMessage({ action: 'SET_BADGE', text: 'RUN', color: '#0ea5e9' });

  const devices = getSelectedDevices();
  const categories = getSelectedCategories();
  const formats = getSelectedFormats();

  startProgressTimer();
  setProgressUI(
    1,
    devices.length,
    `Step 1/${devices.length}: Auditing ${devices[0] === 'desktop' ? 'Desktop' : 'Mobile'}...`,
    'Checking Local Lighthouse Server (localhost:9876)...',
    18
  );

  try {
    const serverReady = await checkLocalServerHealth();
    let finalPayload = null;

    if (serverReady) {
      finalPayload = await runViaLocalServer({
        url: targetUrl,
        devices,
        categories,
        formats
      });
    } else {
      // Check if URL can use Google PageSpeed Insights Fallback
      if (isLocalhostUrl(targetUrl)) {
        throw new Error(
          'Local Lighthouse Server (localhost:9876) is offline, and PageSpeed Insights cannot reach localhost URLs. Double-click start-server.bat to audit localhost sites!'
        );
      }
      finalPayload = await runViaPageSpeedFallback({
        url: targetUrl,
        devices,
        categories,
        formats
      });
    }

    setProgressUI(devices.length, devices.length, 'Completed!', 'Generating reports...', 100);
    lastAuditPayload = finalPayload;

    // Cache a lightweight version in chrome.storage.local so popup reopening restores scores
    await saveLightweightAuditCache(finalPayload);

    renderDashboard(finalPayload);

    if (currentSettings.autoDownload) {
      await triggerReportDownloads(finalPayload, false);
    }

    chrome.runtime.sendMessage({ action: 'SET_BADGE', text: 'OK', color: '#10b981' });
  } catch (err) {
    console.error('Audit error:', err);
    showError(err.message || 'Audit failed.');
    chrome.runtime.sendMessage({ action: 'SET_BADGE', text: 'ERR', color: '#ef4444' });
  } finally {
    stopProgressTimer();
    isAuditing = false;
    els.runAuditBtn.disabled = false;
    setTimeout(() => {
      if (!isAuditing) {
        els.progressSection.classList.add('hidden');
      }
    }, 900);
    updateRunButtonLabel();
  }
}

/**
 * Streams progress and final audit payload from the Local Node.js Lighthouse Engine (`localhost:9876`)
 */
async function runViaLocalServer({ url, devices, categories, formats }) {
  const response = await fetch(`${LOCAL_SERVER_URL}/api/audit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/x-ndjson'
    },
    body: JSON.stringify({
      url,
      devices,
      categories,
      formats,
      stream: true
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Local server error (${response.status}): ${errText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let resultPayload = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx).trim();
      buffer = buffer.slice(newlineIdx + 1);
      if (!line) continue;

      const event = JSON.parse(line);
      if (event.type === 'progress') {
        const step = event.step || 1;
        const total = event.totalSteps || devices.length;
        setProgressUI(
          step,
          total,
          `Step ${step}/${total}: ${event.statusText || 'Auditing...'}`,
          `Running headless Chrome (--headless=new --incognito) on ${url}`
        );
      } else if (event.type === 'result' && event.ok) {
        resultPayload = event;
      } else if (event.type === 'error' || event.ok === false) {
        throw new Error(event.error || 'Local Lighthouse audit failed.');
      }
    }
  }

  if (!resultPayload) {
    throw new Error('Local server closed stream before returning audit results.');
  }

  return resultPayload;
}

/**
 * Fallback mode using Google PageSpeed Insights REST API v5 when local server is offline.
 */
async function runViaPageSpeedFallback({ url, devices, categories, formats }) {
  const timestamp = new Date().toISOString();
  const resultsByDevice = {};
  const summariesByDevice = {};

  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    const stepNum = i + 1;
    const deviceTitle = device === 'desktop' ? 'Desktop' : 'Mobile';

    setProgressUI(
      stepNum,
      devices.length,
      `Step ${stepNum}/${devices.length}: Auditing ${deviceTitle} (PSI Cloud)...`,
      `Querying Google PageSpeed Insights API (${device})...`
    );

    const params = new URLSearchParams({
      url,
      strategy: device === 'desktop' ? 'desktop' : 'mobile'
    });
    for (const cat of categories) {
      params.append('category', cat);
    }

    const res = await fetch(`${PSI_API_URL}?${params.toString()}`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson?.error?.message || `PageSpeed Insights HTTP ${res.status}`;
      throw new Error(`PSI Fallback Error (${deviceTitle}): ${msg}`);
    }

    const data = await res.json();
    const lhr = data.lighthouseResult;
    if (!lhr) {
      throw new Error(`PageSpeed Insights response did not include lighthouseResult for ${deviceTitle}.`);
    }

    const aiSummary = buildClientAiSummary(lhr, device);
    summariesByDevice[device] = aiSummary;

    resultsByDevice[device] = {
      device,
      scores: aiSummary.scores,
      coreWebVitals: aiSummary.coreWebVitals,
      aiSummary,
      rawJson: formats.includes('json') ? JSON.stringify(lhr, null, 2) : undefined,
      html: formats.includes('html') ? buildStandaloneHtmlFromSummary(aiSummary) : undefined
    };
  }

  const combinedAiJson = {
    schema: 'autolighthouse-ai-report/v1',
    url,
    generatedAt: timestamp,
    source: 'pagespeed-insights-fallback',
    summaryComparison: {
      desktop: summariesByDevice.desktop ? summariesByDevice.desktop.scores : null,
      mobile: summariesByDevice.mobile ? summariesByDevice.mobile.scores : null
    },
    devices: {
      ...(summariesByDevice.desktop ? { desktop: summariesByDevice.desktop } : {}),
      ...(summariesByDevice.mobile ? { mobile: summariesByDevice.mobile } : {})
    }
  };

  const combinedAiMarkdown = buildClientAiMarkdown(combinedAiJson);

  return {
    ok: true,
    type: 'result',
    source: 'psi-fallback',
    url,
    timestamp,
    devices,
    categories,
    formats,
    results: resultsByDevice,
    aiReport: {
      json: combinedAiJson,
      markdown: combinedAiMarkdown
    }
  };
}

/* ==========================================================================
   Client-Side AI Report Formatter (Used by PSI Fallback & UI)
   ========================================================================== */

function scoreToRating(score) {
  if (score === null || score === undefined) return 'n/a';
  if (score >= 0.9) return 'good';
  if (score >= 0.5) return 'needs-improvement';
  return 'poor';
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return null;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KiB`;
  return `${(kb / 1024).toFixed(2)} MiB`;
}

function truncate(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return str;
  const clean = str.replace(/\s+/g, ' ').trim();
  return clean.length > maxLen ? `${clean.slice(0, maxLen)}...` : clean;
}

function buildClientAiSummary(lhr, device) {
  const scores = {};
  const categoryAuditMap = {};
  for (const [catKey, catVal] of Object.entries(lhr.categories || {})) {
    scores[catKey] =
      catVal.score !== null && catVal.score !== undefined ? Math.round(catVal.score * 100) : null;
    if (Array.isArray(catVal.auditRefs)) {
      for (const ref of catVal.auditRefs) {
        if (!categoryAuditMap[ref.id]) categoryAuditMap[ref.id] = [];
        categoryAuditMap[ref.id].push(catKey);
      }
    }
  }

  const coreWebVitals = {};
  const audits = lhr.audits || {};
  for (const metric of CORE_METRICS) {
    const a = audits[metric.id];
    if (a) {
      coreWebVitals[metric.key] = {
        id: metric.id,
        label: metric.label,
        displayValue: a.displayValue || null,
        numericValue:
          typeof a.numericValue === 'number' ? Math.round(a.numericValue * 1000) / 1000 : null,
        numericUnit: a.numericUnit || null,
        score: typeof a.score === 'number' ? Math.round(a.score * 100) : null,
        rating: scoreToRating(a.score)
      };
    }
  }

  const opportunities = [];
  const failedAudits = [];
  const consoleErrors = [];
  const cspIssues = [];
  const metricIds = new Set(CORE_METRICS.map((m) => m.id));

  for (const [auditId, audit] of Object.entries(audits)) {
    if (!audit) continue;

    if (auditId === 'errors-in-console' && Array.isArray(audit.details?.items)) {
      for (const item of audit.details.items.slice(0, 15)) {
        consoleErrors.push({
          source: item.source || 'console.error',
          description: truncate(item.description, 260),
          url: truncate(item.sourceLocation?.url || item.url, 160)
        });
      }
    }

    if (auditId === 'csp-xss' && Array.isArray(audit.details?.items)) {
      for (const item of audit.details.items.slice(0, 15)) {
        cspIssues.push({
          directive: item.directive || null,
          description: truncate(item.description, 240),
          severity: item.severity || null
        });
      }
    }

    const mode = audit.scoreDisplayMode;
    if (mode === 'notApplicable' || mode === 'manual' || mode === 'informative') continue;
    if (typeof audit.score !== 'number' || audit.score >= 0.9) continue;

    const details = audit.details || {};
    const overallSavingsMs =
      typeof details.overallSavingsMs === 'number' ? Math.round(details.overallSavingsMs) : null;
    const overallSavingsBytes =
      typeof details.overallSavingsBytes === 'number' ? Math.round(details.overallSavingsBytes) : null;

    const items = (details.items || []).slice(0, 8).map((item) => {
      const node = item.node || item.element?.node || {};
      return {
        selector: node.selector || undefined,
        snippet: truncate(node.snippet, 160) || undefined,
        explanation: truncate(node.explanation, 200) || undefined,
        url: truncate(item.url, 160) || undefined,
        wastedMs: typeof item.wastedMs === 'number' ? Math.round(item.wastedMs) : undefined,
        wastedSize: typeof item.wastedBytes === 'number' ? formatBytes(item.wastedBytes) : undefined
      };
    });

    const entry = {
      id: auditId,
      title: audit.title,
      categories: categoryAuditMap[auditId] || ['other'],
      score: Math.round(audit.score * 100),
      displayValue: audit.displayValue || null,
      description: truncate(audit.description, 240),
      wastedMs: overallSavingsMs,
      wastedBytes: overallSavingsBytes,
      wastedSize: overallSavingsBytes ? formatBytes(overallSavingsBytes) : null,
      items
    };

    if (details.type === 'opportunity' || overallSavingsMs || overallSavingsBytes) {
      opportunities.push(entry);
    }
    if (!metricIds.has(auditId)) {
      failedAudits.push(entry);
    }
  }

  opportunities.sort((a, b) => (b.wastedMs || 0) - (a.wastedMs || 0));
  failedAudits.sort((a, b) => (a.score ?? 100) - (b.score ?? 100));

  return {
    device,
    finalUrl: lhr.finalDisplayedUrl || lhr.finalUrl || lhr.requestedUrl,
    fetchTime: lhr.fetchTime || new Date().toISOString(),
    lighthouseVersion: lhr.lighthouseVersion || null,
    scores,
    coreWebVitals,
    topOpportunities: opportunities.slice(0, 15),
    failedAudits: failedAudits.slice(0, 30),
    consoleErrors,
    cspIssues
  };
}

function buildClientAiMarkdown(combinedReport) {
  const lines = [];
  const { url, generatedAt, devices } = combinedReport;
  const desktop = devices?.desktop || null;
  const mobile = devices?.mobile || null;

  lines.push(`# Lighthouse Dual Audit Report (AI-Optimized Diagnostic)`);
  lines.push(`- **Target URL:** ${url}`);
  lines.push(`- **Audited At:** ${generatedAt}`);
  lines.push('');
  lines.push(`## 1. Category Scores (0–100)`);
  lines.push(`| Category | Desktop | Mobile |`);
  lines.push(`| :--- | :---: | :---: |`);
  for (const cat of [
    { key: 'performance', label: 'Performance' },
    { key: 'accessibility', label: 'Accessibility' },
    { key: 'best-practices', label: 'Best Practices' },
    { key: 'seo', label: 'SEO' }
  ]) {
    lines.push(
      `| **${cat.label}** | ${desktop?.scores?.[cat.key] ?? '—'} | ${mobile?.scores?.[cat.key] ?? '—'} |`
    );
  }
  lines.push('');

  lines.push(`## 2. Core Web Vitals & Performance Metrics`);
  lines.push(`| Metric | Desktop | Mobile |`);
  lines.push(`| :--- | :---: | :---: |`);
  for (const m of CORE_METRICS) {
    const d = desktop?.coreWebVitals?.[m.key];
    const mb = mobile?.coreWebVitals?.[m.key];
    lines.push(
      `| **${m.label}** | ${d ? `${d.displayValue} (${d.rating})` : '—'} | ${
        mb ? `${mb.displayValue} (${mb.rating})` : '—'
      } |`
    );
  }
  lines.push('');

  for (const [deviceKey, summary] of Object.entries(devices || {})) {
    if (!summary) continue;
    const titleDevice = deviceKey.charAt(0).toUpperCase() + deviceKey.slice(1);
    lines.push(`---`);
    lines.push(`## 3. ${titleDevice} Diagnostics`);
    lines.push('');
    if (summary.failedAudits?.length) {
      lines.push(`### Failed Audits (Score < 90) (${titleDevice})`);
      for (const audit of summary.failedAudits) {
        lines.push(
          `- **[${audit.id}] ${audit.title}** (Score: ${audit.score}/100)${
            audit.displayValue ? ` — ${audit.displayValue}` : ''
          }`
        );
        if (audit.description) lines.push(`  - *Why:* ${audit.description}`);
        for (const item of (audit.items || []).slice(0, 5)) {
          const parts = [];
          if (item.selector) parts.push(`Selector: \`${item.selector}\``);
          if (item.snippet) parts.push(`DOM: \`${item.snippet}\``);
          if (item.explanation) parts.push(`Issue: ${item.explanation}`);
          if (item.url) parts.push(`URL: \`${item.url}\``);
          if (item.wastedMs) parts.push(`Wasted: ${item.wastedMs} ms`);
          if (item.wastedSize) parts.push(`Wasted: ${item.wastedSize}`);
          if (parts.length > 0) lines.push(`  - ${parts.join(' | ')}`);
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function buildStandaloneHtmlFromSummary(summary) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Lighthouse Report (${summary.device}) - ${summary.finalUrl}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px; max-width: 960px; margin: 0 auto; }
  h1, h2 { color: #38bdf8; }
  pre { background: #1e293b; padding: 16px; border-radius: 8px; overflow-x: auto; }
</style>
</head>
<body>
  <h1>Lighthouse ${summary.device.toUpperCase()} Report</h1>
  <p><strong>URL:</strong> ${summary.finalUrl} | <strong>Fetched:</strong> ${summary.fetchTime}</p>
  <pre>${JSON.stringify(summary, null, 2)}</pre>
</body>
</html>`;
}

/* ==========================================================================
   Visual Score Dashboard Rendering
   ========================================================================== */

function getScoreColor(score) {
  if (score === null || score === undefined) return '#64748b';
  if (score >= 90) return '#10b981'; // 90-100 Green
  if (score >= 50) return '#f59e0b'; // 50-89 Orange
  return '#ef4444'; // 0-49 Red
}

function createCircularGaugeHTML(score, label) {
  const numericScore = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score))) : null;
  const color = getScoreColor(numericScore);
  const radius = 21;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    numericScore !== null ? circumference - (numericScore / 100) * circumference : circumference;

  return `
    <div class="gauge-item">
      <div class="gauge-svg-wrap">
        <svg class="gauge-svg" viewBox="0 0 52 52">
          <circle class="gauge-bg" cx="26" cy="26" r="${radius}"></circle>
          <circle
            class="gauge-arc"
            cx="26"
            cy="26"
            r="${radius}"
            stroke="${color}"
            stroke-dasharray="${circumference.toFixed(2)}"
            stroke-dashoffset="${dashOffset.toFixed(2)}"
          ></circle>
        </svg>
        <div class="gauge-score-text" style="color: ${color}">
          ${numericScore !== null ? numericScore : '—'}
        </div>
      </div>
      <span class="gauge-label">${label}</span>
    </div>
  `;
}

function renderDeviceColumn(deviceResult, gaugesContainer, cwvContainer) {
  if (!deviceResult) {
    gaugesContainer.innerHTML = '';
    cwvContainer.innerHTML = '';
    return;
  }

  const scores = deviceResult.scores || {};
  const gaugesHtml = CATEGORY_META.filter((c) => scores[c.key] !== undefined && scores[c.key] !== null)
    .map((c) => createCircularGaugeHTML(scores[c.key], c.label))
    .join('');

  gaugesContainer.innerHTML = gaugesHtml;

  const cwv = deviceResult.coreWebVitals || {};
  const cwvRows = ['FCP', 'LCP', 'TBT', 'CLS', 'SI', 'TTI']
    .filter((k) => cwv[k] && cwv[k].displayValue)
    .map(
      (k) => `
      <div class="cwv-row">
        <span class="cwv-key">${k}</span>
        <span class="cwv-val ${cwv[k].rating || ''}">${cwv[k].displayValue}</span>
      </div>
    `
    )
    .join('');

  cwvContainer.innerHTML = cwvRows;
}

function renderDashboard(payload) {
  if (!payload || !payload.results) return;

  els.dashboardSection.classList.remove('hidden');

  const desktopData = payload.results.desktop || null;
  const mobileData = payload.results.mobile || null;

  const hasBoth = Boolean(desktopData && mobileData);
  els.comparisonColumns.classList.toggle('single-col', !hasBoth);
  els.desktopScoreCol.classList.toggle('hidden', !desktopData);
  els.mobileScoreCol.classList.toggle('hidden', !mobileData);

  if (desktopData) {
    renderDeviceColumn(desktopData, els.desktopGauges, els.desktopCwvList);
  }
  if (mobileData) {
    renderDeviceColumn(mobileData, els.mobileGauges, els.mobileCwvList);
  }

  let host = payload.url;
  try {
    host = new URL(payload.url).host;
  } catch {
    // keep raw
  }
  const timeStr = new Date(payload.timestamp || Date.now()).toLocaleTimeString();
  els.dashboardMeta.textContent = `${host} • ${timeStr}`;
  els.dashboardSourceBadge.textContent =
    payload.source === 'psi-fallback' ? 'PSI Cloud Fallback' : 'Local Lighthouse';
}

async function saveLightweightAuditCache(payload) {
  try {
    // Strip multi-megabyte rawJson/html before storing in chrome.storage.local
    const slimResults = {};
    for (const [dev, val] of Object.entries(payload.results || {})) {
      slimResults[dev] = {
        device: val.device,
        scores: val.scores,
        coreWebVitals: val.coreWebVitals,
        aiSummary: val.aiSummary
      };
    }
    const slimPayload = {
      ok: true,
      source: payload.source,
      url: payload.url,
      timestamp: payload.timestamp,
      devices: payload.devices,
      categories: payload.categories,
      results: slimResults,
      aiReport: payload.aiReport
    };
    await chrome.storage.local.set({ lastAuditCache: slimPayload });
  } catch (err) {
    console.warn('Failed to cache audit summary:', err);
  }
}

/* ==========================================================================
   Auto-Download & File Naming (`<domain>-<timestamp>-...`)
   ========================================================================== */

function buildFilePrefix(urlStr, isoTimestamp) {
  let domain = 'website';
  try {
    const u = new URL(urlStr);
    domain = (u.hostname + (u.port ? `-${u.port}` : '')).replace(/[^a-zA-Z0-9.-]/g, '_');
  } catch {
    domain = 'website';
  }
  const ts = (isoTimestamp || new Date().toISOString())
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);
  return `${domain}-${ts}`;
}

function downloadFileViaBackground(filename, content, mimeType) {
  return new Promise((resolve) => {
    // Use Blob URL directly in popup if available for large files, with background fallback
    try {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
      const blobUrl = URL.createObjectURL(blob);
      chrome.downloads.download(
        {
          url: blobUrl,
          filename: `lighthouse-reports/${filename}`,
          saveAs: false,
          conflictAction: 'uniquify'
        },
        (downloadId) => {
          setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
          resolve({ ok: !chrome.runtime.lastError, downloadId });
        }
      );
    } catch (_) {
      chrome.runtime.sendMessage(
        {
          action: 'DOWNLOAD_FILE',
          filename: `lighthouse-reports/${filename}`,
          content,
          mimeType
        },
        (res) => resolve(res || { ok: false })
      );
    }
  });
}

async function triggerReportDownloads(payload, forceAllSelected = false) {
  if (!payload) return;
  const prefix = buildFilePrefix(payload.url, payload.timestamp);

  const wantJson = currentSettings.formats.json;
  const wantHtml = currentSettings.formats.html;
  const wantAi = currentSettings.formats.aiSummary;

  const jobs = [];

  // 1. Per-device Raw JSON & HTML reports
  for (const [device, devResult] of Object.entries(payload.results || {})) {
    if (wantJson) {
      const jsonContent =
        devResult.rawJson || JSON.stringify(devResult.aiSummary || devResult, null, 2);
      jobs.push(
        downloadFileViaBackground(`${prefix}-${device}.json`, jsonContent, 'application/json')
      );
    }
    if (wantHtml && devResult.html) {
      jobs.push(downloadFileViaBackground(`${prefix}-${device}.html`, devResult.html, 'text/html'));
    }
  }

  // 2. Combined AI-Optimized Compact Reports (.json & .md)
  if (wantAi || forceAllSelected) {
    if (payload.aiReport?.json) {
      jobs.push(
        downloadFileViaBackground(
          `${prefix}-combined-ai-report.json`,
          JSON.stringify(payload.aiReport.json, null, 2),
          'application/json'
        )
      );
    }
    if (payload.aiReport?.markdown) {
      jobs.push(
        downloadFileViaBackground(
          `${prefix}-combined-ai-report.md`,
          payload.aiReport.markdown,
          'text/markdown'
        )
      );
    }
  }

  await Promise.allSettled(jobs);
}
