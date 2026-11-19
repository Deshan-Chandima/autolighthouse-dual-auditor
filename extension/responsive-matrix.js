/**
 * SiteLens AI - Multi-Device Live Responsive Matrix Controller
 */

const DEVICE_PRESETS = [
  {
    id: 'iphone-se',
    name: 'iPhone SE (3rd Gen)',
    type: 'mobile',
    category: 'Mobile Small',
    width: 375,
    height: 667,
    icon: '📱',
    scalePreset: 0.8
  },
  {
    id: 'iphone-15',
    name: 'iPhone 14 / 15 / 16',
    type: 'mobile',
    category: 'Mobile Standard',
    width: 390,
    height: 844,
    icon: '📱',
    scalePreset: 0.75
  },
  {
    id: 'pixel-7',
    name: 'Pixel 7 / Galaxy S23',
    type: 'mobile',
    category: 'Android Flagship',
    width: 412,
    height: 915,
    icon: '📱',
    scalePreset: 0.7
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini / 10.2"',
    type: 'tablet',
    category: 'Tablet Portrait',
    width: 768,
    height: 1024,
    icon: '📟',
    scalePreset: 0.6
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro 11"',
    type: 'tablet',
    category: 'Tablet Landscape',
    width: 1024,
    height: 768,
    icon: '📟',
    scalePreset: 0.55
  },
  {
    id: 'laptop-13',
    name: 'Laptop 13" / MacBook',
    type: 'desktop',
    category: 'Laptop',
    width: 1280,
    height: 800,
    icon: '💻',
    scalePreset: 0.48
  },
  {
    id: 'desktop-hd',
    name: 'Desktop Standard',
    type: 'desktop',
    category: 'Desktop',
    width: 1440,
    height: 900,
    icon: '🖥️',
    scalePreset: 0.45
  }
];

// State
let currentUrl = 'https://example.com';
let activeFilter = 'all';
let currentGlobalScale = 0.75; // 'auto' | 0.5 | 0.75 | 1.0
let deviceStates = {}; // id -> { width, height, isLandscape }

// DOM Elements
const els = {
  urlForm: document.getElementById('urlForm'),
  targetUrlInput: document.getElementById('targetUrlInput'),
  currentUrlDisplay: document.getElementById('currentUrlDisplay'),
  btnOpenExternal: document.getElementById('btnOpenExternal'),
  btnRotateAll: document.getElementById('btnRotateAll'),
  btnReloadAll: document.getElementById('btnReloadAll'),
  btnThemeToggle: document.getElementById('btnThemeToggle'),
  themeIcon: document.getElementById('themeIcon'),
  scaleControl: document.getElementById('scaleControl'),
  filterPills: document.getElementById('filterPills'),
  deviceGrid: document.getElementById('deviceGrid'),
  emptyState: document.getElementById('emptyState'),
  countAll: document.getElementById('countAll'),
  countMobile: document.getElementById('countMobile'),
  countTablet: document.getElementById('countTablet'),
  countDesktop: document.getElementById('countDesktop')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initUrlFromParams();
  initTheme();
  initDeviceStates();
  renderDeviceCounts();
  renderDeviceGrid();
  bindEvents();
});

function initUrlFromParams() {
  const params = new URLSearchParams(window.location.search);
  const urlParam = params.get('url');
  if (urlParam && /^https?:\/\//i.test(urlParam.trim())) {
    currentUrl = urlParam.trim();
  } else {
    currentUrl = 'https://example.com';
  }
  els.targetUrlInput.value = currentUrl;
  els.currentUrlDisplay.textContent = currentUrl;
  els.btnOpenExternal.href = currentUrl;
}

function initTheme() {
  const saved = localStorage.getItem('sitelens_theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.remove('theme-dark');
    document.body.classList.add('theme-light');
    els.themeIcon.textContent = '🌙';
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    els.themeIcon.textContent = '☀️';
  }
  localStorage.setItem('sitelens_theme', theme);
}

function initDeviceStates() {
  for (const dev of DEVICE_PRESETS) {
    deviceStates[dev.id] = {
      width: dev.width,
      height: dev.height,
      isLandscape: dev.width > dev.height
    };
  }
}

function renderDeviceCounts() {
  const mobileCount = DEVICE_PRESETS.filter((d) => d.type === 'mobile').length;
  const tabletCount = DEVICE_PRESETS.filter((d) => d.type === 'tablet').length;
  const desktopCount = DEVICE_PRESETS.filter((d) => d.type === 'desktop').length;

  els.countAll.textContent = DEVICE_PRESETS.length;
  els.countMobile.textContent = mobileCount;
  els.countTablet.textContent = tabletCount;
  els.countDesktop.textContent = desktopCount;
}

function getScaleForDevice(dev) {
  if (currentGlobalScale === 'auto') {
    return dev.scalePreset || 0.65;
  }
  return Number(currentGlobalScale) || 0.75;
}

function renderDeviceGrid() {
  els.deviceGrid.innerHTML = '';

  for (const dev of DEVICE_PRESETS) {
    const state = deviceStates[dev.id];
    const scale = getScaleForDevice(dev);
    const scaledWidth = Math.round(state.width * scale);
    const scaledHeight = Math.round(state.height * scale);

    const card = document.createElement('div');
    card.className = `device-card`;
    card.id = `card-${dev.id}`;
    card.dataset.id = dev.id;
    card.dataset.type = dev.type;

    if (activeFilter !== 'all' && dev.type !== activeFilter) {
      card.classList.add('hidden');
    }

    // Top Header of card
    const header = document.createElement('div');
    header.className = 'device-header';
    header.innerHTML = `
      <div class="device-title-wrap">
        <span class="device-name">
          <span>${dev.icon}</span>
          <span>${dev.name}</span>
        </span>
        <span class="device-dims" id="dims-${dev.id}">${state.width} × ${state.height} px (${state.isLandscape ? 'Landscape' : 'Portrait'}) • ${Math.round(scale * 100)}%</span>
      </div>
      <div class="device-actions">
        <button type="button" class="device-btn btn-rotate" title="Rotate device orientation" data-id="${dev.id}">🔄</button>
        <button type="button" class="device-btn btn-reload" title="Reload this frame" data-id="${dev.id}">↺</button>
        <button type="button" class="device-btn btn-isolate" title="Open in separate tab" data-id="${dev.id}">↗</button>
      </div>
    `;

    // Outer Bezel Shell
    const bezel = document.createElement('div');
    bezel.className = 'device-bezel';

    if (dev.type === 'mobile') {
      const notch = document.createElement('div');
      notch.className = 'notch-pill';
      notch.innerHTML = `<span class="notch-camera-dot"></span>`;
      bezel.appendChild(notch);
    }

    // Screen Container
    const screenOuter = document.createElement('div');
    screenOuter.className = 'screen-outer-container';
    screenOuter.id = `screenOuter-${dev.id}`;
    screenOuter.style.width = `${scaledWidth}px`;
    screenOuter.style.height = `${scaledHeight}px`;

    const screenScaled = document.createElement('div');
    screenScaled.className = 'screen-scaled-wrapper';
    screenScaled.id = `screenScaled-${dev.id}`;
    screenScaled.style.width = `${state.width}px`;
    screenScaled.style.height = `${state.height}px`;
    screenScaled.style.transform = `scale(${scale})`;

    const iframe = document.createElement('iframe');
    iframe.className = 'device-iframe';
    iframe.id = `iframe-${dev.id}`;
    iframe.src = currentUrl;
    iframe.title = `${dev.name} Viewport`;
    iframe.loading = 'lazy';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals');

    screenScaled.appendChild(iframe);
    screenOuter.appendChild(screenScaled);
    bezel.appendChild(screenOuter);

    if (dev.type === 'mobile') {
      const homeBar = document.createElement('div');
      homeBar.className = 'home-bar';
      bezel.appendChild(homeBar);
    } else if (dev.type === 'desktop') {
      const chin = document.createElement('div');
      chin.className = 'desktop-chin';
      chin.innerHTML = `<span class="desktop-logo-dot"></span>`;
      bezel.appendChild(chin);
    }

    card.appendChild(header);
    card.appendChild(bezel);
    els.deviceGrid.appendChild(card);
  }

  bindCardActionEvents();
}

function updateDeviceCardLayout(devId) {
  const dev = DEVICE_PRESETS.find((d) => d.id === devId);
  const state = deviceStates[devId];
  if (!dev || !state) return;

  const scale = getScaleForDevice(dev);
  const scaledWidth = Math.round(state.width * scale);
  const scaledHeight = Math.round(state.height * scale);

  const dimsEl = document.getElementById(`dims-${devId}`);
  if (dimsEl) {
    dimsEl.textContent = `${state.width} × ${state.height} px (${state.isLandscape ? 'Landscape' : 'Portrait'}) • ${Math.round(scale * 100)}%`;
  }

  const screenOuter = document.getElementById(`screenOuter-${devId}`);
  if (screenOuter) {
    screenOuter.style.width = `${scaledWidth}px`;
    screenOuter.style.height = `${scaledHeight}px`;
  }

  const screenScaled = document.getElementById(`screenScaled-${devId}`);
  if (screenScaled) {
    screenScaled.style.width = `${state.width}px`;
    screenScaled.style.height = `${state.height}px`;
    screenScaled.style.transform = `scale(${scale})`;
  }
}

function updateAllDeviceScales() {
  for (const dev of DEVICE_PRESETS) {
    updateDeviceCardLayout(dev.id);
  }
}

function rotateDevice(devId) {
  const state = deviceStates[devId];
  if (!state) return;

  // Swap width and height
  const temp = state.width;
  state.width = state.height;
  state.height = temp;
  state.isLandscape = !state.isLandscape;

  updateDeviceCardLayout(devId);
}

function rotateAllDevices() {
  for (const dev of DEVICE_PRESETS) {
    // Mainly mobile & tablet benefit from rotation
    if (dev.type === 'mobile' || dev.type === 'tablet') {
      rotateDevice(dev.id);
    }
  }
}

function reloadDevice(devId) {
  const iframe = document.getElementById(`iframe-${devId}`);
  if (iframe) {
    iframe.src = currentUrl;
  }
}

function reloadAllDevices() {
  for (const dev of DEVICE_PRESETS) {
    reloadDevice(dev.id);
  }
}

function navigateAll(newUrl) {
  let target = (newUrl || '').trim();
  if (!/^https?:\/\//i.test(target)) {
    target = 'https://' + target;
  }
  currentUrl = target;
  els.targetUrlInput.value = currentUrl;
  els.currentUrlDisplay.textContent = currentUrl;
  els.btnOpenExternal.href = currentUrl;

  // Update URL search param without reloading page
  const newSearch = `?url=${encodeURIComponent(currentUrl)}`;
  window.history.replaceState(null, '', newSearch);

  reloadAllDevices();
}

function bindEvents() {
  // URL form submission
  els.urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    navigateAll(els.targetUrlInput.value);
  });

  // Scale buttons
  els.scaleControl.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      els.scaleControl.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const val = btn.dataset.scale;
      currentGlobalScale = val === 'auto' ? 'auto' : parseFloat(val);
      updateAllDeviceScales();
    });
  });

  // Filter pills
  els.filterPills.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      els.filterPills.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter || 'all';

      document.querySelectorAll('.device-card').forEach((card) => {
        const type = card.dataset.type;
        const shouldShow = activeFilter === 'all' || type === activeFilter;
        card.classList.toggle('hidden', !shouldShow);
      });
    });
  });

  // Global actions
  els.btnRotateAll.addEventListener('click', () => {
    rotateAllDevices();
  });

  els.btnReloadAll.addEventListener('click', () => {
    reloadAllDevices();
  });

  els.btnThemeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.contains('theme-dark');
    applyTheme(isDark ? 'light' : 'dark');
  });
}

function bindCardActionEvents() {
  // Individual card action buttons
  document.querySelectorAll('.btn-rotate').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      rotateDevice(btn.dataset.id);
    });
  });

  document.querySelectorAll('.btn-reload').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      reloadDevice(btn.dataset.id);
    });
  });

  document.querySelectorAll('.btn-isolate').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      window.open(currentUrl, '_blank');
    });
  });
}