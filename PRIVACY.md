# Privacy Policy — SiteLens AI

**Last Updated:** November 20, 2026  
**Extension Name:** SiteLens AI — Speed, Security & Responsive Suite  
**Repository:** https://github.com/Deshan-Chandima/sitelens-ai

---

## 1. Overview
SiteLens AI is a developer utility Chrome Extension for web performance auditing (Google Lighthouse), defensive website security analysis, and multi-device responsive viewport testing. We are committed to user privacy: **SiteLens AI does not collect, sell, rent, or track personal user data or browsing history.**

---

## 2. Data We Process (Only On Explicit User Action)
SiteLens AI **never** runs background tracking or passive URL monitoring. Data is only processed when you explicitly click a button in the extension:

1. **Active Tab URL:**  
   Read solely when you open the popup or click **Active Tab** so we can pre-fill the target URL input box for your audit or responsive preview.
2. **Performance Audits (Lighthouse):**
   - If you run the **Local Engine (`localhost:9876`)**, audits execute entirely on your own computer. No external server receives your URL or results.
   - If you use **Google PageSpeed Insights (PSI Cloud Fallback)** on a public URL, the target URL is sent directly to Google's public PageSpeed Insights API (`https://www.googleapis.com/pagespeedonline/v5/runPagespeed`) subject to [Google's Privacy Policy](https://policies.google.com/privacy).
3. **Security Audits:**
   - Performed either directly in your browser (browser fallback), on your own `localhost:9876` engine, or on a custom Cloud API endpoint you explicitly configure in settings.
   - Security scan requests are stateless; URLs and audit results are **not** stored in any database or logged for tracking.
4. **Multi-Device Live Responsive Studio:**
   - Runs 100% locally inside your Chrome browser tab.
   - Uses a temporary, **tab-scoped** `declarativeNetRequest` session rule restricted strictly to the active Responsive Studio tab ID (and automatically deleted the moment that tab closes) so websites can render inside preview iframes without affecting normal browsing tabs.
5. **Local Preferences & Cache (`chrome.storage.local` / `localStorage`):**
   - Your audit preferences (selected categories, custom responsive device presets, theme, and most recent audit summary) are stored strictly on your own device using Chrome's local storage.

---

## 3. Data We Do NOT Collect
- No personally identifiable information (name, email, address, phone).
- No background browsing history, keystrokes, cookies, or session tokens.
- No third-party analytics, ad trackers, or telemetry beacons.

---

## 4. Permissions Explanation
- `activeTab` & `tabs`: Pre-fills the active tab's URL on request and opens the fullscreen Responsive Studio tab.
- `storage`: Persists your audit configuration and custom device presets locally.
- `downloads`: Exports diagnostic reports (`.ai.md`, `.ai.json`, `.security.md`, `.security.json`, `.html`) to your Downloads folder when requested.
- `clipboardWrite`: Copies AI fix prompts and diagnostic reports when you click the **Copy** button.
- `declarativeNetRequest`: Registers a temporary, tab-scoped session rule exclusively for the Responsive Studio tab so preview frames can display sites that set `X-Frame-Options` or `frame-ancestors`. Normal tabs are never modified.

---

## 5. Contact
For privacy questions or security disclosures, open an issue at:  
https://github.com/Deshan-Chandima/sitelens-ai/issues
