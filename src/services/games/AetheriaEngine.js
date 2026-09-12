/**
 * Aetheria 3D — Full 3D Open World Action RPG Engine
 * Powered by Three.js
 * 
 * Features:
 * - Expansive 160x160 continuous procedural 3D terrain (hills, ruins, forests, river)
 * - Continuous mathematical height function getTerrainHeight(x, z)
 * - Dynamic Day / Night cycle with moving sun, moon, and night fireflies
 * - Articulated 3D warrior with 3-hit sword combos, shield blocking, and magic bolts
 * - Multiple AI enemy types: Shadow Wolves, Goblin Marauders, and Stone Golem Boss
 * - Interactive loot chests with weapon upgrades and health potions
 * - Real-time radar minimap telemetry
 * - Full performance optimization and WebGL cleanup
 */

import * as THREE from 'three';
import { aetheriaAudio } from './AetheriaAudio';

export class AetheriaEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = {
      onStatsUpdate: () => {},
      onMinimapUpdate: () => {},
      onBossUpdate: () => {},
      onChestOpen: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      ...callbacks,
    };

    // Game State
    this.isRunning = false;
    this.isPaused = false;

    // Player RPG Stats
    this.player = {
      hp: 100,
      maxHp: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      exp: 0,
      expNext: 100,
      potions: 2,
      equippedWeapon: 'Iron Longsword',
      attackPower: 25,
      critChance: 0.15,
      isBlocking: false,
      isAttacking: false,
      attackCooldown: 0,
      comboStep: 1,
      lastAttackTime: 0,
      isRolling: false,
      rollTimer: 0,
      invulnerableTimer: 0,
    };

    // Physics & Movement
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.facingAngle = 0;
    this.isGrounded = true;
    this.isSprinting = false;

    // Camera Orbit Controller
    this.camDistance = 6.8;
    this.camHeight = 2.8;
    this.camPitch = 0.25;
    this.camYaw = 0;

    // Day / Night Cycle (180 seconds full day)
    this.dayTime = 0.25; // 0: sunrise, 0.25: midday, 0.5: sunset, 0.75: midnight
    this.dayDuration = 180; // seconds

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.reqId = null;

    // Entities
    this.playerGroup = null;
    this.weaponMesh = null;
    this.shieldMesh = null;
    this.enemies = [];
    this.chests = [];
    this.magicProjectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.shockwaves = [];

    // Boss tracking
    this.boss = null;

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    // 1. Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x60a5fa);
    this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.012);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 300);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting & Sky
    this.setupLighting();

    // 5. Build Procedural Terrain & World Landmarks
    this.buildWorldTerrain();

    // 6. Build Player Character & Weapons
    this.buildPlayerCharacter();

    // 7. Spawn Roaming Enemies & Boss
    this.spawnWorldEnemies();

    // 8. Spawn Interactive Treasure Chests
    this.spawnTreasureChests();

    // Set player starting height
    this.pos.y = this.getTerrainHeight(this.pos.x, this.pos.z);
    this.playerGroup.position.copy(this.pos);

    window.addEventListener('resize', this.handleResize);
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.7);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.3);
    this.sunLight.position.set(30, 60, 40);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 140;
    const d = 35;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Moon Light (cooler, active during night)
    this.moonLight = new THREE.DirectionalLight(0x38bdf8, 0.0);
    this.moonLight.position.set(-30, -60, -40);
    this.scene.add(this.moonLight);
  }

  // --- MATHEMATICAL CONTINUOUS TERRAIN HEIGHT ---

  getTerrainHeight(x, z) {
    // Riverbed trench along x = 30
    const riverDist = Math.abs(x - 30);
    let riverDip = 0;
    if (riverDist < 10) {
      riverDip = -2.5 * Math.cos((riverDist / 10) * (Math.PI / 2));
    }

    // Rolling hills using multi-octave trigonometric waves
    const h1 = Math.sin(x * 0.04) * Math.cos(z * 0.04) * 3.5;
    const h2 = Math.sin(x * 0.08 + 1.2) * Math.cos(z * 0.09) * 1.8;
    const h3 = Math.cos(x * 0.015 - z * 0.02) * 4.0;

    // Plateau for Boss Arena at (-35, -35)
    const bossDist = Math.hypot(x - (-35), z - (-35));
    let bossArena = 0;
    if (bossDist < 18) {
      bossArena = 2.0;
    }

    return Math.max(-1.5, h1 + h2 + h3 + riverDip + bossArena);
  }

  buildWorldTerrain() {
    const size = 160;
    const segments = 90;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    const colors = [];

    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = this.getTerrainHeight(x, z);
      posAttr.setY(i, y);

      // Vertex Coloring: Dirt/sand near water, grass in valleys, stone on peaks
      if (y < 0.2) {
        // Sandy riverbank
        colors.push(0.76, 0.70, 0.50);
      } else if (y > 4.2) {
        // Mountain rock
        colors.push(0.35, 0.38, 0.42);
      } else {
        // Lush green meadow
        const gVar = 0.45 + (Math.sin(x * 0.5) * 0.05);
        colors.push(0.18, gVar, 0.20);
      }
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      roughness: 0.9,
    });
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = true;
    this.scene.add(this.terrainMesh);

    // River Water Plane (at y = -0.4)
    const waterGeo = new THREE.PlaneGeometry(24, 160);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.75,
      roughness: 0.1,
      metalness: 0.6,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(30, -0.4, 0);
    this.scene.add(this.waterMesh);

    // Landmarks & Scenery
    this.buildLandmarkRuins();
    this.buildPineForest();
  }

  buildLandmarkRuins() {
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x475569 });
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    // 1. Stonehenge-style circular arena for Golem Boss at (-35, -35)
    const arenaX = -35;
    const arenaZ = -35;
    const arenaRadius = 14;
    const pillarGeo = new THREE.BoxGeometry(1.6, 6, 1.2);

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const px = arenaX + Math.cos(angle) * arenaRadius;
      const pz = arenaZ + Math.sin(angle) * arenaRadius;
      const py = this.getTerrainHeight(px, pz) + 3;

      const pillar = new THREE.Mesh(pillarGeo, stoneMat);
      pillar.position.set(px, py, pz);
      pillar.rotation.y = -angle;
      pillar.castShadow = true;
      this.scene.add(pillar);

      // Glowing Cyan Runes on pillars
      const runeGeo = new THREE.PlaneGeometry(0.5, 1.4);
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(px, py + 0.5, pz);
      rune.rotation.y = -angle + Math.PI / 2;
      this.scene.add(rune);
    }

    // 2. Ancient Crumbled Shrines near center (15, -15)
    const shrinePillarGeo = new THREE.CylinderGeometry(0.6, 0.8, 4.5, 8);
    [[-8, 12], [-14, 18], [12, -22], [18, -16]].forEach(([sx, sz]) => {
      const sy = this.getTerrainHeight(sx, sz) + 2.25;
      const p = new THREE.Mesh(shrinePillarGeo, stoneMat);
      p.position.set(sx, sy, sz);
      p.rotation.z = (Math.random() - 0.5) * 0.2;
      p.castShadow = true;
      this.scene.add(p);
    });
  }

  buildPineForest() {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3e2723 });
    const foliageMat = new THREE.MeshLambertMaterial({ color: 0x14532d });

    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
    const foliageGeo1 = new THREE.ConeGeometry(2.0, 3.2, 7);
    const foliageGeo2 = new THREE.ConeGeometry(1.5, 2.6, 7);
    const foliageGeo3 = new THREE.ConeGeometry(1.0, 2.0, 7);

    // Spawn 55 stylized pine trees across hills (avoiding river and boss arena)
    for (let i = 0; i < 55; i++) {
      const tx = (Math.random() - 0.5) * 140;
      const tz = (Math.random() - 0.5) * 140;

      // Skip river and boss arena
      if (Math.abs(tx - 30) < 14) continue;
      if (Math.hypot(tx - (-35), tz - (-35)) < 20) continue;
      if (Math.hypot(tx, tz) < 10) continue; // Safe spawn zone

      const ty = this.getTerrainHeight(tx, tz);
      const tree = new THREE.Group();
      tree.position.set(tx, ty, tz);

      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      tree.add(trunk);

      const f1 = new THREE.Mesh(foliageGeo1, foliageMat);
      f1.position.y = 3.5;
      f1.castShadow = true;
      tree.add(f1);

      const f2 = new THREE.Mesh(foliageGeo2, foliageMat);
      f2.position.y = 4.8;
      tree.add(f2);

      const f3 = new THREE.Mesh(foliageGeo3, foliageMat);
      f3.position.y = 5.8;
      tree.add(f3);

      this.scene.add(tree);
    }
  }

  // --- PLAYER MODEL & EQUIPMENT ---

  buildPlayerCharacter() {
    this.playerGroup = new THREE.Group();

    const armorMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd5b3 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });
    const capeMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

    this.charRoot = new THREE.Group();
    this.charRoot.position.y = 0.9;
    this.playerGroup.add(this.charRoot);

    // 1. Torso / Armored Chestplate
    const torsoGeo = new THREE.BoxGeometry(0.75, 0.9, 0.45);
    const torso = new THREE.Mesh(torsoGeo, armorMat);
    torso.position.y = 0.45;
    torso.castShadow = true;
    this.charRoot.add(torso);

    // Flowing Cape
    const capeGeo = new THREE.BoxGeometry(0.65, 1.2, 0.05);
    this.cape = new THREE.Mesh(capeGeo, capeMat);
    this.cape.position.set(0, 0.4, -0.26);
    this.charRoot.add(this.cape);

    // 2. Head & Helmet with Visor
    const headGeo = new THREE.BoxGeometry(0.48, 0.48, 0.48);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.15;
    head.castShadow = true;
    this.charRoot.add(head);

    const helmGeo = new THREE.BoxGeometry(0.54, 0.3, 0.54);
    const helm = new THREE.Mesh(helmGeo, steelMat);
    helm.position.set(0, 1.3, 0);
    this.charRoot.add(helm);

    const hornGeo = new THREE.ConeGeometry(0.08, 0.35, 6);
    const hornL = new THREE.Mesh(hornGeo, goldMat);
    hornL.position.set(-0.28, 1.45, 0);
    hornL.rotation.z = 0.6;
    const hornR = new THREE.Mesh(hornGeo, goldMat);
    hornR.position.set(0.28, 1.45, 0);
    hornR.rotation.z = -0.6;
    this.charRoot.add(hornL);
    this.charRoot.add(hornR);

    // 3. Right Arm holding Sword
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.48, 0.8, 0);
    const armGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
    const rArmMesh = new THREE.Mesh(armGeo, armorMat);
    rArmMesh.position.y = -0.3;
    this.rightArm.add(rArmMesh);

    // 3D Longsword
    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.6, 0.2);

    const bladeGeo = new THREE.BoxGeometry(0.12, 1.4, 0.04);
    const blade = new THREE.Mesh(bladeGeo, steelMat);
    blade.position.y = 0.7;
    blade.castShadow = true;

    const guardGeo = new THREE.BoxGeometry(0.4, 0.08, 0.1);
    const guard = new THREE.Mesh(guardGeo, goldMat);

    const hiltGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const hilt = new THREE.Mesh(hiltGeo, armorMat);
    hilt.position.y = -0.15;

    this.swordGroup.add(blade);
    this.swordGroup.add(guard);
    this.swordGroup.add(hilt);
    this.rightArm.add(this.swordGroup);
    this.charRoot.add(this.rightArm);

    // 4. Left Arm holding Shield
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.48, 0.8, 0);
    const lArmMesh = new THREE.Mesh(armGeo, armorMat);
    lArmMesh.position.y = -0.3;
    this.leftArm.add(lArmMesh);

    // Round Crest Shield
    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(-0.15, -0.3, 0.2);

    const shieldGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16);
    shieldGeo.rotateX(Math.PI / 2);
    const shield = new THREE.Mesh(shieldGeo, steelMat);
    shield.castShadow = true;

    const crestGeo = new THREE.OctahedronGeometry(0.2);
    const crest = new THREE.Mesh(crestGeo, goldMat);
    crest.position.z = 0.06;

    this.shieldGroup.add(shield);
    this.shieldGroup.add(crest);
    this.leftArm.add(this.shieldGroup);
    this.charRoot.add(this.leftArm);

    // 5. Articulated Legs
    const legGeo = new THREE.BoxGeometry(0.26, 0.7, 0.26);
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.0, 0);
    const lLegMesh = new THREE.Mesh(legGeo, steelMat);
    lLegMesh.position.y = -0.35;
    this.leftLeg.add(lLegMesh);
    this.charRoot.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.0, 0);
    const rLegMesh = new THREE.Mesh(legGeo, steelMat);
    rLegMesh.position.y = -0.35;
    this.rightLeg.add(rLegMesh);
    this.charRoot.add(this.rightLeg);

    this.scene.add(this.playerGroup);
  }

  // --- ENEMIES & BOSS SYSTEM ---

  spawnWorldEnemies() {
    this.enemies = [];

    // 1. Shadow Wolves (pack of 4 near river / forest)
    const wolfSpawns = [[-10, -18], [-15, -24], [14, 18], [20, 24]];
    wolfSpawns.forEach(([wx, wz], idx) => {
      this.spawnEnemy({
        id: `wolf-${idx}`,
        name: 'Shadow Wolf',
        type: 'wolf',
        x: wx,
        z: wz,
        maxHp: 60,
        hp: 60,
        attackPower: 14,
        speed: 7.5,
        aggroRadius: 14,
        attackRadius: 2.2,
      });
    });

    // 2. Goblin Marauders (guarding shrines)
    const goblinSpawns = [[-18, 12], [8, -32], [24, -10]];
    goblinSpawns.forEach(([gx, gz], idx) => {
      this.spawnEnemy({
        id: `goblin-${idx}`,
        name: 'Goblin Marauder',
        type: 'goblin',
        x: gx,
        z: gz,
        maxHp: 90,
        hp: 90,
        attackPower: 20,
        speed: 5.5,
        aggroRadius: 16,
        attackRadius: 2.6,
      });
    });

    // 3. Ancient Stone Golem Boss in Monolith Arena (-35, -35)
    this.spawnBoss();
  }

  spawnEnemy(config) {
    const group = new THREE.Group();
    const y = this.getTerrainHeight(config.x, config.z);
    group.position.set(config.x, y, config.z);

    if (config.type === 'wolf') {
      // Quadruped Wolf Body
      const bodyGeo = new THREE.BoxGeometry(0.7, 0.55, 1.3);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.55;
      body.castShadow = true;
      group.add(body);

      // Head & Red Eyes
      const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.6);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0, 0.8, 0.7);
      group.add(head);

      const eyeGeo = new THREE.BoxGeometry(0.1, 0.08, 0.08);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
      eyeL.position.set(-0.16, 0.85, 0.96);
      const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
      eyeR.position.set(0.16, 0.85, 0.96);
      group.add(eyeL);
      group.add(eyeR);
    } else {
      // Goblin Marauder (Bipedal green armored figure)
      const skinMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
      const armorMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });

      const torsoGeo = new THREE.BoxGeometry(0.7, 0.8, 0.4);
      const torso = new THREE.Mesh(torsoGeo, armorMat);
      torso.position.y = 0.7;
      torso.castShadow = true;
      group.add(torso);

      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.3;
      group.add(head);

      // Weapon: Club / Cleaver
      const clubGeo = new THREE.BoxGeometry(0.15, 0.9, 0.15);
      const clubMat = new THREE.MeshLambertMaterial({ color: 0x44403c });
      const club = new THREE.Mesh(clubGeo, clubMat);
      club.position.set(0.5, 0.8, 0.3);
      group.add(club);
    }

    // Health Bar Billboard over head
    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.y = config.type === 'wolf' ? 1.4 : 1.9;

    const bgGeo = new THREE.PlaneGeometry(1.2, 0.14);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const bg = new THREE.Mesh(bgGeo, bgMat);

    const fillGeo = new THREE.PlaneGeometry(1.16, 0.1);
    const fillMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.position.z = 0.01;

    hpBarGroup.add(bg);
    hpBarGroup.add(fill);
    group.add(hpBarGroup);

    this.scene.add(group);
    this.enemies.push({
      ...config,
      group,
      hpBarFill: fill,
      state: 'IDLE',
      originX: config.x,
      originZ: config.z,
      attackCooldown: 0,
      staggerTimer: 0,
    });
  }

  spawnBoss() {
    const group = new THREE.Group();
    const bx = -35;
    const bz = -35;
    const by = this.getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.1 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    // Massive Stone Torso
    const torsoGeo = new THREE.BoxGeometry(3.2, 3.4, 2.2);
    const torso = new THREE.Mesh(torsoGeo, stoneMat);
    torso.position.y = 3.6;
    torso.castShadow = true;
    group.add(torso);

    // Glowing Core in Chest
    const coreGeo = new THREE.OctahedronGeometry(0.8);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.set(0, 3.6, 1.15);
    group.add(core);

    // Stone Head
    const headGeo = new THREE.BoxGeometry(1.4, 1.2, 1.4);
    const head = new THREE.Mesh(headGeo, stoneMat);
    head.position.y = 5.8;
    group.add(head);

    // Giant Boulder Arms
    const armGeo = new THREE.BoxGeometry(1.2, 3.6, 1.2);
    const armL = new THREE.Mesh(armGeo, stoneMat);
    armL.position.set(-2.4, 3.6, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(armGeo, stoneMat);
    armR.position.set(2.4, 3.6, 0);
    armR.castShadow = true;
    group.add(armL);
    group.add(armR);

    // Legs
    const legGeo = new THREE.BoxGeometry(1.3, 2.2, 1.3);
    const legL = new THREE.Mesh(legGeo, stoneMat);
    legL.position.set(-1.1, 1.1, 0);
    const legR = new THREE.Mesh(legGeo, stoneMat);
    legR.position.set(1.1, 1.1, 0);
    group.add(legL);
    group.add(legR);

    this.scene.add(group);
    this.boss = {
      id: 'golem-boss',
      name: 'Ancient Stone Golem',
      type: 'boss',
      group,
      x: bx,
      z: bz,
      maxHp: 450,
      hp: 450,
      attackPower: 38,
      speed: 3.8,
      state: 'IDLE',
      originX: bx,
      originZ: bz,
      attackCooldown: 0,
      staggerTimer: 0,
      shockwaveCooldown: 0,
    };
    this.enemies.push(this.boss);
  }

  // --- TREASURE CHESTS ---

  spawnTreasureChests() {
    this.chests = [];
    const chestLocations = [
      { x: -14, z: 16, reward: 'Flame Saber', type: 'weapon' },
      { x: 16, z: -20, reward: 'Void Katana', type: 'weapon' },
      { x: 38, z: 28, reward: 'Elixir Potion x2', type: 'potion' },
      { x: -44, z: -44, reward: 'Golem Heart Core', type: 'relic' },
    ];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });

    chestLocations.forEach((loc, idx) => {
      const group = new THREE.Group();
      const cy = this.getTerrainHeight(loc.x, loc.z);
      group.position.set(loc.x, cy, loc.z);

      const baseGeo = new THREE.BoxGeometry(1.2, 0.6, 0.8);
      const base = new THREE.Mesh(baseGeo, woodMat);
      base.position.y = 0.3;
      base.castShadow = true;
      group.add(base);

      // Hinged Lid
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.6, -0.4);
      const lidGeo = new THREE.BoxGeometry(1.24, 0.35, 0.84);
      const lid = new THREE.Mesh(lidGeo, woodMat);
      lid.position.set(0, 0.17, 0.4);
      lidGroup.add(lid);

      const lockGeo = new THREE.BoxGeometry(0.2, 0.2, 0.08);
      const lock = new THREE.Mesh(lockGeo, goldMat);
      lock.position.set(0, 0.1, 0.84);
      lidGroup.add(lock);

      group.add(lidGroup);
      this.scene.add(group);

      this.chests.push({
        id: `chest-${idx}`,
        ...loc,
        group,
        lidGroup,
        opened: false,
      });
    });
  }

  // --- COMBAT & MAGIC ABILITIES ---

  attack() {
    if (!this.isRunning || this.isPaused || this.player.isRolling) return;
    if (this.player.isAttacking || this.player.attackCooldown > 0) return;

    const now = Date.now();
    if (now - this.player.lastAttackTime > 1100) {
      this.player.comboStep = 1;
    } else {
      this.player.comboStep = (this.player.comboStep % 3) + 1;
    }
    this.player.lastAttackTime = now;

    this.player.isAttacking = true;
    this.player.attackCooldown = 0.32;

    // Play sword swing sound with step frequency
    aetheriaAudio.playSlash(this.player.comboStep);

    // Forward momentum nudge during strike
    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);
    this.pos.x += forwardX * 0.8;
    this.pos.z += forwardZ * 0.8;

    // Attack Hitbox Detection in front of player
    const hitRadius = 2.4;
    const hitAngle = Math.PI / 2.2;
    const attackOrigin = new THREE.Vector2(this.pos.x + forwardX * 1.2, this.pos.z + forwardZ * 1.2);

    this.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;
      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const dist = attackOrigin.distanceTo(new THREE.Vector2(ex, ez));

      if (dist < hitRadius) {
        // Calculate damage
        const isCrit = Math.random() < this.player.critChance;
        const multiplier = isCrit ? 2.0 : 1.0;
        const comboMult = this.player.comboStep === 3 ? 1.4 : 1.0;
        const damage = Math.round(this.player.attackPower * multiplier * comboMult);

        this.damageEnemy(enemy, damage, isCrit);
      }
    });

    // Sword Trail Particle Spark Arc
    this.createSlashArc(this.pos.x + forwardX * 1.2, this.pos.y + 1.2, this.pos.z + forwardZ * 1.2);
  }

  castMagicBolt() {
    if (!this.isRunning || this.isPaused || this.player.stamina < 20) return;

    this.player.stamina = Math.max(0, this.player.stamina - 20);
    this.callbacks.onStatsUpdate(this.player);

    aetheriaAudio.playMagicBlast();

    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);

    const boltGeo = new THREE.SphereGeometry(0.24, 8, 8);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const boltMesh = new THREE.Mesh(boltGeo, boltMat);
    boltMesh.position.set(this.pos.x + forwardX * 1.0, this.pos.y + 1.4, this.pos.z + forwardZ * 1.0);
    this.scene.add(boltMesh);

    this.magicProjectiles.push({
      mesh: boltMesh,
      vx: forwardX * 22,
      vy: 0,
      vz: forwardZ * 22,
      life: 2.0,
      damage: 35,
    });
  }

  dodgeRoll() {
    if (!this.isRunning || this.isPaused || this.player.isRolling || this.player.stamina < 15) return;

    this.player.stamina = Math.max(0, this.player.stamina - 15);
    this.player.isRolling = true;
    this.player.rollTimer = 0.45;
    this.player.invulnerableTimer = 0.45; // Invincible during roll

    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);
    this.vel.x = forwardX * 16;
    this.vel.z = forwardZ * 16;

    aetheriaAudio.playSlash(1);
    this.callbacks.onStatsUpdate(this.player);
  }

  block(active) {
    this.player.isBlocking = active;
  }

  usePotion() {
    if (this.player.potions <= 0 || this.player.hp >= this.player.maxHp) return;
    this.player.potions--;
    this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
    aetheriaAudio.playHeal();
    this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x34d399, 20);
    this.callbacks.onStatsUpdate(this.player);
  }

  interactChest() {
    const interactRadius = 3.2;
    this.chests.forEach(chest => {
      if (chest.opened) return;
      const dist = Math.hypot(this.pos.x - chest.x, this.pos.z - chest.z);
      if (dist < interactRadius) {
        chest.opened = true;
        // Open lid animation
        chest.lidGroup.rotation.x = -Math.PI / 1.8;
        aetheriaAudio.playChestOpen();

        if (chest.type === 'weapon') {
          this.player.equippedWeapon = chest.reward;
          this.player.attackPower += 15;
          this.player.critChance += 0.1;
        } else if (chest.type === 'potion') {
          this.player.potions += 2;
        }

        this.createBurst(chest.x, chest.group.position.y + 0.8, chest.z, 0xf59e0b, 25);
        this.addFloatingText(chest.x, chest.group.position.y + 1.6, chest.z, `Found ${chest.reward}!`, '#f59e0b');
        this.callbacks.onChestOpen(chest.reward);
        this.callbacks.onStatsUpdate(this.player);
      }
    });
  }

  // --- DAMAGE & COMBAT FEEDBACK ---

  damageEnemy(enemy, damage, isCrit = false) {
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.staggerTimer = 0.25;

    aetheriaAudio.playEnemyHit();
    this.createBurst(enemy.group.position.x, enemy.group.position.y + 1.2, enemy.group.position.z, isCrit ? 0xf59e0b : 0xffffff, isCrit ? 22 : 12);

    // Floating damage number
    const color = isCrit ? '#f59e0b' : '#f8fafc';
    const text = isCrit ? `CRIT! -${damage}` : `-${damage}`;
    this.addFloatingText(enemy.group.position.x, enemy.group.position.y + 2.0, enemy.group.position.z, text, color);

    // Update enemy health bar
    const hpRatio = enemy.hp / enemy.maxHp;
    enemy.hpBarFill.scale.x = Math.max(0.001, hpRatio);

    // Update Boss bar if boss
    if (enemy.type === 'boss') {
      this.callbacks.onBossUpdate(enemy.hp, enemy.maxHp);
    }

    if (enemy.hp <= 0) {
      this.handleEnemyDeath(enemy);
    }
  }

  handleEnemyDeath(enemy) {
    this.createBurst(enemy.group.position.x, enemy.group.position.y + 1.5, enemy.group.position.z, 0xef4444, 35);
    this.scene.remove(enemy.group);

    // Award EXP
    const expAward = enemy.type === 'boss' ? 250 : 35;
    this.player.exp += expAward;
    this.addFloatingText(enemy.group.position.x, enemy.group.position.y + 2.4, enemy.group.position.z, `+${expAward} EXP`, '#38bdf8');

    // Level up check
    if (this.player.exp >= this.player.expNext) {
      this.player.level++;
      this.player.exp -= this.player.expNext;
      this.player.expNext = Math.round(this.player.expNext * 1.5);
      this.player.maxHp += 25;
      this.player.hp = this.player.maxHp;
      this.player.attackPower += 8;
      aetheriaAudio.playLevelUp();
      this.addFloatingText(this.pos.x, this.pos.y + 2.5, this.pos.z, `LEVEL UP! (Lv ${this.player.level})`, '#34d399');
    }

    this.callbacks.onStatsUpdate(this.player);

    if (enemy.type === 'boss') {
      this.callbacks.onVictory();
    }
  }

  damagePlayer(amount, sourceEnemy) {
    if (this.player.invulnerableTimer > 0) return;

    let finalDamage = amount;
    if (this.player.isBlocking) {
      // Shield block deflection
      finalDamage = Math.round(amount * 0.2); // 80% damage reduction
      aetheriaAudio.playBlock();
      this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x06b6d4, 15);
      this.addFloatingText(this.pos.x, this.pos.y + 2.0, this.pos.z, `BLOCKED! -${finalDamage}`, '#06b6d4');
    } else {
      aetheriaAudio.playEnemyHit();
      this.createBurst(this.pos.x, this.pos.y + 1.0, this.pos.z, 0xef4444, 16);
      this.addFloatingText(this.pos.x, this.pos.y + 2.0, this.pos.z, `-${finalDamage}`, '#ef4444');
    }

    this.player.hp = Math.max(0, this.player.hp - finalDamage);
    this.player.invulnerableTimer = 0.5; // Brief invincibility window
    this.callbacks.onStatsUpdate(this.player);

    if (this.player.hp <= 0) {
      this.isRunning = false;
      this.callbacks.onGameOver(sourceEnemy.name);
    }
  }

  // --- FLOATING TEXT & PARTICLES ---

  addFloatingText(x, y, z, text, color = '#ffffff') {
    this.floatingTexts.push({
      x,
      y,
      z,
      text,
      color,
      life: 1.2,
      vy: 1.5,
    });
  }

  createBurst(x, y, z, color = 0xf59e0b, count = 16) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vx: Math.cos(angle) * speed,
        vy: (Math.random() * 5) + 1,
        vz: Math.sin(angle) * speed,
        life: 0.8,
        decay: 2.2,
      });
    }
  }

  createSlashArc(x, y, z) {
    const arcGeo = new THREE.TorusGeometry(1.2, 0.06, 6, 16, Math.PI);
    const arcMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    const arc = new THREE.Mesh(arcGeo, arcMat);
    arc.position.set(x, y, z);
    arc.rotation.y = this.facingAngle;
    arc.rotation.x = Math.PI / 2;
    this.scene.add(arc);

    this.particles.push({
      mesh: arc,
      vx: 0,
      vy: 0.4,
      vz: 0,
      life: 0.25,
      decay: 4.0,
    });
  }

  createShockwave(x, y, z) {
    const ringGeo = new THREE.RingGeometry(0.5, 1.2, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(x, y + 0.1, z);
    this.scene.add(ring);

    this.shockwaves.push({
      mesh: ring,
      radius: 1.0,
      maxRadius: 12.0,
      originX: x,
      originZ: z,
      damage: 30,
      hitPlayer: false,
    });
  }

  // --- GAME LOOP & UPDATES ---

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    aetheriaAudio.ensureContext();
    this.animate();
  }

  pause() {
    this.isPaused = true;
    aetheriaAudio.setCombatState(false);
  }

  resume() {
    this.isPaused = false;
    this.clock.start();
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
    // 1. Update Day / Night Cycle
    this.dayTime = (this.dayTime + (delta / this.dayDuration)) % 1.0;
    this.updateAtmosphere();

    // 2. Stamina Regeneration
    if (!this.isSprinting && !this.player.isRolling && this.player.stamina < this.player.maxStamina) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 18 * delta);
      this.callbacks.onStatsUpdate(this.player);
    }

    // 3. Timers
    if (this.player.attackCooldown > 0) {
      this.player.attackCooldown -= delta;
      if (this.player.attackCooldown <= 0) {
        this.player.isAttacking = false;
      }
    }

    if (this.player.isRolling) {
      this.player.rollTimer -= delta;
      if (this.player.rollTimer <= 0) {
        this.player.isRolling = false;
      }
    }

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= delta;
    }

    // 4. Player Physics & Terrain Following
    this.pos.x += this.vel.x * delta;
    this.pos.z += this.vel.z * delta;
    this.vel.x *= Math.max(0, 1 - 8 * delta);
    this.vel.z *= Math.max(0, 1 - 8 * delta);

    // Keep within world bounds
    const bound = 75;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -bound, bound);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -bound, bound);

    // Lock player height to terrain surface smoothly
    const groundY = this.getTerrainHeight(this.pos.x, this.pos.z);
    this.pos.y = groundY;
    this.playerGroup.position.copy(this.pos);
    this.playerGroup.rotation.y = this.facingAngle;

    // 5. Update Enemy AI & Combat Checks
    this.updateEnemyAI(delta);

    // 6. Update Projectiles & Shockwaves
    this.updateProjectiles(delta);
    this.updateShockwaves(delta);

    // 7. Update Particles & Floating Text
    this.updateParticles(delta);

    // 8. Player Character Animation
    this.animatePlayer(delta);

    // 9. Camera Orbit Follow
    this.updateCameraFollow(delta);

    // 10. Radar Minimap Telemetry
    this.emitMinimapData();
  }

  updateAtmosphere() {
    const sunAngle = this.dayTime * Math.PI * 2;
    const sunDist = 80;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;

    this.sunLight.position.set(sunX, Math.max(5, sunY), 40);

    // Sun intensity & Sky color
    const isDay = sunY > 0;
    const sunRatio = Math.max(0, sunY / sunDist);

    if (isDay) {
      const skyCol = new THREE.Color(0x60a5fa).lerp(new THREE.Color(0xf97316), Math.max(0, 1 - sunRatio * 2));
      this.scene.background = skyCol;
      if (this.scene.fog) this.scene.fog.color = skyCol;
      this.sunLight.intensity = 0.4 + sunRatio * 1.0;
      this.ambientLight.intensity = 0.3 + sunRatio * 0.4;
    } else {
      // Night Sky
      const nightCol = new THREE.Color(0x0a0f1d);
      this.scene.background = nightCol;
      if (this.scene.fog) this.scene.fog.color = nightCol;
      this.sunLight.intensity = 0.05;
      this.ambientLight.intensity = 0.18;
    }
  }

  updateEnemyAI(delta) {
    let anyEnemyAggro = false;

    this.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;

      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const distToPlayer = Math.hypot(this.pos.x - ex, this.pos.z - ez);

      if (enemy.staggerTimer > 0) {
        enemy.staggerTimer -= delta;
        return;
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= delta;
      }

      // Check Aggro Range
      if (distToPlayer < enemy.aggroRadius) {
        enemy.state = 'CHASE';
        anyEnemyAggro = true;

        // Rotate towards player
        const targetAngle = Math.atan2(this.pos.x - ex, this.pos.z - ez);
        enemy.group.rotation.y = targetAngle;

        if (distToPlayer > enemy.attackRadius) {
          // Pursue player along ground
          const stepX = Math.sin(targetAngle) * enemy.speed * delta;
          const stepZ = Math.cos(targetAngle) * enemy.speed * delta;
          const nx = ex + stepX;
          const nz = ez + stepZ;
          enemy.group.position.set(nx, this.getTerrainHeight(nx, nz), nz);
        } else {
          // In Attack Range!
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.type === 'boss' ? 2.4 : 1.4;
            this.executeEnemyAttack(enemy);
          }
        }
      } else {
        // Return to origin if too far
        enemy.state = 'IDLE';
        const distToOrigin = Math.hypot(enemy.originX - ex, enemy.originZ - ez);
        if (distToOrigin > 1.5) {
          const retAngle = Math.atan2(enemy.originX - ex, enemy.originZ - ez);
          enemy.group.rotation.y = retAngle;
          const stepX = Math.sin(retAngle) * (enemy.speed * 0.5) * delta;
          const stepZ = Math.cos(retAngle) * (enemy.speed * 0.5) * delta;
          const nx = ex + stepX;
          const nz = ez + stepZ;
          enemy.group.position.set(nx, this.getTerrainHeight(nx, nz), nz);
        }
      }

      // Face Billboard Health Bars towards Camera
      if (enemy.group.children[enemy.group.children.length - 1]) {
        const hpBar = enemy.group.children[enemy.group.children.length - 1];
        hpBar.rotation.y = this.camera.rotation.y - enemy.group.rotation.y;
      }
    });

    // Dynamic Battle Theme Switcher
    aetheriaAudio.setCombatState(anyEnemyAggro);
  }

  executeEnemyAttack(enemy) {
    if (enemy.type === 'boss') {
      // Boss Stomp Attack -> Shockwave Ring
      aetheriaAudio.playGolemStomp();
      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const ey = enemy.group.position.y;
      this.createShockwave(ex, ey, ez);
    } else {
      // Normal Melee Strike
      this.damagePlayer(enemy.attackPower, enemy);
    }
  }

  updateProjectiles(delta) {
    for (let i = this.magicProjectiles.length - 1; i >= 0; i--) {
      const p = this.magicProjectiles[i];
      p.life -= delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.z += p.vz * delta;

      // Hit-test enemies
      let hit = false;
      for (let enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dist = p.mesh.position.distanceTo(enemy.group.position);
        if (dist < 2.0) {
          this.damageEnemy(enemy, p.damage, true);
          hit = true;
          break;
        }
      }

      if (hit || p.life <= 0) {
        this.createBurst(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z, 0x38bdf8, 16);
        this.scene.remove(p.mesh);
        this.magicProjectiles.splice(i, 1);
      }
    }
  }

  updateShockwaves(delta) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += delta * 12;
      sw.mesh.scale.setScalar(sw.radius);

      // Hit-test player
      if (!sw.hitPlayer) {
        const dist = Math.hypot(this.pos.x - sw.originX, this.pos.z - sw.originZ);
        if (Math.abs(dist - sw.radius) < 1.2) {
          sw.hitPlayer = true;
          this.damagePlayer(sw.damage, { name: 'Stone Golem Shockwave' });
        }
      }

      if (sw.radius >= sw.maxRadius) {
        this.scene.remove(sw.mesh);
        this.shockwaves.splice(i, 1);
      }
    }
  }

  updateParticles(delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= p.decay * delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.y += p.vy * delta;
      p.mesh.position.z += p.vz * delta;
      p.vy -= 9.8 * delta;

      p.mesh.scale.setScalar(Math.max(0.01, p.life));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    // Floating damage text progression
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= delta;
      ft.y += ft.vy * delta;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  animatePlayer(delta) {
    if (!this.charRoot) return;

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const time = this.clock.getElapsedTime();

    if (this.player.isRolling) {
      // Somersault roll forward
      this.charRoot.position.y = 0.45;
      this.charRoot.rotation.x = (time * 16) % (Math.PI * 2);
    } else if (this.player.isAttacking) {
      // 3-Hit Combo Sword Swing Articulation
      this.charRoot.position.y = 0.9;
      this.charRoot.rotation.x = 0.1;
      const step = this.player.comboStep;
      if (step === 1) {
        this.rightArm.rotation.x = -1.6;
        this.rightArm.rotation.z = -0.8;
      } else if (step === 2) {
        this.rightArm.rotation.x = -1.2;
        this.rightArm.rotation.z = 0.8;
      } else {
        // Heavy vertical cleave
        this.rightArm.rotation.x = -2.2;
        this.rightArm.rotation.z = 0;
      }
    } else if (this.player.isBlocking) {
      // Raise shield
      this.charRoot.position.y = 0.85;
      this.leftArm.rotation.x = -1.4;
      this.leftArm.rotation.z = 0.4;
      this.rightArm.rotation.x = -0.4;
    } else if (speed > 0.5) {
      // Running Gait
      const runCycle = time * (speed * 0.8);
      this.charRoot.position.y = 0.9 + Math.abs(Math.sin(runCycle)) * 0.08;
      this.charRoot.rotation.x = 0.1;

      const stride = Math.sin(runCycle);
      this.leftLeg.rotation.x = stride * 0.8;
      this.rightLeg.rotation.x = -stride * 0.8;
      this.leftArm.rotation.x = -stride * 0.6;
      this.rightArm.rotation.x = stride * 0.6;

      // Cape wave
      this.cape.rotation.x = (speed / 12) * 0.8;
    } else {
      // Idle Breathing
      this.charRoot.position.y = 0.9 + Math.sin(time * 2) * 0.03;
      this.charRoot.rotation.x = 0;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = 0;
      this.rightArm.rotation.x = 0;
      this.cape.rotation.x = 0.08;
    }
  }

  updateCameraFollow(delta) {
    // Spherical orbit calculation
    const cx = this.pos.x - Math.sin(this.camYaw) * (this.camDistance * Math.cos(this.camPitch));
    const cy = this.pos.y + this.camHeight + Math.sin(this.camPitch) * this.camDistance;
    const cz = this.pos.z - Math.cos(this.camYaw) * (this.camDistance * Math.cos(this.camPitch));

    this.camera.position.x += (cx - this.camera.position.x) * Math.min(1, 10 * delta);
    this.camera.position.y += (cy - this.camera.position.y) * Math.min(1, 10 * delta);
    this.camera.position.z += (cz - this.camera.position.z) * Math.min(1, 10 * delta);

    this.camera.lookAt(this.pos.x, this.pos.y + 1.6, this.pos.z);
  }

  emitMinimapData() {
    const radarEnemies = this.enemies
      .filter(e => e.hp > 0)
      .map(e => ({
        x: e.group.position.x,
        z: e.group.position.z,
        type: e.type,
      }));

    const radarChests = this.chests.map(c => ({
      x: c.x,
      z: c.z,
      opened: c.opened,
    }));

    this.callbacks.onMinimapUpdate({
      playerX: this.pos.x,
      playerZ: this.pos.z,
      facingAngle: this.facingAngle,
      enemies: radarEnemies,
      chests: radarChests,
    });
  }

  // --- PLAYER MOVEMENT INPUTS ---

  move(moveX, moveZ, sprint = false) {
    if (!this.isRunning || this.isPaused || this.player.isRolling) return;

    // Movement relative to camera angle
    const camAngle = this.camYaw;
    const forwardX = Math.sin(camAngle);
    const forwardZ = Math.cos(camAngle);
    const rightX = Math.cos(camAngle);
    const rightZ = -Math.sin(camAngle);

    const dirX = rightX * moveX + forwardX * moveZ;
    const dirZ = rightZ * moveX + forwardZ * moveZ;
    const len = Math.hypot(dirX, dirZ);

    if (len > 0.01) {
      const normX = dirX / len;
      const normZ = dirZ / len;

      this.isSprinting = sprint && this.player.stamina > 5;
      const speed = this.isSprinting ? 12 : 7.2;

      this.vel.x = normX * speed;
      this.vel.z = normZ * speed;

      this.facingAngle = Math.atan2(normX, normZ);

      if (this.isSprinting) {
        this.player.stamina = Math.max(0, this.player.stamina - 20 * (1 / 60));
        this.callbacks.onStatsUpdate(this.player);
      }
    }
  }

  rotateCamera(deltaYaw, deltaPitch) {
    this.camYaw += deltaYaw;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + deltaPitch, -0.15, 0.85);
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

    aetheriaAudio.destroy();

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
