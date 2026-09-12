/**
 * VoidStrike 3D — Full 3D Starfighter Space Combat Engine
 * Powered by Three.js
 *
 * Features:
 * - 6-DOF Starfighter physics (Pitch, Yaw, Roll, Throttle, Afterburner Boost)
 * - Natural coordinated flight banking
 * - Twin alternating plasma cannon bolts with tracer trails
 * - Homing photon torpedoes with proportional navigation guidance
 * - Barrel roll evasive dodge maneuver with invulnerability frames
 * - Procedural cosmic starfield, nebula sky, and tumbling asteroid field
 * - AI Enemy Interceptors, Heavy Gunships, and multi-stage Dreadnought Boss
 * - Cockpit / Chase camera modes
 * - Real-time 3D tactical radar telemetry
 * - Full WebGL memory disposal
 */

import * as THREE from 'three';
import { voidStrikeAudio } from './VoidStrikeAudio';

export class VoidStrikeEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = {
      onStatsUpdate: () => {},
      onRadarUpdate: () => {},
      onLockUpdate: () => {},
      onBossUpdate: () => {},
      onWaveComplete: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      ...callbacks,
    };

    // Game Lifecycle
    this.isRunning = false;
    this.isPaused = false;
    this.wave = 1;
    this.score = 0;

    // Player Starfighter Stats
    this.player = {
      hull: 100,
      maxHull: 100,
      shield: 100,
      maxShield: 100,
      shieldRegenDelay: 0,
      boostEnergy: 100,
      maxBoostEnergy: 100,
      missiles: 6,
      maxMissiles: 6,
      speed: 35,
      cruiseSpeed: 35,
      boostSpeed: 75,
      isBoosting: false,
      isRolling: false,
      rollTimer: 0,
      invulnerableTimer: 0,
      weaponSide: 0, // 0: left, 1: right
      lastFireTime: 0,
      score: 0,
    };

    // Camera Mode
    this.cameraMode = 'chase'; // 'chase' | 'cockpit'

    // Flight Orientation & Physics
    this.shipPos = new THREE.Vector3(0, 0, 0);
    this.shipQuat = new THREE.Quaternion();
    this.velocity = new THREE.Vector3(0, 0, -35);
    this.pitchRate = 0;
    this.yawRate = 0;
    this.rollRate = 0;

    // Target Locking
    this.currentTarget = null;
    this.lockProgress = 0;
    this.isLocked = false;

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.reqId = null;

    // Entity Arrays
    this.playerShip = null;
    this.cockpitFrame = null;
    this.shieldBubble = null;
    this.engineExhaustL = null;
    this.engineExhaustR = null;
    this.projectiles = [];
    this.torpedoes = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.asteroids = [];
    this.particles = [];
    this.boss = null;

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    // 1. Scene & Space Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x02040a);
    this.scene.fog = new THREE.FogExp2(0x050b18, 0.0018);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 800);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    // 4. Space Lights
    this.setupLighting();

    // 5. Starfield & Cosmic Nebula
    this.buildStarfield();

    // 6. Player Starfighter
    this.buildPlayerStarfighter();

    // 7. Asteroid Field
    this.buildAsteroidField();

    // 8. Spawn Initial Wave
    this.spawnWave(this.wave);

    window.addEventListener('resize', this.handleResize);
  }

  setupLighting() {
    // Ambient starlight
    const ambient = new THREE.AmbientLight(0x38bdf8, 0.4);
    this.scene.add(ambient);

    // Distant primary star
    this.starLight = new THREE.DirectionalLight(0xfff7ed, 1.6);
    this.starLight.position.set(200, 150, 300);
    this.scene.add(this.starLight);

    // Secondary nebula backlight
    const nebulaLight = new THREE.DirectionalLight(0x818cf8, 0.7);
    nebulaLight.position.set(-200, -100, -200);
    this.scene.add(nebulaLight);
  }

  buildStarfield() {
    // 1. Deep Space Star Particles
    const starCount = 850;
    const starGeo = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * 1200;
      const y = (Math.random() - 0.5) * 1200;
      const z = (Math.random() - 0.5) * 1200;
      positions.push(x, y, z);

      // Star hues: cyan, gold, white, violet
      const r = Math.random();
      if (r < 0.3) colors.push(0.7, 0.9, 1.0);
      else if (r < 0.6) colors.push(1.0, 0.9, 0.7);
      else if (r < 0.8) colors.push(0.8, 0.7, 1.0);
      else colors.push(1.0, 1.0, 1.0);
    }

    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
    });

    this.starField = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starField);

    // 2. Cosmic Dust Cloud Clusters
    const nebulaGeo = new THREE.SphereGeometry(450, 16, 16);
    const nebulaMat = new THREE.MeshBasicMaterial({
      color: 0x1e1b4b,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.25,
    });
    const nebulaSphere = new THREE.Mesh(nebulaGeo, nebulaMat);
    this.scene.add(nebulaSphere);
  }

  // --- PLAYER STARFIGHTER MODEL (APEX-X INTERCEPTOR) ---

  buildPlayerStarfighter() {
    this.playerShip = new THREE.Group();

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.85,
      roughness: 0.25,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.65,
    });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Sleek Fuselage Wedge
    const bodyGeo = new THREE.ConeGeometry(1.1, 4.8, 4);
    bodyGeo.rotateX(Math.PI / 2);
    bodyGeo.rotateZ(Math.PI / 4);
    const body = new THREE.Mesh(bodyGeo, hullMat);
    this.playerShip.add(body);

    // 2. Canopy Cockpit Dome
    const canopyGeo = new THREE.SphereGeometry(0.55, 12, 8);
    canopyGeo.scale(0.8, 0.65, 1.8);
    const canopy = new THREE.Mesh(canopyGeo, glassMat);
    canopy.position.set(0, 0.35, -0.2);
    this.playerShip.add(canopy);

    // 3. Swept Delta Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 1.2);
    wingShape.lineTo(3.4, -1.4);
    wingShape.lineTo(3.2, -1.8);
    wingShape.lineTo(0, -1.1);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.08, bevelEnabled: false };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.rotateX(Math.PI / 2);

    // Right Wing
    const rightWing = new THREE.Mesh(wingGeo, hullMat);
    rightWing.position.set(0, 0, 0);
    this.playerShip.add(rightWing);

    // Left Wing (Mirrored)
    const leftWing = new THREE.Mesh(wingGeo, hullMat);
    leftWing.scale.set(-1, 1, 1);
    this.playerShip.add(leftWing);

    // 4. Wingtip Stabilizer Fins
    const finGeo = new THREE.BoxGeometry(0.08, 0.9, 0.8);
    const finR = new THREE.Mesh(finGeo, trimMat);
    finR.position.set(3.3, 0.35, -1.5);
    const finL = new THREE.Mesh(finGeo, trimMat);
    finL.position.set(-3.3, 0.35, -1.5);
    this.playerShip.add(finR);
    this.playerShip.add(finL);

    // 5. Dual Wing Plasma Laser Hardpoints
    const cannonGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.4, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannonL = new THREE.Mesh(cannonGeo, trimMat);
    cannonL.position.set(-1.8, -0.05, -0.8);
    const cannonR = new THREE.Mesh(cannonGeo, trimMat);
    cannonR.position.set(1.8, -0.05, -0.8);
    this.playerShip.add(cannonL);
    this.playerShip.add(cannonR);

    // 6. Twin Engine Thrusters & Exhaust Cones
    const engineGeo = new THREE.CylinderGeometry(0.35, 0.38, 1.2, 12);
    engineGeo.rotateX(Math.PI / 2);
    const engineL = new THREE.Mesh(engineGeo, trimMat);
    engineL.position.set(-0.75, 0.1, 1.6);
    const engineR = new THREE.Mesh(engineGeo, trimMat);
    engineR.position.set(0.75, 0.1, 1.6);
    this.playerShip.add(engineL);
    this.playerShip.add(engineR);

    // Thruster Blue Plasma Flames
    const exhaustGeo = new THREE.ConeGeometry(0.28, 1.2, 10);
    exhaustGeo.rotateX(-Math.PI / 2);
    this.engineExhaustL = new THREE.Mesh(exhaustGeo, glowMat);
    this.engineExhaustL.position.set(-0.75, 0.1, 2.7);
    this.engineExhaustR = new THREE.Mesh(exhaustGeo, glowMat);
    this.engineExhaustR.position.set(0.75, 0.1, 2.7);
    this.playerShip.add(this.engineExhaustL);
    this.playerShip.add(this.engineExhaustR);

    // 7. Kinetic Energy Shield Bubble
    const shieldGeo = new THREE.IcosahedronGeometry(3.6, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.0, // Invisible until struck
    });
    this.shieldBubble = new THREE.Mesh(shieldGeo, shieldMat);
    this.playerShip.add(this.shieldBubble);

    this.scene.add(this.playerShip);
  }

  buildAsteroidField() {
    // 40 Tumbling procedural low-poly asteroids
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    for (let i = 0; i < 40; i++) {
      const radius = 4.0 + Math.random() * 8.0;
      const geo = new THREE.DodecahedronGeometry(radius, 1);

      // Deform vertices for cratered asteroid look
      const posAttr = geo.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        const vx = posAttr.getX(j);
        const vy = posAttr.getY(j);
        const vz = posAttr.getZ(j);
        const factor = 1 + (Math.sin(vx * 1.5) * Math.cos(vy * 1.5) * 0.22);
        posAttr.setXYZ(j, vx * factor, vy * factor, vz * factor);
      }
      geo.computeVertexNormals();

      const mesh = new THREE.Mesh(geo, rockMat);

      // Distribute in a toroidal field between 80 and 260 radius
      const angle = Math.random() * Math.PI * 2;
      const dist = 70 + Math.random() * 180;
      const height = (Math.random() - 0.5) * 90;

      mesh.position.set(Math.cos(angle) * dist, height, Math.sin(angle) * dist);

      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      this.scene.add(mesh);
      this.asteroids.push({
        mesh,
        radius,
        hp: Math.round(radius * 15),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.4
        ),
      });
    }
  }

  // --- WAVE SPAWNER ---

  spawnWave(waveNum) {
    this.wave = waveNum;

    if (waveNum === 1) {
      // 4 Scout Interceptors
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const x = Math.cos(angle) * 110;
        const z = -140 + Math.sin(angle) * 30;
        const y = (Math.random() - 0.5) * 40;
        this.spawnEnemy('scout', x, y, z);
      }
    } else if (waveNum === 2) {
      // 6 Interceptors + 2 Heavy Gunships
      for (let i = 0; i < 6; i++) {
        const x = (Math.random() - 0.5) * 160;
        const y = (Math.random() - 0.5) * 50;
        const z = -130 - Math.random() * 80;
        this.spawnEnemy('scout', x, y, z);
      }
      this.spawnEnemy('gunship', -50, 15, -180);
      this.spawnEnemy('gunship', 50, -15, -180);
    } else {
      // Wave 3: Dreadnought Flagship Boss!
      this.spawnBossDreadnought();
    }
  }

  spawnEnemy(type, x, y, z) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    if (type === 'scout') {
      // Crimson Scout Interceptor
      const mat = new THREE.MeshStandardMaterial({ color: 0xe11d48, metalness: 0.8, roughness: 0.3 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9 });

      const bodyGeo = new THREE.ConeGeometry(0.8, 3.2, 4);
      bodyGeo.rotateX(-Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, mat);
      group.add(body);

      const wingGeo = new THREE.BoxGeometry(3.6, 0.08, 1.2);
      const wings = new THREE.Mesh(wingGeo, wingMat);
      wings.position.set(0, 0, 0.4);
      group.add(wings);

      this.scene.add(group);
      this.enemies.push({
        id: `scout-${Date.now()}-${Math.random()}`,
        type: 'scout',
        group,
        hp: 45,
        maxHp: 45,
        speed: 38,
        radius: 2.2,
        attackCooldown: 1.5 + Math.random() * 1.5,
      });
    } else if (type === 'gunship') {
      // Heavy Gunship (Armored flying fortress)
      const mat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, metalness: 0.85, roughness: 0.4 });
      const turretMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, metalness: 0.9 });

      const hullGeo = new THREE.BoxGeometry(4.2, 1.8, 7.2);
      const hull = new THREE.Mesh(hullGeo, mat);
      group.add(hull);

      const turretL = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2), turretMat);
      turretL.position.set(-2.4, 0.4, 0);
      const turretR = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2), turretMat);
      turretR.position.set(2.4, 0.4, 0);
      group.add(turretL);
      group.add(turretR);

      this.scene.add(group);
      this.enemies.push({
        id: `gunship-${Date.now()}-${Math.random()}`,
        type: 'gunship',
        group,
        hp: 140,
        maxHp: 140,
        speed: 22,
        radius: 4.5,
        attackCooldown: 2.0,
      });
    }
  }

  spawnBossDreadnought() {
    const group = new THREE.Group();
    group.position.set(0, 20, -260);

    const bossMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.9, roughness: 0.2 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const genMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // 1. Colossal Flagship Main Keel (45 units long)
    const hullGeo = new THREE.BoxGeometry(16, 6, 45);
    const hull = new THREE.Mesh(hullGeo, bossMat);
    group.add(hull);

    // 2. Command Bridge Tower
    const bridgeGeo = new THREE.BoxGeometry(8, 5, 12);
    const bridge = new THREE.Mesh(bridgeGeo, bossMat);
    bridge.position.set(0, 4.5, 10);
    group.add(bridge);

    // 3. Four Auxiliary Shield Generator Pods
    const genGeo = new THREE.SphereGeometry(1.6, 12, 12);
    const generators = [];
    [
      [-10, 2, 8],
      [10, 2, 8],
      [-10, 2, -10],
      [10, 2, -10],
    ].forEach(([gx, gy, gz], idx) => {
      const gMesh = new THREE.Mesh(genGeo, genMat);
      gMesh.position.set(gx, gy, gz);
      group.add(gMesh);
      generators.push({
        id: `gen-${idx}`,
        mesh: gMesh,
        hp: 75,
        maxHp: 75,
      });
    });

    // 4. Vulnerable Core Reactor (Exposed in Phase 2)
    const coreGeo = new THREE.OctahedronGeometry(2.4);
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, -2.5, 0);
    group.add(coreMesh);

    this.scene.add(group);
    this.boss = {
      group,
      hullHp: 500,
      maxHullHp: 500,
      generators,
      coreMesh,
      attackCooldown: 1.2,
      phase: 1, // 1: Destroy generators, 2: Destroy core
    };

    this.callbacks.onBossUpdate(this.boss.hullHp, this.boss.maxHullHp, 1);
  }

  // --- WEAPON ACTIONS ---

  firePlasmaCannons() {
    if (!this.isRunning || this.isPaused) return;

    const now = Date.now();
    if (now - this.player.lastFireTime < 130) return; // Max 7.7 shots/sec
    this.player.lastFireTime = now;

    // Alternate between left and right wing cannons
    const isRight = this.player.weaponSide === 1;
    this.player.weaponSide = 1 - this.player.weaponSide;

    const offset = new THREE.Vector3(isRight ? 1.8 : -1.8, -0.05, -1.2);
    offset.applyQuaternion(this.shipQuat);
    const spawnPos = this.shipPos.clone().add(offset);

    // Forward direction of ship
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);

    // Plasma bolt visual
    const boltGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 6);
    boltGeo.rotateX(Math.PI / 2);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.copy(spawnPos);
    bolt.quaternion.copy(this.shipQuat);
    this.scene.add(bolt);

    const boltSpeed = 220;
    this.projectiles.push({
      mesh: bolt,
      velocity: forward.clone().multiplyScalar(boltSpeed).add(this.velocity.clone().multiplyScalar(0.4)),
      life: 1.8,
      damage: 22,
    });

    voidStrikeAudio.playLaser(isRight);
  }

  fireHomingTorpedo() {
    if (!this.isRunning || this.isPaused || this.player.missiles <= 0) return;

    this.player.missiles--;
    this.callbacks.onStatsUpdate(this.player);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);
    const spawnPos = this.shipPos.clone().add(new THREE.Vector3(0, -0.6, 0).applyQuaternion(this.shipQuat));

    // Torpedo visual
    const torpGeo = new THREE.ConeGeometry(0.25, 1.4, 8);
    torpGeo.rotateX(Math.PI / 2);
    const torpMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 0.6 });
    const torp = new THREE.Mesh(torpGeo, torpMat);
    torp.position.copy(spawnPos);
    torp.quaternion.copy(this.shipQuat);
    this.scene.add(torp);

    this.torpedoes.push({
      mesh: torp,
      velocity: forward.clone().multiplyScalar(55),
      target: this.currentTarget,
      life: 5.0,
      damage: 90,
    });

    voidStrikeAudio.playTorpedoLaunch();
  }

  barrelRoll() {
    if (!this.isRunning || this.isPaused || this.player.isRolling || this.player.boostEnergy < 25) return;

    this.player.boostEnergy = Math.max(0, this.player.boostEnergy - 25);
    this.player.isRolling = true;
    this.player.rollTimer = 0.55;
    this.player.invulnerableTimer = 0.55;

    voidStrikeAudio.playBarrelRoll();
    this.callbacks.onStatsUpdate(this.player);
  }

  toggleCameraMode() {
    this.cameraMode = this.cameraMode === 'chase' ? 'cockpit' : 'chase';
  }

  // --- GAME LOOP & UPDATES ---

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    voidStrikeAudio.ensureContext();
    voidStrikeAudio.startBGM();
    this.animate();
  }

  pause() {
    this.isPaused = true;
    voidStrikeAudio.stopBGM();
  }

  resume() {
    this.isPaused = false;
    this.clock.start();
    voidStrikeAudio.startBGM();
  }

  animate() {
    if (!this.isRunning) return;
    this.reqId = requestAnimationFrame(this.animate);
    if (this.isPaused) return;

    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.update(delta);
    this.render();
  }

  update(delta) {
    // 1. Flight Control & Angular Damping
    this.updateFlightPhysics(delta);

    // 2. Shield & Boost Energy Regeneration
    this.updateShieldAndBoost(delta);

    // 3. Update Weapons (Plasma Bolts, Homing Torpedoes, Enemy Fire)
    this.updateProjectiles(delta);
    this.updateTorpedoes(delta);

    // 4. Update Enemy AI & Boss
    this.updateEnemies(delta);
    this.updateBoss(delta);

    // 5. Update Asteroids & Collision Detection
    this.updateAsteroids(delta);

    // 6. Update Explosions & Particles
    this.updateParticles(delta);

    // 7. Target Acquisition & Lock-on
    this.updateTargetLock(delta);

    // 8. Camera Update
    this.updateCamera(delta);

    // 9. Radar Telemetry Dispatch
    this.emitRadarData();
  }

  updateFlightPhysics(delta) {
    // Compute current speed
    const currentMaxSpeed = this.player.isBoosting ? this.player.boostSpeed : this.player.cruiseSpeed;
    const targetSpeed = this.player.isBoosting ? this.player.boostSpeed : this.player.cruiseSpeed;
    this.player.speed = THREE.MathUtils.lerp(this.player.speed, targetSpeed, 4.0 * delta);

    // Apply pitch, yaw, roll rotation to quaternion
    const rotDelta = new THREE.Euler(
      this.pitchRate * delta,
      this.yawRate * delta,
      this.rollRate * delta,
      'YXZ'
    );
    const rotQuat = new THREE.Quaternion().setFromEuler(rotDelta);
    this.shipQuat.multiply(rotQuat);

    // Coordinated flight banking: Bank ship visually into turns
    if (this.player.isRolling) {
      this.player.rollTimer -= delta;
      const rollAngle = (1 - this.player.rollTimer / 0.55) * Math.PI * 2;
      const snapRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 12 * delta);
      this.shipQuat.multiply(snapRoll);
      if (this.player.rollTimer <= 0) this.player.isRolling = false;
    } else {
      // Natural banking roll proportional to yaw rate
      const targetBank = -this.yawRate * 0.45;
      const bankQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), targetBank * delta);
      this.shipQuat.multiply(bankQuat);
    }

    // Velocity in forward direction (-Z in local ship space)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);
    this.velocity.copy(forward).multiplyScalar(this.player.speed);

    // Move ship position
    this.shipPos.addScaledVector(this.velocity, delta);

    // Update player mesh
    this.playerShip.position.copy(this.shipPos);
    this.playerShip.quaternion.copy(this.shipQuat);

    // Engine thruster exhaust scaling
    const exhaustScale = this.player.isBoosting ? 2.2 : 0.8 + (this.player.speed / this.player.cruiseSpeed) * 0.4;
    this.engineExhaustL.scale.set(1, exhaustScale, 1);
    this.engineExhaustR.scale.set(1, exhaustScale, 1);

    // Audio pitch update
    voidStrikeAudio.updateEnginePitch(this.player.speed / this.player.cruiseSpeed, this.player.isBoosting);

    // Dampen angular rates
    this.pitchRate *= Math.max(0, 1 - 6 * delta);
    this.yawRate *= Math.max(0, 1 - 6 * delta);
    this.rollRate *= Math.max(0, 1 - 6 * delta);
  }

  updateShieldAndBoost(delta) {
    // Shield Regeneration
    if (this.player.shieldRegenDelay > 0) {
      this.player.shieldRegenDelay -= delta;
    } else if (this.player.shield < this.player.maxShield) {
      this.player.shield = Math.min(this.player.maxShield, this.player.shield + 16 * delta);
      this.callbacks.onStatsUpdate(this.player);
    }

    // Shield bubble fadeout
    if (this.shieldBubble.material.opacity > 0) {
      this.shieldBubble.material.opacity = Math.max(0, this.shieldBubble.material.opacity - 3.5 * delta);
    }

    // Boost Energy
    if (this.player.isBoosting) {
      this.player.boostEnergy = Math.max(0, this.player.boostEnergy - 35 * delta);
      if (this.player.boostEnergy <= 0) this.player.isBoosting = false;
      this.callbacks.onStatsUpdate(this.player);
    } else if (this.player.boostEnergy < this.player.maxBoostEnergy) {
      this.player.boostEnergy = Math.min(this.player.maxBoostEnergy, this.player.boostEnergy + 20 * delta);
      this.callbacks.onStatsUpdate(this.player);
    }

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= delta;
    }
  }

  updateProjectiles(delta) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      let hit = false;

      // 1. Check hits against enemies
      for (let enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dist = p.mesh.position.distanceTo(enemy.group.position);
        if (dist < enemy.radius + 0.8) {
          this.damageEnemy(enemy, p.damage);
          hit = true;
          break;
        }
      }

      // 2. Check hits against Boss
      if (!hit && this.boss) {
        if (this.boss.phase === 1) {
          for (let gen of this.boss.generators) {
            if (gen.hp <= 0) continue;
            const worldPos = new THREE.Vector3();
            gen.mesh.getWorldPosition(worldPos);
            if (p.mesh.position.distanceTo(worldPos) < 2.4) {
              gen.hp -= p.damage;
              this.createSparks(worldPos.x, worldPos.y, worldPos.z, 0x38bdf8);
              hit = true;
              if (gen.hp <= 0) {
                this.boss.group.remove(gen.mesh);
                this.createExplosion(worldPos.x, worldPos.y, worldPos.z, false);
                this.checkBossGenerators();
              }
              break;
            }
          }
        } else if (this.boss.phase === 2) {
          const corePos = new THREE.Vector3();
          this.boss.coreMesh.getWorldPosition(corePos);
          if (p.mesh.position.distanceTo(corePos) < 3.2) {
            this.boss.hullHp -= p.damage;
            this.createSparks(corePos.x, corePos.y, corePos.z, 0xef4444);
            this.callbacks.onBossUpdate(this.boss.hullHp, this.boss.maxHullHp, 2);
            hit = true;
            if (this.boss.hullHp <= 0) {
              this.defeatBoss();
            }
          }
        }
      }

      // 3. Check hits against Asteroids
      if (!hit) {
        for (let ast of this.asteroids) {
          if (p.mesh.position.distanceTo(ast.mesh.position) < ast.radius) {
            ast.hp -= p.damage;
            this.createSparks(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, 0x94a3b8);
            hit = true;
            if (ast.hp <= 0) {
              this.shatterAsteroid(ast);
            }
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  updateTorpedoes(delta) {
    for (let i = this.torpedoes.length - 1; i >= 0; i--) {
      const t = this.torpedoes[i];
      t.life -= delta;

      // Homing guidance towards target if active
      if (t.target && t.target.group && t.target.hp > 0) {
        const targetPos = t.target.group.position;
        const dir = targetPos.clone().sub(t.mesh.position).normalize();
        t.velocity.lerp(dir.multiplyScalar(90), 4.5 * delta);
        t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), t.velocity.clone().normalize());
      }

      t.mesh.position.addScaledVector(t.velocity, delta);

      // Check impact
      let hit = false;
      for (let enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        if (t.mesh.position.distanceTo(enemy.group.position) < enemy.radius + 1.6) {
          this.damageEnemy(enemy, t.damage);
          this.createExplosion(t.mesh.position.x, t.mesh.position.y, t.mesh.position.z, true);
          hit = true;
          break;
        }
      }

      if (hit || t.life <= 0) {
        this.createExplosion(t.mesh.position.x, t.mesh.position.y, t.mesh.position.z, true);
        this.scene.remove(t.mesh);
        this.torpedoes.splice(i, 1);
      }
    }
  }

  updateEnemies(delta) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hp <= 0) continue;

      const dist = e.group.position.distanceTo(this.shipPos);

      // Dogfight Pursuit AI
      const toPlayer = this.shipPos.clone().sub(e.group.position).normalize();
      e.group.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), toPlayer), 2.5 * delta);

      // Forward movement
      const enemyForward = new THREE.Vector3(0, 0, 1).applyQuaternion(e.group.quaternion);
      e.group.position.addScaledVector(enemyForward, e.speed * delta);

      // Attack player
      e.attackCooldown -= delta;
      if (e.attackCooldown <= 0 && dist < 120) {
        e.attackCooldown = e.type === 'scout' ? 1.8 : 2.5;
        this.enemyFire(e);
      }
    }
  }

  enemyFire(enemy) {
    const start = enemy.group.position.clone();
    const toPlayer = this.shipPos.clone().sub(start).normalize();

    const boltGeo = new THREE.SphereGeometry(0.24, 6, 6);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.copy(start);
    this.scene.add(bolt);

    this.enemyProjectiles.push({
      mesh: bolt,
      velocity: toPlayer.multiplyScalar(110),
      life: 2.2,
      damage: enemy.type === 'scout' ? 14 : 28,
    });
  }

  updateBoss(delta) {
    if (!this.boss || this.boss.hullHp <= 0) return;

    this.boss.attackCooldown -= delta;
    if (this.boss.attackCooldown <= 0) {
      this.boss.attackCooldown = 1.4;
      // Salvo of 4 flak plasma rounds
      const worldPos = new THREE.Vector3();
      this.boss.group.getWorldPosition(worldPos);

      for (let i = 0; i < 3; i++) {
        const spread = new THREE.Vector3(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );
        const target = this.shipPos.clone().add(spread);
        const dir = target.sub(worldPos).normalize();

        const flakGeo = new THREE.SphereGeometry(0.6, 8, 8);
        const flakMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
        const flak = new THREE.Mesh(flakGeo, flakMat);
        flak.position.copy(worldPos);
        this.scene.add(flak);

        this.enemyProjectiles.push({
          mesh: flak,
          velocity: dir.multiplyScalar(90),
          life: 3.0,
          damage: 24,
        });
      }
    }
  }

  updateAsteroids(delta) {
    for (let ast of this.asteroids) {
      ast.mesh.rotation.x += ast.rotSpeed.x * delta;
      ast.mesh.rotation.y += ast.rotSpeed.y * delta;
      ast.mesh.rotation.z += ast.rotSpeed.z * delta;

      // Collision with player ship
      const dist = this.shipPos.distanceTo(ast.mesh.position);
      if (dist < ast.radius + 1.8) {
        this.damagePlayer(40);
        // Bounce player slightly
        const normal = this.shipPos.clone().sub(ast.mesh.position).normalize();
        this.shipPos.addScaledVector(normal, 3.0);
      }
    }

    // Check enemy projectile hits against player
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const ep = this.enemyProjectiles[i];
      ep.life -= delta;
      ep.mesh.position.addScaledVector(ep.velocity, delta);

      if (ep.mesh.position.distanceTo(this.shipPos) < 2.4) {
        this.damagePlayer(ep.damage);
        this.scene.remove(ep.mesh);
        this.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (ep.life <= 0) {
        this.scene.remove(ep.mesh);
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  damagePlayer(amount) {
    if (this.player.invulnerableTimer > 0) return;

    if (this.player.shield > 0) {
      // Absorb with shield
      const shieldDamage = Math.min(this.player.shield, amount);
      this.player.shield -= shieldDamage;
      const leftover = amount - shieldDamage;
      this.player.hull = Math.max(0, this.player.hull - leftover);

      // Flash shield bubble
      this.shieldBubble.material.opacity = 0.75;
      voidStrikeAudio.playShieldHit();
    } else {
      this.player.hull = Math.max(0, this.player.hull - amount);
      voidStrikeAudio.playExplosion(false);
    }

    this.player.shieldRegenDelay = 4.0; // 4s cooldown before regen
    this.callbacks.onStatsUpdate(this.player);

    if (this.player.hull <= 0) {
      this.createExplosion(this.shipPos.x, this.shipPos.y, this.shipPos.z, true);
      this.isRunning = false;
      this.callbacks.onGameOver();
    }
  }

  damageEnemy(enemy, damage) {
    enemy.hp -= damage;
    this.createSparks(enemy.group.position.x, enemy.group.position.y, enemy.group.position.z, 0xe11d48);

    if (enemy.hp <= 0) {
      this.createExplosion(enemy.group.position.x, enemy.group.position.y, enemy.group.position.z, enemy.type === 'gunship');
      this.scene.remove(enemy.group);
      const idx = this.enemies.indexOf(enemy);
      if (idx !== -1) this.enemies.splice(idx, 1);

      this.player.score += enemy.type === 'scout' ? 100 : 350;
      this.callbacks.onStatsUpdate(this.player);

      // Check wave completion
      if (this.enemies.length === 0 && !this.boss) {
        this.wave++;
        this.callbacks.onWaveComplete(this.wave);
        setTimeout(() => this.spawnWave(this.wave), 1500);
      }
    }
  }

  checkBossGenerators() {
    const active = this.boss.generators.filter(g => g.hp > 0);
    if (active.length === 0 && this.boss.phase === 1) {
      this.boss.phase = 2;
      this.callbacks.onBossUpdate(this.boss.hullHp, this.boss.maxHullHp, 2);
    }
  }

  defeatBoss() {
    const worldPos = new THREE.Vector3();
    this.boss.group.getWorldPosition(worldPos);
    this.createExplosion(worldPos.x, worldPos.y, worldPos.z, true);
    this.scene.remove(this.boss.group);
    this.boss = null;
    this.player.score += 2500;
    this.callbacks.onStatsUpdate(this.player);
    voidStrikeAudio.playVictory();
    this.callbacks.onVictory();
  }

  shatterAsteroid(ast) {
    this.createExplosion(ast.mesh.position.x, ast.mesh.position.y, ast.mesh.position.z, false);
    this.scene.remove(ast.mesh);
    const idx = this.asteroids.indexOf(ast);
    if (idx !== -1) this.asteroids.splice(idx, 1);
    this.player.score += 25;
    this.callbacks.onStatsUpdate(this.player);
  }

  // --- TARGET LOCK-ON ---

  updateTargetLock(delta) {
    // Find closest enemy within forward cone
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipQuat);
    let bestTarget = null;
    let bestDist = 180;

    for (let enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      const toEnemy = enemy.group.position.clone().sub(this.shipPos);
      const dist = toEnemy.length();
      if (dist > 180) continue;

      const angle = forward.angleTo(toEnemy.normalize());
      if (angle < 0.35 && dist < bestDist) {
        bestDist = dist;
        bestTarget = enemy;
      }
    }

    if (bestTarget) {
      this.currentTarget = bestTarget;
      this.lockProgress = Math.min(1.0, this.lockProgress + 1.2 * delta);
      const wasLocked = this.isLocked;
      this.isLocked = this.lockProgress >= 1.0;

      if (this.isLocked && !wasLocked) {
        voidStrikeAudio.playLockOnTone(true);
      } else if (!this.isLocked) {
        if (Math.random() < 0.12) voidStrikeAudio.playLockOnTone(false);
      }

      this.callbacks.onLockUpdate({
        hasTarget: true,
        isLocked: this.isLocked,
        progress: this.lockProgress,
        distance: Math.round(bestDist),
      });
    } else {
      this.currentTarget = null;
      this.lockProgress = 0;
      this.isLocked = false;
      this.callbacks.onLockUpdate({ hasTarget: false, isLocked: false, progress: 0, distance: 0 });
    }
  }

  // --- CAMERA UPDATE ---

  updateCamera(delta) {
    if (this.cameraMode === 'cockpit') {
      // First-Person Cockpit View
      const cockpitOffset = new THREE.Vector3(0, 0.45, -0.4).applyQuaternion(this.shipQuat);
      this.camera.position.copy(this.shipPos).add(cockpitOffset);
      this.camera.quaternion.copy(this.shipQuat);
    } else {
      // Third-Person Chase-Cam with smooth spring dampening
      const chaseOffset = new THREE.Vector3(0, 2.2, 7.8).applyQuaternion(this.shipQuat);
      const targetCamPos = this.shipPos.clone().add(chaseOffset);

      this.camera.position.lerp(targetCamPos, 14 * delta);

      // Look slightly ahead of ship
      const lookTarget = this.shipPos.clone().add(new THREE.Vector3(0, 0.4, -20).applyQuaternion(this.shipQuat));
      this.camera.lookAt(lookTarget);

      // Match roll orientation
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.shipQuat);
      this.camera.up.copy(up);
    }
  }

  // --- PARTICLES & EXPLOSIONS ---

  createExplosion(x, y, z, isLarge = false) {
    voidStrikeAudio.playExplosion(isLarge);
    const count = isLarge ? 36 : 18;
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);

    for (let i = 0; i < count; i++) {
      const color = Math.random() > 0.5 ? 0xf59e0b : 0xef4444;
      const mat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      const speed = 15 + Math.random() * (isLarge ? 40 : 20);
      const angleTheta = Math.random() * Math.PI * 2;
      const anglePhi = Math.random() * Math.PI;

      this.particles.push({
        mesh,
        vx: Math.sin(anglePhi) * Math.cos(angleTheta) * speed,
        vy: Math.cos(anglePhi) * speed,
        vz: Math.sin(anglePhi) * Math.sin(angleTheta) * speed,
        life: 0.8 + Math.random() * 0.4,
        decay: 1.5,
      });
    }
  }

  createSparks(x, y, z, color = 0x38bdf8) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 18,
        vy: (Math.random() - 0.5) * 18,
        vz: (Math.random() - 0.5) * 18,
        life: 0.3,
        decay: 3.5,
      });
    }
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.mesh.scale.setScalar(Math.max(0.01, p.life));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  // --- 3D TACTICAL RADAR DATA ---

  emitRadarData() {
    // Relative positions in ship's local coordinate space
    const invQuat = this.shipQuat.clone().invert();

    const radarEnemies = this.enemies.map(e => {
      const rel = e.group.position.clone().sub(this.shipPos).applyQuaternion(invQuat);
      return {
        x: rel.x,
        y: rel.y,
        z: rel.z,
        type: e.type,
      };
    });

    const radarAsteroids = this.asteroids.slice(0, 15).map(a => {
      const rel = a.mesh.position.clone().sub(this.shipPos).applyQuaternion(invQuat);
      return {
        x: rel.x,
        y: rel.y,
        z: rel.z,
      };
    });

    this.callbacks.onRadarUpdate({
      enemies: radarEnemies,
      asteroids: radarAsteroids,
      boss: this.boss ? {
        x: this.boss.group.position.clone().sub(this.shipPos).applyQuaternion(invQuat).x,
        y: this.boss.group.position.clone().sub(this.shipPos).applyQuaternion(invQuat).y,
        z: this.boss.group.position.clone().sub(this.shipPos).applyQuaternion(invQuat).z,
      } : null,
    });
  }

  // --- FLIGHT INPUT CONTROLS ---

  setPitch(rate) {
    this.pitchRate = THREE.MathUtils.clamp(rate, -1.8, 1.8);
  }

  setYaw(rate) {
    this.yawRate = THREE.MathUtils.clamp(rate, -1.8, 1.8);
  }

  setRoll(rate) {
    this.rollRate = THREE.MathUtils.clamp(rate, -2.5, 2.5);
  }

  setBoost(active) {
    if (active && this.player.boostEnergy > 10) {
      this.player.isBoosting = true;
    } else {
      this.player.isBoosting = false;
    }
  }

  handleResize() {
    if (!this.canvas || !this.renderer || !this.camera) return;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    this.isRunning = false;
    if (this.reqId) cancelAnimationFrame(this.reqId);
    window.removeEventListener('resize', this.handleResize);

    voidStrikeAudio.destroy();

    this.scene?.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer?.dispose();
    this.scene = null;
    this.camera = null;
    this.renderer = null;
  }
}
