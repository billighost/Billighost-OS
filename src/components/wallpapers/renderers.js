/**
 * Billighost OS — Live Wallpaper Renderers
 *
 * Each renderer is a factory returning { step, resize, destroy }. The host
 * component owns the canvas and the animation loop; renderers only draw.
 *
 * The interesting part is `obstacles`: a list of the on-screen rectangles of
 * open windows and desktop icons, refreshed by the host. Effects collide
 * with those rects, which is what makes rain land ON your windows rather
 * than behind them.
 */

const TWO_PI = Math.PI * 2;

/** Is (x, y) inside any obstacle? Returns the rect, or null. */
function hitTest(obstacles, x, y) {
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h) return o;
  }
  return null;
}

/** The topmost obstacle surface directly below (x, y), or null. */
function surfaceBelow(obstacles, x, y) {
  let best = null;
  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    if (x >= o.x && x <= o.x + o.w && o.y >= y) {
      if (!best || o.y < best.y) best = o;
    }
  }
  return best;
}

/* ══════════════════════════════════════════════
   RAIN
   Drops fall, land on window/icon surfaces, splash, then trickle down the
   glass as rivulets before evaporating.
   ══════════════════════════════════════════════ */

export function createRain() {
  let W = 0, H = 0;
  let drops = [];
  let splashes = [];
  let rivulets = [];
  let wind = 0;
  let t = 0;

  const DROP_COUNT = () => Math.round((W * H) / 9000);

  const spawnDrop = () => ({
    x: Math.random() * (W + 240) - 120,
    y: -Math.random() * H,
    z: 0.35 + Math.random() * 0.8,              // depth: speed, size, opacity
    len: 8 + Math.random() * 16,
    vy: 0,
  });

  return {
    resize(width, height) {
      W = width;
      H = height;
      const target = DROP_COUNT();
      drops = Array.from({ length: target }, spawnDrop);
      splashes = [];
      rivulets = [];
    },

    step(ctx, obstacles, dt) {
      t += dt;
      // Wind meanders, so the rain is never mechanically vertical.
      wind = Math.sin(t * 0.00013) * 0.9 + Math.sin(t * 0.00041) * 0.35;

      ctx.clearRect(0, 0, W, H);

      /* ── Falling drops ── */
      ctx.lineCap = 'round';
      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];
        d.vy = 560 * d.z;
        const nx = d.x + wind * d.z * 60 * (dt / 1000);
        const ny = d.y + d.vy * (dt / 1000);

        // Landing: the first surface below, or the floor.
        const surface = surfaceBelow(obstacles, nx, d.y);
        const landY = surface ? surface.y : H;

        if (ny >= landY) {
          // Splash where it hit.
          splashes.push({ x: nx, y: landY, life: 0, max: 16 + Math.random() * 10, z: d.z });

          // On a window, some water stays and runs down the glass.
          if (surface && Math.random() < 0.55) {
            rivulets.push({
              x: nx,
              y: landY + 2,
              maxY: surface.y + surface.h,
              vy: 14 + Math.random() * 34,
              life: 0,
              max: 120 + Math.random() * 160,
              w: 0.7 + d.z * 1.2,
              wobble: Math.random() * TWO_PI,
            });
          }

          Object.assign(d, spawnDrop());
          d.y = -20;
          continue;
        }

        d.x = nx;
        d.y = ny;
        if (d.x < -140) d.x += W + 260;
        else if (d.x > W + 140) d.x -= W + 260;

        const alpha = 0.1 + d.z * 0.4;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - wind * d.z * 6, d.y - d.len * d.z);
        ctx.strokeStyle = `rgba(186, 214, 255, ${alpha})`;
        ctx.lineWidth = 0.6 + d.z * 1.1;
        ctx.stroke();
      }

      /* ── Splashes ── */
      for (let i = splashes.length - 1; i >= 0; i--) {
        const s = splashes[i];
        s.life++;
        if (s.life > s.max) { splashes.splice(i, 1); continue; }
        const p = s.life / s.max;
        const r = 1 + p * 9 * s.z;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r, Math.PI, TWO_PI);   // half-ring: a crown, not a bubble
        ctx.strokeStyle = `rgba(200, 224, 255, ${(1 - p) * 0.5 * s.z})`;
        ctx.lineWidth = 0.9;
        ctx.stroke();
      }

      /* ── Rivulets running down the glass ── */
      for (let i = rivulets.length - 1; i >= 0; i--) {
        const r = rivulets[i];
        r.life++;
        r.wobble += 0.09;
        r.vy += 22 * (dt / 1000);              // gravity
        r.y += r.vy * (dt / 1000);

        const done = r.life > r.max || r.y > r.maxY;
        if (done) { rivulets.splice(i, 1); continue; }

        const wobbleX = Math.sin(r.wobble) * 0.7;
        const fade = 1 - (r.life / r.max);

        // Head
        ctx.beginPath();
        ctx.arc(r.x + wobbleX, r.y, r.w * 1.5, 0, TWO_PI);
        ctx.fillStyle = `rgba(196, 220, 255, ${0.4 * fade})`;
        ctx.fill();

        // Trail
        ctx.beginPath();
        ctx.moveTo(r.x + wobbleX, r.y);
        ctx.lineTo(r.x, r.y - 14 - r.vy * 0.12);
        ctx.strokeStyle = `rgba(176, 206, 250, ${0.22 * fade})`;
        ctx.lineWidth = r.w;
        ctx.stroke();
      }

      // Cap the pools so a long session cannot grow unbounded.
      if (splashes.length > 400) splashes.length = 400;
      if (rivulets.length > 260) rivulets.length = 260;
    },

    destroy() {
      drops = [];
      splashes = [];
      rivulets = [];
    },
  };
}

/* ══════════════════════════════════════════════
   AURORA
   Vertical curtains of light that bend away from open windows, as though
   the windows displaced the field.
   ══════════════════════════════════════════════ */

export function createAurora() {
  let W = 0, H = 0;
  let t = 0;
  let bands = [];

  return {
    resize(width, height) {
      W = width;
      H = height;
      bands = [
        { hue: 152, amp: 0.16, speed: 0.00016, phase: 0, yBase: 0.30, thick: 0.16 },
        { hue: 186, amp: 0.13, speed: 0.00022, phase: 2.1, yBase: 0.42, thick: 0.13 },
        { hue: 262, amp: 0.11, speed: 0.00013, phase: 4.2, yBase: 0.52, thick: 0.11 },
      ];
    },

    step(ctx, obstacles, dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      const cols = 68;
      for (const b of bands) {
        ctx.beginPath();
        for (let i = 0; i <= cols; i++) {
          const x = (i / cols) * W;
          const u = i / cols;

          let y = H * b.yBase
            + Math.sin(u * 5.2 + t * b.speed * 1000 + b.phase) * H * b.amp
            + Math.sin(u * 11.4 - t * b.speed * 620 + b.phase) * H * b.amp * 0.38;

          /*
           * Windows displace the curtain: the closer a column is to a
           * window's horizontal span, the further the band is pushed up.
           * This is what makes the aurora look aware of the desktop.
           */
          for (const o of obstacles) {
            const cx = o.x + o.w / 2;
            const d = Math.abs(x - cx);
            const reach = o.w * 0.85;
            if (d < reach) {
              const falloff = 1 - d / reach;
              y -= falloff * falloff * (o.h * 0.22);
            }
          }

          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }

        // Close down the screen so the band can be filled as a curtain.
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, H * (b.yBase - b.thick), 0, H * (b.yBase + b.thick * 2.6));
        grad.addColorStop(0, `hsla(${b.hue}, 78%, 62%, 0)`);
        grad.addColorStop(0.28, `hsla(${b.hue}, 78%, 62%, 0.16)`);
        grad.addColorStop(0.62, `hsla(${b.hue}, 70%, 52%, 0.07)`);
        grad.addColorStop(1, `hsla(${b.hue}, 70%, 45%, 0)`);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';
    },

    destroy() { bands = []; },
  };
}

/* ══════════════════════════════════════════════
   INK FLOW
   A slow vector field of luminous particles. The cursor pushes them aside;
   windows are solid, so the current routes around them.
   ══════════════════════════════════════════════ */

export function createInkFlow() {
  let W = 0, H = 0;
  let particles = [];
  let t = 0;
  let mouse = { x: -9999, y: -9999 };

  const field = (x, y, time) => {
    // Layered sinusoids: cheap, smooth, and non-repeating enough to read
    // as organic flow rather than a pattern.
    const a = Math.sin(x * 0.0022 + time * 0.00021) + Math.cos(y * 0.0027 - time * 0.00016);
    const b = Math.cos(x * 0.0015 - time * 0.00012) + Math.sin(y * 0.0019 + time * 0.00024);
    return Math.atan2(b, a);
  };

  return {
    resize(width, height) {
      W = width;
      H = height;
      const count = Math.min(720, Math.round((W * H) / 2600));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        px: 0, py: 0,
        life: Math.random() * 420,
        max: 320 + Math.random() * 460,
        hue: Math.random() < 0.5 ? 212 : 268,
        spd: 0.35 + Math.random() * 0.9,
      }));
    },

    setMouse(x, y) { mouse = { x, y }; },

    step(ctx, obstacles, dt) {
      t += dt;

      // Long trails: fade rather than clear.
      ctx.fillStyle = 'rgba(6, 5, 12, 0.085)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      for (const p of particles) {
        p.px = p.x;
        p.py = p.y;

        const ang = field(p.x, p.y, t);
        let vx = Math.cos(ang) * p.spd;
        let vy = Math.sin(ang) * p.spd;

        // Cursor repulsion.
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 22000) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 148) * 2.6;
          vx += (dx / d) * push;
          vy += (dy / d) * push;
        }

        p.x += vx;
        p.y += vy;
        p.life++;

        // Windows are solid: a particle entering one is pushed back out the
        // nearest edge, so the current visibly routes around them.
        const hit = hitTest(obstacles, p.x, p.y);
        if (hit) {
          const toLeft = p.x - hit.x;
          const toRight = hit.x + hit.w - p.x;
          const toTop = p.y - hit.y;
          const toBottom = hit.y + hit.h - p.y;
          const min = Math.min(toLeft, toRight, toTop, toBottom);
          if (min === toLeft) p.x = hit.x - 1;
          else if (min === toRight) p.x = hit.x + hit.w + 1;
          else if (min === toTop) p.y = hit.y - 1;
          else p.y = hit.y + hit.h + 1;
        }

        const outside = p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20;
        if (p.life > p.max || outside) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.life = 0;
          continue;
        }

        const fade = Math.sin((p.life / p.max) * Math.PI);
        ctx.beginPath();
        ctx.moveTo(p.px, p.py);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = `hsla(${p.hue}, 86%, 72%, ${0.2 * fade})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.globalCompositeOperation = 'source-over';
    },

    destroy() { particles = []; },
  };
}

/* ══════════════════════════════════════════════
   CIRCUIT PULSE
   A Manhattan lattice with data pulses travelling it. Traces that would
   cross a window are dimmed, so the circuit appears to route around it.
   ══════════════════════════════════════════════ */

export function createCircuit() {
  let W = 0, H = 0;
  let nodes = [];
  let edges = [];
  let pulses = [];
  let t = 0;
  const GRID = 96;

  return {
    resize(width, height) {
      W = width;
      H = height;
      nodes = [];
      edges = [];
      pulses = [];

      const cols = Math.ceil(W / GRID) + 1;
      const rows = Math.ceil(H / GRID) + 1;

      // Jittered grid — a perfect lattice reads as graph paper.
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          nodes.push({
            x: c * GRID + (Math.random() - 0.5) * 22,
            y: r * GRID + (Math.random() - 0.5) * 22,
            r, c,
          });
        }
      }

      const at = (r, c) => (r >= 0 && c >= 0 && r < rows && c < cols) ? nodes[r * cols + c] : null;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const n = at(r, c);
          const right = at(r, c + 1);
          const down = at(r + 1, c);
          // Sparse: not every neighbour is wired, which looks like a board.
          if (right && Math.random() < 0.62) edges.push({ a: n, b: right });
          if (down && Math.random() < 0.5) edges.push({ a: n, b: down });
        }
      }
    },

    step(ctx, obstacles, dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);

      // Traces, dimmed where they pass under a window.
      ctx.lineWidth = 1;
      for (const e of edges) {
        const mx = (e.a.x + e.b.x) / 2;
        const my = (e.a.y + e.b.y) / 2;
        const covered = !!hitTest(obstacles, mx, my);
        ctx.beginPath();
        ctx.moveTo(e.a.x, e.a.y);
        ctx.lineTo(e.b.x, e.b.y);
        ctx.strokeStyle = covered
          ? 'rgba(52, 211, 153, 0.045)'
          : 'rgba(52, 211, 153, 0.12)';
        ctx.stroke();
      }

      // Nodes
      for (const n of nodes) {
        if (hitTest(obstacles, n.x, n.y)) continue;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.15, 0, TWO_PI);
        ctx.fillStyle = 'rgba(52, 211, 153, 0.3)';
        ctx.fill();
      }

      // Emit pulses along clear traces.
      if (pulses.length < 46 && Math.random() < 0.34) {
        const e = edges[Math.floor(Math.random() * edges.length)];
        if (e) pulses.push({ e, p: 0, spd: 0.0009 + Math.random() * 0.0016 });
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i];
        pu.p += pu.spd * dt;
        if (pu.p >= 1) { pulses.splice(i, 1); continue; }

        const x = pu.e.a.x + (pu.e.b.x - pu.e.a.x) * pu.p;
        const y = pu.e.a.y + (pu.e.b.y - pu.e.a.y) * pu.p;
        if (hitTest(obstacles, x, y)) continue;   // travels under the window, unseen

        const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g.addColorStop(0, 'rgba(180, 255, 225, 0.85)');
        g.addColorStop(0.35, 'rgba(52, 211, 153, 0.4)');
        g.addColorStop(1, 'rgba(52, 211, 153, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, TWO_PI);
        ctx.fill();
      }
    },

    destroy() {
      nodes = [];
      edges = [];
      pulses = [];
    },
  };
}

export const RENDERERS = {
  rain: createRain,
  aurora: createAurora,
  inkflow: createInkFlow,
  circuit: createCircuit,
};
