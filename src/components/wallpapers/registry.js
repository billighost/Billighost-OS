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
    category: 'gradient',
    description: 'The Billighost default — a quiet blue drift',
    live: null,
    css: `radial-gradient(ellipse 120% 80% at 20% 10%, rgba(126,184,255,0.16) 0%, transparent 55%),
          radial-gradient(ellipse 100% 70% at 85% 85%, rgba(167,139,250,0.14) 0%, transparent 55%),
          linear-gradient(160deg, #070910 0%, #0a0d18 45%, #05060b 100%)`,
  },
  {
    id: 'rain',
    name: 'Rainfall & Thunder',
    category: 'live',
    description: 'Rain lands on windows and taskbar, with occasional lightning strikes & thunder audio',
    live: 'rain',
    css: `radial-gradient(ellipse 140% 90% at 50% 0%, rgba(90,120,170,0.20) 0%, transparent 60%),
          linear-gradient(170deg, #0a1018 0%, #070c14 50%, #04070c 100%)`,
  },
  {
    id: 'aurora',
    name: 'Aurora Drift',
    category: 'live',
    description: 'Slow polar curtains that bend around open windows',
    live: 'aurora',
    css: `radial-gradient(ellipse 120% 70% at 30% 20%, rgba(52,211,153,0.16) 0%, transparent 58%),
          radial-gradient(ellipse 110% 60% at 75% 70%, rgba(126,184,255,0.14) 0%, transparent 58%),
          linear-gradient(165deg, #050a0c 0%, #061016 55%, #03070a 100%)`,
  },
  {
    id: 'inkflow',
    name: 'Ink Flow',
    category: 'live',
    description: 'Luminous ink currents that part where your cursor moves',
    live: 'inkflow',
    css: `radial-gradient(ellipse 100% 80% at 70% 30%, rgba(167,139,250,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 90% 70% at 25% 75%, rgba(126,184,255,0.12) 0%, transparent 55%),
          linear-gradient(150deg, #08070f 0%, #0c0a18 50%, #050409 100%)`,
  },
  {
    id: 'circuit',
    name: 'Circuit Pulse',
    category: 'live',
    description: 'Data pulses travelling a circuit lattice, routing around your windows',
    live: 'circuit',
    css: `radial-gradient(ellipse 110% 80% at 50% 40%, rgba(52,211,153,0.10) 0%, transparent 60%),
          linear-gradient(155deg, #04080a 0%, #060d10 50%, #020506 100%)`,
  },
  {
    id: 'matrix',
    name: 'Matrix Rain',
    category: 'live',
    description: 'Animated stream of luminous jade glyphs falling through digital cyberspace',
    live: 'matrix',
    css: `radial-gradient(ellipse 110% 80% at 50% 50%, #062817 0%, #02120a 50%, #000000 100%)`,
  },
  {
    id: 'starfield',
    name: 'Deep Space Starfield',
    category: 'live',
    description: 'Hyperspeed 3D deep space warp with procedural moving star particles',
    live: 'starfield',
    css: `radial-gradient(ellipse 120% 80% at 50% 50%, #0f172a 0%, #070913 55%, #020307 100%)`,
  },
  {
    id: 'quantum',
    name: 'Quantum Synaptic Mesh',
    category: 'live',
    description: 'Floating energy nodes with real-time neural synaptic connections',
    live: 'quantum',
    css: `radial-gradient(ellipse at 30% 40%, #0d1b2a 0%, #050505 50%),
          radial-gradient(ellipse at 70% 60%, #1a0a2e 0%, transparent 50%)`,
  },
  {
    id: 'cyber-pulse',
    name: 'Cyber Neon Horizon',
    category: 'live',
    description: 'Pulsing synthwave vector wireframe grid receding to infinity',
    live: 'cyber-pulse',
    css: `radial-gradient(circle at 50% 30%, #311042 0%, #100520 45%, #05020a 100%)`,
  },
  {
    id: 'nebula',
    name: 'Nebula',
    category: 'gradient',
    description: 'Deep space colour field, no motion',
    live: null,
    css: `radial-gradient(ellipse 90% 70% at 25% 25%, rgba(121,40,202,0.28) 0%, transparent 55%),
          radial-gradient(ellipse 80% 60% at 75% 70%, rgba(0,243,255,0.18) 0%, transparent 55%),
          radial-gradient(ellipse 70% 60% at 55% 45%, rgba(255,0,127,0.14) 0%, transparent 55%),
          linear-gradient(160deg, #06040f 0%, #0a0618 50%, #030209 100%)`,
  },
  {
    id: 'obsidian-flow',
    name: 'Obsidian Flow',
    category: 'gradient',
    description: 'Dark mineral tones tailored for extended low-light focus',
    live: null,
    css: `linear-gradient(135deg, #090a0f 0%, #111422 50%, #050608 100%)`,
  },
  {
    id: 'quantum-aurora',
    name: 'Quantum Aurora',
    category: 'gradient',
    description: 'Emerald atmospheric glow reminiscent of polar ionospheric waves',
    live: null,
    css: `radial-gradient(ellipse at top left, #064e3b 0%, #022c22 30%, #020617 70%)`,
  },
  {
    id: 'crimson-noir',
    name: 'Crimson Noir',
    category: 'gradient',
    description: 'Sleek luxury crimson dark mode with velvet deep accents',
    live: null,
    css: `radial-gradient(circle at 50% 30%, #4c0519 0%, #1f0208 40%, #050505 90%)`,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'minimal',
    description: 'Near-black, for maximum focus',
    live: null,
    css: `linear-gradient(170deg, #0a0a0d 0%, #070709 60%, #050506 100%)`,
  },
];

export function getWallpaper(id) {
  return WALLPAPERS.find(w => w.id === id) || WALLPAPERS[0];
}

export const LIVE_WALLPAPER_IDS = WALLPAPERS.filter(w => w.live).map(w => w.id);
