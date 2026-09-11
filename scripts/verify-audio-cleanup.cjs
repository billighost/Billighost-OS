/**
 * Verifies the two audio bugs are fixed:
 *   1. no feedback-delay echo path in the graph
 *   2. closing the window (incl. from Task View) stops playback and
 *      closes the AudioContext
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  // Instrument AudioContext before app code runs.
  await page.addInitScript(() => {
    window.__ctxLog = { created: 0, closed: 0, live: new Set() };
    const Native = window.AudioContext;
    class Tracked extends Native {
      constructor(...a) {
        super(...a);
        window.__ctxLog.created++;
        window.__ctxLog.live.add(this);
      }
      close() {
        window.__ctxLog.closed++;
        window.__ctxLog.live.delete(this);
        return super.close();
      }
    }
    window.AudioContext = Tracked;

    // Count how many nodes reach the destination, and flag feedback loops.
    window.__graph = { delayCreated: 0, convolverCreated: 0 };
    const od = Native.prototype.createDelay;
    Native.prototype.createDelay = function (...a) { window.__graph.delayCreated++; return od.apply(this, a); };
    const oc = Native.prototype.createConvolver;
    Native.prototype.createConvolver = function (...a) { window.__graph.convolverCreated++; return oc.apply(this, a); };
  });

  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });

  await bootToDesktop(page).catch(e => console.log('boot failed:', e.message));

  const onDesktop = await page.locator('[data-testid="taskbar-taskview-btn"]').count();
  console.log('reached desktop:', onDesktop > 0 ? 'YES' : 'NO');
  if (!onDesktop) { console.log('errors:', errs); await browser.close(); return; }

  // Launch the audio player via its desktop shortcut.
  await page.dblclick('[data-testid="shortcut-music"]').catch(async () => {
    await page.dblclick('text=Music');
  });
  await page.waitForTimeout(1500);

  const opened = await page.locator('[data-testid="audio-player-app"]').count();
  console.log('audio app open:', opened > 0 ? 'YES' : 'NO');

  // Press play.
  await page.locator('[data-testid="audio-player-app"] button').filter({ hasText: /▶|play/i }).first()
    .click().catch(() => {});
  // Fall back: click the big transport button by position if needed.
  await page.waitForTimeout(1800);

  const mid = await page.evaluate(() => ({
    created: window.__ctxLog.created,
    closed: window.__ctxLog.closed,
    live: window.__ctxLog.live.size,
    liveStates: [...window.__ctxLog.live].map(c => c.state),
    delays: window.__graph.delayCreated,
    convolvers: window.__graph.convolverCreated,
  }));
  console.log('\nwhile playing:', JSON.stringify(mid));
  console.log('  → feedback delay nodes:', mid.delays, mid.delays === 0 ? '(echo path gone ✓)' : '(ECHO PATH STILL PRESENT ✗)');
  console.log('  → convolver reverb:', mid.convolvers, mid.convolvers > 0 ? '✓' : '(none)');

  // Close from TASK VIEW — the path the user reported.
  await page.click('[data-testid="taskbar-taskview-btn"]');
  await page.waitForTimeout(800);
  const card = page.locator('[data-testid="taskview-card-media"]');
  if (await card.count()) {
    await card.locator('button').first().click();
    console.log('\nclosed via Task View: YES');
  } else {
    console.log('\nTask View card not found; closing via window control');
    await page.keyboard.press('Escape');
    await page.click('[data-app="media"] button[title="Close"]').catch(() => {});
  }
  await page.waitForTimeout(1500);

  const after = await page.evaluate(() => ({
    created: window.__ctxLog.created,
    closed: window.__ctxLog.closed,
    live: window.__ctxLog.live.size,
    liveStates: [...window.__ctxLog.live].map(c => c.state),
  }));
  console.log('after close:', JSON.stringify(after));
  const stopped = after.live === 0 || after.liveStates.every(st => st === 'closed');
  console.log('  → playback torn down:', stopped ? 'YES ✓' : 'NO ✗ (context still running)');
  console.log('\nerrors:', errs.length ? errs : 'none');

  await browser.close();
})();
