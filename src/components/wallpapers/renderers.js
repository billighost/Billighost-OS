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

  // ── Lightning Engine ──
  let nextLightningTime = 9000 + Math.random() * 10000;
  let lightningState = null; // { segments: [], branches: [], alpha: 0, life: 0, duration: 360 }

  const DROP_COUNT = () => Math.round((W * H) / 9000);

  const spawnDrop = () => ({
    x: Math.random() * (W + 240) - 120,
    y: -Math.random() * H,
    z: 0.35 + Math.random() * 0.8,              // depth: speed, size, opacity
    len: 8 + Math.random() * 16,
    vy: 0,
  });

  const generateLightning = (intensity = 1.0) => {
    const startX = W * 0.15 + Math.random() * (W * 0.7);
    let curX = startX;
    let curY = 0;
    const targetY = H * (0.65 + Math.random() * 0.3);
    const segments = [];
    const branches = [];

    while (curY < targetY) {
      const stepLen = 14 + Math.random() * 26;
      const angle = (Math.PI / 2) + (Math.random() - 0.5) * 0.95;
      const nx = curX + Math.cos(angle) * stepLen;
      const ny = curY + Math.sin(angle) * stepLen;

      segments.push({
        x1: curX,
        y1: curY,
        x2: nx,
        y2: ny,
        width: Math.max(1.2, (1 - curY / H) * 3.2 * intensity),
      });

      // Branching fork
      if (Math.random() < 0.32 && branches.length < 18) {
        let bX = nx;
        let bY = ny;
        const branchDir = Math.random() < 0.5 ? -1 : 1;
        const branchSteps = 3 + Math.floor(Math.random() * 5);
        for (let b = 0; b < branchSteps; b++) {
          const bAngle = (Math.PI / 2) + branchDir * (0.4 + Math.random() * 0.6);
          const bStepLen = 10 + Math.random() * 18;
          const bNx = bX + Math.cos(bAngle) * bStepLen;
          const bNy = bY + Math.sin(bAngle) * bStepLen;
          branches.push({
            x1: bX,
            y1: bY,
            x2: bNx,
            y2: bNy,
            width: Math.max(0.6, (1 - b / branchSteps) * 1.5 * intensity),
          });
          bX = bNx;
          bY = bNy;
        }
      }

      curX = nx;
      curY = ny;
    }

    lightningState = {
      segments,
      branches,
      alpha: 1.0,
      life: 0,
      duration: 380,
      originX: startX,
      intensity,
    };

    // Notify sound engine
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('billighost:lightning-strike', {
        detail: { intensity }
      }));
    }
  };

  return {
    resize(width, height) {
      W = width;
      H = height;
      const target = DROP_COUNT();
      drops = Array.from({ length: target }, spawnDrop);
      splashes = [];
      rivulets = [];
      lightningState = null;
      nextLightningTime = t + 8000 + Math.random() * 12000;
    },

    strike(intensity = 1.0) {
      generateLightning(intensity);
    },

    step(ctx, obstacles, dt) {
      t += dt;
      // Wind meanders, so the rain is never mechanically vertical.
      wind = Math.sin(t * 0.00013) * 0.9 + Math.sin(t * 0.00041) * 0.35;

      ctx.clearRect(0, 0, W, H);

      /* ── Lightning Timer & Rendering ── */
      if (t > nextLightningTime) {
        generateLightning(0.8 + Math.random() * 0.5);
        nextLightningTime = t + 10000 + Math.random() * 14000;
      }

      if (lightningState) {
        lightningState.life += dt;
        const progress = lightningState.life / lightningState.duration;
        if (progress >= 1) {
          lightningState = null;
        } else {
          // Double-peak flicker envelope: flash -> dip -> spike -> fade
          let flashAlpha = 0;
          if (progress < 0.15) {
            flashAlpha = progress / 0.15 * 0.85;
          } else if (progress < 0.28) {
            flashAlpha = 0.35 + (0.28 - progress) * 1.5;
          } else if (progress < 0.45) {
            flashAlpha = 0.95 * (1 - (progress - 0.28) / 0.17 * 0.4);
          } else {
            flashAlpha = (1 - progress) * 0.55;
          }

          // 1. Sky illumination glow
          ctx.save();
          const skyGlow = ctx.createRadialGradient(
            lightningState.originX, 0, 10,
            lightningState.originX, H * 0.5, W * 0.8
          );
          skyGlow.addColorStop(0, `rgba(200, 225, 255, ${flashAlpha * 0.32})`);
          skyGlow.addColorStop(0.5, `rgba(140, 180, 240, ${flashAlpha * 0.15})`);
          skyGlow.addColorStop(1, 'transparent');
          ctx.fillStyle = skyGlow;
          ctx.fillRect(0, 0, W, H);

          // 2. Main bolt glow + core
          ctx.lineCap = 'round';
          ctx.lineJoin = 'miter';

          // Outer blue-white glow
          ctx.strokeStyle = `rgba(160, 210, 255, ${flashAlpha * 0.55})`;
          for (const s of lightningState.segments) {
            ctx.lineWidth = s.width * 3.4;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
          }

          // Inner brilliant white core
          ctx.strokeStyle = `rgba(255, 255, 255, ${flashAlpha * 0.95})`;
          for (const s of lightningState.segments) {
            ctx.lineWidth = s.width;
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.lineTo(s.x2, s.y2);
            ctx.stroke();
          }

          // Forked branches
          ctx.strokeStyle = `rgba(180, 220, 255, ${flashAlpha * 0.75})`;
          for (const b of lightningState.branches) {
            ctx.lineWidth = b.width;
            ctx.beginPath();
            ctx.moveTo(b.x1, b.y1);
            ctx.lineTo(b.x2, b.y2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }

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
      lightningState = null;
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

export function createMatrix() {
  let W = 0, H = 0;
  let columns = [];
  const GLYPHS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
  const FONT_SIZE = 14;

  return {
    resize(width, height) {
      W = width;
      H = height;
      const colCount = Math.floor(W / FONT_SIZE);
      columns = Array.from({ length: colCount }, (_, i) => ({
        x: i * FONT_SIZE + FONT_SIZE / 2,
        y: Math.random() * -H,
        speed: 150 + Math.random() * 220,
        len: 12 + Math.floor(Math.random() * 18),
        chars: Array.from({ length: 32 }, () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]),
        switchTimer: 0,
      }));
    },

    step(ctx, obstacles, dt) {
      ctx.fillStyle = 'rgba(5, 7, 10, 0.16)';
      ctx.fillRect(0, 0, W, H);

      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';

      for (let i = 0; i < columns.length; i++) {
        const c = columns[i];
        c.y += c.speed * (dt / 1000);
        c.switchTimer += dt;
        if (c.switchTimer > 120) {
          c.switchTimer = 0;
          const idx = Math.floor(Math.random() * c.len);
          c.chars[idx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }

        for (let j = 0; j < c.len; j++) {
          const gy = c.y - j * FONT_SIZE;
          if (gy < -FONT_SIZE || gy > H + FONT_SIZE) continue;

          const covered = !!hitTest(obstacles, c.x, gy);
          if (covered) continue;

          const char = c.chars[j % c.chars.length];
          if (j === 0) {
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#34d399';
            ctx.shadowBlur = 8;
            ctx.fillText(char, c.x, gy);
            ctx.shadowBlur = 0;
          } else {
            const fade = Math.max(0.1, 1 - j / c.len);
            ctx.fillStyle = `rgba(52, 211, 153, ${fade * 0.85})`;
            ctx.fillText(char, c.x, gy);
          }
        }

        if (c.y - c.len * FONT_SIZE > H) {
          c.y = -FONT_SIZE * 2;
          c.speed = 150 + Math.random() * 220;
        }
      }
    },

    destroy() {
      columns = [];
    },
  };
}

export function createStarfield() {
  let W = 0, H = 0;
  let stars = [];
  let mouse = { x: 0, y: 0 };
  const COUNT = 650;
  const DEPTH = 1200;

  return {
    resize(width, height) {
      W = width;
      H = height;
      mouse.x = W / 2;
      mouse.y = H / 2;
      stars = Array.from({ length: COUNT }, () => ({
        x: (Math.random() - 0.5) * W * 2.2,
        y: (Math.random() - 0.5) * H * 2.2,
        z: Math.random() * DEPTH + 1,
        pz: 0,
        color: Math.random() < 0.6 ? '#7eb8ff' : (Math.random() < 0.5 ? '#a78bfa' : '#ffffff'),
      }));
    },

    setMouse(x, y) {
      mouse.x = x;
      mouse.y = y;
    },

    step(ctx, obstacles, dt) {
      ctx.fillStyle = 'rgba(4, 6, 12, 0.22)';
      ctx.fillRect(0, 0, W, H);

      const cx = W / 2 + (mouse.x - W / 2) * 0.08;
      const cy = H / 2 + (mouse.y - H / 2) * 0.08;
      const speed = 750 * (dt / 1000);

      ctx.lineCap = 'round';

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.x = (Math.random() - 0.5) * W * 2.2;
          s.y = (Math.random() - 0.5) * H * 2.2;
          s.z = DEPTH;
          s.pz = DEPTH;
        }

        const k = 320 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        if (hitTest(obstacles, px, py)) continue;

        const pk = 320 / s.pz;
        const ppx = s.x * pk + cx;
        const ppy = s.y * pk + cy;

        const size = Math.max(1, (1 - s.z / DEPTH) * 2.8);
        const alpha = Math.min(1, (1 - s.z / DEPTH) * 1.4);

        ctx.strokeStyle = s.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = size;
        ctx.beginPath();
        ctx.moveTo(ppx, ppy);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },

    destroy() {
      stars = [];
    },
  };
}

export function createQuantum() {
  let W = 0, H = 0;
  let nodes = [];
  let mouse = { x: -9999, y: -9999 };

  return {
    resize(width, height) {
      W = width;
      H = height;
      const count = Math.min(65, Math.max(28, Math.round((W * H) / 22000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 55,
        vy: (Math.random() - 0.5) * 55,
        radius: 1.8 + Math.random() * 2.2,
        hue: Math.random() < 0.5 ? 265 : 210,
        phase: Math.random() * Math.PI * 2,
      }));
    },

    setMouse(x, y) {
      mouse.x = x;
      mouse.y = y;
    },

    step(ctx, obstacles, dt) {
      ctx.clearRect(0, 0, W, H);
      const seconds = dt / 1000;
      const CONNECT_DIST = 135;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx * seconds;
        n.y += n.vy * seconds;
        n.phase += dt * 0.003;

        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 180 && d > 10) {
          n.vx += (dx / d) * 12 * seconds;
          n.vy += (dy / d) * 12 * seconds;
        }

        const hit = hitTest(obstacles, n.x, n.y);
        if (hit) {
          const cx = hit.x + hit.w / 2;
          const cy = hit.y + hit.h / 2;
          if (Math.abs(n.x - cx) > Math.abs(n.y - cy)) {
            n.vx *= -1;
            n.x = n.x < cx ? hit.x - 2 : hit.x + hit.w + 2;
          } else {
            n.vy *= -1;
            n.y = n.y < cy ? hit.y - 2 : hit.y + hit.h + 2;
          }
        }

        if (n.x < 0 || n.x > W) { n.vx *= -1; n.x = Math.max(0, Math.min(W, n.x)); }
        if (n.y < 0 || n.y > H) { n.vy *= -1; n.y = Math.max(0, Math.min(H, n.y)); }
      }

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < CONNECT_DIST) {
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            if (hitTest(obstacles, mx, my)) continue;

            const alpha = (1 - dist / CONNECT_DIST) * 0.38;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (hitTest(obstacles, n.x, n.y)) continue;
        const pulse = Math.sin(n.phase) * 0.4 + 0.8;
        const r = n.radius * pulse;

        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 4.5);
        glow.addColorStop(0, `hsla(${n.hue}, 85%, 75%, 0.8)`);
        glow.addColorStop(0.4, `hsla(${n.hue}, 80%, 65%, 0.35)`);
        glow.addColorStop(1, 'transparent');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 4.5, 0, TWO_PI);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 0.7, 0, TWO_PI);
        ctx.fill();
      }
    },

    destroy() {
      nodes = [];
    },
  };
}

export function createCyberPulse() {
  let W = 0, H = 0;
  let t = 0;

  return {
    resize(width, height) {
      W = width;
      H = height;
    },

    step(ctx, obstacles, dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);

      const horizon = H * 0.44;

      const sunR = Math.min(W, H) * 0.16;
      const sunX = W / 2;
      const sunY = horizon - sunR * 0.35;

      const sunGrad = ctx.createRadialGradient(sunX, sunY, sunR * 0.1, sunX, sunY, sunR * 1.4);
      sunGrad.addColorStop(0, 'rgba(255, 77, 106, 0.9)');
      sunGrad.addColorStop(0.5, 'rgba(192, 132, 252, 0.6)');
      sunGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR * 1.4, 0, TWO_PI);
      ctx.fill();

      const horizGrad = ctx.createLinearGradient(0, horizon, W, horizon);
      horizGrad.addColorStop(0, 'transparent');
      horizGrad.addColorStop(0.5, 'rgba(255, 77, 106, 0.6)');
      horizGrad.addColorStop(1, 'transparent');
      ctx.strokeStyle = horizGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, horizon);
      ctx.lineTo(W, horizon);
      ctx.stroke();

      const gridZSpeed = 0.00035;
      const offsetZ = (t * gridZSpeed) % 1;

      const vLines = 26;
      ctx.strokeStyle = 'rgba(126, 184, 255, 0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= vLines; i++) {
        const u = (i / vLines - 0.5) * 2;
        const xBottom = W / 2 + u * W * 1.2;
        ctx.beginPath();
        ctx.moveTo(W / 2 + u * 15, horizon);
        ctx.lineTo(xBottom, H);
        ctx.stroke();
      }

      const hLines = 16;
      for (let i = 0; i < hLines; i++) {
        const z = (i + offsetZ) / hLines;
        const pz = Math.pow(z, 2.4);
        const y = horizon + pz * (H - horizon);

        const alpha = Math.min(0.65, pz * 0.85);
        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
        ctx.lineWidth = 0.8 + pz * 1.4;

        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
    },

    destroy() {},
  };
}

export const RENDERERS = {
  rain: createRain,
  aurora: createAurora,
  inkflow: createInkFlow,
  circuit: createCircuit,
  matrix: createMatrix,
  starfield: createStarfield,
  quantum: createQuantum,
  'cyber-pulse': createCyberPulse,
};
