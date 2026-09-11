import { useRef, useEffect } from 'react';
import styles from './EntanglementCanvas.module.css';

/**
 * Billighost OS — Quantum Filament Weave
 *
 * Luminous filaments braided around a trefoil-knot core. Because a trefoil
 * is genuinely knotted, the strands cannot be pulled apart — the entanglement
 * is real geometry rather than crossed lines faked in 2D.
 *
 * Timeline (fractions of `duration`):
 *   0.00 – 0.18  spawn    filaments emerge from the singularity
 *   0.14 – 0.70  braid    knot rotates, contact nodes pulse
 *   0.66 – 1.00  unravel  strands fly outward, core flares white
 */

const SAMPLES = 240;      // points along the core curve
const FILAMENTS = 6;      // strands wound around it
const SUBSAMPLE = 6;      // stride used for contact detection
const TWO_PI = Math.PI * 2;

const PALETTE = [
  [255, 255, 255],
  [126, 184, 255],  // --accent-glow
  [167, 139, 250],  // --accent-soft
  [207, 228, 255],
  [126, 184, 255],
  [120, 230, 200],
];

/* ── Curve geometry ───────────────────────────────────────── */

/** Trefoil knot, normalised to roughly unit radius. */
function coreAt(u) {
  return [
    (Math.sin(u) + 2 * Math.sin(2 * u)) / 3,
    (Math.cos(u) - 2 * Math.cos(2 * u)) / 3,
    -Math.sin(3 * u) / 1.4,
  ];
}

function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function norm(a) {
  const m = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / m, a[1] / m, a[2] / m];
}

/**
 * Builds the core curve plus a rotation-minimising frame at each sample.
 *
 * A naive Frenet frame flips wherever curvature vanishes, which would kink
 * the braid. Parallel transport avoids that, but leaves a holonomy mismatch
 * where the closed loop meets itself — so the residual angle is measured and
 * distributed linearly back across the samples.
 */
function buildFrames() {
  const pts = [];
  const tangents = [];
  for (let i = 0; i < SAMPLES; i++) {
    const u = (i / SAMPLES) * TWO_PI;
    pts.push(coreAt(u));
    const du = 0.0015;
    tangents.push(norm(sub(coreAt(u + du), coreAt(u - du))));
  }

  // Seed a normal perpendicular to the first tangent.
  let seed = cross(tangents[0], [0, 0, 1]);
  if (Math.hypot(seed[0], seed[1], seed[2]) < 1e-4) seed = cross(tangents[0], [0, 1, 0]);
  const normals = [norm(seed)];
  const binormals = [norm(cross(tangents[0], normals[0]))];

  for (let i = 1; i < SAMPLES; i++) {
    const T = tangents[i];
    const prev = normals[i - 1];
    // Project the previous normal onto the plane perpendicular to T.
    const projected = norm([
      prev[0] - T[0] * dot(prev, T),
      prev[1] - T[1] * dot(prev, T),
      prev[2] - T[2] * dot(prev, T),
    ]);
    normals.push(projected);
    binormals.push(norm(cross(T, projected)));
  }

  // Holonomy: angle between the transported frame and the seed at closure.
  const closure = Math.atan2(dot(normals[SAMPLES - 1], binormals[0]), dot(normals[SAMPLES - 1], normals[0]));
  for (let i = 0; i < SAMPLES; i++) {
    const a = -closure * (i / (SAMPLES - 1));
    const c = Math.cos(a);
    const s = Math.sin(a);
    const N = normals[i];
    const B = binormals[i];
    normals[i] = [N[0] * c + B[0] * s, N[1] * c + B[1] * s, N[2] * c + B[2] * s];
    binormals[i] = [B[0] * c - N[0] * s, B[1] * c - N[1] * s, B[2] * c - N[2] * s];
  }

  return { pts, normals, binormals };
}

/* ── Easing ───────────────────────────────────────────────── */
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInExpo = (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));

export default function EntanglementCanvas({ duration = 3800, onComplete, fading = false }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const nodesRef = useRef([]);
  const motesRef = useRef([]);
  const frameRef = useRef(0);
  const doneRef = useRef(false);
  const completeRef = useRef(onComplete);

  // Kept in an effect: assigning refs during render is unsafe under
  // concurrent rendering, which may render without committing.
  useEffect(() => {
    completeRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const { pts, normals, binormals } = buildFrames();

    // Drifting dust so the empty space still reads as volume.
    motesRef.current = Array.from({ length: 70 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: Math.random(),
      r: 0.3 + Math.random() * 1.1,
      vx: (Math.random() - 0.5) * 0.00018,
      vy: (Math.random() - 0.5) * 0.00018,
      tw: Math.random() * TWO_PI,
    }));

    // Reused scratch buffers — avoids allocating 1440 arrays per frame.
    const sx = new Float32Array(SAMPLES * FILAMENTS);
    const sy = new Float32Array(SAMPLES * FILAMENTS);
    const sd = new Float32Array(SAMPLES * FILAMENTS);

    if (reduced) {
      // Motion-sensitive users get a calm static bloom instead of the weave.
      const cx = width / 2;
      const cy = height / 2;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.3);
      g.addColorStop(0, 'rgba(207, 228, 255, 0.5)');
      g.addColorStop(0.4, 'rgba(126, 184, 255, 0.18)');
      g.addColorStop(1, 'rgba(126, 184, 255, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
      const timer = setTimeout(() => completeRef.current?.(), 900);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', resize);
      };
    }

    startRef.current = performance.now();

    const render = () => {
      const elapsed = performance.now() - startRef.current;
      const t = clamp01(elapsed / duration);
      frameRef.current++;

      const pSpawn = easeOutExpo(clamp01(t / 0.18));
      const pBraid = easeInOut(clamp01((t - 0.14) / 0.56));
      const pUnravel = clamp01((t - 0.66) / 0.34);
      const unravelE = easeInExpo(pUnravel);

      const cx = width / 2;
      const cy = height / 2;
      const baseScale = Math.min(width, height) * 0.26;
      const scale = baseScale * (0.22 + 0.78 * pSpawn) * (1 + unravelE * 1.5);
      const persp = 3.4;

      // Knot tumbles slowly, then spins up as it comes apart.
      const spin = elapsed / 1000;
      const angY = spin * 0.42 + unravelE * 2.4;
      const angX = Math.sin(spin * 0.31) * 0.46 + unravelE * 0.8;
      const cosY = Math.cos(angY);
      const sinY = Math.sin(angY);
      const cosX = Math.cos(angX);
      const sinX = Math.sin(angX);

      // Strand radius: grows in, breathes, then blows outward.
      const ropeR = (0.06 + 0.1 * pSpawn) * (1 + Math.sin(spin * 1.5) * 0.06) + unravelE * 0.55;
      const twistRate = 3 + pBraid * 2 - unravelE * 4;
      const revealCount = Math.max(2, Math.floor(SAMPLES * clamp01(t / 0.16)));

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      /* ── Project every filament point ── */
      for (let f = 0; f < FILAMENTS; f++) {
        const phase = (f / FILAMENTS) * TWO_PI;
        for (let i = 0; i < SAMPLES; i++) {
          const u = (i / SAMPLES) * TWO_PI;
          const phi = u * twistRate + phase;
          const cp = Math.cos(phi);
          const spp = Math.sin(phi);
          const P = pts[i];
          const N = normals[i];
          const B = binormals[i];

          // Point on the rope surface around the knot core.
          const x = P[0] + ropeR * (cp * N[0] + spp * B[0]);
          const y = P[1] + ropeR * (cp * N[1] + spp * B[1]);
          const z = P[2] + ropeR * (cp * N[2] + spp * B[2]);

          // Rotate Y then X.
          const x1 = x * cosY + z * sinY;
          const z1 = -x * sinY + z * cosY;
          const y1 = y * cosX - z1 * sinX;
          const z2 = y * sinX + z1 * cosX;

          const d = persp / (persp + z2);
          const idx = f * SAMPLES + i;
          sx[idx] = cx + x1 * scale * d;
          sy[idx] = cy + y1 * scale * d;
          sd[idx] = d;
        }
      }

      /* ── Contact nodes: strands touching in screen space ── */
      if (frameRef.current % 4 === 0 && pUnravel < 0.5 && nodesRef.current.length < 26) {
        const threshold = 9;
        for (let f = 0; f < FILAMENTS; f++) {
          for (let g = f + 1; g < FILAMENTS; g++) {
            for (let i = 0; i < revealCount; i += SUBSAMPLE) {
              const ai = f * SAMPLES + i;
              for (let j = 0; j < revealCount; j += SUBSAMPLE) {
                const bj = g * SAMPLES + j;
                const dx = sx[ai] - sx[bj];
                const dy = sy[ai] - sy[bj];
                if (dx * dx + dy * dy < threshold * threshold) {
                  // Only when they are genuinely at different depths — a real crossing.
                  if (Math.abs(sd[ai] - sd[bj]) > 0.035) {
                    nodesRef.current.push({
                      x: (sx[ai] + sx[bj]) / 2,
                      y: (sy[ai] + sy[bj]) / 2,
                      life: 0,
                      max: 34 + Math.random() * 26,
                      hue: Math.random() < 0.5 ? 1 : 2,
                    });
                  }
                  break;
                }
              }
            }
          }
        }
      }

      /* ── Filaments: wide glow pass, then bright core ── */
      const chunk = 6;
      for (let f = 0; f < FILAMENTS; f++) {
        const [r, g, b] = PALETTE[f % PALETTE.length];
        const fade = 1 - unravelE * 0.85;

        for (let pass = 0; pass < 2; pass++) {
          for (let i = 0; i < revealCount - 1; i += chunk) {
            const end = Math.min(i + chunk, revealCount - 1);
            let depth = 0;
            for (let k = i; k <= end; k++) depth += sd[f * SAMPLES + k];
            depth /= (end - i + 1);

            // Depth 1.0 ≈ at the core plane; higher is nearer the camera.
            const near = clamp01((depth - 0.72) / 0.62);
            const w = pass === 0 ? (1.1 + near * 5.2) : (0.45 + near * 1.5);
            const a = (pass === 0 ? 0.055 + near * 0.1 : 0.32 + near * 0.5) * fade;
            if (a <= 0.002) continue;

            // Slight chromatic split on the glow pass reads as a real lens.
            const rr = pass === 0 ? Math.min(255, r + 18) : r;
            const bb = pass === 0 ? Math.min(255, b + 26) : b;

            ctx.beginPath();
            ctx.moveTo(sx[f * SAMPLES + i], sy[f * SAMPLES + i]);
            for (let k = i + 1; k <= end; k++) {
              ctx.lineTo(sx[f * SAMPLES + k], sy[f * SAMPLES + k]);
            }
            ctx.strokeStyle = `rgba(${rr | 0}, ${g}, ${bb}, ${a})`;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        }
      }

      /* ── Pulse nodes ── */
      const nodes = nodesRef.current;
      for (let n = nodes.length - 1; n >= 0; n--) {
        const nd = nodes[n];
        nd.life++;
        if (nd.life > nd.max) {
          nodes.splice(n, 1);
          continue;
        }
        const lp = nd.life / nd.max;
        const alpha = Math.sin(lp * Math.PI) * (1 - unravelE);
        const [r, g, b] = PALETTE[nd.hue];

        // Core bloom
        const rad = 2 + lp * 9;
        const grd = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, rad * 2.4);
        grd.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.85})`);
        grd.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${alpha * 0.45})`);
        grd.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, rad * 2.4, 0, TWO_PI);
        ctx.fill();

        // Expanding contact ring
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, 3 + lp * 22, 0, TWO_PI);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha * 0.3 * (1 - lp)})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      /* ── Dust motes ── */
      for (const m of motesRef.current) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.x < 0) m.x += 1; else if (m.x > 1) m.x -= 1;
        if (m.y < 0) m.y += 1; else if (m.y > 1) m.y -= 1;
        m.tw += 0.03;
        const a = (0.1 + Math.abs(Math.sin(m.tw)) * 0.22) * pSpawn * (1 - unravelE * 0.7);
        ctx.beginPath();
        ctx.arc(m.x * width, m.y * height, m.r * (0.5 + m.z), 0, TWO_PI);
        ctx.fillStyle = `rgba(207, 228, 255, ${a})`;
        ctx.fill();
      }

      /* ── Central singularity ── */
      const coreA = (0.16 + pBraid * 0.3) * (1 - clamp01(pUnravel * 1.4)) + unravelE * 0.9;
      if (coreA > 0.004) {
        const cr = Math.min(width, height) * (0.05 + pBraid * 0.05 + unravelE * 0.55);
        const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
        grd.addColorStop(0, `rgba(255, 255, 255, ${coreA * 0.75})`);
        grd.addColorStop(0.25, `rgba(207, 228, 255, ${coreA * 0.35})`);
        grd.addColorStop(0.6, `rgba(126, 184, 255, ${coreA * 0.12})`);
        grd.addColorStop(1, 'rgba(126, 184, 255, 0)');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.globalCompositeOperation = 'source-over';

      /* ── Vignette keeps attention centred ── */
      const vg = ctx.createRadialGradient(cx, cy, Math.min(width, height) * 0.28, cx, cy, Math.max(width, height) * 0.72);
      vg.addColorStop(0, 'rgba(5, 5, 5, 0)');
      vg.addColorStop(1, 'rgba(5, 5, 5, 0.72)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);

      if (t >= 1) {
        if (!doneRef.current) {
          doneRef.current = true;
          completeRef.current?.();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [duration]);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${fading ? styles.fading : ''}`}
      data-testid="entanglement-canvas"
    />
  );
}
