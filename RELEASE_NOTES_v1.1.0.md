# Release Notes — AutoLighthouse Dual Auditor v1.1.0

## 🚀 Overview
**AutoLighthouse Dual Auditor v1.1.0** introduces a ground-up modern UI redesign inspired by contemporary dashboard aesthetics, featuring segmented pill tabs, an interactive rainbow speedometer arc gauge, category impact cards, one-click result clearing, and AI-ready diagnostics for seamless token-efficient debugging.

---

## ✨ What's New in v1.1.0

### 🎨 1. Complete Modern UI Redesign
- **Segmented Pill Controls:** Replaced legacy checkboxes with sleek, elevated pill switches for **Dual Run**, **Desktop**, and **Mobile** modes.
- **Hero Semicircular Speedometer Arc:** An interactive rainbow gradient gauge (`#ef4444` → `#f97316` → `#eab308` → `#10b981`) featuring a dynamic pointer dot tracking exact score placement.
- **Status Tag Pills:** Instant visual status classification:
  - `90–100`: **Good** (Soft Mint)
  - `50–89`: **To improve** (Soft Peach / Amber)
  - `0–49`: **Needs attention** (Soft Coral / Red)
- **Category & Impact Cards:** Stacked card layout with mini circular score indicators, Core Web Vitals summaries, and color-coded impact pills (`High Impact`, `Moderate impact`, `Low Impact`).
- **Target URL Card:** Clean input field with automatic active tab detection and HTTP/HTTPS protocol indicators.
- **High-Contrast Dark Pill Action Button:** Modern `#0f172a` button with subtle hover micro-interactions and elevation.

### 🗑️ 2. One-Click Result Clearing
- Added a dedicated **`🗑️ Clear`** button in the dashboard header.
- Instantly clears all visual gauges, resets Core Web Vitals, removes cached results from `chrome.storage.local`, and resets the extension badge.

### 📊 3. Multi-View Dashboard Switcher
- Switch between **🖥️ Desktop**, **📱 Mobile**, and **📊 Compare** with one click.
- Side-by-side comparison mode for rapid cross-device bottleneck inspection.

### 🤖 4. AI-Ready Compact Diagnostics (`.ai.md` & `.ai.json`)
- Strips multi-megabyte trace bloat while preserving exact failing DOM selectors, snippets, wasted bytes/ms, console errors, and CSP issues.
- **📋 Copy AI Prompt + Report to Clipboard:** Copies pre-formatted engineering prompt + Markdown report directly for Antigravity, Claude, ChatGPT, or Cursor.

### 🌐 5. Dual Engine Architecture (Local + Cloud Fallback)
- **Local Engine (`http://localhost:9876`):** Official Lighthouse runner with isolated headless Chrome (`--headless=new --incognito --no-sandbox`). Audits both `http://localhost:*` and live `https://*` sites.
- **PageSpeed Insights Cloud Fallback:** Automatically audits public sites via Google PageSpeed Insights REST API v5 even if the local server is offline.

---

## 📦 Assets
- `autolighthouse-v1.1.0-extension.zip` — Ready-to-load unpacked Chrome Extension package.
- Full Source Code (zip & tar.gz)

---

## 🛠️ Quick Installation Guide

### Option 1: Load Extension into Chrome
1. Download and extract `autolighthouse-v1.1.0-extension.zip` (or use the `extension/` folder).
2. Open Google Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the extracted folder.
5. Pin the extension to your toolbar.

### Option 2: Start the Local Engine (for localhost auditing)
1. Double-click `start-server.bat` (Windows) or run:
   ```bash
   npm --prefix server install
   npm --prefix server start
   ```
2. The engine listens at `http://localhost:9876`.

---

**Full Changelog**: https://github.com/Deshan-Chandima/autolighthouse-dual-auditor/compare/v1.0.0...v1.1.0
