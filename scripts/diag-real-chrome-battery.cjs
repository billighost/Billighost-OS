/**
 * Reads the battery through the REAL installed Chrome (channel: 'chrome'),
 * not the bundled Chromium — which fakes navigator.getBattery().
 */
const { chromium } = require('playwright');

(async () => {
  let b;
  try {
    b = await chromium.launch({ channel: 'chrome', headless: false });
  } catch (e) {
    console.log('Could not launch real Chrome:', e.message.split('\n')[0]);
    return;
  }
  const page = await b.newPage();
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });

  const r = await page.evaluate(async () => {
    const out = { hasApi: typeof navigator.getBattery === 'function' };
    if (!out.hasApi) return out;
    try {
      const bat = await navigator.getBattery();
      out.level = bat.level;
      out.pct = Math.round(bat.level * 100);
      out.charging = bat.charging;
      out.chargingTime = bat.chargingTime;
      out.dischargingTime = bat.dischargingTime;
    } catch (e) {
      out.err = String(e);
    }
    return out;
  });
  console.log('REAL Chrome Battery API:', JSON.stringify(r, null, 2));
  await b.close();
})();
