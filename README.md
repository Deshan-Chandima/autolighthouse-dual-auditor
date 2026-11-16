# SiteLens AI — Web Performance & 6-Layer Security Suite

A modern, production-ready **Chrome Extension (Manifest V3)** and lightweight **Local Node.js Engine** (`http://localhost:9876`) that runs official Google Lighthouse audits (Desktop + Mobile), performs deep 6-layer website security scans with site-wide crawling, displays interactive speedometer score gauges, and exports token-optimized **AI-ready diagnostic reports (`.ai.md`, `.ai.json`, `.security.md`, `.security.json`)**.

---

## ✨ Features

### ⚡ 1. Dual Lighthouse Audit (Desktop + Mobile)
- **1-Click Dual Run**: Automatically runs sequential Desktop (`1350×940` desktop preset) and Mobile (`Moto G4 / Slow 4G` preset) audits in clean, isolated headless Chrome instances (`--headless=new --incognito --no-sandbox`).
- **Core Web Vitals Comparison**: Side-by-side metrics for FCP, LCP, TBT, CLS, Speed Index, and TTI.
- **Visual Gauge Dashboard**: Interactive rainbow arc speedometer with dynamic pointer dot and status badges (*Good*, *To improve*, *Needs attention*).
- **Google PageSpeed Insights Fallback**: Audits public `https://` websites seamlessly even if the local server is offline.

### 🛡️ 2. 6-Layer Defensive Website Security Scanner
- **🔒 HTTP Security Headers**: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (Clickjacking), X-Content-Type-Options (nosniff), Referrer-Policy, Permissions-Policy, and COOP.
- **🍪 Cookies & Session Flags**: Audit `HttpOnly`, `Secure`, `SameSite=Strict/Lax`, and cookie prefixes.
- **🔐 SSL/TLS & Transport Security**: HTTPS enforcement, TLS 1.2/1.3 protocol validation, certificate expiration tracking, and Mixed Content detection.
- **🕵️ Sensitive File & Source Map Exposure**: Probes for accidentally exposed `/.env`, `/.git/HEAD`, `/package.json`, `/phpinfo.php`, `/wp-config.php.bak`, and production JavaScript Source Maps (`.js.map`).
- **📦 Client-Side, DOM & Secret Leaks**: Scans for known vulnerable/outdated JS libraries (jQuery, Lodash, Bootstrap, AngularJS, Moment.js), missing Subresource Integrity (`integrity`), insecure HTTP form submissions, reverse tabnabbing (`target="_blank"`), and hardcoded API keys/secrets (`AIza...`, `sk_live_...`, `AKIA...`, `ghp_...`).
- **🌐 CORS & Information Disclosure**: Detects overly permissive wildcard CORS (`Access-Control-Allow-Origin: *`) with credentials, and server version leakage via `Server` and `X-Powered-By` headers.
- **🌐 Site-Wide Crawler**: Choose between **Quick Page Scan** or **Full Site Crawl** across **5, 10 (default), or 25 internal pages**.

### 🤖 3. AI-Optimized Diagnostics & 1-Click Clipboard Prompts
- **Token-Efficient Reports**: Strips megabytes of trace bloat, preserving exact failing DOM selectors, snippets, wasted milliseconds/bytes, console errors, and security issues.
- **📋 Copy AI Fix Prompt**: One click copies a structured engineering prompt + Markdown diagnostic report directly to your clipboard, ready to paste into Antigravity, Claude, ChatGPT, or Cursor for instant code patches.
- **Auto-Download**: Automatically saves `.ai.md`, `.ai.json`, `.security.md`, and `.security.json` to your `Downloads/lighthouse-reports/` folder.

---

## 📁 Project Structure

```text
Performane/
├── start-server.bat              # 1-click Windows launcher for Local Engine (localhost:9876)
├── README.md                     # Step-by-step setup & usage guide
├── server/                       # Local Node.js Engine
│   ├── package.json
│   ├── server.js                 # Express API (/api/health, /api/audit, /api/security-audit)
│   ├── ai-formatter.js           # Generates token-optimized AI Lighthouse reports
│   ├── security-scanner.js       # 6-Layer Security & Site-Wide Crawler Engine
│   └── start-server.bat          # Launcher inside server/
└── extension/                    # Chrome Extension (Manifest V3)
    ├── manifest.json
    ├── background.js             # MV3 Service Worker (downloads & status badges)
    ├── popup.html                # Modern UI with Lighthouse & Security Scanner tabs
    ├── popup.css                 # Segmented controls, speedometer gauge, impact cards
    ├── popup.js                  # Auto URL detection, streaming client & dashboard logic
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Quick Start Guide

### Step 1: Start the Local Engine
Double-click **`start-server.bat`** in the project root, or run via terminal:
```bash
cd server
npm install
npm start
```
The server will start at `http://localhost:9876`. Keep this window open during local audits.

### Step 2: Load the Extension into Google Chrome
1. Open Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** (top-left button).
4. Select the **`extension`** folder:
   ```text
   d:\Coding\Extention\Performane\extension
   ```
5. Pin **SiteLens AI** to your Chrome toolbar for 1-click access.

### Step 3: Run Audits
1. Open any tab (`http://localhost:*` or `https://*`) and click the **SiteLens AI** extension icon.
2. **Speed & Core Web Vitals**: Select `⚡ Lighthouse Audit`, choose device mode (`Dual Run`, `Desktop`, or `Mobile`), and click **Run Dual Lighthouse Audit**.
3. **Security Audit**: Switch to `🛡️ Security Scanner`, select crawl scope (`Full Site Crawl` or `Quick Page Scan`), select crawl depth (`5`, `10`, or `25` pages), and click **Run Security Audit**.
4. View live speedometer scores, inspect category & impact cards, and click **Copy AI Prompt** to paste diagnostic fixes straight into your AI assistant!

---

## 📄 License
MIT License. Built for developers and teams striving for fast, accessible, and secure web applications.
