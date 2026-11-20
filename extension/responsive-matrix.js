/**
 * SiteLens AI - Multi-Device Live Responsive Matrix Controller
 * Supports adding custom devices, editing dimensions, deleting devices, and resetting to defaults.
 */

import { renderIcon, getDeviceIconName } from './icons.js';

const DEFAULT_DEVICE_PRESETS = [
  {
    id: 'iphone-se',
    name: 'iPhone SE (3rd Gen)',
    type: 'mobile',
    category: 'Mobile Small',
    width: 375,
    height: 667,
    iconName: 'smartphone',
    scalePreset: 0.8
  },
  {
    id: 'iphone-15',
    name: 'iPhone 14 / 15 / 16',
    type: 'mobile',
    category: 'Mobile Standard',
    width: 390,
    height: 844,
    iconName: 'smartphone',
    scalePreset: 0.75
  },
  {
    id: 'pixel-7',
    name: 'Pixel 7 / Galaxy S23',
    type: 'mobile',
    category: 'Android Flagship',
    width: 412,
    height: 915,
    iconName: 'smartphone',
    scalePreset: 0.7
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini / 10.2"',
    type: 'tablet',
    category: 'Tablet Portrait',
    width: 768,
    height: 1024,
    iconName: 'tablet',
    scalePreset: 0.6
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro 11"',
    type: 'tablet',
    category: 'Tablet Landscape',
    width: 1024,
    height: 768,
    iconName: 'tablet',
    scalePreset: 0.55
  },
  {
    id: 'laptop-13',
    name: 'Laptop 13" / MacBook',
    type: 'desktop',
    category: 'Laptop',
    width: 1280,
    height: 800,
    iconName: 'laptop',
    scalePreset: 0.48
  },
  {
    id: 'desktop-hd',
    name: 'Desktop Standard',
    type: 'desktop',
    category: 'Desktop',
    width: 1440,
    height: 900,
    iconName: 'monitor',
    scalePreset: 0.45
  }
];

const TIER_META = [
  { key: 'mobile', title: 'Mobile Breakpoints', iconName: 'smartphone' },
  { key: 'tablet', title: 'Tablet Breakpoints', iconName: 'tablet' },
  { key: 'desktop', title: 'Desktop & Laptop Breakpoints', iconName: 'monitor' }
];

// State
let currentDevices = loadDevicesFromStorage();
let currentUrl = 'https://example.com';
let activeFilter = 'all';
let currentGlobalScale = 0.75; // 'auto' | 0.5 | 0.75 | 1.0
let currentLayoutMode = localStorage.getItem('sitelens_layout_mode') || 'rows'; // 'rows' | 'strip'
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
  layoutControl: document.getElementById('layoutControl'),
  filterPills: document.getElementById('filterPills'),
  matrixCanvas: document.getElementById('matrixCanvas'),
  deviceGrid: document.getElementById('deviceGrid'),
  emptyState: document.getElementById('emptyState'),
  emptyResetBtn: document.getElementById('emptyResetBtn'),
  countAll: document.getElementById('countAll'),
  countMobile: document.getElementById('countMobile'),
  countTablet: document.getElementById('countTablet'),
  countDesktop: document.getElementById('countDesktop'),
  // Modal Elements
  btnManageDevices: document.getElementById('btnManageDevices'),
  deviceModalOverlay: document.getElementById('deviceModalOverlay'),
  modalCloseBtn: document.getElementById('modalCloseBtn'),
  btnOpenAddForm: document.getElementById('btnOpenAddForm'),
  btnResetDefaults: document.getElementById('btnResetDefaults'),
  deviceFormWrap: document.getElementById('deviceFormWrap'),
  deviceForm: document.getElementById('deviceForm'),
  formTitle: document.getElementById('formTitle'),
  editDeviceId: document.getElementById('editDeviceId'),
  inputDevName: document.getElementById('inputDevName'),
  selectDevType: document.getElementById('selectDevType'),
  inputDevWidth: document.getElementById('inputDevWidth'),
  inputDevHeight: document.getElementById('inputDevHeight'),
  btnCancelForm: document.getElementById('btnCancelForm'),
  modalDeviceList: document.getElementById('modalDeviceList')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  initUrlFromParams();
  initTheme();
  initDeviceStates();
  applyLayoutMode(currentLayoutMode);
  renderDeviceCounts();
  // Register tab-scoped DNR session rule BEFORE rendering iframes (Chrome Web Store compliant)
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ action: 'REGISTER_STUDIO_TAB' });
    }
  } catch (err) {
    console.warn('[SiteLens AI] Studio tab rule registration notice:', err);
  }
  renderDeviceGrid();
  bindEvents();
});

function applyLayoutMode(mode) {
  const norm = mode === 'strip' ? 'strip' : 'rows';
  currentLayoutMode = norm;
  localStorage.setItem('sitelens_layout_mode', norm);

  if (els.deviceGrid) {
    els.deviceGrid.classList.toggle('layout-rows', norm === 'rows');
    els.deviceGrid.classList.toggle('layout-strip', norm === 'strip');
  }
  if (els.matrixCanvas) {
    els.matrixCanvas.classList.toggle('canvas-strip-mode', norm === 'strip');
  }
  if (els.layoutControl) {
    els.layoutControl.querySelectorAll('.seg-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.layout === norm);
    });
  }
}

function loadDevicesFromStorage() {
  try {
    const saved = localStorage.getItem('sitelens_custom_devices');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load custom devices:', err);
  }
  return structuredClone(DEFAULT_DEVICE_PRESETS);
}

function saveDevicesToStorage() {
  try {
    localStorage.setItem('sitelens_custom_devices', JSON.stringify(currentDevices));
  } catch (err) {
    console.warn('Could not save custom devices:', err);
  }
}

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
    els.themeIcon.innerHTML = renderIcon('moon', { size: 14 });
  } else {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
    els.themeIcon.innerHTML = renderIcon('sun', { size: 14 });
  }
  localStorage.setItem('sitelens_theme', theme);
}

function initDeviceStates() {
  for (const dev of currentDevices) {
    if (!deviceStates[dev.id]) {
      deviceStates[dev.id] = {
        width: dev.width,
        height: dev.height,
        isLandscape: dev.width > dev.height
      };
    }
  }
}

function renderDeviceCounts() {
  const mobileCount = currentDevices.filter((d) => d.type === 'mobile').length;
  const tabletCount = currentDevices.filter((d) => d.type === 'tablet').length;
  const desktopCount = currentDevices.filter((d) => d.type === 'desktop').length;

  els.countAll.textContent = currentDevices.length;
  els.countMobile.textContent = mobileCount;
  els.countTablet.textContent = tabletCount;
  els.countDesktop.textContent = desktopCount;
}

function getScaleForDevice(dev) {
  if (currentGlobalScale === 'auto') {
    return dev.scalePreset || (dev.type === 'mobile' ? 0.75 : dev.type === 'tablet' ? 0.6 : 0.48);
  }
  return Number(currentGlobalScale) || 0.75;
}

function calculateAspectRatio(w, h) {
  const ratio = (w / h);
  if (Math.abs(ratio - 9/19.5) < 0.03 || Math.abs(ratio - 19.5/9) < 0.03) return '19.5:9';
  if (Math.abs(ratio - 9/20) < 0.03 || Math.abs(ratio - 20/9) < 0.03) return '20:9';
  if (Math.abs(ratio - 9/16) < 0.03 || Math.abs(ratio - 16/9) < 0.03) return '16:9';
  if (Math.abs(ratio - 3/4) < 0.03 || Math.abs(ratio - 4/3) < 0.03) return '4:3';
  if (Math.abs(ratio - 10/16) < 0.03 || Math.abs(ratio - 16/10) < 0.03) return '16:10';
  return `${Math.round(ratio * 10) / 10}:1`;
}

function computeTierWidthRange(devicesInTier) {
  const widths = devicesInTier.map((d) => (deviceStates[d.id]?.width ?? d.width));
  if (widths.length === 0) return '';
  const minW = Math.min(...widths);
  const maxW = Math.max(...widths);
  return minW === maxW ? `${minW}px` : `${minW}px – ${maxW}px`;
}

function updateTierRangeLabel(tierKey) {
  const rangeEl = document.getElementById(`tierRange-${tierKey}`);
  if (!rangeEl) return;
  const tierDevices = currentDevices.filter((d) => d.type === tierKey);
  rangeEl.textContent = computeTierWidthRange(tierDevices);
}

function createDeviceCardElement(dev) {
  const state = deviceStates[dev.id] || {
    width: dev.width,
    height: dev.height,
    isLandscape: dev.width > dev.height
  };
  deviceStates[dev.id] = state;

  const scale = getScaleForDevice(dev);
  const scaledWidth = Math.round(state.width * scale);
  const scaledHeight = Math.round(state.height * scale);
  const aspect = calculateAspectRatio(state.width, state.height);

  const card = document.createElement('div');
  card.className = `device-card`;
  card.id = `card-${dev.id}`;
  card.dataset.id = dev.id;
  card.dataset.type = dev.type;

  if (activeFilter !== 'all' && dev.type !== activeFilter) {
    card.classList.add('hidden');
  }

  // Top Header of card with Rotate, Reload, Edit, Delete, Isolate actions
  const devIconName = getDeviceIconName(dev);
  const header = document.createElement('div');
  header.className = 'device-header';
  header.innerHTML = `
    <div class="device-title-wrap">
      <div class="device-name-row">
        <span class="device-icon-badge" data-type="${dev.type}">${renderIcon(devIconName, { size: 13 })}</span>
        <span class="device-name">${dev.name}</span>
        <span class="device-aspect-tag">${aspect}</span>
      </div>
      <span class="device-dims" id="dims-${dev.id}">${state.width} × ${state.height} px (${state.isLandscape ? 'Landscape' : 'Portrait'}) • <span class="tabular">${Math.round(scale * 100)}%</span></span>
    </div>
    <div class="device-actions">
      <button type="button" class="device-btn btn-rotate" title="Rotate device orientation" data-id="${dev.id}">${renderIcon('rotateCw', { size: 13 })}</button>
      <button type="button" class="device-btn btn-reload" title="Reload this frame" data-id="${dev.id}">${renderIcon('refreshCw', { size: 13 })}</button>
      <button type="button" class="device-btn btn-edit-device" title="Edit this device" data-id="${dev.id}">${renderIcon('pencil', { size: 13 })}</button>
      <button type="button" class="device-btn btn-delete-device" title="Delete this device" data-id="${dev.id}">${renderIcon('trash2', { size: 13 })}</button>
      <button type="button" class="device-btn btn-isolate" title="Open in separate tab" data-id="${dev.id}">${renderIcon('arrowUpRight', { size: 13 })}</button>
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
  return card;
}

function renderDeviceGrid() {
  els.deviceGrid.innerHTML = '';

  if (currentDevices.length === 0) {
    els.emptyState.classList.remove('hidden');
    return;
  }
  els.emptyState.classList.add('hidden');

  for (const tier of TIER_META) {
    const tierDevices = currentDevices.filter((d) => d.type === tier.key);
    if (tierDevices.length === 0) continue;

    const section = document.createElement('section');
    section.className = 'tier-section';
    section.dataset.tier = tier.key;
    if (activeFilter !== 'all' && activeFilter !== tier.key) {
      section.classList.add('hidden');
    }

    const tierHeader = document.createElement('div');
    tierHeader.className = 'tier-header';
    tierHeader.innerHTML = `
      <span class="tier-icon-box" data-tier="${tier.key}">${renderIcon(tier.iconName, { size: 14 })}</span>
      <h2 class="tier-title">${tier.title}</h2>
      <span class="tier-count-badge tabular">${tierDevices.length}</span>
      <span class="tier-range-pill tabular" id="tierRange-${tier.key}">${computeTierWidthRange(tierDevices)}</span>
      <span class="tier-divider"></span>
    `;

    const row = document.createElement('div');
    row.className = 'tier-devices-row';
    for (const dev of tierDevices) {
      row.appendChild(createDeviceCardElement(dev));
    }

    section.appendChild(tierHeader);
    section.appendChild(row);
    els.deviceGrid.appendChild(section);
  }

  bindCardActionEvents();
}

function updateDeviceCardLayout(devId) {
  const dev = currentDevices.find((d) => d.id === devId);
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

  updateTierRangeLabel(dev.type);
}

function updateAllDeviceScales() {
  for (const dev of currentDevices) {
    updateDeviceCardLayout(dev.id);
  }
}

function rotateDevice(devId) {
  const state = deviceStates[devId];
  if (!state) return;

  const temp = state.width;
  state.width = state.height;
  state.height = temp;
  state.isLandscape = !state.isLandscape;

  updateDeviceCardLayout(devId);
}

function rotateAllDevices() {
  for (const dev of currentDevices) {
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
  for (const dev of currentDevices) {
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

  const newSearch = `?url=${encodeURIComponent(currentUrl)}`;
  window.history.replaceState(null, '', newSearch);

  reloadAllDevices();
}

/* ==========================================================================
   Device Management (Add, Edit, Delete, Reset to Default)
   ========================================================================== */

function openDeviceModal() {
  renderModalDeviceList();
  hideDeviceForm();
  els.deviceModalOverlay.classList.remove('hidden');
}

function closeDeviceModal() {
  els.deviceModalOverlay.classList.add('hidden');
  hideDeviceForm();
}

function showAddDeviceForm() {
  els.formTitle.textContent = 'Add New Device';
  els.editDeviceId.value = '';
  els.inputDevName.value = '';
  els.selectDevType.value = 'mobile';
  els.inputDevWidth.value = '';
  els.inputDevHeight.value = '';
  els.deviceFormWrap.classList.remove('hidden');
  els.inputDevName.focus();
}

function showEditDeviceForm(devId) {
  const dev = currentDevices.find((d) => d.id === devId);
  if (!dev) return;

  els.formTitle.textContent = `Edit Device: ${dev.name}`;
  els.editDeviceId.value = dev.id;
  els.inputDevName.value = dev.name;
  els.selectDevType.value = dev.type;
  els.inputDevWidth.value = dev.width;
  els.inputDevHeight.value = dev.height;

  els.deviceFormWrap.classList.remove('hidden');
  els.inputDevName.focus();
}

function hideDeviceForm() {
  els.deviceFormWrap.classList.add('hidden');
  els.editDeviceId.value = '';
  els.deviceForm.reset();
}

function saveDeviceFromForm() {
  const editId = (els.editDeviceId.value || '').trim();
  const name = (els.inputDevName.value || '').trim();
  const type = els.selectDevType.value;
  const width = parseInt(els.inputDevWidth.value, 10);
  const height = parseInt(els.inputDevHeight.value, 10);

  if (!name || isNaN(width) || isNaN(height) || width < 200 || height < 200) {
    alert('Please enter a valid name and dimensions (min 200px).');
    return;
  }

  const iconName = type === 'mobile' ? 'smartphone' : type === 'tablet' ? 'tablet' : 'monitor';
  const category = type === 'mobile' ? 'Mobile' : type === 'tablet' ? 'Tablet' : 'Desktop';

  if (editId) {
    // Edit existing device
    const idx = currentDevices.findIndex((d) => d.id === editId);
    if (idx !== -1) {
      currentDevices[idx] = {
        ...currentDevices[idx],
        name,
        type,
        category,
        width,
        height,
        iconName
      };
      deviceStates[editId] = {
        width,
        height,
        isLandscape: width > height
      };
    }
  } else {
    // Add new device
    const newId = `dev-${Date.now()}`;
    const newDevice = {
      id: newId,
      name,
      type,
      category,
      width,
      height,
      iconName,
      scalePreset: type === 'mobile' ? 0.75 : type === 'tablet' ? 0.6 : 0.48
    };
    currentDevices.push(newDevice);
    deviceStates[newId] = {
      width,
      height,
      isLandscape: width > height
    };
  }

  saveDevicesToStorage();
  hideDeviceForm();
  renderDeviceCounts();
  renderDeviceGrid();
  renderModalDeviceList();
}

function deleteDevice(devId) {
  if (currentDevices.length <= 1) {
    alert('You must keep at least one device in the matrix.');
    return;
  }

  const dev = currentDevices.find((d) => d.id === devId);
  const name = dev ? dev.name : 'this device';

  if (confirm(`Are you sure you want to delete "${name}"?`)) {
    currentDevices = currentDevices.filter((d) => d.id !== devId);
    delete deviceStates[devId];

    saveDevicesToStorage();
    renderDeviceCounts();
    renderDeviceGrid();
    renderModalDeviceList();
  }
}

function resetDevicesToDefaults() {
  if (confirm('Reset all device presets back to the original 7 defaults? Any custom added devices will be restored.')) {
    currentDevices = structuredClone(DEFAULT_DEVICE_PRESETS);
    deviceStates = {};
    initDeviceStates();

    saveDevicesToStorage();
    renderDeviceCounts();
    renderDeviceGrid();
    renderModalDeviceList();
    hideDeviceForm();
  }
}

function renderModalDeviceList() {
  els.modalDeviceList.innerHTML = '';

  for (const dev of currentDevices) {
    const item = document.createElement('div');
    item.className = 'modal-device-item';
    item.dataset.id = dev.id;

    item.innerHTML = `
      <div class="modal-device-meta">
        <span class="modal-dev-icon-box" data-type="${dev.type}">${renderIcon(getDeviceIconName(dev), { size: 15 })}</span>
        <div>
          <span class="modal-dev-name">${dev.name}</span>
          <span class="modal-dev-dims tabular">${dev.width} × ${dev.height} px</span>
        </div>
        <span class="modal-dev-badge">${dev.category || dev.type}</span>
      </div>
      <div class="modal-dev-actions">
        <button type="button" class="btn-item-action btn-modal-edit" data-id="${dev.id}">${renderIcon('pencil', { size: 12 })}<span>Edit</span></button>
        <button type="button" class="btn-item-action delete-action btn-modal-delete" data-id="${dev.id}">${renderIcon('trash2', { size: 12 })}<span>Delete</span></button>
      </div>
    `;

    els.modalDeviceList.appendChild(item);
  }

  // Bind edit/delete inside modal
  els.modalDeviceList.querySelectorAll('.btn-modal-edit').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showEditDeviceForm(btn.dataset.id);
    });
  });

  els.modalDeviceList.querySelectorAll('.btn-modal-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDevice(btn.dataset.id);
    });
  });
}

/* ==========================================================================
   Event Listeners
   ========================================================================== */

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

  // Layout mode switcher (Tiered Vertical Rows vs Horizontal Strip)
  els.layoutControl?.querySelectorAll('.seg-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      applyLayoutMode(btn.dataset.layout);
    });
  });

  // Filter pills
  els.filterPills.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      els.filterPills.querySelectorAll('.filter-pill').forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter || 'all';

      document.querySelectorAll('.tier-section').forEach((sec) => {
        const tier = sec.dataset.tier;
        const shouldShow = activeFilter === 'all' || tier === activeFilter;
        sec.classList.toggle('hidden', !shouldShow);
      });

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

  // Modal actions
  els.btnManageDevices?.addEventListener('click', () => {
    openDeviceModal();
  });

  els.modalCloseBtn?.addEventListener('click', () => {
    closeDeviceModal();
  });

  els.deviceModalOverlay?.addEventListener('click', (e) => {
    if (e.target === els.deviceModalOverlay) {
      closeDeviceModal();
    }
  });

  els.btnOpenAddForm?.addEventListener('click', () => {
    showAddDeviceForm();
  });

  els.btnCancelForm?.addEventListener('click', () => {
    hideDeviceForm();
  });

  els.deviceForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveDeviceFromForm();
  });

  els.btnResetDefaults?.addEventListener('click', () => {
    resetDevicesToDefaults();
  });

  els.emptyResetBtn?.addEventListener('click', () => {
    resetDevicesToDefaults();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && els.deviceModalOverlay && !els.deviceModalOverlay.classList.contains('hidden')) {
      closeDeviceModal();
    }
  });
}

function bindCardActionEvents() {
  // Individual card action buttons in the grid
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

  // Direct Edit from card
  document.querySelectorAll('.btn-edit-device').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openDeviceModal();
      showEditDeviceForm(btn.dataset.id);
    });
  });

  // Direct Delete from card
  document.querySelectorAll('.btn-delete-device').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDevice(btn.dataset.id);
    });
  });
}
