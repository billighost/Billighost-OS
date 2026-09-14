/**
 * Window size tiers.
 *
 * A tier is a *contract about layout*, not a breakpoint: `micro` means "one
 * job only", `wide` means "a side panel may default open". Apps switch
 * component trees on it, so it has to be stable — a window dragged to sit
 * exactly on a threshold must not flicker between two layouts, which is what
 * the hysteresis deadband is for.
 *
 * Both axes matter. A 1200x200 window has width to spare but cannot stack
 * anything, so it is `micro` — classifying on width alone is what produces a
 * "wide" layout crushed into 200px of height.
 */

/** Minimum size to *qualify* for each tier. Ordered smallest to largest. */
export const TIER_FLOORS = [
  { name: 'micro',   w: 0,   h: 0   },
  { name: 'compact', w: 300, h: 210 },
  { name: 'regular', w: 540, h: 400 },
  { name: 'wide',    w: 920, h: 560 },
];

export const TIER_ORDER = TIER_FLOORS.map(f => f.name);

/** Extra px required to cross a boundary, so a resize cannot thrash. */
export const HYSTERESIS = 12;

/**
 * @param {number} w  window width in px
 * @param {number} h  window height in px
 * @param {string|null} prev  tier reported last time, or null on first measure
 */
export function computeTier(w, h, prev = null) {
  const width = Number.isFinite(w) ? w : 0;
  const height = Number.isFinite(h) ? h : 0;
  const prevIdx = prev ? TIER_ORDER.indexOf(prev) : -1;

  for (let i = TIER_FLOORS.length - 1; i > 0; i--) {
    const floor = TIER_FLOORS[i];
    /*
     * Growing into a bigger tier must clear the floor by HYSTERESIS; shrinking
     * out of the current one must fall HYSTERESIS below it. With no previous
     * tier (the first measurement) the floor applies exactly, so a window does
     * not open one tier below what its size deserves.
     */
    let pad = 0;
    if (prevIdx !== -1) pad = i > prevIdx ? HYSTERESIS : -HYSTERESIS;
    if (width >= floor.w + pad && height >= floor.h + pad) return floor.name;
  }
  return TIER_FLOORS[0].name;
}

/** True when `tier` is at least as large as `min`. */
export function atLeast(tier, min) {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}
