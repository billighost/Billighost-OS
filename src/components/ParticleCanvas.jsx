import { useRef, useEffect, useCallback } from 'react';
import styles from './ParticleCanvas.module.css';

/**
 * GPU-accelerated canvas particle system for the Billighost boot screen.
 * Particles spawn from center, flow outward with organic sine paths,
 * then scatter explosively. Loops for the given duration.
 */

const COLORS = [
  'rgba(255, 255, 255, 0.9)',
  'rgba(126, 184, 255, 0.8)',   // --accent-glow
  'rgba(167, 139, 250, 0.7)',   // --accent-soft
  'rgba(52, 211, 153, 0.5)',    // --accent-success
  'rgba(200, 200, 220, 0.6)',
];

class Particle {
  constructor(cx, cy, phase) {
    this.reset(cx, cy, phase);
  }

  reset(cx, cy, phase) {
    this.x = cx;
    this.y = cy;
    this.originX = cx;
    this.originY = cy;

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.3 + Math.random() * 1.8;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0;
    this.maxLife = 120 + Math.random() * 180;
    this.phase = phase;
    this.sineOffset = Math.random() * Math.PI * 2;
    this.sineAmplitude = 0.3 + Math.random() * 1.5;
    this.sineFreq = 0.02 + Math.random() * 0.04;
    this.thickness = 0.4 + Math.random() * 1.8;
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
    this.trail = [];
    this.maxTrail = 8 + Math.floor(Math.random() * 12);
    this.scattered = false;
    this.scatterTime = 0.5 + Math.random() * 0.3;
    this.glowSize = 2 + Math.random() * 6;
    this.dead = false;
  }

  update() {
    this.life++;
    const progress = this.life / this.maxLife;

    if (progress > this.scatterTime && !this.scattered) {
      this.scattered = true;
      const scatterForce = 2 + Math.random() * 4;
      const scatterAngle = Math.atan2(this.y - this.originY, this.x - this.originX) + (Math.random() - 0.5) * 0.8;
      this.vx = Math.cos(scatterAngle) * scatterForce;
      this.vy = Math.sin(scatterAngle) * scatterForce;
    }

    if (this.scattered) {
      this.vx *= 0.97;
      this.vy *= 0.97;
    } else {
      const sineWave = Math.sin(this.life * this.sineFreq + this.sineOffset) * this.sineAmplitude;
      const perpX = -this.vy;
      const perpY = this.vx;
      const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
      this.x += this.vx + (perpX / len) * sineWave * 0.3;
      this.y += this.vy + (perpY / len) * sineWave * 0.3;
    }

    if (this.scattered) {
      this.x += this.vx;
      this.y += this.vy;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    if (progress >= 1) {
      this.dead = true;
    }
  }

  draw(ctx) {
    const progress = this.life / this.maxLife;
    let alpha;
    if (progress < 0.1) {
      alpha = progress / 0.1;
    } else if (progress > 0.7) {
      alpha = 1 - (progress - 0.7) / 0.3;
    } else {
      alpha = 1;
    }

    if (alpha <= 0) return;

    /* Draw trail */
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = this.color.replace(/[\d.]+\)$/, `${alpha * 0.4})`);
      ctx.lineWidth = this.thickness * 0.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    /* Draw head glow */
    ctx.save();
    ctx.globalAlpha = alpha * 0.6;
    ctx.shadowColor = this.color.replace(/[\d.]+\)$/, '0.8)');
    ctx.shadowBlur = this.glowSize;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.thickness, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace(/[\d.]+\)$/, `${alpha})`);
    ctx.fill();
    ctx.restore();
  }
}

export default function ParticleCanvas({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const particlesRef = useRef([]);
  const spawnTimerRef = useRef(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const cx = w / 2;
    const cy = h / 2;

    /* Fade-trail effect instead of full clear */
    ctx.fillStyle = 'rgba(5, 5, 5, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* Spawn new particles in waves */
    spawnTimerRef.current++;
    if (spawnTimerRef.current % 3 === 0) {
      const batchSize = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < batchSize; i++) {
        particlesRef.current.push(
          new Particle(
            cx + (Math.random() - 0.5) * 30,
            cy + (Math.random() - 0.5) * 30,
            spawnTimerRef.current
          )
        );
      }
    }

    /* Cap particle count */
    if (particlesRef.current.length > 300) {
      particlesRef.current = particlesRef.current.slice(-250);
    }

    /* Update and draw */
    particlesRef.current = particlesRef.current.filter((p) => {
      p.update();
      if (p.dead) return false;
      p.draw(ctx);
      return true;
    });

    animRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    /* Clear and start */
    particlesRef.current = [];
    spawnTimerRef.current = 0;
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) {
        cancelAnimationFrame(animRef.current);
      }
    };
  }, [active, animate]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
