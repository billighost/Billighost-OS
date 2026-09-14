import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTier, atLeast, TIER_ORDER } from '../../src/app/sizeTiers.js';

test('tiers are ordered smallest to largest', () => {
  assert.deepEqual(TIER_ORDER, ['micro', 'compact', 'regular', 'wide']);
});

test('classifies by both axes, not just width', () => {
  assert.equal(computeTier(180, 96), 'micro');
  assert.equal(computeTier(400, 300), 'compact');
  assert.equal(computeTier(700, 500), 'regular');
  assert.equal(computeTier(1200, 700), 'wide');
});

test('a wide but very short window is not wide', () => {
  // 1200x200 has plenty of width but cannot lay out rows — height decides.
  assert.equal(computeTier(1200, 200), 'micro');
  assert.equal(computeTier(1200, 380), 'compact');
});

test('hysteresis keeps a window from thrashing on a boundary', () => {
  // Growing past the compact floor (300x210) needs +12px on both axes.
  assert.equal(computeTier(305, 215, 'micro'), 'micro');   // inside deadband
  assert.equal(computeTier(313, 223, 'micro'), 'compact'); // cleared it
  // Shrinking out of compact needs to drop 12px below the floor.
  assert.equal(computeTier(295, 205, 'compact'), 'compact'); // still inside
  assert.equal(computeTier(287, 197, 'compact'), 'micro');   // dropped out
});

test('with no previous tier there is no deadband', () => {
  assert.equal(computeTier(305, 215, null), 'compact');
});

test('atLeast compares tier rank', () => {
  assert.equal(atLeast('regular', 'compact'), true);
  assert.equal(atLeast('compact', 'regular'), false);
  assert.equal(atLeast('wide', 'wide'), true);
});

test('degenerate sizes do not throw', () => {
  assert.equal(computeTier(0, 0), 'micro');
  assert.equal(computeTier(NaN, NaN), 'micro');
});
