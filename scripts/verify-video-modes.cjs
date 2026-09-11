/**
 * Verifies the video app opens as a player and only reveals editing tools
 * once editing mode is switched on.
 */
const { chromium } = require('playwright');
const { bootToDesktop, seedProfile } = require('./harness.cjs');
const path = require('path');

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5200/', { waitUntil: 'domcontentloaded' });
  await seedProfile(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await bootToDesktop(page);

  await page.dblclick('[data-testid="shortcut-video"]');
  await page.waitForTimeout(1000);
  const app = page.locator('[data-testid="video-editor-app"]');

  const survey = async (label) => {
    const r = await app.evaluate(el => {
      const txt = (sel) => [...el.querySelectorAll(sel)].map(n => n.textContent.trim());
      return {
        mode: el.dataset.mode,
        hasPanel: !!el.querySelector('[class*=panel]'),
        actions: txt('[class*=action]'),
        transport: txt('[class*=tBtn]'),
        stageWidth: Math.round(el.querySelector('[class*=stage]').getBoundingClientRect().width),
      };
    });
    console.log(`${label}:`, JSON.stringify(r, null, 2));
    return r;
  };

  await app.locator('input[type=file]').setInputFiles(path.join(__dirname, 'fixtures', 'sample-video.webm'));
  await page.waitForTimeout(1500);

  const player = await survey('PLAYER mode');

  await page.click('[data-testid="video-edit-toggle"]');
  await page.waitForTimeout(600);
  const editing = await survey('EDIT mode');

  console.log('\n--- checks ---');
  console.log('opens as player:', player.mode === 'player' ? '✓' : '✗');
  console.log('no side panel in player mode:', !player.hasPanel ? '✓' : '✗');
  console.log('no Export button in player mode:', !player.actions.some(a => /Export/.test(a)) ? '✓' : '✗');
  console.log('no trim buttons in player mode:', !player.transport.some(t => /In|Out/.test(t)) ? '✓' : '✗');
  console.log('edit mode reveals panel:', editing.hasPanel ? '✓' : '✗');
  console.log('edit mode reveals Export:', editing.actions.some(a => /Export/.test(a)) ? '✓' : '✗');
  console.log('edit mode reveals trim:', editing.transport.some(t => /In|Out/.test(t)) ? '✓' : '✗');
  console.log('stage wider in player mode:', player.stageWidth > editing.stageWidth ? `✓ (${player.stageWidth} > ${editing.stageWidth})` : '✗');

  await page.screenshot({ path: 'scripts/shots/video-edit-mode.png' });
  console.log('\nerrors:', errs.length ? errs.slice(0,3) : 'none');
  await b.close();
})();
