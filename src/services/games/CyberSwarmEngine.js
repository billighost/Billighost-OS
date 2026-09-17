/**
 * CyberSwarm: Rogue Overdrive — 2D Bullet-Heaven Rogue-Lite Horde Engine
 * High-performance 2D Canvas rendering.
 *
 * Features:
 * - 8-Way Operative movement with ghost after-image dash
 * - Dual-stick / mouse directional aim + optional auto-aim targeting
 * - Dynamic reactive cyber neon grid floor with explosive pulse shockwaves
 * - 6 Upgradable techno-weapons (Pulse Rifle, Tesla Coil, Orbital Blades, Railgun, Mines, Nova Pulse)
 * - Vacuum magnet physics for dropped XP gems + one-shot combat powerups
 * - Wave-based swarm director: spawn phase -> clear phase -> rest phase, with banner callouts
 * - 5 Swarm enemy tiers including a chain-reaction "volatile" unit and a shield-regen unit
 * - 2 Mega-Boss archetypes that alternate and scale every 5 waves
 * - Operative cosmetic tiers that visually evolve with player level
 */

import { cyberSwarmAudio } from './CyberSwarmAudio';

// --- TUNING TABLES -----------------------------------------------------

const SCORE_TABLE = { crawler: 20, drone: 35, volatile: 45, brute: 150, shielded: 90 };
const GEM_VALUE = { crawler: 8, drone: 14, volatile: 18, brute: 55, shielded: 30 };
const GEM_COLOR = {
  crawler: '#38bdf8',
  drone: '#fbbf24',
  volatile: '#fb923c',
  brute: '#fbbf24',
  shielded: '#22d3ee',
};

const POWERUP_META = {
  nuke: { color: '#f43f5e', label: 'NUKE' },
  magnet: { color: '#38bdf8', label: 'MAGNET' },
  heal: { color: '#34d399', label: 'REPAIR' },
  overdrive: { color: '#fbbf24', label: 'OVERDRIVE' },
  shield: { color: '#a855f7', label: 'SHIELD' },
};
const POWERUP_TYPES = Object.keys(POWERUP_META);

// --- SHARED VISUAL HELPER (also used by the character/profile screen) --

/**
 * Draws the player's Operative ship centered at the canvas origin, facing +x.
 * Caller is responsible for translate/rotate. `tier` (1-5) unlocks extra
 * plating/wings/thruster detail as the player levels up, so the character
 * actually looks different as you progress instead of staying a flat dot.
 */
export function drawCyberOperative(ctx, tier = 1, opts = {}) {
  const { dashGlow = 0 } = opts;

  // Rear thruster flame (tiers 3+)
  if (tier >= 3) {
    const flicker = 0.7 + Math.random() * 0.3;
    const grad = ctx.createLinearGradient(-26, 0, -12, 0);
    grad.addColorStop(0, 'rgba(56,189,248,0)');
    grad.addColorStop(1, `rgba(125,211,252,${0.8 * flicker})`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-12, -5);
    ctx.lineTo(-26, 0);
    ctx.lineTo(-12, 5);
    ctx.closePath();
    ctx.fill();
  }

  // Halo ring (tier 5, "ascended" look)
  if (tier >= 5) {
    ctx.strokeStyle = 'rgba(192,132,252,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(192,132,252,0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Shoulder pauldrons (tier 4+)
  if (tier >= 4) {
    ctx.fillStyle = '#818cf8';
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.lineTo(4, -18);
    ctx.lineTo(9, -11);
    ctx.lineTo(0, -8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 14);
    ctx.lineTo(4, 18);
    ctx.lineTo(9, 11);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
  }

  // Side wing fins (tier 2+)
  if (tier >= 2) {
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(-6, -9);
    ctx.lineTo(-20, -16);
    ctx.lineTo(-10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 9);
    ctx.lineTo(-20, 16);
    ctx.lineTo(-10, 4);
    ctx.closePath();
    ctx.fill();
  }

  // Armor chassis
  ctx.fillStyle = tier >= 4 ? '#0369a1' : '#0284c7';
  ctx.shadowColor = dashGlow > 0 ? '#c084fc' : '#38bdf8';
  ctx.shadowBlur = 12 + dashGlow * 10;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();

  // Plating seam ring (tier 3+)
  if (tier >= 3) {
    ctx.strokeStyle = 'rgba(224,242,254,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // Cyber visor
  ctx.fillStyle = tier >= 5 ? '#e0f2fe' : '#38bdf8';
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = tier >= 5 ? 8 : 0;
  ctx.fillRect(4, -5, tier >= 5 ? 10 : 8, 10);
  ctx.shadowBlur = 0;

  // Weapon barrel(s) — twin barrels at tier 4+
  ctx.fillStyle = '#334155';
  ctx.fillRect(10, -3, 14, 6);
  if (tier >= 4) {
    ctx.fillRect(8, -9, 11, 4);
    ctx.fillRect(8, 5, 11, 4);
  }
}

// --- ENGINE --------------------------------------------------------------

export class CyberSwarmEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = {
      onStatsUpdate: () => {},
      onLevelUp: () => {},
      onBossUpdate: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      onWaveBanner: () => {},
      onPowerup: () => {},
      ...callbacks,
    };

    // Game Lifecycle
    this.isRunning = false;
    this.isPaused = false;
    this.gameTime = 0;
    this.kills = 0;
    this.score = 0;
    this.bossDefeated = false;

    // Arena Bounds
    this.arenaSize = 1800;

    // Wave Director
    this.wave = 1;
    this.waveState = 'banner_start'; // banner_start | spawning | clearing | banner_end | resting
    this.waveStateTimer = 2.2;
    this.spawnPhaseTimer = 0;

    // Player Operative Stats
    this.player = {
      x: 900,
      y: 900,
      vx: 0,
      vy: 0,
      speed: 190,
      aimAngle: 0,
      hp: 100,
      maxHp: 100,
      level: 1,
      exp: 0,
      expNext: 40,
      magnetRadius: 110,
      dashCooldown: 0,
      dashTimer: 0,
      isDashing: false,
      autoAim: true,
      critChance: 0,
      critMult: 2.1,
      upgradeCounts: { statSpeed: 0, statMagnet: 0, statHealth: 0, statCrit: 0 },
      buffs: { shieldTimer: 0, overdriveTimer: 0 },
    };

    // Weapons Inventory
    this.weapons = {
      pulseRifle: { level: 1, timer: 0, cooldown: 0.2, damage: 16 },
      teslaCoil: { level: 0, timer: 0, cooldown: 1.1, damage: 32, chains: 3 },
      orbitalBlades: { level: 0, angle: 0, count: 2, damage: 24 },
      railgun: { level: 0, timer: 0, cooldown: 2.0, damage: 85 },
      clusterMines: { level: 0, timer: 0, cooldown: 2.8, damage: 65 },
      novaPulse: { level: 0, timer: 0, cooldown: 3.4, damage: 45, radius: 120 },
    };

    // Entities
    this.projectiles = [];
    this.mines = [];
    this.enemies = [];
    this.gems = [];
    this.powerups = [];
    this.particles = [];
    this.floatingTexts = [];
    this.gridRipples = [];
    this.dashGhosts = [];
    this.boss = null;

    // Input States
    this.moveX = 0;
    this.moveY = 0;
    this.mouseWorldX = 900;
    this.mouseWorldY = 900;

    // Camera viewport offset
    this.camX = 900;
    this.camY = 900;

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  handleResize() {
    if (!this.canvas) return;
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);

    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // --- SKIN TIER ---

  getPlayerSkinTier(level = this.player.level) {
    if (level >= 20) return 5;
    if (level >= 15) return 4;
    if (level >= 10) return 3;
    if (level >= 5) return 2;
    return 1;
  }

  // --- WEAPON UPGRADE OPTIONS ---

  getAvailableUpgrades() {
    const pool = [
      {
        id: 'pulseRifle',
        name: 'Pulse Rifle Overclock',
        desc: '+25% Fire Rate & +6 Plasma Damage',
        currentLevel: this.weapons.pulseRifle.level,
        type: 'weapon',
      },
      {
        id: 'teslaCoil',
        name: this.weapons.teslaCoil.level === 0 ? 'Deploy Tesla Coil' : 'Tesla Voltage Boost',
        desc: this.weapons.teslaCoil.level === 0 ? 'Arcing chain lightning shocks groups of drones' : '+2 Chain Targets & +15 Damage',
        currentLevel: this.weapons.teslaCoil.level,
        type: 'weapon',
      },
      {
        id: 'orbitalBlades',
        name: this.weapons.orbitalBlades.level === 0 ? 'Deploy Orbital Blades' : 'Orbital Shield Array',
        desc: this.weapons.orbitalBlades.level === 0 ? 'Energetic discs orbit player, slicing melee swarms' : '+1 Blade & +30% Rotation Velocity',
        currentLevel: this.weapons.orbitalBlades.level,
        type: 'weapon',
      },
      {
        id: 'railgun',
        name: this.weapons.railgun.level === 0 ? 'Equip Heavy Railgun' : 'Hyper-Velocity Coils',
        desc: this.weapons.railgun.level === 0 ? 'Piercing linear beam cuts through entire columns' : '-20% Cooldown & +35 Penetration Damage',
        currentLevel: this.weapons.railgun.level,
        type: 'weapon',
      },
      {
        id: 'clusterMines',
        name: this.weapons.clusterMines.level === 0 ? 'Deploy Nanite Mines' : 'High-Explosive Shrapnel',
        desc: this.weapons.clusterMines.level === 0 ? 'Leaves proximity mines behind operative' : '+1 Mine Per Drop & +25 Blast Radius',
        currentLevel: this.weapons.clusterMines.level,
        type: 'weapon',
      },
      {
        id: 'novaPulse',
        name: this.weapons.novaPulse.level === 0 ? 'Install Nova Core' : 'Nova Overcharge',
        desc: this.weapons.novaPulse.level === 0 ? 'Periodic shockwave ring damages everything nearby' : '+35% Radius & +20 Damage',
        currentLevel: this.weapons.novaPulse.level,
        type: 'weapon',
      },
      {
        id: 'statSpeed',
        name: 'Cyber-Bionic Servos',
        desc: '+15% Movement Speed & Dash Cooldown Reduction',
        currentLevel: this.player.upgradeCounts.statSpeed,
        type: 'stat',
      },
      {
        id: 'statMagnet',
        name: 'Nanite Vacuum Field',
        desc: '+40% XP Gem Pickup Magnet Radius',
        currentLevel: this.player.upgradeCounts.statMagnet,
        type: 'stat',
      },
      {
        id: 'statHealth',
        name: 'Reinforced Exoskeleton',
        desc: '+25 Max HP & Instant 40 HP Repair',
        currentLevel: this.player.upgradeCounts.statHealth,
        type: 'stat',
      },
      {
        id: 'statCrit',
        name: 'Overclocked Targeting AI',
        desc: '+8% Critical Strike Chance (2.1x Damage)',
        currentLevel: this.player.upgradeCounts.statCrit,
        type: 'stat',
      },
    ];

    const shuffled = pool.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  applyUpgrade(upgradeId) {
    if (upgradeId === 'pulseRifle') {
      this.weapons.pulseRifle.level++;
      this.weapons.pulseRifle.cooldown = Math.max(0.08, this.weapons.pulseRifle.cooldown * 0.85);
      this.weapons.pulseRifle.damage += 6;
    } else if (upgradeId === 'teslaCoil') {
      this.weapons.teslaCoil.level++;
      this.weapons.teslaCoil.chains += 2;
      this.weapons.teslaCoil.damage += 14;
    } else if (upgradeId === 'orbitalBlades') {
      this.weapons.orbitalBlades.level++;
      this.weapons.orbitalBlades.count = Math.min(6, this.weapons.orbitalBlades.count + 1);
      this.weapons.orbitalBlades.damage += 10;
    } else if (upgradeId === 'railgun') {
      this.weapons.railgun.level++;
      this.weapons.railgun.cooldown = Math.max(1.0, this.weapons.railgun.cooldown * 0.82);
      this.weapons.railgun.damage += 35;
    } else if (upgradeId === 'clusterMines') {
      this.weapons.clusterMines.level++;
      this.weapons.clusterMines.damage += 25;
    } else if (upgradeId === 'novaPulse') {
      this.weapons.novaPulse.level++;
      this.weapons.novaPulse.radius *= 1.35;
      this.weapons.novaPulse.damage += 20;
      this.weapons.novaPulse.cooldown = Math.max(1.6, this.weapons.novaPulse.cooldown * 0.9);
    } else if (upgradeId === 'statSpeed') {
      this.player.speed *= 1.15;
      this.player.upgradeCounts.statSpeed++;
    } else if (upgradeId === 'statMagnet') {
      this.player.magnetRadius *= 1.4;
      this.player.upgradeCounts.statMagnet++;
    } else if (upgradeId === 'statHealth') {
      this.player.maxHp += 25;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
      this.player.upgradeCounts.statHealth++;
    } else if (upgradeId === 'statCrit') {
      this.player.critChance = Math.min(0.75, this.player.critChance + 0.08);
      this.player.upgradeCounts.statCrit++;
    }

    this.isPaused = false;
    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  getPublicStats() {
    return {
      hp: Math.round(this.player.hp),
      maxHp: this.player.maxHp,
      level: this.player.level,
      exp: Math.round(this.player.exp),
      expNext: this.player.expNext,
      score: this.score,
      kills: this.kills,
      time: Math.floor(this.gameTime),
      weapons: this.weapons,
      autoAim: this.player.autoAim,
      wave: this.wave,
      waveState: this.waveState,
      isBossWave: this.isBossWave(this.wave),
      critChance: this.player.critChance,
      buffs: { ...this.player.buffs },
      skinTier: this.getPlayerSkinTier(),
      upgradeCounts: { ...this.player.upgradeCounts },
    };
  }

  // --- GAME LIFECYCLE ---

  start() {
    this.isRunning = true;
    this.isPaused = false;
    cyberSwarmAudio.ensureContext();
    cyberSwarmAudio.setMusicIntensity(0);
    cyberSwarmAudio.startBGM();
    this.lastTime = performance.now();
    requestAnimationFrame(this.animate);

    // Kick off wave 1 intro banner
    this.callbacks.onWaveBanner({ visible: true, kind: 'start', wave: this.wave, isBoss: this.isBossWave(this.wave) });
  }

  pause() {
    this.isPaused = true;
    cyberSwarmAudio.stopBGM();
  }

  resume() {
    this.isPaused = false;
    this.lastTime = performance.now();
    cyberSwarmAudio.startBGM();
    requestAnimationFrame(this.animate);
  }

  animate(now) {
    if (!this.isRunning) return;
    requestAnimationFrame(this.animate);
    if (this.isPaused) return;

    const delta = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(delta);
    this.render();
  }

  // --- GAME SIMULATION UPDATE ---

  update(delta) {
    this.gameTime += delta;

    this.updateWaveSystem(delta);
    this.updatePlayer(delta);
    this.updateWeapons(delta);
    this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updateGems(delta);
    this.updatePowerups(delta);
    this.updateParticles(delta);

    // Camera Follow
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;
    this.camX = this.player.x - w / 2;
    this.camY = this.player.y - h / 2;
    this.camX = Math.max(0, Math.min(this.arenaSize - w, this.camX));
    this.camY = Math.max(0, Math.min(this.arenaSize - h, this.camY));
  }

  // --- WAVE DIRECTOR ---

  isBossWave(wave) {
    return wave % 5 === 0;
  }

  waveSpawnDuration(wave) {
    return Math.min(50, 20 + wave * 2);
  }

  spawnRateForWave(wave) {
    return Math.min(11, 1.5 + wave * 0.35);
  }

  maxEnemiesForWave(wave) {
    return Math.min(220, 55 + wave * 11);
  }

  updateWaveSystem(delta) {
    this.waveStateTimer -= delta;

    switch (this.waveState) {
      case 'banner_start': {
        if (this.waveStateTimer <= 0) {
          this.callbacks.onWaveBanner({ visible: false });
          this.waveState = 'spawning';
          this.spawnPhaseTimer = this.waveSpawnDuration(this.wave);
          if (this.isBossWave(this.wave)) {
            this.spawnBossForWave(this.wave);
            cyberSwarmAudio.setMusicIntensity(2);
          } else {
            cyberSwarmAudio.setMusicIntensity(1);
          }
        }
        break;
      }
      case 'spawning': {
        if (this.isBossWave(this.wave)) {
          this.trySpawnEnemies(delta, 0.22);
          if (!this.boss) {
            this.waveState = 'clearing';
            this.waveStateTimer = 0.1;
          }
        } else {
          this.spawnPhaseTimer -= delta;
          this.trySpawnEnemies(delta, 1);
          if (this.spawnPhaseTimer <= 0) {
            this.waveState = 'clearing';
            this.waveStateTimer = 25; // safety cap to avoid a stuck wave
          }
        }
        break;
      }
      case 'clearing': {
        if ((this.enemies.length === 0 && !this.boss) || this.waveStateTimer <= 0) {
          this.onWaveCleared();
          this.waveState = 'banner_end';
          this.waveStateTimer = 2.0;
        }
        break;
      }
      case 'banner_end': {
        if (this.waveStateTimer <= 0) {
          this.callbacks.onWaveBanner({ visible: false });
          this.waveState = 'resting';
          this.waveStateTimer = 6.0;
          cyberSwarmAudio.setMusicIntensity(0);
        }
        break;
      }
      case 'resting': {
        if (this.waveStateTimer <= 0) {
          this.wave++;
          this.waveState = 'banner_start';
          this.waveStateTimer = 2.2;
          cyberSwarmAudio.playWaveStart();
          this.callbacks.onWaveBanner({
            visible: true,
            kind: 'start',
            wave: this.wave,
            isBoss: this.isBossWave(this.wave),
          });
          this.callbacks.onStatsUpdate(this.getPublicStats());
        }
        break;
      }
      default:
        break;
    }
  }

  onWaveCleared() {
    cyberSwarmAudio.playWaveClear();
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.12);
    this.spawnPowerup(this.player.x, this.player.y - 40);
    this.callbacks.onWaveBanner({ visible: true, kind: 'clear', wave: this.wave });
    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  // --- SWARM SPAWNING ---

  tierWeightsForWave(wave) {
    const w = { crawler: 50 };
    if (wave >= 2) w.drone = 22;
    if (wave >= 3) w.volatile = 14;
    if (wave >= 4) w.brute = 16;
    if (wave >= 6) w.shielded = 14;
    return w;
  }

  pickWeighted(weights) {
    const entries = Object.entries(weights);
    const total = entries.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [k, v] of entries) {
      if (r < v) return k;
      r -= v;
    }
    return entries[0][0];
  }

  trySpawnEnemies(delta, rateMult = 1) {
    if (this.enemies.length >= this.maxEnemiesForWave(this.wave)) return;

    const spawnRate = this.spawnRateForWave(this.wave) * rateMult;
    if (Math.random() < spawnRate * delta) {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 580;
      const x = this.player.x + Math.cos(angle) * spawnDist;
      const y = this.player.y + Math.sin(angle) * spawnDist;
      const type = this.pickWeighted(this.tierWeightsForWave(this.wave));
      this.spawnEnemy(type, x, y);
    }
  }

  statScaleForWave(wave) {
    return 1 + (wave - 1) * 0.09;
  }

  spawnEnemy(type, x, y) {
    const scale = this.statScaleForWave(this.wave);
    const speedScale = Math.min(1.35, 1 + (this.wave - 1) * 0.015);

    if (type === 'crawler') {
      this.enemies.push({
        type: 'crawler', x, y,
        hp: 20 * scale, maxHp: 20 * scale,
        speed: 130 * speedScale, radius: 12,
        color: '#ef4444', angle: 0,
        contactDamage: 9,
      });
    } else if (type === 'drone') {
      this.enemies.push({
        type: 'drone', x, y,
        hp: 42 * scale, maxHp: 42 * scale,
        speed: 92 * speedScale, radius: 15,
        color: '#f59e0b', angle: 0,
        shootTimer: 1.5 + Math.random() * 1.5,
        contactDamage: 10,
      });
    } else if (type === 'brute') {
      this.enemies.push({
        type: 'brute', x, y,
        hp: 175 * scale, maxHp: 175 * scale,
        speed: 78 * speedScale, radius: 22,
        color: '#a855f7', angle: 0,
        contactDamage: 24,
      });
    } else if (type === 'volatile') {
      this.enemies.push({
        type: 'volatile', x, y,
        hp: 85 * scale, maxHp: 85 * scale,
        speed: 68 * speedScale, radius: 16,
        color: '#fb923c', angle: 0,
        pulsePhase: Math.random() * Math.PI * 2,
        contactDamage: 12,
      });
    } else if (type === 'shielded') {
      this.enemies.push({
        type: 'shielded', x, y,
        hp: 65 * scale, maxHp: 65 * scale,
        shield: 55 * scale, shieldMax: 55 * scale,
        shieldRegenTimer: 0,
        speed: 82 * speedScale, radius: 18,
        color: '#22d3ee', angle: 0,
        contactDamage: 14,
      });
    }
  }

  spawnBossForWave(wave) {
    const bossIndex = Math.floor(wave / 5) - 1; // wave5 -> 0, wave10 -> 1 ...
    const type = bossIndex % 2 === 0 ? 'titan' : 'warlord';
    const scale = 1 + bossIndex * 0.32;
    this.spawnBoss(type, scale);
  }

  spawnBoss(type, scale = 1) {
    const baseHp = type === 'titan' ? 1700 : 2500;
    this.boss = {
      type,
      x: this.player.x + 400,
      y: this.player.y - 300,
      hp: baseHp * scale,
      maxHp: baseHp * scale,
      speed: type === 'titan' ? 62 : 74,
      radius: type === 'titan' ? 42 : 46,
      laserAngle: 0,
      laserTimer: 3.0,
      summonTimer: type === 'titan' ? 6.0 : 8.0,
      chargeTimer: type === 'warlord' ? 4.5 : null,
      isCharging: false,
      chargeDirX: 0,
      chargeDirY: 0,
      chargeTime: 0,
      phase: 1,
    };
    cyberSwarmAudio.playBossWarning();
    this.callbacks.onBossUpdate(this.boss);
  }

  // --- PLAYER ---

  updatePlayer(delta) {
    if (this.player.dashTimer > 0) {
      this.player.dashTimer -= delta;
      if (this.player.dashTimer <= 0) this.player.isDashing = false;
    }
    if (this.player.dashCooldown > 0) this.player.dashCooldown -= delta;
    if (this.player.buffs.shieldTimer > 0) this.player.buffs.shieldTimer -= delta;
    if (this.player.buffs.overdriveTimer > 0) this.player.buffs.overdriveTimer -= delta;

    let mx = this.moveX;
    let my = this.moveY;
    const len = Math.hypot(mx, my);
    if (len > 0.01) {
      mx /= len;
      my /= len;
    }

    const currentSpeed = this.player.isDashing ? this.player.speed * 2.8 : this.player.speed;
    this.player.vx = mx * currentSpeed;
    this.player.vy = my * currentSpeed;

    this.player.x += this.player.vx * delta;
    this.player.y += this.player.vy * delta;

    this.player.x = Math.max(30, Math.min(this.arenaSize - 30, this.player.x));
    this.player.y = Math.max(30, Math.min(this.arenaSize - 30, this.player.y));

    if (this.player.isDashing && Math.random() < 0.4) {
      this.dashGhosts.push({ x: this.player.x, y: this.player.y, angle: this.player.aimAngle, life: 0.25 });
    }

    if (this.player.autoAim) {
      let closest = null;
      let closestDist = 450;
      for (const e of this.enemies) {
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
      }
      if (this.boss) {
        const bDist = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
        if (bDist < closestDist) closest = this.boss;
      }
      if (closest) {
        this.player.aimAngle = Math.atan2(closest.y - this.player.y, closest.x - this.player.x);
      } else if (len > 0.01) {
        this.player.aimAngle = Math.atan2(my, mx);
      }
    } else {
      this.player.aimAngle = Math.atan2(this.mouseWorldY - this.player.y, this.mouseWorldX - this.player.x);
    }
  }

  dash() {
    if (this.player.dashCooldown > 0 || this.player.isDashing) return;
    this.player.isDashing = true;
    this.player.dashTimer = 0.2;
    this.player.dashCooldown = 1.4;
    cyberSwarmAudio.playDash();
    this.createShockwave(this.player.x, this.player.y, '#38bdf8', 40);
  }

  get isInvulnerable() {
    return this.player.isDashing || this.player.buffs.shieldTimer > 0;
  }

  // --- WEAPONS FIRING ---

  weaponRateMult() {
    return this.player.buffs.overdriveTimer > 0 ? 1.8 : 1;
  }

  dealDamage(e, baseDamage) {
    let dmg = baseDamage;
    let crit = false;
    if (Math.random() < this.player.critChance) {
      dmg *= this.player.critMult;
      crit = true;
    }
    this.damageEnemy(e, dmg, crit);
    return crit;
  }

  updateWeapons(delta) {
    const rate = this.weaponRateMult();
    const dtBoost = delta * rate;

    if (this.weapons.pulseRifle.level > 0) {
      this.weapons.pulseRifle.timer -= dtBoost;
      if (this.weapons.pulseRifle.timer <= 0) {
        this.weapons.pulseRifle.timer = this.weapons.pulseRifle.cooldown;
        this.firePulseRifle();
      }
    }

    if (this.weapons.teslaCoil.level > 0) {
      this.weapons.teslaCoil.timer -= dtBoost;
      if (this.weapons.teslaCoil.timer <= 0) {
        this.weapons.teslaCoil.timer = this.weapons.teslaCoil.cooldown;
        this.fireTeslaCoil();
      }
    }

    if (this.weapons.orbitalBlades.level > 0) {
      this.weapons.orbitalBlades.angle += 3.8 * dtBoost;
      this.checkOrbitalBladeHits(delta);
    }

    if (this.weapons.railgun.level > 0) {
      this.weapons.railgun.timer -= dtBoost;
      if (this.weapons.railgun.timer <= 0) {
        this.weapons.railgun.timer = this.weapons.railgun.cooldown;
        this.fireRailgun();
      }
    }

    if (this.weapons.clusterMines.level > 0) {
      this.weapons.clusterMines.timer -= dtBoost;
      if (this.weapons.clusterMines.timer <= 0) {
        this.weapons.clusterMines.timer = this.weapons.clusterMines.cooldown;
        this.dropClusterMine();
      }
    }

    if (this.weapons.novaPulse.level > 0) {
      this.weapons.novaPulse.timer -= dtBoost;
      if (this.weapons.novaPulse.timer <= 0) {
        this.weapons.novaPulse.timer = this.weapons.novaPulse.cooldown;
        this.fireNovaPulse();
      }
    }
  }

  firePulseRifle() {
    const angle = this.player.aimAngle + (Math.random() - 0.5) * 0.08;
    const speed = 650;
    this.projectiles.push({
      type: 'pulse',
      x: this.player.x + Math.cos(angle) * 20,
      y: this.player.y + Math.sin(angle) * 20,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 4,
      damage: this.weapons.pulseRifle.damage,
      life: 0.9,
      color: '#38bdf8',
    });
    cyberSwarmAudio.playBlaster();
  }

  fireTeslaCoil() {
    const range = 260;
    const targets = this.enemies
      .map(e => ({ e, dist: Math.hypot(e.x - this.player.x, e.y - this.player.y) }))
      .filter(t => t.dist < range)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, this.weapons.teslaCoil.chains);

    if (targets.length === 0) return;

    cyberSwarmAudio.playTesla();
    let prevX = this.player.x;
    let prevY = this.player.y;

    targets.forEach(({ e }) => {
      this.dealDamage(e, this.weapons.teslaCoil.damage);
      this.particles.push({ type: 'lightning', x1: prevX, y1: prevY, x2: e.x, y2: e.y, life: 0.15, color: '#fbbf24' });
      prevX = e.x;
      prevY = e.y;
    });
  }

  checkOrbitalBladeHits(delta = 1 / 60) {
    const radius = 68;
    const count = this.weapons.orbitalBlades.count;
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const bx = this.player.x + Math.cos(this.weapons.orbitalBlades.angle + i * angleStep) * radius;
      const by = this.player.y + Math.sin(this.weapons.orbitalBlades.angle + i * angleStep) * radius;

      for (const e of this.enemies) {
        if (Math.hypot(e.x - bx, e.y - by) < e.radius + 14) {
          if (!e.bladeCooldown || e.bladeCooldown <= 0) {
            e.bladeCooldown = 0.25;
            this.dealDamage(e, this.weapons.orbitalBlades.damage);
            cyberSwarmAudio.playOrbitalSlice();
            this.createSparks(bx, by, '#34d399', 6);
          }
        }
      }
      if (this.boss && Math.hypot(this.boss.x - bx, this.boss.y - by) < this.boss.radius + 14) {
        if (!this.boss.bladeCooldown || this.boss.bladeCooldown <= 0) {
          this.boss.bladeCooldown = 0.25;
          this.damageBoss(this.weapons.orbitalBlades.damage);
        }
      }
    }
    if (this.boss && this.boss.bladeCooldown > 0) this.boss.bladeCooldown -= delta;
  }

  fireRailgun() {
    cyberSwarmAudio.playRailgun();
    const angle = this.player.aimAngle;
    const beamLength = 700;
    const endX = this.player.x + Math.cos(angle) * beamLength;
    const endY = this.player.y + Math.sin(angle) * beamLength;

    this.particles.push({ type: 'railbeam', x1: this.player.x, y1: this.player.y, x2: endX, y2: endY, life: 0.28, color: '#a855f7' });

    this.enemies.forEach(e => {
      const dist = this.distToSegment(e.x, e.y, this.player.x, this.player.y, endX, endY);
      if (dist < e.radius + 12) {
        this.dealDamage(e, this.weapons.railgun.damage);
        this.createSparks(e.x, e.y, '#a855f7', 8);
      }
    });

    if (this.boss) {
      const dist = this.distToSegment(this.boss.x, this.boss.y, this.player.x, this.player.y, endX, endY);
      if (dist < this.boss.radius + 12) this.damageBoss(this.weapons.railgun.damage);
    }
  }

  dropClusterMine() {
    this.mines.push({ x: this.player.x, y: this.player.y, radius: 12, damage: this.weapons.clusterMines.damage, life: 14.0, armTimer: 0.4 });
  }

  fireNovaPulse() {
    const radius = this.weapons.novaPulse.radius;
    this.createShockwave(this.player.x, this.player.y, '#c084fc', radius);
    cyberSwarmAudio.playTesla();

    this.enemies.forEach(e => {
      const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
      if (dist < radius) this.dealDamage(e, this.weapons.novaPulse.damage);
    });
    if (this.boss) {
      const dist = Math.hypot(this.boss.x - this.player.x, this.boss.y - this.player.y);
      if (dist < radius) this.damageBoss(this.weapons.novaPulse.damage * 0.6);
    }
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // --- ENEMY SIMULATION ---

  updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.bladeCooldown > 0) e.bladeCooldown -= delta;

      if (e.type === 'shielded') {
        if (e.shieldRegenTimer > 0) {
          e.shieldRegenTimer -= delta;
        } else if (e.shield < e.shieldMax) {
          e.shield = Math.min(e.shieldMax, e.shield + delta * 14);
        }
      }
      if (e.type === 'volatile') {
        e.pulsePhase += delta * 6;
      }

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);
      e.angle = Math.atan2(dy, dx);

      if (e.type === 'drone' && dist < 220) {
        e.shootTimer -= delta;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.2;
          const angle = Math.atan2(dy, dx);
          this.projectiles.push({
            type: 'enemyLaser', x: e.x, y: e.y,
            vx: Math.cos(angle) * 320, vy: Math.sin(angle) * 320,
            radius: 4, damage: 12, life: 1.8, color: '#ef4444',
          });
        }
      } else if (dist > 0.1) {
        e.x += (dx / dist) * e.speed * delta;
        e.y += (dy / dist) * e.speed * delta;
      }

      if (dist < e.radius + 14 && !this.isInvulnerable) {
        this.damagePlayer(e.contactDamage || 10);
      }
    }

    if (this.boss) this.updateBoss(delta);
  }

  updateBoss(delta) {
    const b = this.boss;

    if (!b.phase2Triggered && b.hp <= b.maxHp * 0.5) {
      b.phase2Triggered = true;
      b.phase = 2;
      this.addFloatingText(b.x, b.y - b.radius - 20, 'PHASE 2', '#f43f5e');
      this.createShockwave(b.x, b.y, '#f43f5e', 120);
    }
    const phaseMult = b.phase === 2 ? 1.4 : 1;

    if (b.type === 'warlord' && b.isCharging) {
      b.x += b.chargeDirX * b.speed * 5 * delta;
      b.y += b.chargeDirY * b.speed * 5 * delta;
      b.chargeTime -= delta;
      if (b.chargeTime <= 0) b.isCharging = false;
    } else {
      const dx = this.player.x - b.x;
      const dy = this.player.y - b.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.1) {
        b.x += (dx / dist) * b.speed * delta;
        b.y += (dy / dist) * b.speed * delta;
      }
    }

    // Contact damage from the boss body itself
    const pd = Math.hypot(this.player.x - b.x, this.player.y - b.y);
    if (pd < b.radius + 15 && !this.isInvulnerable) {
      this.damagePlayer((b.type === 'warlord' && b.isCharging ? 30 : 20));
    }

    if (b.type === 'titan') {
      b.laserAngle += 1.8 * delta * phaseMult;
      b.laserTimer -= delta;
      if (b.laserTimer <= 0) {
        b.laserTimer = b.phase === 2 ? 1.6 : 2.2;
        const bolts = b.phase === 2 ? 6 : 4;
        for (let i = 0; i < bolts; i++) {
          const a = b.laserAngle + (i * Math.PI * 2) / bolts;
          this.projectiles.push({
            type: 'enemyLaser', x: b.x, y: b.y,
            vx: Math.cos(a) * 350, vy: Math.sin(a) * 350,
            radius: 5, damage: 18, life: 2.0, color: '#a855f7',
          });
        }
      }
      b.summonTimer -= delta;
      if (b.summonTimer <= 0) {
        b.summonTimer = 6.0;
        for (let i = 0; i < (b.phase === 2 ? 9 : 6); i++) {
          this.spawnEnemy('crawler', b.x + (Math.random() - 0.5) * 80, b.y + (Math.random() - 0.5) * 80);
        }
      }
    } else if (b.type === 'warlord') {
      if (!b.isCharging) {
        b.chargeTimer -= delta;
        if (b.chargeTimer <= 0) {
          b.chargeTimer = b.phase === 2 ? 2.8 : 4.2;
          const dx = this.player.x - b.x;
          const dy = this.player.y - b.y;
          const dist = Math.hypot(dx, dy) || 1;
          b.chargeDirX = dx / dist;
          b.chargeDirY = dy / dist;
          b.isCharging = true;
          b.chargeTime = 0.6;
          this.createShockwave(b.x, b.y, '#f97316', 60);
        }
      }
      b.summonTimer -= delta;
      if (b.summonTimer <= 0) {
        b.summonTimer = b.phase === 2 ? 5.5 : 8.0;
        for (let i = 0; i < (b.phase === 2 ? 3 : 2); i++) {
          this.spawnEnemy('volatile', b.x + (Math.random() - 0.5) * 90, b.y + (Math.random() - 0.5) * 90);
        }
      }
    }
  }

  damagePlayer(amount) {
    this.player.hp = Math.max(0, this.player.hp - amount);
    this.createShockwave(this.player.x, this.player.y, '#ef4444', 30);
    this.callbacks.onStatsUpdate(this.getPublicStats());

    if (this.player.hp <= 0) {
      this.isRunning = false;
      cyberSwarmAudio.playExplosion(true);
      this.callbacks.onGameOver();
    }
  }

  damageEnemy(e, damage, isCrit = false) {
    if (e.type === 'shielded' && e.shield > 0) {
      e.shield -= damage;
      e.shieldRegenTimer = 3;
      if (e.shield < 0) {
        e.hp += e.shield; // spill remainder into hp
        e.shield = 0;
      }
      this.addFloatingText(e.x, e.y - 12, isCrit ? `-${Math.round(damage)}!` : `-${Math.round(damage)}`, isCrit ? '#fde047' : '#22d3ee');
    } else {
      e.hp -= damage;
      this.addFloatingText(e.x, e.y - 12, isCrit ? `-${Math.round(damage)}!` : `-${Math.round(damage)}`, isCrit ? '#fde047' : '#f8fafc');
    }

    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const idx = this.enemies.indexOf(e);
    if (idx === -1) return; // already removed (e.g. earlier hit this same frame)
    this.enemies.splice(idx, 1);

    const tier = e.type === 'brute' ? 'heavy' : (e.type === 'drone' || e.type === 'volatile' || e.type === 'shielded') ? 'medium' : 'light';
    cyberSwarmAudio.playEnemyDeath(tier);
    this.createExplosion(e.x, e.y, e.color, e.type === 'brute');

    this.kills++;
    this.score += SCORE_TABLE[e.type] || 20;

    this.gems.push({ x: e.x, y: e.y, value: GEM_VALUE[e.type] || 8, color: GEM_COLOR[e.type] || '#38bdf8' });

    if (Math.random() < 0.03) this.spawnPowerup(e.x, e.y);

    if (e.type === 'volatile') this.triggerVolatileExplosion(e);

    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  /** Volatile units are tougher to bring down, but killing one chain-detonates
   * nearby enemies (and can even chain into other volatiles) — the reward for
   * baiting a pack of enemies onto one before popping it. */
  triggerVolatileExplosion(e) {
    const radius = 150;
    const damage = 85 + this.wave * 4;
    cyberSwarmAudio.playChainBlast();
    this.createShockwave(e.x, e.y, '#fb923c', radius * 0.9);
    this.createExplosion(e.x, e.y, '#fb7185', true);

    const snapshot = [...this.enemies];
    snapshot.forEach(other => {
      const d = Math.hypot(other.x - e.x, other.y - e.y);
      if (d < radius) this.damageEnemy(other, damage);
    });

    if (this.boss) {
      const bd = Math.hypot(this.boss.x - e.x, this.boss.y - e.y);
      if (bd < radius) this.damageBoss(damage * 0.6);
    }

    const pd = Math.hypot(this.player.x - e.x, this.player.y - e.y);
    if (pd < radius * 0.7 && !this.isInvulnerable) {
      this.damagePlayer(16);
    }
  }

  updateGems(delta) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.player.magnetRadius) {
        const speed = (1 - dist / this.player.magnetRadius) * 580 + 120;
        g.x += (dx / dist) * speed * delta;
        g.y += (dy / dist) * speed * delta;
      }

      if (dist < 22) {
        this.player.exp += g.value;
        cyberSwarmAudio.playGemCollect();
        this.gems.splice(i, 1);

        if (this.player.exp >= this.player.expNext) {
          this.triggerLevelUp();
        } else {
          this.callbacks.onStatsUpdate(this.getPublicStats());
        }
      }
    }
  }

  // --- POWERUPS ---

  spawnPowerup(x, y, forceType = null) {
    const type = forceType || POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    const meta = POWERUP_META[type];
    this.powerups.push({ type, x, y, radius: 11, color: meta.color, life: 18, spin: 0 });
  }

  updatePowerups(delta) {
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.life -= delta;
      p.spin += delta * 3;

      const dx = this.player.x - p.x;
      const dy = this.player.y - p.y;
      const dist = Math.hypot(dx, dy);
      const pullRadius = this.player.magnetRadius * 0.65;
      if (dist < pullRadius && dist > 0.1) {
        const speed = (1 - dist / pullRadius) * 420 + 80;
        p.x += (dx / dist) * speed * delta;
        p.y += (dy / dist) * speed * delta;
      }

      if (dist < 22) {
        this.collectPowerup(p);
        this.powerups.splice(i, 1);
        continue;
      }
      if (p.life <= 0) this.powerups.splice(i, 1);
    }
  }

  collectPowerup(p) {
    cyberSwarmAudio.playPowerupPickup();
    this.createShockwave(p.x, p.y, p.color, 50);
    this.callbacks.onPowerup(p.type);

    if (p.type === 'nuke') {
      [...this.enemies].forEach(e => this.damageEnemy(e, 160));
      if (this.boss) this.damageBoss(110);
      this.createExplosion(this.player.x, this.player.y, '#f43f5e', true);
    } else if (p.type === 'magnet') {
      [...this.gems].forEach(g => {
        this.player.exp += g.value;
      });
      this.gems = [];
      if (this.player.exp >= this.player.expNext) this.triggerLevelUp();
    } else if (p.type === 'heal') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * 0.35);
    } else if (p.type === 'overdrive') {
      this.player.buffs.overdriveTimer = 8;
    } else if (p.type === 'shield') {
      this.player.buffs.shieldTimer = 5;
    }

    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  /** Cheat code: instantly tops off the XP bar by exactly however much is left
   * to fill it (works the same whether that's 5 XP or 5000) and fires a normal
   * level-up. Triggered from the UI after three quick presses of H. */
  cheatFillXP() {
    const needed = this.player.expNext - this.player.exp;
    if (needed > 0) this.player.exp += needed;
    this.addFloatingText(this.player.x, this.player.y - 30, 'CHEAT: XP FILLED', '#fde047');
    this.createShockwave(this.player.x, this.player.y, '#fde047', 70);
    cyberSwarmAudio.playPowerupPickup();
    if (this.player.exp >= this.player.expNext) {
      this.triggerLevelUp();
    } else {
      this.callbacks.onStatsUpdate(this.getPublicStats());
    }
  }

  triggerLevelUp() {
    this.player.level++;
    this.player.exp = Math.max(0, this.player.exp - this.player.expNext);
    this.player.expNext = Math.round(this.player.expNext * 1.4);
    this.isPaused = true;
    cyberSwarmAudio.playLevelUp();
    this.createShockwave(this.player.x, this.player.y, '#fbbf24', 60);

    const choices = this.getAvailableUpgrades();
    this.callbacks.onLevelUp(choices);
    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      if (p.type === 'pulse') {
        for (const e of this.enemies) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            this.dealDamage(e, p.damage);
            p.life = 0;
            break;
          }
        }
        if (this.boss && Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < this.boss.radius + p.radius) {
          this.damageBoss(p.damage);
          p.life = 0;
        }
      } else if (p.type === 'enemyLaser') {
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < 14 && !this.isInvulnerable) {
          this.damagePlayer(p.damage);
          p.life = 0;
        }
      }

      if (p.life <= 0) this.projectiles.splice(i, 1);
    }

    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.life -= delta;
      if (m.armTimer > 0) m.armTimer -= delta;

      if (m.armTimer <= 0) {
        let triggered = false;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - m.x, e.y - m.y) < e.radius + m.radius + 8) {
            this.detonateMine(m);
            this.mines.splice(i, 1);
            triggered = true;
            break;
          }
        }
        if (triggered) continue;
      }

      if (m.life <= 0) this.mines.splice(i, 1);
    }
  }

  detonateMine(m) {
    cyberSwarmAudio.playExplosion(false);
    this.createShockwave(m.x, m.y, '#f59e0b', 75);

    [...this.enemies].forEach(e => {
      if (Math.hypot(e.x - m.x, e.y - m.y) < 75) this.damageEnemy(e, m.damage);
    });
    if (this.boss && Math.hypot(this.boss.x - m.x, this.boss.y - m.y) < 75) {
      this.damageBoss(m.damage * 0.6);
    }
  }

  damageBoss(amount) {
    if (!this.boss) return;
    this.boss.hp -= amount;
    this.callbacks.onBossUpdate(this.boss);

    if (this.boss.hp <= 0) {
      this.createExplosion(this.boss.x, this.boss.y, this.boss.type === 'warlord' ? '#f97316' : '#a855f7', true);
      const wasWarlord = this.boss.type === 'warlord';
      this.boss = null;
      this.callbacks.onBossUpdate(null);
      this.bossDefeated = true;
      this.score += wasWarlord ? 4500 : 3000;
      this.callbacks.onStatsUpdate(this.getPublicStats());
      cyberSwarmAudio.setMusicIntensity(0);
    }
  }

  // --- VISUAL EFFECTS & PARTICLES ---

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      if (p.vx) p.x += p.vx * delta;
      if (p.vy) p.y += p.vy * delta;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= delta;
      ft.y -= 25 * delta;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    for (let i = this.gridRipples.length - 1; i >= 0; i--) {
      const r = this.gridRipples[i];
      r.radius += 180 * delta;
      r.life -= 2.2 * delta;
      if (r.life <= 0) this.gridRipples.splice(i, 1);
    }

    for (let i = this.dashGhosts.length - 1; i >= 0; i--) {
      const dg = this.dashGhosts[i];
      dg.life -= 4 * delta;
      if (dg.life <= 0) this.dashGhosts.splice(i, 1);
    }
  }

  createExplosion(x, y, color, isLarge = false) {
    const count = isLarge ? 28 : 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 2.5 + Math.random() * 2.5, color, life: 0.35 + Math.random() * 0.25 });
    }
    this.createShockwave(x, y, color, isLarge ? 80 : 35);
  }

  createSparks(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: 2, color, life: 0.2 });
    }
  }

  createShockwave(x, y, color, maxRadius = 50) {
    this.gridRipples.push({ x, y, color, radius: 10, maxRadius, life: 1.0 });
  }

  addFloatingText(x, y, text, color = '#ffffff') {
    this.floatingTexts.push({ x, y, text, color, life: 0.6 });
  }

  // --- RENDERING PIPELINE ---

  render() {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;

    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(-this.camX, -this.camY);

    this.drawCyberGrid(ctx);
    this.drawRipples(ctx);
    this.drawGems(ctx);
    this.drawPowerups(ctx);
    this.drawMines(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);
    this.drawProjectiles(ctx);
    this.drawParticles(ctx);

    ctx.restore();
  }

  drawCyberGrid(ctx) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const step = 60;

    const startX = Math.floor(this.camX / step) * step;
    const endX = this.camX + (this.canvas.clientWidth || 800) + step;
    const startY = Math.floor(this.camY / step) * step;
    const endY = this.camY + (this.canvas.clientHeight || 500) + step;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, this.arenaSize, this.arenaSize);
  }

  drawRipples(ctx) {
    this.gridRipples.forEach(r => {
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    });
  }

  drawGems(ctx) {
    this.gems.forEach(g => {
      ctx.fillStyle = g.color;
      ctx.shadowColor = g.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  drawPowerups(ctx) {
    this.powerups.forEach(p => {
      const pulse = 1 + Math.sin(p.spin * 2) * 0.12;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      const r = p.radius * pulse;
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      // Type glyph
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.strokeStyle = '#0a0e1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (p.type === 'heal') {
        ctx.moveTo(-4, 0); ctx.lineTo(4, 0);
        ctx.moveTo(0, -4); ctx.lineTo(0, 4);
      } else if (p.type === 'shield') {
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
      } else if (p.type === 'magnet') {
        ctx.arc(0, 0, 4, Math.PI * 0.15, Math.PI * 0.85);
      } else if (p.type === 'overdrive') {
        ctx.moveTo(-2, -5); ctx.lineTo(1, -1); ctx.lineTo(-1, 1); ctx.lineTo(2, 5);
      } else if (p.type === 'nuke') {
        ctx.moveTo(0, -5); ctx.lineTo(4, 4); ctx.lineTo(-4, 4); ctx.closePath();
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  drawMines(ctx) {
    this.mines.forEach(m => {
      const armed = m.armTimer <= 0;
      ctx.fillStyle = armed ? '#f59e0b' : '#64748b';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = armed ? '#fbbf24' : '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  drawEnemies(ctx) {
    this.enemies.forEach(e => {
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'crawler') {
        ctx.rotate(e.angle || 0);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(e.radius, 0);
        ctx.lineTo(0, -e.radius * 0.8);
        ctx.lineTo(-e.radius, 0);
        ctx.lineTo(0, e.radius * 0.8);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // legs
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, -e.radius * 0.5); ctx.lineTo(-e.radius * 0.9, -e.radius * 1.1);
        ctx.moveTo(-2, e.radius * 0.5); ctx.lineTo(-e.radius * 0.9, e.radius * 1.1);
        ctx.stroke();
        // core
        ctx.fillStyle = '#fca5a5';
        ctx.beginPath();
        ctx.arc(2, 0, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'drone') {
        const bob = Math.sin(this.gameTime * 4 + e.x) * 2;
        ctx.translate(0, bob);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const px = Math.cos(a) * e.radius;
          const py = Math.sin(a) * e.radius;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
        // eye
        ctx.fillStyle = '#fef3c7';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (e.type === 'brute') {
        ctx.rotate((e.angle || 0) * 0.15);
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        // plating lines
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-e.radius, -e.radius * 0.3); ctx.lineTo(e.radius, -e.radius * 0.3);
        ctx.moveTo(-e.radius, e.radius * 0.3); ctx.lineTo(e.radius, e.radius * 0.3);
        ctx.stroke();
        // core window
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (e.type === 'volatile') {
        const pulse = 1 + Math.sin(e.pulsePhase) * 0.18;
        const spikeCount = 8;
        ctx.fillStyle = e.color;
        ctx.shadowColor = '#fb7185';
        ctx.shadowBlur = 14;
        ctx.beginPath();
        for (let i = 0; i < spikeCount * 2; i++) {
          const a = (Math.PI / spikeCount) * i;
          const r = i % 2 === 0 ? e.radius * pulse : e.radius * 0.55;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        // glowing core (warns of the chain-explosion)
        ctx.fillStyle = `rgba(255, 237, 213, ${0.6 + Math.sin(e.pulsePhase) * 0.3})`;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'shielded') {
        // outer rotating shield ring, only while shield remains
        if (e.shield > 0) {
          ctx.save();
          ctx.rotate(this.gameTime * 1.5);
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.35 + (e.shield / e.shieldMax) * 0.4})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (Math.PI / 3) * i;
            const px = Math.cos(a) * (e.radius + 8);
            const py = Math.sin(a) * (e.radius + 8);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = e.color;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#e0f7fa';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // HP bar for anything that's taken damage — helps read the swarm at a glance
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW, 3);
        ctx.fillStyle = '#f87171';
        ctx.fillRect(e.x - barW / 2, e.y - e.radius - 10, barW * Math.max(0, e.hp / e.maxHp), 3);
      }
    });

    if (this.boss) this.drawBoss(ctx, this.boss);
  }

  drawBoss(ctx, b) {
    ctx.save();
    ctx.translate(b.x, b.y);

    const glowColor = b.type === 'warlord' ? '#f97316' : '#a855f7';
    const bodyColor = b.type === 'warlord' ? '#c2410c' : '#7e22ce';

    // Outer armor ring
    ctx.rotate(this.gameTime * 0.5);
    ctx.strokeStyle = `${glowColor}55`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const px = Math.cos(a) * (b.radius + 12);
      const py = Math.sin(a) * (b.radius + 12);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.rotate(-this.gameTime * 0.5);

    ctx.fillStyle = bodyColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = b.phase === 2 ? 26 : 18;
    ctx.beginPath();
    ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (b.type === 'warlord' && b.isCharging) {
      ctx.strokeStyle = 'rgba(249,115,22,0.8)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.chargeDirX * b.radius, b.chargeDirY * b.radius);
      ctx.lineTo(b.chargeDirX * (b.radius + 60), b.chargeDirY * (b.radius + 60));
      ctx.stroke();
    }

    ctx.restore();
  }

  drawPlayer(ctx) {
    this.dashGhosts.forEach(dg => {
      ctx.save();
      ctx.translate(dg.x, dg.y);
      ctx.rotate(dg.angle);
      ctx.fillStyle = `rgba(56, 189, 248, ${dg.life})`;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.aimAngle);
    drawCyberOperative(ctx, this.getPlayerSkinTier(), { dashGlow: this.player.isDashing ? 1 : 0 });
    ctx.restore();

    // Shield buff bubble
    if (this.player.buffs.shieldTimer > 0) {
      ctx.strokeStyle = `rgba(168,85,247,${0.4 + Math.sin(this.gameTime * 8) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 24, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (this.weapons.orbitalBlades.level > 0) {
      const radius = 68;
      const count = this.weapons.orbitalBlades.count;
      const angleStep = (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
        const bx = this.player.x + Math.cos(this.weapons.orbitalBlades.angle + i * angleStep) * radius;
        const by = this.player.y + Math.sin(this.weapons.orbitalBlades.angle + i * angleStep) * radius;

        ctx.fillStyle = '#34d399';
        ctx.shadowColor = '#34d399';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  drawProjectiles(ctx) {
    this.projectiles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  drawParticles(ctx) {
    this.particles.forEach(p => {
      if (p.type === 'lightning') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
      } else if (p.type === 'railbeam') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 5;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(p.x1, p.y1);
        ctx.lineTo(p.x2, p.y2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    this.floatingTexts.forEach(ft => {
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(ft.text, ft.x - 10, ft.y);
    });
  }

  // --- CONTROLS API ---

  setMovement(mx, my) {
    this.moveX = mx;
    this.moveY = my;
  }

  setMousePos(screenX, screenY) {
    this.mouseWorldX = screenX + this.camX;
    this.mouseWorldY = screenY + this.camY;
  }

  toggleAutoAim() {
    this.player.autoAim = !this.player.autoAim;
    this.callbacks.onStatsUpdate(this.getPublicStats());
    return this.player.autoAim;
  }

  destroy() {
    this.isRunning = false;
    window.removeEventListener('resize', this.handleResize);
    cyberSwarmAudio.destroy();
  }
}
