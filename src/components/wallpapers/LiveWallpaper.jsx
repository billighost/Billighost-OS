import { useRef, useEffect } from 'react';
import { RENDERERS } from './renderers';
import { WallpaperAudio } from '../../services/wallpaperAudio';
import { LocalSettings } from '../../services/storage/localStorage';
import styles from './LiveWallpaper.module.css';

/**
 * Billighost OS — Live Wallpaper Host
 *
 * Owns the canvas and the animation loop, and — the point of the whole
 * thing — measures where open windows and desktop icons actually are, so
 * effects can collide with them. That is what makes rain land ON a window
 * instead of behind it.
 *
 * Obstacles are re-measured on a timer rather than every frame:
 * getBoundingClientRect() forces layout, and doing that for every window at
 * 60fps is a measurable cost for information that changes only when a
 * window is dragged.
 */

const OBSTACLE_REFRESH_MS = 160;

export default function LiveWallpaper({ effect, paused = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const rendererRef = useRef(null);
  const obstaclesRef = useRef([]);
  const lastTimeRef = useRef(0);
  const lastMeasureRef = useRef(0);

  useEffect(() => {
    if (!effect || !RENDERERS[effect]) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduced) return;   // the static CSS layer beneath is the whole wallpaper

    const renderer = RENDERERS[effect]();
    rendererRef.current = renderer;

    let width = 0;
    let height = 0;

    const resize = () => {
      // Capped at 1.5x: a live wallpaper is a background, and full DPR on a
      // 4K display costs more than it visibly returns.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      renderer.resize(width, height);
    };

    resize();
    window.addEventListener('resize', resize);

    /**
     * Collects the rectangles effects should collide with: open windows and
     * desktop icons. Minimized windows are skipped — they are hidden, so
     * rain landing on them would be rain landing on nothing.
     */
    const measureObstacles = () => {
      const rects = [];

      document.querySelectorAll('[data-testid="os-window"]').forEach((el) => {
        if (el.getAttribute('inert') !== null) return;      // minimized
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        rects.push({ x: r.x, y: r.y, w: r.width, h: r.height, kind: 'window' });
      });

      document.querySelectorAll('[data-desktop-icon]').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        rects.push({ x: r.x, y: r.y, w: r.width, h: r.height, kind: 'icon' });
      });

      // The taskbar is a surface too — rain should pool on it.
      const bar = document.querySelector('[data-taskbar]');
      if (bar) {
        const r = bar.getBoundingClientRect();
        rects.push({ x: r.x, y: r.y, w: r.width, h: r.height, kind: 'taskbar' });
      }

      obstaclesRef.current = rects;
    };
    measureObstacles();

    // Ink flow reacts to the cursor.
    const onMouseMove = (e) => renderer.setMouse?.(e.clientX, e.clientY);
    if (renderer.setMouse) window.addEventListener('mousemove', onMouseMove, { passive: true });

    const loop = (now) => {
      const dt = Math.min(48, now - (lastTimeRef.current || now));   // clamp after a tab switch
      lastTimeRef.current = now;

      if (now - lastMeasureRef.current > OBSTACLE_REFRESH_MS) {
        lastMeasureRef.current = now;
        measureObstacles();
      }

      renderer.step(ctx, obstaclesRef.current, dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Stop entirely when the tab is hidden: an unseen wallpaper should not
    // keep a core warm.
    const onVisibility = () => {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else if (!rafRef.current) {
        lastTimeRef.current = 0;
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Wallpaper Ambient Sound (Rain & Thunder)
    const isRain = effect === 'rain';
    const appSettings = LocalSettings.getAppearance();
    const audioEnabled = appSettings.wallpaperAudio !== false;

    if (isRain && audioEnabled && !paused) {
      WallpaperAudio.startRain();
    } else {
      WallpaperAudio.stopRain(true);
    }

    const onLightningStrike = (e) => {
      if (!isRain || paused) return;
      const currentApp = LocalSettings.getAppearance();
      if (currentApp.wallpaperAudio === false) return;
      const intensity = e.detail?.intensity || 1.0;
      // Schedule thunder with 260ms speed-of-sound acoustic delay
      WallpaperAudio.scheduleThunder(260, intensity);
    };
    window.addEventListener('billighost:lightning-strike', onLightningStrike);

    const onAppearanceChange = (e) => {
      const next = e.detail || {};
      const isNextRain = next.liveWallpaper === 'rain' || (next.wallpaper === 'rain' && !next.customWallpaperData);
      if (!isNextRain) {
        WallpaperAudio.stopRain(true);
      } else if (isRain) {
        if (next.wallpaperAudio === false) {
          WallpaperAudio.stopRain(true);
        } else if (next.wallpaperAudio !== false && !paused) {
          WallpaperAudio.startRain();
        }
      }
    };
    window.addEventListener('billighost:appearance-change', onAppearanceChange);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('billighost:lightning-strike', onLightningStrike);
      window.removeEventListener('billighost:appearance-change', onAppearanceChange);
      document.removeEventListener('visibilitychange', onVisibility);
      WallpaperAudio.stopRain(true);
      renderer.destroy?.();
      rendererRef.current = null;
    };
  }, [effect]);

  // Honour an explicit pause (e.g. battery saver) without tearing down.
  useEffect(() => {
    if (paused || effect !== 'rain') {
      WallpaperAudio.stopRain(true);
    } else if (effect === 'rain') {
      const appSettings = LocalSettings.getAppearance();
      if (appSettings.wallpaperAudio !== false) {
        WallpaperAudio.startRain();
      }
    }
    if (!paused || !rafRef.current) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, [paused, effect]);

  if (!effect || !RENDERERS[effect]) return null;

  return <canvas ref={canvasRef} className={styles.canvas} data-live-wallpaper={effect} aria-hidden="true" />;
}
