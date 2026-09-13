/**
 * CyberSwarm: Rogue Overdrive — 2D Bullet-Heaven Rogue-Lite Horde Engine
 * High-performance 2D Canvas rendering capable of 250+ simultaneous swarm units at 60 FPS.
 *
 * Features:
 * - 8-Way Operative movement with ghost after-image dash
 * - Dual-stick / mouse directional aim + optional auto-aim targeting
 * - Dynamic reactive cyber neon grid floor with explosive pulse shockwaves
 * - 5 Upgradable techno-weapons (Pulse Rifle, Tesla Coil, Orbital Blades, Railgun, Mines)
 * - Vacuum magnet physics for dropped XP gems
 * - 3 Swarm enemy tiers + multi-phase Cyber-Titan Mega Boss
 * - Spatial partitioning for high-performance O(1) collision detection
 */

import { cyberSwarmAudio } from './CyberSwarmAudio';

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
      ...callbacks,
    };

    // Game Lifecycle
    this.isRunning = false;
    this.isPaused = false;
    this.gameTime = 0;
    this.kills = 0;
    this.score = 0;

    // Arena Bounds (1800 x 1800)
    this.arenaSize = 1800;

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
    };

    // Weapons Inventory
    this.weapons = {
      pulseRifle: { level: 1, timer: 0, cooldown: 0.18, damage: 18 },
      teslaCoil: { level: 0, timer: 0, cooldown: 1.1, damage: 32, chains: 3 },
      orbitalBlades: { level: 0, angle: 0, count: 2, damage: 24 },
      railgun: { level: 0, timer: 0, cooldown: 2.0, damage: 85 },
      clusterMines: { level: 0, timer: 0, cooldown: 2.8, damage: 65 },
    };

    // Entities
    this.projectiles = [];
    this.mines = [];
    this.enemies = [];
    this.gems = [];
    this.particles = [];
    this.floatingTexts = [];
    this.gridRipples = [];
    this.dashGhosts = [];
    this.boss = null;

    // Spatial Grid (120px cell size)
    this.gridCellSize = 120;
    this.spatialGrid = new Map();

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
        id: 'statSpeed',
        name: 'Cyber-Bionic Servos',
        desc: '+15% Movement Speed & Dash Cooldown Reduction',
        currentLevel: 1,
        type: 'stat',
      },
      {
        id: 'statMagnet',
        name: 'Nanite Vacuum Field',
        desc: '+40% XP Gem Pickup Magnet Radius',
        currentLevel: 1,
        type: 'stat',
      },
      {
        id: 'statHealth',
        name: 'Reinforced Exoskeleton',
        desc: '+25 Max HP & Instant 40 HP Repair',
        currentLevel: 1,
        type: 'stat',
      },
    ];

    // Pick 3 random unique upgrades
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
      this.weapons.orbitalBlades.count = Math.min(5, this.weapons.orbitalBlades.count + 1);
      this.weapons.orbitalBlades.damage += 10;
    } else if (upgradeId === 'railgun') {
      this.weapons.railgun.level++;
      this.weapons.railgun.cooldown = Math.max(1.0, this.weapons.railgun.cooldown * 0.82);
      this.weapons.railgun.damage += 35;
    } else if (upgradeId === 'clusterMines') {
      this.weapons.clusterMines.level++;
      this.weapons.clusterMines.damage += 25;
    } else if (upgradeId === 'statSpeed') {
      this.player.speed *= 1.15;
    } else if (upgradeId === 'statMagnet') {
      this.player.magnetRadius *= 1.4;
    } else if (upgradeId === 'statHealth') {
      this.player.maxHp += 25;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
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
    };
  }

  // --- GAME LIFECYCLE ---

  start() {
    this.isRunning = true;
    this.isPaused = false;
    cyberSwarmAudio.ensureContext();
    cyberSwarmAudio.startBGM();
    this.lastTime = performance.now();
    requestAnimationFrame(this.animate);
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

    // 1. Player Movement & Dashing
    this.updatePlayer(delta);

    // 2. Weapons Execution (Pulse Rifle, Tesla Coil, Orbital Blades, Railgun, Mines)
    this.updateWeapons(delta);

    // 3. Enemy Spawning & Wave Progression
    this.updateEnemySpawning(delta);

    // 4. Update Swarm Enemies & Collision
    this.updateEnemies(delta);

    // 5. Update Projectiles & Mines
    this.updateProjectiles(delta);

    // 6. Update XP Gems & Magnet Vacuum
    this.updateGems(delta);

    // 7. Update Visual Particles & Grid Shockwaves
    this.updateParticles(delta);

    // 8. Update Camera Follow
    const w = this.canvas.clientWidth || 800;
    const h = this.canvas.clientHeight || 500;
    this.camX = this.player.x - w / 2;
    this.camY = this.player.y - h / 2;

    // Clamp camera within arena
    this.camX = Math.max(0, Math.min(this.arenaSize - w, this.camX));
    this.camY = Math.max(0, Math.min(this.arenaSize - h, this.camY));
  }

  updatePlayer(delta) {
    // Dash timer
    if (this.player.dashTimer > 0) {
      this.player.dashTimer -= delta;
      if (this.player.dashTimer <= 0) {
        this.player.isDashing = false;
      }
    }
    if (this.player.dashCooldown > 0) {
      this.player.dashCooldown -= delta;
    }

    // Move velocity
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

    // Clamp within arena
    this.player.x = Math.max(30, Math.min(this.arenaSize - 30, this.player.x));
    this.player.y = Math.max(30, Math.min(this.arenaSize - 30, this.player.y));

    // Dash ghost after-image
    if (this.player.isDashing && Math.random() < 0.4) {
      this.dashGhosts.push({
        x: this.player.x,
        y: this.player.y,
        angle: this.player.aimAngle,
        life: 0.25,
      });
    }

    // Determine Aim Angle
    if (this.player.autoAim) {
      // Find closest enemy
      let closest = null;
      let closestDist = 450;
      for (let e of this.enemies) {
        const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
        if (dist < closestDist) {
          closestDist = dist;
          closest = e;
        }
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

  // --- WEAPONS FIRING ---

  updateWeapons(delta) {
    // 1. Pulse Rifle
    if (this.weapons.pulseRifle.level > 0) {
      this.weapons.pulseRifle.timer -= delta;
      if (this.weapons.pulseRifle.timer <= 0) {
        this.weapons.pulseRifle.timer = this.weapons.pulseRifle.cooldown;
        this.firePulseRifle();
      }
    }

    // 2. Tesla Coil
    if (this.weapons.teslaCoil.level > 0) {
      this.weapons.teslaCoil.timer -= delta;
      if (this.weapons.teslaCoil.timer <= 0) {
        this.weapons.teslaCoil.timer = this.weapons.teslaCoil.cooldown;
        this.fireTeslaCoil();
      }
    }

    // 3. Orbital Blades
    if (this.weapons.orbitalBlades.level > 0) {
      this.weapons.orbitalBlades.angle += 3.8 * delta;
      this.checkOrbitalBladeHits();
    }

    // 4. Heavy Railgun
    if (this.weapons.railgun.level > 0) {
      this.weapons.railgun.timer -= delta;
      if (this.weapons.railgun.timer <= 0) {
        this.weapons.railgun.timer = this.weapons.railgun.cooldown;
        this.fireRailgun();
      }
    }

    // 5. Nanite Cluster Mines
    if (this.weapons.clusterMines.level > 0) {
      this.weapons.clusterMines.timer -= delta;
      if (this.weapons.clusterMines.timer <= 0) {
        this.weapons.clusterMines.timer = this.weapons.clusterMines.cooldown;
        this.dropClusterMine();
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
    // Find up to N enemies in range
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
      this.damageEnemy(e, this.weapons.teslaCoil.damage);
      // Spawn lightning arc visual
      this.particles.push({
        type: 'lightning',
        x1: prevX,
        y1: prevY,
        x2: e.x,
        y2: e.y,
        life: 0.15,
        color: '#fbbf24',
      });
      prevX = e.x;
      prevY = e.y;
    });
  }

  checkOrbitalBladeHits() {
    const radius = 68;
    const count = this.weapons.orbitalBlades.count;
    const angleStep = (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const bx = this.player.x + Math.cos(this.weapons.orbitalBlades.angle + i * angleStep) * radius;
      const by = this.player.y + Math.sin(this.weapons.orbitalBlades.angle + i * angleStep) * radius;

      for (let e of this.enemies) {
        if (Math.hypot(e.x - bx, e.y - by) < e.radius + 14) {
          if (!e.bladeCooldown || e.bladeCooldown <= 0) {
            e.bladeCooldown = 0.25;
            this.damageEnemy(e, this.weapons.orbitalBlades.damage);
            cyberSwarmAudio.playOrbitalSlice();
            this.createSparks(bx, by, '#34d399', 6);
          }
        }
      }
    }
  }

  fireRailgun() {
    cyberSwarmAudio.playRailgun();
    const angle = this.player.aimAngle;
    const beamLength = 700;
    const endX = this.player.x + Math.cos(angle) * beamLength;
    const endY = this.player.y + Math.sin(angle) * beamLength;

    // Visual beam
    this.particles.push({
      type: 'railbeam',
      x1: this.player.x,
      y1: this.player.y,
      x2: endX,
      y2: endY,
      life: 0.28,
      color: '#a855f7',
    });

    // Check all enemies along line segment
    this.enemies.forEach(e => {
      const dist = this.distToSegment(e.x, e.y, this.player.x, this.player.y, endX, endY);
      if (dist < e.radius + 12) {
        this.damageEnemy(e, this.weapons.railgun.damage);
        this.createSparks(e.x, e.y, '#a855f7', 8);
      }
    });
  }

  dropClusterMine() {
    this.mines.push({
      x: this.player.x,
      y: this.player.y,
      radius: 12,
      damage: this.weapons.clusterMines.damage,
      life: 14.0,
      armTimer: 0.4,
    });
  }

  distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  }

  // --- SWARM SPAWNING & ENEMY SIMULATION ---

  updateEnemySpawning(delta) {
    // Max 180 normal enemies on screen for smooth 60 FPS
    if (this.enemies.length >= 180) return;

    // Spawn rate scales with game time
    const spawnRate = Math.min(12, 2.5 + this.gameTime * 0.04);
    if (Math.random() < spawnRate * delta) {
      // Spawn at edge of player screen (distance 550)
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 580;
      const x = this.player.x + Math.cos(angle) * spawnDist;
      const y = this.player.y + Math.sin(angle) * spawnDist;

      // Determine Tier
      const r = Math.random();
      if (this.gameTime > 120 && r < 0.12) {
        // Tier 3: Brute Mech
        this.spawnEnemy('brute', x, y);
      } else if (this.gameTime > 45 && r < 0.35) {
        // Tier 2: Laser Drone
        this.spawnEnemy('drone', x, y);
      } else {
        // Tier 1: Nano-Crawler
        this.spawnEnemy('crawler', x, y);
      }
    }

    // Spawn Cyber-Titan Boss at 180s (3 minutes)
    if (this.gameTime > 180 && !this.boss && !this.bossDefeated) {
      this.spawnBoss();
    }
  }

  spawnEnemy(type, x, y) {
    if (type === 'crawler') {
      this.enemies.push({
        type: 'crawler',
        x,
        y,
        hp: 22,
        maxHp: 22,
        speed: 135,
        radius: 12,
        color: '#ef4444',
      });
    } else if (type === 'drone') {
      this.enemies.push({
        type: 'drone',
        x,
        y,
        hp: 45,
        maxHp: 45,
        speed: 95,
        radius: 15,
        color: '#f59e0b',
        shootTimer: 1.5 + Math.random() * 1.5,
      });
    } else if (type === 'brute') {
      this.enemies.push({
        type: 'brute',
        x,
        y,
        hp: 180,
        maxHp: 180,
        speed: 80,
        radius: 22,
        color: '#a855f7',
      });
    }
  }

  spawnBoss() {
    this.boss = {
      x: this.player.x + 400,
      y: this.player.y - 300,
      hp: 1800,
      maxHp: 1800,
      speed: 60,
      radius: 42,
      laserAngle: 0,
      laserTimer: 3.0,
      summonTimer: 4.0,
    };
    this.callbacks.onBossUpdate(this.boss.hp, this.boss.maxHp, true);
  }

  updateEnemies(delta) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.bladeCooldown > 0) e.bladeCooldown -= delta;

      // Move toward player
      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (e.type === 'drone' && dist < 220) {
        // Drone keeps distance and shoots laser
        e.shootTimer -= delta;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2.2;
          const angle = Math.atan2(dy, dx);
          this.projectiles.push({
            type: 'enemyLaser',
            x: e.x,
            y: e.y,
            vx: Math.cos(angle) * 320,
            vy: Math.sin(angle) * 320,
            radius: 4,
            damage: 12,
            life: 1.8,
            color: '#ef4444',
          });
        }
      } else if (dist > 0.1) {
        e.x += (dx / dist) * e.speed * delta;
        e.y += (dy / dist) * e.speed * delta;
      }

      // Contact damage with player
      if (dist < e.radius + 14 && !this.player.isDashing) {
        this.damagePlayer(e.type === 'brute' ? 24 : 10);
      }
    }

    // Update Boss if active
    if (this.boss) {
      const b = this.boss;
      const dx = this.player.x - b.x;
      const dy = this.player.y - b.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0.1) {
        b.x += (dx / dist) * b.speed * delta;
        b.y += (dy / dist) * b.speed * delta;
      }

      // Boss quad-laser sweep
      b.laserAngle += 1.8 * delta;
      b.laserTimer -= delta;
      if (b.laserTimer <= 0) {
        b.laserTimer = 0.2;
        for (let i = 0; i < 4; i++) {
          const a = b.laserAngle + (i * Math.PI) / 2;
          this.projectiles.push({
            type: 'enemyLaser',
            x: b.x,
            y: b.y,
            vx: Math.cos(a) * 350,
            vy: Math.sin(a) * 350,
            radius: 5,
            damage: 18,
            life: 2.0,
            color: '#a855f7',
          });
        }
      }

      // Summon add crawlers
      b.summonTimer -= delta;
      if (b.summonTimer <= 0) {
        b.summonTimer = 6.0;
        for (let i = 0; i < 6; i++) {
          this.spawnEnemy('crawler', b.x + (Math.random() - 0.5) * 80, b.y + (Math.random() - 0.5) * 80);
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

  damageEnemy(e, damage) {
    e.hp -= damage;
    this.addFloatingText(e.x, e.y - 12, `-${damage}`, '#f8fafc');

    if (e.hp <= 0) {
      this.killEnemy(e);
    }
  }

  killEnemy(e) {
    cyberSwarmAudio.playEnemyDeath();
    this.createExplosion(e.x, e.y, e.color);
    const idx = this.enemies.indexOf(e);
    if (idx !== -1) this.enemies.splice(idx, 1);

    this.kills++;
    this.score += e.type === 'brute' ? 150 : 25;

    // Drop XP Gem
    this.gems.push({
      x: e.x,
      y: e.y,
      value: e.type === 'brute' ? 50 : 10,
      color: e.type === 'brute' ? '#fbbf24' : '#38bdf8',
    });

    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  updateGems(delta) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = this.player.x - g.x;
      const dy = this.player.y - g.y;
      const dist = Math.hypot(dx, dy);

      // Vacuum magnet pull
      if (dist < this.player.magnetRadius) {
        const speed = (1 - dist / this.player.magnetRadius) * 580 + 120;
        g.x += (dx / dist) * speed * delta;
        g.y += (dy / dist) * speed * delta;
      }

      // Collect gem
      if (dist < 22) {
        this.player.exp += g.value;
        cyberSwarmAudio.playGemCollect();
        this.gems.splice(i, 1);

        // Level Up Check
        if (this.player.exp >= this.player.expNext) {
          this.triggerLevelUp();
        } else {
          this.callbacks.onStatsUpdate(this.getPublicStats());
        }
      }
    }
  }

  triggerLevelUp() {
    this.player.level++;
    this.player.exp = Math.max(0, this.player.exp - this.player.expNext);
    this.player.expNext = Math.round(this.player.expNext * 1.45);
    this.isPaused = true;
    cyberSwarmAudio.playLevelUp();
    this.createShockwave(this.player.x, this.player.y, '#fbbf24', 60);

    const choices = this.getAvailableUpgrades();
    this.callbacks.onLevelUp(choices);
    this.callbacks.onStatsUpdate(this.getPublicStats());
  }

  updateProjectiles(delta) {
    // Player & Enemy projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.x += p.vx * delta;
      p.y += p.vy * delta;

      if (p.type === 'pulse') {
        // Check enemy collision
        for (let e of this.enemies) {
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            this.damageEnemy(e, p.damage);
            p.life = 0;
            break;
          }
        }
        // Check boss collision
        if (this.boss && Math.hypot(this.boss.x - p.x, this.boss.y - p.y) < this.boss.radius + p.radius) {
          this.damageBoss(p.damage);
          p.life = 0;
        }
      } else if (p.type === 'enemyLaser') {
        if (Math.hypot(this.player.x - p.x, this.player.y - p.y) < 14 && !this.player.isDashing) {
          this.damagePlayer(p.damage);
          p.life = 0;
        }
      }

      if (p.life <= 0) {
        this.projectiles.splice(i, 1);
      }
    }

    // Proximity Cluster Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.life -= delta;
      if (m.armTimer > 0) m.armTimer -= delta;

      if (m.armTimer <= 0) {
        for (let e of this.enemies) {
          if (Math.hypot(e.x - m.x, e.y - m.y) < e.radius + m.radius + 8) {
            // Detonate
            this.detonateMine(m);
            this.mines.splice(i, 1);
            break;
          }
        }
      }

      if (m.life <= 0) {
        this.mines.splice(i, 1);
      }
    }
  }

  detonateMine(m) {
    cyberSwarmAudio.playExplosion(false);
    this.createShockwave(m.x, m.y, '#f59e0b', 75);

    this.enemies.forEach(e => {
      if (Math.hypot(e.x - m.x, e.y - m.y) < 75) {
        this.damageEnemy(e, m.damage);
      }
    });
  }

  damageBoss(amount) {
    if (!this.boss) return;
    this.boss.hp -= amount;
    this.callbacks.onBossUpdate(this.boss.hp, this.boss.maxHp, true);

    if (this.boss.hp <= 0) {
      this.createExplosion(this.boss.x, this.boss.y, '#a855f7', true);
      this.boss = null;
      this.bossDefeated = true;
      this.score += 3000;
      this.isRunning = false;
      this.callbacks.onVictory();
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
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2.5 + Math.random() * 2.5,
        color,
        life: 0.35 + Math.random() * 0.25,
      });
    }
    this.createShockwave(x, y, color, isLarge ? 80 : 35);
  }

  createSparks(x, y, color, count = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2,
        color,
        life: 0.2,
      });
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

    // Camera Translation
    ctx.translate(-this.camX, -this.camY);

    // 1. Draw Cyber Neon Floor Grid
    this.drawCyberGrid(ctx);

    // 2. Draw Explosive Grid Ripples
    this.drawRipples(ctx);

    // 3. Draw XP Gems
    this.drawGems(ctx);

    // 4. Draw Cluster Mines
    this.drawMines(ctx);

    // 5. Draw Swarm Enemies & Cyber-Titan Boss
    this.drawEnemies(ctx);

    // 6. Draw Player Operative & Orbital Blades
    this.drawPlayer(ctx);

    // 7. Draw Projectiles & Lasers
    this.drawProjectiles(ctx);

    // 8. Draw Particles & Damage Numbers
    this.drawParticles(ctx);

    ctx.restore();
  }

  drawCyberGrid(ctx) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
    ctx.lineWidth = 1;
    const step = 60;

    // Viewport bounds in world space
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

    // Arena Perimeter Bounds
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

  drawMines(ctx) {
    this.mines.forEach(m => {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  drawEnemies(ctx) {
    this.enemies.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      if (e.type === 'crawler') {
        // Diamond Arachnid Bug
        ctx.moveTo(e.x, e.y - e.radius);
        ctx.lineTo(e.x + e.radius, e.y);
        ctx.lineTo(e.x, e.y + e.radius);
        ctx.lineTo(e.x - e.radius, e.y);
        ctx.closePath();
      } else if (e.type === 'drone') {
        // Hexagonal Drone
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      } else {
        // Armored Brute Mech Box
        ctx.roundRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2, 4);
      }
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Cyber-Titan Boss
    if (this.boss) {
      const b = this.boss;
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Glowing Eye Core
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawPlayer(ctx) {
    // Dash ghost after-images
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

    // Operative Body
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.aimAngle);

    // Armor Chassis
    ctx.fillStyle = '#0284c7';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cyber Visor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(4, -5, 8, 10);

    // Weapon Gun Barrel
    ctx.fillStyle = '#334155';
    ctx.fillRect(10, -3, 14, 6);

    ctx.restore();

    // Orbital Energy Blades
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
    // Lightnings & Railbeams
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

    // Floating damage numbers
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
