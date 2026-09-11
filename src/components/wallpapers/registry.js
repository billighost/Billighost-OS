/**
 * Billighost OS — Wallpaper Registry
 *
 * One place describing every backdrop: its name, its static CSS (used for
 * thumbnails, for the setup preview, and as the base layer under a live
 * effect), and — for live wallpapers — which renderer drives it.
 *
 * Static entries are pure CSS so they cost nothing. Live entries pair that
 * CSS with a canvas renderer in ./renderers.
 */

export const WALLPAPERS = [
  {
    id: 'default',
    name: 'Deep Field',
    description: 'The Billighost default — a quiet blue drift',
    live: null,
    css: `radial-gradient(ellipse 120% 80% at 20% 10%, rgba(126,184,255,0.16) 0%, transparent 55%),
          radial-gradient(ellipse 100% 70% at 85% 85%, rgba(167,139,250,0.14) 0%, transparent 55%),
          linear-gradient(160deg, #070910 0%, #0a0d18 45%, #05060b 100%)`,
  },
  {
    id: 'rain',
    name: 'Rainfall',
    description: 'Rain that lands on your windows and desktop icons, then runs down the glass',
    live: 'rain',
    css: `radial-gradient(ellipse 140% 90% at 50% 0%, rgba(90,120,170,0.20) 0%, transparent 60%),
          linear-gradient(170deg, #0a1018 0%, #070c14 50%, #04070c 100%)`,
  },
  {
    id: 'aurora',
    name: 'Aurora Drift',
    description: 'Slow polar curtains that bend around open windows',
    live: 'aurora',
    css: `radial-gradient(ellipse 120% 70% at 30% 20%, rgba(52,211,153,0.16) 0%, transparent 58%),
          radial-gradient(ellipse 110% 60% at 75% 70%, rgba(126,184,255,0.14) 0%, transparent 58%),
          linear-gradient(165deg, #050a0c 0%, #061016 55%, #03070a 100%)`,
  },
  {
    id: 'inkflow',
    name: 'Ink Flow',
    description: 'Luminous ink currents that part where your cursor moves',
    live: 'inkflow',
    css: `radial-gradient(ellipse 100% 80% at 70% 30%, rgba(167,139,250,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 90% 70% at 25% 75%, rgba(126,184,255,0.12) 0%, transparent 55%),
          linear-gradient(150deg, #08070f 0%, #0c0a18 50%, #050409 100%)`,
  },
  {
    id: 'circuit',
    name: 'Circuit Pulse',
    description: 'Data pulses travelling a circuit lattice, routing around your windows',
    live: 'circuit',
    css: `radial-gradient(ellipse 110% 80% at 50% 40%, rgba(52,211,153,0.10) 0%, transparent 60%),
          linear-gradient(155deg, #04080a 0%, #060d10 50%, #020506 100%)`,
  },
  {
    id: 'nebula',
    name: 'Nebula',
    description: 'Deep space colour field, no motion',
    live: null,
    css: `radial-gradient(ellipse 90% 70% at 25% 25%, rgba(121,40,202,0.28) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 75% 70%, rgba(0,243,255,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 55% 45%, rgba(255,0,127,0.14) 0%, transparent 55%),
          linear-gradient(160deg, #06040f 0%, #0a0618 50%, #030209 100%)`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Near-black, for maximum focus',
    live: null,
    css: `linear-gradient(170deg, #0a0a0d 0%, #070709 60%, #050506 100%)`,
  },
];

export function getWallpaper(id) {
  return WALLPAPERS.find(w => w.id === id) || WALLPAPERS[0];
}

export const LIVE_WALLPAPER_IDS = WALLPAPERS.filter(w => w.live).map(w => w.id);
