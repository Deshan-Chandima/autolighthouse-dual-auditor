import express from 'express';
import cors from 'cors';
import lighthouse, { desktopConfig } from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import {
  buildSingleDeviceAiSummary,
  buildCombinedAiReport,
  buildCombinedAiMarkdown
} from './ai-formatter.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 9876;
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

// Track active audit status for live status queries
let activeAuditState = {
  running: false,
  url: null,
  step: 0,
  totalSteps: 0,
  statusText: 'Idle',
  startedAt: null,
  updatedAt: null
};

function updateState(patch) {
  activeAuditState = {
    ...activeAuditState,
    ...patch,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Build accurate official Lighthouse configuration for Desktop vs Mobile (Moto G4 / Slow 4G).
 */
function buildLighthouseConfig(device, categories) {
  const onlyCategories = Array.isArray(categories) && categories.length > 0
    ? categories
    : ['performance', 'accessibility', 'best-practices', 'seo'];

  if (device === 'desktop') {
    // Extend official Lighthouse desktop preset
    return {
      ...desktopConfig,
      settings: {
        ...(desktopConfig?.settings || {}),
        formFactor: 'desktop',
        onlyCategories,
        screenEmulation: {
          mobile: false,
          width: 1350,
          height: 940,
          deviceScaleFactor: 1,
          disabled: false
        },
        throttling: {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0
        }
      }
    };
  }

  // Official Mobile Moto G4 / Slow 4G preset
  return {
    extends: 'lighthouse:default',
    settings: {
      formFactor: 'mobile',
      onlyCategories,
      screenEmulation: {
        mobile: true,
        width: 412,
        height: 823,
        deviceScaleFactor: 1.75,
        disabled: false
      },
      throttling: {
        rttMs: 150,
        throughputKbps: 1.6 * 1024,
        requestLatencyMs: 150 * 3.75,
        downloadThroughputKbps: 1.6 * 1024 * 0.9,
        uploadThroughputKbps: 750 * 0.9,
        cpuSlowdownMultiplier: 4
      },
      emulatedUserAgent:
        'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36'
    }
  };
}

/**
 * Health check endpoint used by the Chrome Extension popup.
 */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    status: 'online',
    service: 'AutoLighthouse Dual Auditor Engine',
    port: PORT,
    activeAudit: activeAuditState
  });
});

app.get('/api/status', (req, res) => {
  res.json(activeAuditState);
});

/**
 * POST /api/audit
 * Body: {
 *   url: string,
 *   devices: ['desktop', 'mobile'],
 *   categories: ['performance', 'accessibility', 'best-practices', 'seo'],
 *   formats: ['json', 'html', 'ai-summary'],
 *   stream?: boolean
 * }
 */
app.post('/api/audit', async (req, res) => {
  const {
    url,
    devices = ['desktop', 'mobile'],
    categories = ['performance', 'accessibility', 'best-practices', 'seo'],
    formats = ['json', 'html', 'ai-summary'],
    stream = false
  } = req.body || {};

  if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    return res.status(400).json({
      ok: false,
      error: 'A valid http:// or https:// URL is required.'
    });
  }

  const targetUrl = url.trim();
  const normalizedDevices = Array.isArray(devices) && devices.length > 0
    ? devices.filter((d) => d === 'desktop' || d === 'mobile')
    : ['desktop', 'mobile'];

  if (normalizedDevices.length === 0) {
    return res.status(400).json({
      ok: false,
      error: 'At least one device ("desktop" or "mobile") must be selected.'
    });
  }

  const wantStream = Boolean(stream) || (req.headers.accept && req.headers.accept.includes('application/x-ndjson'));
  if (wantStream) {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
  }

  const sendProgress = (payload) => {
    updateState(payload);
    if (wantStream && !res.writableEnded) {
      res.write(JSON.stringify({ type: 'progress', ...activeAuditState }) + '\n');
    }
  };

  const timestamp = new Date().toISOString();
  const totalSteps = normalizedDevices.length;

  updateState({
    running: true,
    url: targetUrl,
    step: 0,
    totalSteps,
    statusText: 'Launching isolated headless Chrome...',
    startedAt: timestamp
  });

  const resultsByDevice = {};
  const summariesByDevice = {};

  try {
    for (let i = 0; i < normalizedDevices.length; i++) {
      const device = normalizedDevices[i];
      const stepNumber = i + 1;
      const deviceTitle = device === 'desktop' ? 'Desktop' : 'Mobile';

      sendProgress({
        running: true,
        step: stepNumber,
        totalSteps,
        device,
        statusText: `Running ${deviceTitle} Audit...`
      });

      console.log(`[AutoLighthouse] Step ${stepNumber}/${totalSteps}: Running ${deviceTitle} Audit for ${targetUrl}...`);

      let chrome = null;
      try {
        // Launch fresh isolated headless Chrome instance per device so caches/states never bleed across runs
        chrome = await chromeLauncher.launch({
          chromeFlags: [
            '--headless=new',
            '--no-sandbox',
            '--incognito',
            '--disable-gpu',
            '--disable-extensions',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-networking',
            '--disable-sync',
            '--metrics-recording-only',
            '--disable-default-apps',
            '--mute-audio',
            '--no-first-run',
            '--disable-dev-shm-usage'
          ]
        });

        const lhFlags = {
          logLevel: 'error',
          output: ['json', 'html'],
          port: chrome.port
        };

        const lhConfig = buildLighthouseConfig(device, categories);
        const runnerResult = await lighthouse(targetUrl, lhFlags, lhConfig);

        const lhr = runnerResult.lhr;
        const reports = Array.isArray(runnerResult.report)
          ? runnerResult.report
          : [runnerResult.report];
        const rawJsonReport = reports[0] || JSON.stringify(lhr, null, 2);
        const htmlReport = reports[1] || '';

        const aiSummary = buildSingleDeviceAiSummary(lhr, device);
        summariesByDevice[device] = aiSummary;

        resultsByDevice[device] = {
          device,
          scores: aiSummary.scores,
          coreWebVitals: aiSummary.coreWebVitals,
          aiSummary,
          rawJson: formats.includes('json') ? rawJsonReport : undefined,
          html: formats.includes('html') ? htmlReport : undefined
        };
      } finally {
        if (chrome) {
          try {
            await chrome.kill();
          } catch (killErr) {
            console.warn('[AutoLighthouse] Warning killing Chrome process:', killErr?.message);
          }
        }
      }
    }

    const combinedAiJson = buildCombinedAiReport({
      url: targetUrl,
      timestamp,
      desktopSummary: summariesByDevice.desktop || null,
      mobileSummary: summariesByDevice.mobile || null
    });
    const combinedAiMarkdown = buildCombinedAiMarkdown(combinedAiJson);

    sendProgress({
      running: false,
      step: totalSteps,
      totalSteps,
      statusText: 'Completed'
    });

    console.log(`[AutoLighthouse] Completed audit for ${targetUrl}`);

    const finalPayload = {
      ok: true,
      type: 'result',
      source: 'local-lighthouse',
      url: targetUrl,
      timestamp,
      devices: normalizedDevices,
      categories,
      formats,
      results: resultsByDevice,
      aiReport: {
        json: combinedAiJson,
        markdown: combinedAiMarkdown
      }
    };

    if (wantStream) {
      res.write(JSON.stringify(finalPayload) + '\n');
      res.end();
    } else {
      res.json(finalPayload);
    }
  } catch (error) {
    console.error('[AutoLighthouse] Audit failed:', error);
    updateState({
      running: false,
      statusText: `Error: ${error.message || 'Audit failed'}`
    });

    const errPayload = {
      ok: false,
      type: 'error',
      error: error.message || 'Failed to run Lighthouse audit.'
    };

    if (wantStream) {
      if (!res.writableEnded) {
        res.write(JSON.stringify(errPayload) + '\n');
        res.end();
      }
    } else if (!res.headersSent) {
      res.status(500).json(errPayload);
    }
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log('==============================================================');
  console.log(' 🚀 AutoLighthouse Dual Auditor Engine is ONLINE');
  console.log(` 🌐 Listening at: http://localhost:${PORT}`);
  console.log(` 🩺 Health Check: http://localhost:${PORT}/api/health`);
  console.log(` ⚡ Audit API:    POST http://localhost:${PORT}/api/audit`);
  console.log('==============================================================');
});
