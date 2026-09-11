/**
 * Shared harness: boots the OS and signs in to the desktop.
 * Reads the PIN from the hint the PinScreen renders rather than hardcoding.
 */
async function bootToDesktop(page, { timeout = 30000 } = {}) {
  await page.waitForSelector('[data-testid="boot-screen"]', { timeout: 5000 }).catch(() => {});
  // Wait out the staged boot sequence.
  await page.waitForFunction(() => !document.querySelector('[data-testid="boot-screen"]'), null, { timeout });

  // Lock screen → tap anywhere.
  await page.waitForTimeout(400);
  await page.mouse.click(700, 450);
  await page.waitForTimeout(900);

  // PIN screen: lift the PIN out of the on-screen hint, e.g. "Enter PIN (0813)".
  const hint = await page.evaluate(() => document.querySelector('#root')?.innerText || '');
  const m = hint.match(/\((\d{4})\)/);
  const pin = m ? m[1] : '0813';

  // The PIN is four separate controlled <input>s driven by onChange, so
  // keyboard.press() alone does not populate them — type into each box.
  const boxes = page.locator('input');
  const count = await boxes.count();
  if (count >= pin.length) {
    for (let i = 0; i < pin.length; i++) {
      await boxes.nth(i).fill(pin[i]);
      await page.waitForTimeout(90);
    }
  } else {
    await page.keyboard.type(pin, { delay: 90 });
  }

  await page.waitForSelector('[data-testid="taskbar-taskview-btn"]', { timeout });
  await page.waitForTimeout(600);
  return pin;
}

module.exports = { bootToDesktop };
