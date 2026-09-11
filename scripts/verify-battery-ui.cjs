/**
 * Battery UI accuracy.
 *
 * Headless Chromium FAKES navigator.getBattery() (it reports ~80% charging
 * regardless of hardware), so this overrides the API with known values and
 * asserts the UI reflects exactly what it is given.
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

const CASES = [
  { level: 0.10, charging: false, expect: '10%', tone: 'critical' },
  { level: 0.18, charging: false, expect: '18%', tone: 'warn' },
  { level: 0.81, charging: true,  expect: '81%', tone: 'good' },
  { level: 1.00, charging: true,  expect: '100%', tone: 'good' },
];

(async () => {
  for (const c of CASES) {
    const b = await chromium.launch();
    const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });

    await page.addInitScript(({ level, charging }) => {
      const listeners = {};
      const fake = {
        level, charging,
        chargingTime: charging ? 3600 : Infinity,
        dischargingTime: charging ? Infinity : 7200,
        addEventListener: (t, fn) => { (listeners[t] ||= []).push(fn); },
        removeEventListener: () => {},
      };
      navigator.getBattery = () => Promise.resolve(fake);
    }, c);

    await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
    await seedProfile(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await bootToDesktop(page);
    await page.waitForTimeout(1200);

    const ui = await page.evaluate(() => {
      const tray = document.querySelector('[title^="Battery"]');
      const fill = document.querySelector('[class*=batteryFill]');
      return {
        title: tray?.getAttribute('title'),
        text: tray?.textContent.trim(),
        fillW: fill ? getComputedStyle(fill).width : null,
        trackW: fill ? getComputedStyle(fill.parentElement).width : null,
        fillColor: fill ? getComputedStyle(fill).backgroundColor : null,
      };
    });

    const shows = ui.text === c.expect;
    const pctOfTrack = ui.fillW && ui.trackW
      ? Math.round((parseFloat(ui.fillW) / parseFloat(ui.trackW)) * 100) : null;

    console.log(
      `${String(Math.round(c.level*100)).padStart(3)}% ${c.charging ? 'chg ' : 'dis '}` +
      `→ shows "${ui.text}" ${shows ? '✓' : '✗ expected ' + c.expect}` +
      `  bar=${pctOfTrack}%  ${ui.fillColor}`
    );
    if (!shows) console.log('   title was:', ui.title);

    await b.close();
  }
})();
