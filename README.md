# AutoLighthouse Dual Auditor (Desktop + Mobile)

A production-ready **Chrome Extension (Manifest V3)** paired with a lightweight **Local Node.js Lighthouse Engine** (`http://localhost:9876`) that runs official Google Lighthouse audits for **Desktop and Mobile** sequentially in one click, displays live side-by-side circular score gauges, and automatically downloads **Raw JSON**, **Official HTML**, and **AI-Ready Compact Diagnostic Reports (`.ai.json` & `.ai.md`)**.

---

## 📁 Project Structure

```text
Performane/
├── start-server.bat              # 1-click Windows launcher for the Local Lighthouse Server
├── README.md                     # Step-by-step setup & usage guide
├── server/                       # Local Node.js Lighthouse Engine (localhost:9876)
│   ├── package.json
│   ├── server.js                 # Express API (/api/health, /api/status, /api/audit)
│   ├── ai-formatter.js           # Strips LHR bloat into AI-Ready JSON & Markdown
│   └── start-server.bat          # Launcher inside server/
└── extension/                    # Chrome Extension (Manifest V3 - Load Unpacked)
    ├── manifest.json
    ├── background.js             # MV3 Service Worker (downloads & status badges)
    ├── popup.html                # Dark-mode popup interface
    ├── popup.css                 # Modern styling & SVG circular score gauges
    ├── popup.js                  # Auto URL detection, streaming client, PSI fallback
    ├── icon16.png
    ├── icon48.png
    ├── icon128.png
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

---

## 🚀 Step 1: Load the Unpacked Extension into Chrome

1. Open Google Chrome and navigate to:
   ```text
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the **`extension`** folder inside this project:
   ```text
   d:\Coding\Extention\Performane\extension
   ```
5. Click the **Extensions (puzzle piece)** icon in the Chrome toolbar and **Pin** **AutoLighthouse Dual Auditor (Desktop + Mobile)** for quick 1-click access.

---

## ⚡ Step 2: Start the Local Lighthouse Engine

To audit `http://localhost:*` development servers or run full local headless Chrome audits:

### Option A: Double-Click Launcher (Windows)
- Double-click **`start-server.bat`** in the project root (or inside `server/start-server.bat`).
- A terminal window will open and start the server at `http://localhost:9876`.

### Option B: Command Line (`npm start`)
```bash
cd server
npm install
npm start
```

When running, the extension popup's top-right badge will show a glowing green **Local Engine: Online** status indicator.

> **Cloud Fallback Mode (Zero-Server Mode):**
> If the local server (`localhost:9876`) is offline and you are auditing a public `https://` website, the extension automatically falls back to the **Google PageSpeed Insights REST API v5** (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`) so you can still run Desktop + Mobile audits and generate AI-Ready reports without starting the local server.

---

## 🎯 Step 3: Run a 1-Click Dual Audit & Auto-Download Reports

1. Navigate to any website (`http://localhost:3000`, `http://127.0.0.1:5173`, or `https://example.com`) and click the **AutoLighthouse** extension icon.
2. **Target URL:** The active tab's URL is automatically detected. You can also edit the URL field manually or click **Use Active Tab**.
3. **Device Selection:**
   - **Both (Auto-Sequence)** *(Default)*: Sequentially runs a clean Desktop audit (`1350×940` desktop config) followed by a clean Mobile audit (`Moto G4 / Slow 4G` config) in isolated headless Chrome instances (`--headless=new --no-sandbox --incognito --disable-extensions`).
   - **Desktop Only** or **Mobile Only**: Runs a single form-factor audit.
4. **Audit Categories:** Toggle **Performance**, **Accessibility**, **Best Practices**, and **SEO**.
5. **Output Formats & Auto-Download:**
   - **AI-Optimized Compact Report** (`<domain>-<timestamp>-combined-ai-report.json` & `.md`): Merges Desktop and Mobile scores, Core Web Vitals (`FCP`, `LCP`, `TBT`, `CLS`, `SI`, `TTI`), all failed audits (`score < 0.9`), top opportunities with wasted bytes/ms, exact failing DOM selectors/snippets, console errors, and CSP issues into a token-efficient file.
   - **Full Lighthouse JSON** (`<domain>-<timestamp>-desktop.json` & `mobile.json`)
   - **Full Lighthouse HTML Report** (`<domain>-<timestamp>-desktop.html` & `mobile.html`)
   - **Auto-Download Toggle**: When enabled, reports are saved automatically to your `Downloads/lighthouse-reports/` folder as soon as the audit finishes.
6. Click **Run Dual Lighthouse Audit**:
   - Watch the live progress bar (`Step 1/2: Running Desktop Audit...` -> `Step 2/2: Running Mobile Audit...` -> `Completed!`).
   - Inspect the side-by-side **Desktop vs. Mobile** circular score gauges (0–49 Red, 50–89 Orange, 90–100 Green) and Core Web Vitals right inside the popup.
   - Click **📋 Copy AI Prompt + Report to Clipboard** to copy an AI engineering prompt along with the full Desktop + Mobile Markdown diagnostic report directly to your clipboard, ready to paste into Antigravity chat!
