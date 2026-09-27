import fs from 'node:fs';
import { chromium } from 'playwright';

const BASE_URL = (process.env.SMOKE_BASE_URL || 'https://risetin.co.id').replace(/\/$/, '');
const results = [];
const screenshotsDir = 'smoke-artifacts';
fs.mkdirSync(screenshotsDir, { recursive: true });

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`SMOKE |${ok ? 'PASS' : 'FAIL'}| ${name} | ${detail}`);
}

async function requestCheck(name, path, options = {}, validate = null) {
  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      redirect: 'manual',
      ...options,
    });
    const text = await response.text();
    const validation = validate
      ? validate({ response, text })
      : { ok: response.ok, detail: `HTTP ${response.status}` };
    record(name, Boolean(validation.ok), validation.detail || `HTTP ${response.status}`);
    return { response, text };
  } catch (error) {
    record(name, false, `request error: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

console.log(`Production smoke target: ${BASE_URL}`);

const home = await requestCheck('homepage-current-app', '/', {}, ({ response, text }) => {
  const legacy = /Countdown Timer Expired|PopularFX Theme/i.test(text);
  const current = /Risetin|Technology That Moves Business Forward|Technology & Cyber/i.test(text);
  return {
    ok: response.status === 200 && current && !legacy,
    detail: `HTTP ${response.status}; currentMarker=${current}; legacyMarker=${legacy}`,
  };
});

if (home) {
  const h = home.response.headers;
  const requiredHeaders = [
    ['strict-transport-security', h.get('strict-transport-security')],
    ['content-security-policy', h.get('content-security-policy')],
    ['x-content-type-options', h.get('x-content-type-options')],
    ['referrer-policy', h.get('referrer-policy')],
  ];
  for (const [header, value] of requiredHeaders) {
    record(`security-header:${header}`, Boolean(value), value || 'missing');
  }
}

await requestCheck('route:/assessment', '/assessment', {}, ({ response, text }) => ({
  ok: response.status === 200 && /maturity|assessment/i.test(text),
  detail: `HTTP ${response.status}; marker=${/maturity|assessment/i.test(text)}`,
}));

await requestCheck('route:/contact', '/contact', {}, ({ response, text }) => ({
  ok: response.status === 200 && /contact|inquiry|RFQ/i.test(text),
  detail: `HTTP ${response.status}; marker=${/contact|inquiry|RFQ/i.test(text)}`,
}));

await requestCheck('route:/tools', '/tools', {}, ({ response, text }) => ({
  ok: response.status === 200 && /tools|assessment|security/i.test(text),
  detail: `HTTP ${response.status}; marker=${/tools|assessment|security/i.test(text)}`,
}));

await requestCheck('security.txt', '/.well-known/security.txt', {}, ({ response, text }) => ({
  ok: response.status === 200 && /^Contact:/mi.test(text) && /^Expires:/mi.test(text),
  detail: `HTTP ${response.status}; contact=${/^Contact:/mi.test(text)}; expires=${/^Expires:/mi.test(text)}`,
}));

await requestCheck('admin-unauthenticated-protection', '/admin/leads', {}, ({ response }) => ({
  ok: response.status === 401,
  detail: `HTTP ${response.status}; expected 401`,
}));

await requestCheck(
  'api:assessment-score',
  '/api/assessment/score',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      mode: 'quick',
      profile: {
        companyName: 'RTI Production Smoke Test',
        industry: 'Technology / Digital Platform',
        companySize: 'Test',
        regulated: 'unsure',
        cloudAdoption: 'limited',
        aiAdoption: 'pilot',
      },
      answers: {
        it_strategy_governance_01_it_strategy_business_alignment: 3,
      },
      targets: { it_strategy_governance: 4 },
      evidence: {
        it_strategy_governance_01_it_strategy_business_alignment: false,
      },
    }),
  },
  ({ response, text }) => {
    let success = false;
    try {
      success = JSON.parse(text)?.success === true;
    } catch {}
    return {
      ok: response.status === 200 && success,
      detail: `HTTP ${response.status}; success=${success}; body=${text.slice(0, 180).replace(/\s+/g, ' ')}`,
    };
  },
);

await requestCheck(
  'api:chat',
  '/api/chat',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'Jawab singkat: smoke test RTI.' }],
    }),
  },
  ({ response, text }) => ({
    ok: response.status === 200,
    detail: `HTTP ${response.status}; body=${text.slice(0, 180).replace(/\s+/g, ' ')}`,
  }),
);

await requestCheck(
  'api:security-headers-check',
  '/api/tools/headers-check',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ domain: 'example.com', authorized: true }),
  },
  ({ response, text }) => ({
    ok: response.status === 200,
    detail: `HTTP ${response.status}; body=${text.slice(0, 180).replace(/\s+/g, ' ')}`,
  }),
);

// A missing Turnstile token should be rejected by the new production app.
await requestCheck(
  'api:lead-antibot-enforced',
  '/api/leads',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'production-smoke-test',
      name: 'RTI Production Smoke Test',
      role: 'QA',
      company: 'PT Riset Teknologi Indonesia',
      sector: 'Technology',
      email: 'qa-smoke-test@risetin.co.id',
      needSummary: 'Automated production smoke test. No commercial inquiry.',
      consent: true,
    }),
  },
  ({ response, text }) => ({
    ok: response.status === 400,
    detail: `HTTP ${response.status}; expected anti-bot rejection 400; body=${text.slice(0, 180).replace(/\s+/g, ' ')}`,
  }),
);

let browser;
try {
  browser = await chromium.launch({ headless: true });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const path of ['/', '/assessment', '/contact']) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const consoleErrors = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      try {
        const response = await page.goto(`${BASE_URL}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(1500);
        const metrics = await page.evaluate(() => ({
          title: document.title,
          body: document.body?.innerText?.slice(0, 500) || '',
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          readyState: document.readyState,
        }));
        const noOverflow = metrics.scrollWidth <= metrics.clientWidth + 2;
        const notLegacy = !/Countdown Timer Expired|PopularFX Theme/i.test(metrics.body);
        const ok = response?.status() === 200 && noOverflow && notLegacy;
        record(
          `browser:${viewport.name}:${path}`,
          ok,
          `HTTP ${response?.status()}; overflow=${metrics.scrollWidth - metrics.clientWidth}px; consoleErrors=${consoleErrors.length}; title=${metrics.title}`,
        );
        await page.screenshot({
          path: `${screenshotsDir}/${viewport.name}-${path === '/' ? 'home' : path.slice(1)}.png`,
          fullPage: true,
        });
      } catch (error) {
        record(
          `browser:${viewport.name}:${path}`,
          false,
          error instanceof Error ? error.message : String(error),
        );
      } finally {
        await page.close();
      }
    }
  }

  // Attempt a real RFQ only when the expected current contact form exists and
  // Turnstile provides a token. Otherwise report BLOCKED without fabricating success.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    const response = await page.goto(`${BASE_URL}/contact`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    if (response?.status() !== 200) {
      record('rfq:end-to-end', false, `contact HTTP ${response?.status()}`);
    } else {
      const fullName = page.locator('input[placeholder="e.g. Budi Pratama"]');
      if ((await fullName.count()) === 0) {
        record('rfq:end-to-end', false, 'current RTI RFQ form not found on production');
      } else {
        await fullName.fill('RTI Production Smoke Test');
        await page.locator('input[placeholder="e.g. Head of IT / CISO"]').fill('QA / Production Verification');
        await page.locator('input[placeholder="e.g. Bank Mandiri Sejahtera"]').fill('PT Riset Teknologi Indonesia');
        await page.locator('input[placeholder="name@company.co.id"]').fill('qa-smoke-test@risetin.co.id');
        await page.locator('textarea').fill('Automated production smoke test. This is test data and not a commercial inquiry.');
        await page.locator('input[type="checkbox"]').check();

        const submit = page.getByRole('button', { name: /Submit Formal RFQ Inquiry/i });
        await page.waitForTimeout(12000);
        const disabled = await submit.isDisabled().catch(() => true);
        if (disabled) {
          record('rfq:end-to-end', false, 'BLOCKED: Turnstile did not yield a browser token in CI; no lead was submitted');
        } else {
          const responsePromise = page.waitForResponse(
            (r) => r.url().includes('/api/leads') && r.request().method() === 'POST',
            { timeout: 20000 },
          ).catch(() => null);
          await submit.click();
          const apiResponse = await responsePromise;
          await page.waitForTimeout(1500);
          const successVisible = await page.getByText('Inquiry Received Successfully').isVisible().catch(() => false);
          record(
            'rfq:end-to-end',
            Boolean(apiResponse && apiResponse.status() === 201 && successVisible),
            `API HTTP ${apiResponse?.status() ?? 'no-response'}; successUI=${successVisible}`,
          );
        }
      }
    }
  } catch (error) {
    record('rfq:end-to-end', false, error instanceof Error ? error.message : String(error));
  } finally {
    await page.close();
  }
} catch (error) {
  record('browser-launch', false, error instanceof Error ? error.message : String(error));
} finally {
  await browser?.close();
}

console.log('\n=== SMOKE SUMMARY ===');
for (const item of results) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'}\t${item.name}\t${item.detail}`);
}
const passed = results.filter((item) => item.ok).length;
const failed = results.length - passed;
console.log(`TOTAL=${results.length} PASS=${passed} FAIL=${failed}`);

process.exitCode = failed === 0 ? 0 : 1;
