/**
 * Shared harness: boots the OS and signs in to the desktop.
 * Reads the PIN from the hint the PinScreen renders rather than hardcoding.
 */
async function bootToDesktop(page, { timeout = 30000, pin = '1111' } = {}) {
  await page.waitForSelector('[data-testid="boot-screen"]', { timeout: 5000 }).catch(() => {});
  // Wait out the staged boot sequence.
  await page.waitForFunction(() => !document.querySelector('[data-testid="boot-screen"]'), null, { timeout });

  // Lock screen → tap anywhere.
  await page.waitForTimeout(400);
  await page.mouse.click(700, 450);
  await page.waitForTimeout(900);

  // The PIN is no longer printed on screen (it is chosen during setup), so
  // the caller supplies it. Defaults to the value seedProfile() writes.
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

/**
 * Writes a completed setup into localStorage so tests skip the wizard.
 * Call BEFORE the first navigation that should land on the lock screen.
 */
async function seedProfile(page, opts = {}) {
  const {
    pin = '1111',
    name = 'Test User',
    email = 'test@billighost.dev',
    wallpaper = 'default',
    liveWallpaper = null,
  } = opts;

  await page.evaluate(({ pin, name, email, wallpaper, liveWallpaper }) => {
    localStorage.setItem('billighost_setup', 'complete');
    localStorage.setItem('billighost_user_profile', JSON.stringify({ name, email }));
    localStorage.setItem('billighost_security', JSON.stringify({ pin, autoLockMinutes: 0 }));
    localStorage.setItem('billighost_appearance', JSON.stringify({ wallpaper, liveWallpaper }));
  }, { pin, name, email, wallpaper, liveWallpaper });
}

module.exports = { bootToDesktop, seedProfile };
