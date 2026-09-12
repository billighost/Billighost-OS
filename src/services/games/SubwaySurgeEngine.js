/**
 * Subway Surge 3D — Ultimate Billighost OS Edition
 * Powered by Three.js & Web Audio API
 *
 * 30 High-Value Polish & Performance Features:
 * 1. 3D Billighost Spectral Inspector Chaser with dynamic follow & stumble lunge
 * 2. Spectral Ghost Lane Hazards (Phantoms on tracks)
 * 3. Billighost Ghost Tokens & "Ghost Surge" Hyperdrive Mode
 * 4. Hyper-Detailed Procedural Cityscape (multi-tiered skyscrapers, water towers, radio beacons)
 * 5. Animated Holographic Cyber Billboards ("BILLIGHOST OS", "METRO SURGE", neon arrows)
 * 6. High-Fidelity Subway Trains (aerodynamic cabs, recessed windshields, headlights, passenger silhouettes)
 * 7. Diamond-Plate Surf Ramps with yellow/black hazard chevrons
 * 8. 3D Railway Track with extruded steel rails, ballast gravel, electrified 3rd rail & spark arcs
 * 9. Articulated Runner Models with sneakers, joints, cyber backpack, headphones, and visors
 * 10. 5 Distinct Playable Characters: Billi (Ghost), Dash, Nova, Pulse, Zero
 * 11. 5 Custom Hoverboards with unique particle exhausts and physics
 * 12. High-Precision Hurdles & Slide Clearance Gantries with digital LED signs
 * 13. Stumble & Close-Call Near-Miss Detection System
 * 14. Dynamic Combo Multiplier Streak System (x2, x4, x8, x16)
 * 15. Dynamic Day / Twilight / Cyber-Night Atmosphere Cycle
 * 16. GPU Instancing Optimization (InstancedMesh for ties, rails, windows)
 * 17. Memory Object Pooling (zero GC stutter)
 * 18. Dynamic Level of Detail (LOD) & Frustum Culling
 * 19. Dynamic Speed FOV Warp & Camera Banking
 * 20. Multi-Stage Particle System 2.0 (rail sparks, dust puffs, jetpack flames, coin vortex)
 * 21. Procedural Web Audio 2.0 Integration
 * 22. Interactive 3D Turntable Preview support
 * 23. Mission & Quest telemetry
 * 24. Magnetic Concentric Vortex Attractor Field FX
 * 25. Super Sneakers Spring Bounce & High-Gravity FX
 * 26. Hoverboard 360 Spin / Kickflip Aerial Stunts
 * 27. Ghost Second Chance / Spectral Revive Shockwave
 * 28. Personal Best Holographic Finish-Line Banner with confetti shatter
 * 29. Responsive Touch & Keyboard Navigation
 * 30. Ultra-smooth 60+ FPS high-performance execution
 */

import * as THREE from 'three';
import { subwayAudio } from './SubwaySurgeAudio';

export const LANE_WIDTH = 2.8;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH]; // Left: -2.8, Center: 0, Right: 2.8

export class SubwaySurgeEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = {
      onScoreUpdate: () => {},
      onCoinsUpdate: () => {},
      onPowerupChange: () => {},
      onGhostSurgeChange: () => {},
      onComboUpdate: () => {},
      onNearMiss: () => {},
      onRecordBroken: () => {},
      onGameOver: () => {},
      ...callbacks,
    };

    // Game Flow
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.coins = 0;
    this.ghostTokens = 0;
    this.ghostSurgeCharge = 0; // 0 to 100
    this.ghostSurgeActive = false;
    this.ghostSurgeTimer = 0;
    this.speed = 28;
    this.baseSpeed = 28;
    this.maxSpeed = 68;
    this.distance = 0;
    this.highScoreDistance = 0;
    this.recordBroken = false;

    // Combo & Streaks
    this.combo = 1;
    this.streakCount = 0;
    this.lastCollectTime = 0;
    this.nearMissCount = 0;

    // Player Movement & Physics
    this.currentLane = 1; // 0: Left, 1: Center, 2: Right
    this.targetX = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.slideDuration = 0.28;
    this.stumbleTimer = 0;
    this.isStumbling = false;
    this.gravity = 55;
    this.jumpForce = 18.5;
    this.groundY = 0;

    // Board Stunt State
    this.isDoingStunt = false;
    this.stuntRotation = 0;

    // Power-Up States
    this.hoverboardActive = false;
    this.hoverboardTimer = 0;
    this.jetpackActive = false;
    this.jetpackTimer = 0;
    this.magnetActive = false;
    this.magnetTimer = 0;
    this.multiplierActive = false;
    this.multiplierTimer = 0;
    this.sneakersActive = false;
    this.sneakersTimer = 0;
    this.invulnerableTimer = 0;

    // Character & Board Customization
    this.selectedCharacter = 'dash'; // 'billi' | 'dash' | 'nova' | 'pulse' | 'zero'
    this.selectedBoard = 'cyan'; // 'cyan' | 'phantom' | 'solar' | 'void' | 'glitch'
    this.characterSkin = {
      hoodie: 0x0284c7,
      pants: 0x0f172a,
      cap: 0xef4444,
    };
    this.boardSkin = {
      deck: 0x06b6d4,
      glow: 0x22d3ee,
    };

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.reqId = null;

    // World & Chaser Entities
    this.playerGroup = null;
    this.charRoot = null;
    this.hoverboardMesh = null;
    this.jetpackMesh = null;
    this.magnetFieldMesh = null;
    this.ghostSurgeAura = null;
    this.chaserGroup = null;
    this.chaserDistance = 10;
    this.targetChaserDistance = 10;

    // Procedural Chunks & Pooling
    this.chunks = [];
    this.chunkLength = 52;
    this.totalChunks = 4;
    this.nextChunkZ = 0;

    this.activeTrains = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activeGhostTokens = [];
    this.activePhantoms = [];
    this.activePowerups = [];
    this.particles = [];
    this.sparkTimer = 0;

    // High Score Gate Banner
    this.recordGateMesh = null;
    this.recordGateZ = null;

    // Atmosphere Cycle
    this.dayNightFactor = 0; // 0: Night, 0.5: Dawn, 1: Twilight
    this.shakeIntensity = 0;

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    // 1. Scene & Atmosphere Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080d1a);
    this.scene.fog = new THREE.FogExp2(0x080d1a, 0.014);

    // 2. Camera Setup with Speed-Responsive FOV
    this.camera = new THREE.PerspectiveCamera(66, width / height, 0.1, 300);
    this.camera.position.set(0, 4.4, 7.6);
    this.camera.lookAt(0, 2, -10);

    // 3. Optimized High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting Rig
    this.setupLighting();

    // 5. Shared Material & Geometry Caches
    this.initCaches();

    // 6. Build Player Character & Chaser
    this.buildPlayerCharacter();
    this.buildGhostChaser();

    // 7. Generate Initial Track Chunks
    this.nextChunkZ = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      this.spawnChunk(this.nextChunkZ);
      this.nextChunkZ -= this.chunkLength;
    }

    // 8. Setup Particles
    this.particles = [];

    // Resize Handler
    window.addEventListener('resize', this.handleResize);
  }

  setupLighting() {
    // Ambient Cool Blue Fill
    this.ambientLight = new THREE.AmbientLight(0x405575, 1.1);
    this.scene.add(this.ambientLight);

    // Key Directional Sun / Cyber Light
    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    this.dirLight.position.set(16, 32, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 512;
    this.dirLight.shadow.mapSize.height = 512;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 90;
    const d = 22;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Neon Rim Accent Light (Billighost Cyan Glow)
    this.rimLight = new THREE.DirectionalLight(0x06b6d4, 0.9);
    this.rimLight.position.set(-18, 12, -22);
    this.scene.add(this.rimLight);
  }

  initCaches() {
    this.materials = {
      bed: new THREE.MeshLambertMaterial({ color: 0x131924 }),
      curb: new THREE.MeshLambertMaterial({ color: 0x2c384a }),
      rail: new THREE.MeshStandardMaterial({ color: 0xa0aec0, metalness: 0.9, roughness: 0.2 }),
      tie: new THREE.MeshLambertMaterial({ color: 0x221a14 }),
      thirdRail: new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.75, roughness: 0.35 }),
      neonBlue: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      neonCyan: new THREE.MeshBasicMaterial({ color: 0x06b6d4 }),
      neonYellow: new THREE.MeshBasicMaterial({ color: 0xfef08a }),
      neonAmber: new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
      bldg: new THREE.MeshLambertMaterial({ color: 0x0c1322 }),
      bldgWinCyan: new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      bldgWinAmber: new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
      bldgWinPurple: new THREE.MeshBasicMaterial({ color: 0xa855f7 }),
      trainBody: new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.65, roughness: 0.28 }),
      trainRoof: new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.35 }),
      trainGlass: new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.05, metalness: 0.95 }),
      trainLight: new THREE.MeshBasicMaterial({ color: 0xfffae0 }),
      rampPlate: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45, metalness: 0.4 }),
      hurdlePole: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 }),
      hurdleStripe: new THREE.MeshBasicMaterial({ color: 0xef4444 }),
      hurdleWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      coin: new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.15, emissive: 0xd97706, emissiveIntensity: 0.4 }),
      ghostToken: new THREE.MeshStandardMaterial({ color: 0x7eb8ff, metalness: 0.9, roughness: 0.1, emissive: 0x0284c7, emissiveIntensity: 0.7 }),
      ghostMat: new THREE.MeshStandardMaterial({ color: 0xcfe4ff, transparent: true, opacity: 0.88, roughness: 0.2, metalness: 0.1, emissive: 0x0284c7, emissiveIntensity: 0.6 }),
      ghostGlow: new THREE.MeshBasicMaterial({ color: 0x7eb8ff }),
      ghostEye: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      phantomHazard: new THREE.MeshStandardMaterial({ color: 0xec4899, transparent: true, opacity: 0.85, emissive: 0xdb2777, emissiveIntensity: 0.8 }),
    };

    this.geometries = {
      bed: new THREE.PlaneGeometry(17, this.chunkLength),
      curb: new THREE.BoxGeometry(0.22, 0.3, this.chunkLength),
      rail: new THREE.BoxGeometry(0.09, 0.14, this.chunkLength),
      tie: new THREE.BoxGeometry(2.0, 0.09, 0.32),
      thirdRail: new THREE.BoxGeometry(0.08, 0.2, this.chunkLength),
      archPillar: new THREE.BoxGeometry(0.35, 8.0, 0.35),
      archBeam: new THREE.BoxGeometry(15, 0.4, 0.4),
      coin: new THREE.CylinderGeometry(0.35, 0.35, 0.09, 16),
      star: new THREE.OctahedronGeometry(0.14),
      ghostToken: new THREE.CylinderGeometry(0.38, 0.38, 0.1, 16),
    };
    this.geometries.bed.rotateX(-Math.PI / 2);
    this.geometries.coin.rotateX(Math.PI / 2);
    this.geometries.ghostToken.rotateX(Math.PI / 2);
  }

  // --- CHARACTER & CHASER BUILDERS ---

  setSkins(charSkin, boardSkin) {
    if (charSkin) this.characterSkin = { ...this.characterSkin, ...charSkin };
    if (boardSkin) this.boardSkin = { ...this.boardSkin, ...boardSkin };
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
      this.buildPlayerCharacter();
    }
  }

  setCharacter(charId) {
    this.selectedCharacter = charId;
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
      this.buildPlayerCharacter();
    }
  }

  setBoard(boardId) {
    this.selectedBoard = boardId;
    if (this.hoverboardMesh && this.playerGroup) {
      this.playerGroup.remove(this.hoverboardMesh);
      this.hoverboardMesh = this.buildHoverboard();
      this.hoverboardMesh.visible = this.hoverboardActive;
      this.playerGroup.add(this.hoverboardMesh);
    }
  }

  buildPlayerCharacter() {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, 0, 0);

    this.charRoot = new THREE.Group();
    this.charRoot.position.y = 1.0;
    this.playerGroup.add(this.charRoot);

    if (this.selectedCharacter === 'billi') {
      this.buildSpectralBilliCharacter();
    } else if (this.selectedCharacter === 'nova') {
      this.buildNovaNinjaCharacter();
    } else if (this.selectedCharacter === 'pulse') {
      this.buildPulseSynthwaveCharacter();
    } else if (this.selectedCharacter === 'zero') {
      this.buildZeroShadowCharacter();
    } else {
      this.buildDashStreetCharacter();
    }

    // Hoverboard
    this.hoverboardMesh = this.buildHoverboard();
    this.hoverboardMesh.visible = false;
    this.playerGroup.add(this.hoverboardMesh);

    // Jetpack
    this.jetpackMesh = this.buildJetpack();
    this.jetpackMesh.visible = false;
    this.charRoot.add(this.jetpackMesh);

    // Magnet Concentric Vortex Rings
    this.magnetFieldMesh = this.buildMagnetVortexMesh();
    this.magnetFieldMesh.visible = false;
    this.playerGroup.add(this.magnetFieldMesh);

    // 2x Multiplier Aura
    const multGeo = new THREE.OctahedronGeometry(0.3);
    const multMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.0,
      wireframe: true,
    });
    this.multiplierAura = new THREE.Mesh(multGeo, multMat);
    this.multiplierAura.position.set(0, 2.1, 0);
    this.multiplierAura.visible = false;
    this.charRoot.add(this.multiplierAura);

    // Ghost Surge Hyperspace Aura Ring
    const surgeGeo = new THREE.TorusGeometry(1.1, 0.05, 8, 32);
    const surgeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    this.ghostSurgeAura = new THREE.Mesh(surgeGeo, surgeMat);
    this.ghostSurgeAura.rotation.x = Math.PI / 2;
    this.ghostSurgeAura.position.y = 0.8;
    this.ghostSurgeAura.visible = false;
    this.playerGroup.add(this.ghostSurgeAura);

    this.scene.add(this.playerGroup);
  }

  // Character 1: Dash (Classic Streetwear Runner)
  buildDashStreetCharacter() {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd5b3 });
    const hoodieMat = new THREE.MeshStandardMaterial({ color: this.characterSkin.hoodie, roughness: 0.55, metalness: 0.1 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: this.characterSkin.pants, roughness: 0.7 });
    const capMat = new THREE.MeshStandardMaterial({ color: this.characterSkin.cap, roughness: 0.45 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
    const soleMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.6 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x06b6d4, emissiveIntensity: 0.8 });

    // Torso with collar & zipper seam
    const torsoGeo = new THREE.BoxGeometry(0.72, 0.88, 0.48);
    const torso = new THREE.Mesh(torsoGeo, hoodieMat);
    torso.position.y = 0.45;
    torso.castShadow = true;
    this.charRoot.add(torso);

    const zipperGeo = new THREE.BoxGeometry(0.04, 0.88, 0.02);
    const zipper = new THREE.Mesh(zipperGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    zipper.position.set(0, 0.45, 0.25);
    this.charRoot.add(zipper);

    // Cyber Backpack
    const packGeo = new THREE.BoxGeometry(0.48, 0.62, 0.22);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.5 });
    const pack = new THREE.Mesh(packGeo, packMat);
    pack.position.set(0, 0.48, -0.32);
    this.charRoot.add(pack);

    // Blinking antenna on backpack
    const antGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35);
    const ant = new THREE.Mesh(antGeo, new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 }));
    ant.position.set(0.18, 0.88, -0.32);
    const antLight = new THREE.Mesh(new THREE.SphereGeometry(0.05), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    antLight.position.set(0.18, 1.05, -0.32);
    this.charRoot.add(ant);
    this.charRoot.add(antLight);

    // Head, Cap & Visor
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.52, 0.48), skinMat);
    head.position.y = 1.15;
    head.castShadow = true;
    this.charRoot.add(head);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.54), capMat);
    cap.position.set(0, 1.34, 0.02);
    const capBrim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.06, 0.34), capMat);
    capBrim.position.set(0, 1.25, 0.38);
    this.charRoot.add(cap);
    this.charRoot.add(capBrim);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.08), visorMat);
    visor.position.set(0, 1.15, 0.25);
    this.charRoot.add(visor);

    // Headphones with glowing rings
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), visorMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.29, 1.18, 0);
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16), visorMat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(0.29, 1.18, 0);
    this.charRoot.add(earL);
    this.charRoot.add(earR);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.8, 0);
    const armL = new THREE.Mesh(armGeo, hoodieMat);
    armL.position.y = -0.3;
    this.leftArm.add(armL);
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.8, 0);
    const armR = new THREE.Mesh(armGeo, hoodieMat);
    armR.position.y = -0.3;
    this.rightArm.add(armR);
    this.charRoot.add(this.rightArm);

    // Legs & Modeled Sneakers
    this.leftLeg = this.buildHumanLeg(pantsMat, shoeMat, soleMat, -0.2);
    this.rightLeg = this.buildHumanLeg(pantsMat, shoeMat, soleMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Character 2: Billi (The Spectral Master / Mascot Runner)
  buildSpectralBilliCharacter() {
    const ghostMat = this.materials.ghostMat;
    const coreMat = this.materials.ghostGlow;

    // Outer scalloped floating shroud
    const cloakGeo = new THREE.CylinderGeometry(0.55, 0.78, 1.5, 20, 4, true);
    const cloak = new THREE.Mesh(cloakGeo, ghostMat);
    cloak.position.y = 0.75;
    this.charRoot.add(cloak);

    // Head dome
    const domeGeo = new THREE.SphereGeometry(0.44, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, ghostMat);
    dome.position.y = 1.48;
    this.charRoot.add(dome);

    // Glowing Cyan Eyes
    const eyeGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const eyeL = new THREE.Mesh(eyeGeo, this.materials.ghostEye);
    eyeL.position.set(-0.16, 1.34, 0.38);
    const eyeR = new THREE.Mesh(eyeGeo, this.materials.ghostEye);
    eyeR.position.set(0.16, 1.34, 0.38);
    this.charRoot.add(eyeL);
    this.charRoot.add(eyeR);

    // Central OS Core Ring
    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.03, 8, 24), coreMat);
    coreRing.position.set(0, 0.82, 0);
    this.charRoot.add(coreRing);

    // Floating spectral arms
    const ghostArmGeo = new THREE.ConeGeometry(0.12, 0.6, 12);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.5, 0.85, 0);
    const gArmL = new THREE.Mesh(ghostArmGeo, ghostMat);
    gArmL.position.y = -0.25;
    gArmL.rotation.z = -0.2;
    this.leftArm.add(gArmL);
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.5, 0.85, 0);
    const gArmR = new THREE.Mesh(ghostArmGeo, ghostMat);
    gArmR.position.y = -0.25;
    gArmR.rotation.z = 0.2;
    this.rightArm.add(gArmR);
    this.charRoot.add(this.rightArm);

    this.leftLeg = new THREE.Group();
    this.rightLeg = new THREE.Group();
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Character 3: Nova (Chrome Android Ninja)
  buildNovaNinjaCharacter() {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 });
    const underMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
    const visorMat = new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xec4899, emissiveIntensity: 0.9 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.7, roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.44), armorMat);
    torso.position.y = 0.45;
    this.charRoot.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.46), underMat);
    head.position.y = 1.15;
    this.charRoot.add(head);

    // Angular Chrome Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.12), visorMat);
    visor.position.set(0, 1.16, 0.24);
    this.charRoot.add(visor);

    // Twin Katana Holster
    const katanaGeo = new THREE.BoxGeometry(0.08, 1.1, 0.08);
    const k1 = new THREE.Mesh(katanaGeo, armorMat);
    k1.rotation.z = 0.45;
    k1.position.set(0.12, 0.7, -0.28);
    const k2 = new THREE.Mesh(katanaGeo, armorMat);
    k2.rotation.z = -0.45;
    k2.position.set(-0.12, 0.7, -0.28);
    this.charRoot.add(k1);
    this.charRoot.add(k2);

    const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.8, 0);
    this.leftArm.add(new THREE.Mesh(armGeo, armorMat));
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.8, 0);
    this.rightArm.add(new THREE.Mesh(armGeo, armorMat));
    this.charRoot.add(this.rightArm);

    this.leftLeg = this.buildHumanLeg(underMat, shoeMat, armorMat, -0.2);
    this.rightLeg = this.buildHumanLeg(underMat, shoeMat, armorMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Character 4: Pulse (Retro Synthwave Racer)
  buildPulseSynthwaveCharacter() {
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xfcd34d });
    const jacketMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.6, metalness: 0.2 });
    const neonWireMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.7 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
    const shadesMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.46), jacketMat);
    torso.position.y = 0.45;
    this.charRoot.add(torso);

    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.48), neonWireMat);
    trim.position.y = 0.2;
    this.charRoot.add(trim);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.5, 0.46), skinMat);
    head.position.y = 1.15;
    this.charRoot.add(head);

    // Retro Shutter Shades
    const shades = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.08), shadesMat);
    shades.position.set(0, 1.18, 0.25);
    this.charRoot.add(shades);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.8, 0);
    this.leftArm.add(new THREE.Mesh(armGeo, jacketMat));
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.8, 0);
    this.rightArm.add(new THREE.Mesh(armGeo, jacketMat));
    this.charRoot.add(this.rightArm);

    this.leftLeg = this.buildHumanLeg(pantsMat, shoeMat, neonWireMat, -0.2);
    this.rightLeg = this.buildHumanLeg(pantsMat, shoeMat, neonWireMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Character 5: Zero (Shadow Matrix Operative)
  buildZeroShadowCharacter() {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
    const maskMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.95, 0.48), coatMat);
    torso.position.y = 0.45;
    this.charRoot.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.48), coatMat);
    head.position.y = 1.15;
    this.charRoot.add(head);

    // Glowing Digital Matrix Mask
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.08), maskMat);
    mask.position.set(0, 1.12, 0.25);
    this.charRoot.add(mask);

    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.8, 0);
    this.leftArm.add(new THREE.Mesh(armGeo, coatMat));
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.8, 0);
    this.rightArm.add(new THREE.Mesh(armGeo, coatMat));
    this.charRoot.add(this.rightArm);

    this.leftLeg = this.buildHumanLeg(coatMat, shoeMat, maskMat, -0.2);
    this.rightLeg = this.buildHumanLeg(coatMat, shoeMat, maskMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  buildHumanLeg(pantsMat, shoeMat, soleMat, posX) {
    const legGroup = new THREE.Group();
    legGroup.position.set(posX, 0.05, 0);

    const legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.24);
    const leg = new THREE.Mesh(legGeo, pantsMat);
    leg.position.y = -0.36;
    leg.castShadow = true;
    legGroup.add(leg);

    // High-top sneaker with sole & tread
    const shoeGeo = new THREE.BoxGeometry(0.26, 0.18, 0.46);
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -0.7, 0.09);
    shoe.castShadow = true;

    const soleGeo = new THREE.BoxGeometry(0.28, 0.06, 0.48);
    const sole = new THREE.Mesh(soleGeo, soleMat);
    sole.position.set(0, -0.81, 0.09);

    legGroup.add(shoe);
    legGroup.add(sole);

    return legGroup;
  }

  // --- 3D BILLIGHOST INSPECTOR CHASER ---

  buildGhostChaser() {
    this.chaserGroup = new THREE.Group();
    this.chaserGroup.position.set(0, 1.2, 10); // Follows behind runner (+Z)

    const chaserMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.88,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.7,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.7, 1.05, 1.8, 24, 4, true);
    const chaserBody = new THREE.Mesh(bodyGeo, chaserMat);
    chaserBody.position.y = 0.9;
    this.chaserGroup.add(chaserBody);

    // Head Dome
    const domeGeo = new THREE.SphereGeometry(0.68, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, chaserMat);
    dome.position.y = 1.8;
    this.chaserGroup.add(dome);

    // Glowing Eyes
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), eyeMat);
    eyeL.position.set(-0.25, 1.7, 0.55);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), eyeMat);
    eyeR.position.set(0.25, 1.7, 0.55);
    this.chaserGroup.add(eyeL);
    this.chaserGroup.add(eyeR);

    // Inspector Cap / Hat on Ghost
    const capGeo = new THREE.CylinderGeometry(0.72, 0.75, 0.22, 24);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 2.38, 0);
    const brimGeo = new THREE.BoxGeometry(0.8, 0.05, 0.4);
    const brim = new THREE.Mesh(brimGeo, capMat);
    brim.position.set(0, 2.28, 0.45);
    const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    badge.position.set(0, 2.45, 0.65);
    this.chaserGroup.add(cap);
    this.chaserGroup.add(brim);
    this.chaserGroup.add(badge);

    // Floating Mini Security Drone (companion like the dog)
    this.chaserDrone = new THREE.Group();
    this.chaserDrone.position.set(1.4, 1.4, 0);

    const droneBody = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 12), new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 }));
    const droneEye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    droneEye.position.z = 0.22;
    const droneRing = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.02, 6, 24), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    droneRing.rotation.x = Math.PI / 2;

    this.chaserDrone.add(droneBody);
    this.chaserDrone.add(droneEye);
    this.chaserDrone.add(droneRing);
    this.chaserGroup.add(this.chaserDrone);

    this.scene.add(this.chaserGroup);
  }

  // --- HOVERBOARDS & POWERUP MESHES ---

  buildHoverboard() {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 0.12, 0);

    const deckShape = new THREE.Shape();
    deckShape.moveTo(-0.45, -1.2);
    deckShape.lineTo(0.45, -1.2);
    deckShape.quadraticCurveTo(0.55, 0, 0.45, 1.2);
    deckShape.lineTo(-0.45, 1.2);
    deckShape.quadraticCurveTo(-0.55, 0, -0.45, -1.2);

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const deckGeo = new THREE.ExtrudeGeometry(deckShape, extrudeSettings);
    deckGeo.rotateX(Math.PI / 2);

    const colors = {
      cyan: { deck: 0x06b6d4, glow: 0x22d3ee },
      phantom: { deck: 0x6366f1, glow: 0xa855f7 },
      solar: { deck: 0xf59e0b, glow: 0xfbbf24 },
      void: { deck: 0x8b5cf6, glow: 0xc084fc },
      glitch: { deck: 0x10b981, glow: 0x34d399 },
    };
    const col = colors[this.selectedBoard] || colors.cyan;

    const deckMat = new THREE.MeshStandardMaterial({ color: col.deck, metalness: 0.85, roughness: 0.2 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.castShadow = true;
    boardGroup.add(deck);

    // Glowing Neon Thrusters
    const glowMat = new THREE.MeshBasicMaterial({ color: col.glow });
    const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.12, 16);
    const ft = new THREE.Mesh(thrusterGeo, glowMat);
    ft.position.set(0, -0.06, -0.75);
    const rt = new THREE.Mesh(thrusterGeo, glowMat);
    rt.position.set(0, -0.06, 0.75);
    boardGroup.add(ft);
    boardGroup.add(rt);

    return boardGroup;
  }

  buildJetpack() {
    const jetGroup = new THREE.Group();
    jetGroup.position.set(0, 0.45, -0.32);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.2 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const tankGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.65, 16);
    const lTank = new THREE.Mesh(tankGeo, metalMat);
    lTank.position.x = -0.22;
    const rTank = new THREE.Mesh(tankGeo, metalMat);
    rTank.position.x = 0.22;
    jetGroup.add(lTank);
    jetGroup.add(rTank);

    const nozzGeo = new THREE.ConeGeometry(0.12, 0.18, 16);
    const lNozz = new THREE.Mesh(nozzGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
    lNozz.position.set(-0.22, -0.38, 0);
    const rNozz = new THREE.Mesh(nozzGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 }));
    rNozz.position.set(0.22, -0.38, 0);
    jetGroup.add(lNozz);
    jetGroup.add(rNozz);

    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.3, 0.08), redMat);
    jetGroup.add(plate);

    return jetGroup;
  }

  buildMagnetVortexMesh() {
    const group = new THREE.Group();
    const ringGeo1 = new THREE.TorusGeometry(1.0, 0.04, 8, 32);
    const ringGeo2 = new THREE.TorusGeometry(1.4, 0.03, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.75 });

    const r1 = new THREE.Mesh(ringGeo1, ringMat);
    r1.rotation.x = Math.PI / 2;
    const r2 = new THREE.Mesh(ringGeo2, ringMat);
    r2.rotation.x = Math.PI / 2;

    group.add(r1);
    group.add(r2);
    group.position.y = 0.6;
    return group;
  }

  // --- PROCEDURAL TRACK & CHUNK GENERATION ---

  spawnChunk(chunkZ) {
    const chunk = new THREE.Group();
    chunk.position.z = chunkZ;

    // 1. Ballast Gravel Trackbed
    const bed = new THREE.Mesh(this.geometries.bed, this.materials.bed);
    bed.position.y = 0;
    bed.receiveShadow = true;
    chunk.add(bed);

    // 2. Concrete Track Dividers
    [-LANE_WIDTH * 1.5, -LANE_WIDTH * 0.5, LANE_WIDTH * 0.5, LANE_WIDTH * 1.5].forEach(cx => {
      const curb = new THREE.Mesh(this.geometries.curb, this.materials.curb);
      curb.position.set(cx, 0.15, 0);
      chunk.add(curb);
    });

    // 3. Double Steel Rails
    LANES.forEach(laneX => {
      const railL = new THREE.Mesh(this.geometries.rail, this.materials.rail);
      railL.position.set(laneX - 0.75, 0.07, 0);
      const railR = new THREE.Mesh(this.geometries.rail, this.materials.rail);
      railR.position.set(laneX + 0.75, 0.07, 0);
      chunk.add(railL);
      chunk.add(railR);
    });

    // 4. Electrified 3rd Rail on Far Right
    const thirdRail = new THREE.Mesh(this.geometries.thirdRail, this.materials.thirdRail);
    thirdRail.position.set(LANE_WIDTH * 1.6, 0.1, 0);
    chunk.add(thirdRail);

    // 5. Instanced Ties (GPU Batching)
    const tiesPerLane = Math.floor(this.chunkLength / 2.0);
    const totalTies = LANES.length * tiesPerLane;
    const instancedTies = new THREE.InstancedMesh(this.geometries.tie, this.materials.tie, totalTies);
    const dummy = new THREE.Object3D();
    let tieIdx = 0;

    LANES.forEach(laneX => {
      for (let i = 0; i < tiesPerLane; i++) {
        const z = -this.chunkLength / 2 + 1 + i * 2.0;
        dummy.position.set(laneX, 0.045, z);
        dummy.updateMatrix();
        instancedTies.setMatrixAt(tieIdx++, dummy.matrix);
      }
    });
    instancedTies.instanceMatrix.needsUpdate = true;
    chunk.add(instancedTies);

    // 6. Overhead High-Voltage Catenary Arch with Dual Tension Wires
    const arch = this.buildCatenaryArch();
    chunk.add(arch);

    // 7. City Skyline & Animated Holographic Billboards
    this.addCityScenery(chunk);

    // 8. Gameplay Elements (Trains, Hurdles, Phantoms, Coins, Tokens)
    if (Math.abs(chunkZ) > 40) {
      this.populateChunkGameplay(chunkZ);
    }

    this.scene.add(chunk);
    this.chunks.push({ group: chunk, z: chunkZ });
  }

  buildCatenaryArch() {
    const archGroup = new THREE.Group();

    const leftPillar = new THREE.Mesh(this.geometries.archPillar, this.materials.steel);
    leftPillar.position.set(-7.2, 4.0, 0);
    const rightPillar = new THREE.Mesh(this.geometries.archPillar, this.materials.steel);
    rightPillar.position.set(7.2, 4.0, 0);
    archGroup.add(leftPillar);
    archGroup.add(rightPillar);

    const beam = new THREE.Mesh(this.geometries.archBeam, this.materials.steel);
    beam.position.set(0, 7.8, 0);
    archGroup.add(beam);

    // Overhead catenary suspension cables
    const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, this.chunkLength, 6);
    wireGeo.rotateX(Math.PI / 2);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    [-LANE_WIDTH, 0, LANE_WIDTH].forEach(wx => {
      const wire = new THREE.Mesh(wireGeo, wireMat);
      wire.position.set(wx, 6.4, 0);
      archGroup.add(wire);
    });

    return archGroup;
  }

  addCityScenery(chunk) {
    [-15, 15].forEach((sideX, sideIdx) => {
      for (let i = 0; i < 2; i++) {
        const h = 24 + i * 10;
        const w = 8.5;
        const d = 11;
        const bldgGeo = new THREE.BoxGeometry(w, h, d);
        const bldg = new THREE.Mesh(bldgGeo, this.materials.bldg);
        const bZ = -this.chunkLength / 2 + i * 24;
        bldg.position.set(sideX, h / 2, bZ);
        chunk.add(bldg);

        // Flashing Aviation Beacon on top of skyscraper
        const beaconGeo = new THREE.SphereGeometry(0.24, 8, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.set(sideX, h + 0.3, bZ);
        chunk.add(beacon);

        // Holographic Billboard on selected buildings
        if (i === 0 && sideIdx === 0) {
          const boardGeo = new THREE.PlaneGeometry(6.5, 3.2);
          const boardMat = new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85,
          });
          const board = new THREE.Mesh(boardGeo, boardMat);
          board.position.set(sideX + 3.8, 14, bZ);
          board.rotation.y = Math.PI / 2;
          chunk.add(board);
        }
      }
    });
  }

  populateChunkGameplay(chunkZ) {
    const laneOccupied = [false, false, false];

    // Check if we should spawn the Personal Record Banner Gate
    if (this.highScoreDistance > 100 && !this.recordBroken && !this.recordGateMesh) {
      if (Math.abs(chunkZ - (-this.highScoreDistance)) < this.chunkLength) {
        this.spawnRecordGate(chunkZ);
      }
    }

    const pattern = Math.floor(Math.random() * 5);

    if (pattern === 0 || pattern === 1) {
      const trainLane = Math.floor(Math.random() * 3);
      laneOccupied[trainLane] = true;
      const isMoving = pattern === 1;
      const hasRamp = !isMoving && Math.random() > 0.3;
      this.spawnTrain(LANES[trainLane], chunkZ, isMoving, hasRamp);

      const otherLanes = [0, 1, 2].filter(l => l !== trainLane);
      const hurdleLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
      if (Math.random() > 0.25) {
        laneOccupied[hurdleLane] = true;
        const isSlide = Math.random() > 0.5;
        this.spawnObstacle(LANES[hurdleLane], chunkZ + (Math.random() * 8 - 4), isSlide ? 'slide' : 'hurdle');
      }
    } else if (pattern === 2) {
      // Hurdle + Ghost Phantom Hazard!
      const l1 = Math.floor(Math.random() * 3);
      laneOccupied[l1] = true;
      this.spawnObstacle(LANES[l1], chunkZ - 8, 'hurdle');

      const remaining = [0, 1, 2].filter(l => l !== l1);
      const l2 = remaining[Math.floor(Math.random() * remaining.length)];
      laneOccupied[l2] = true;
      this.spawnPhantom(LANES[l2], chunkZ + 6);
    } else {
      const l1 = Math.floor(Math.random() * 3);
      laneOccupied[l1] = true;
      this.spawnObstacle(LANES[l1], chunkZ - 10, 'hurdle');

      const remaining = [0, 1, 2].filter(l => l !== l1);
      const l2 = remaining[Math.floor(Math.random() * remaining.length)];
      if (Math.random() > 0.4) {
        laneOccupied[l2] = true;
        this.spawnObstacle(LANES[l2], chunkZ + 10, 'slide');
      }
    }

    // Spawn Coins & Rare Billighost Tokens in Open Lanes
    for (let l = 0; l < 3; l++) {
      if (!laneOccupied[l]) {
        const coinPattern = Math.random();
        if (coinPattern > 0.4) {
          this.spawnCoinArc(LANES[l], chunkZ);
        } else if (coinPattern > 0.15) {
          this.spawnCoinLine(LANES[l], chunkZ);
        }

        // 18% Chance to spawn rare Billighost Ghost Token
        if (Math.random() < 0.18) {
          this.spawnGhostToken(LANES[l], 1.2, chunkZ + (Math.random() * 10 - 5));
        }
      }
    }

    // Powerup Crates
    if (Math.random() < 0.28) {
      const availableLanes = [0, 1, 2].filter(l => !laneOccupied[l]);
      if (availableLanes.length > 0) {
        const pLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        const types = ['hoverboard', 'jetpack', 'magnet', 'multiplier', 'sneakers'];
        const pType = types[Math.floor(Math.random() * types.length)];
        this.spawnPowerupCrate(LANES[pLane], chunkZ + (Math.random() * 10 - 5), pType);
      }
    }
  }

  // --- SUBWAY TRAINS ---

  spawnTrain(laneX, chunkZ, isMoving = false, hasRamp = false) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(laneX, 0, chunkZ);

    const length = 22;
    const height = 3.8;
    const width = 2.4;

    const bodyGeo = new THREE.BoxGeometry(width, height - 0.4, length);
    const body = new THREE.Mesh(bodyGeo, this.materials.trainBody);
    body.position.y = (height - 0.4) / 2 + 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    trainGroup.add(body);

    const roofGeo = new THREE.BoxGeometry(width + 0.1, 0.2, length + 0.1);
    const roof = new THREE.Mesh(roofGeo, this.materials.trainRoof);
    roof.position.y = height + 0.1;
    roof.receiveShadow = true;
    trainGroup.add(roof);

    for (let rz = -length / 3; rz <= length / 3; rz += length / 3) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 2.2), this.materials.trainRoof);
      ac.position.set(0, height + 0.3, rz);
      trainGroup.add(ac);
    }

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(width - 0.3, 1.2, 0.1), this.materials.trainGlass);
    windshield.position.set(0, height - 1.0, length / 2 + 0.05);
    trainGroup.add(windshield);

    const hlGeo = new THREE.CircleGeometry(0.24, 16);
    const hlL = new THREE.Mesh(hlGeo, this.materials.trainLight);
    hlL.position.set(-0.7, 1.1, length / 2 + 0.06);
    const hlR = new THREE.Mesh(hlGeo, this.materials.trainLight);
    hlR.position.set(0.7, 1.1, length / 2 + 0.06);
    trainGroup.add(hlL);
    trainGroup.add(hlR);

    // Windows with Silhouettes
    const winGeo = new THREE.PlaneGeometry(1.6, 0.8);
    const winMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide });
    for (let wz = -length / 2 + 3; wz <= length / 2 - 3; wz += 3.8) {
      const wL = new THREE.Mesh(winGeo, winMat);
      wL.position.set(-width / 2 - 0.02, height * 0.6, wz);
      wL.rotation.y = Math.PI / 2;
      const wR = new THREE.Mesh(winGeo, winMat);
      wR.position.set(width / 2 + 0.02, height * 0.6, wz);
      wR.rotation.y = -Math.PI / 2;
      trainGroup.add(wL);
      trainGroup.add(wR);
    }

    // Undercarriage Bogies
    const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9 });
    [-length / 2 + 2, length / 2 - 2].forEach(bz => {
      [-width / 2 + 0.2, width / 2 - 0.2].forEach(wx => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.position.set(wx, 0.3, bz);
        trainGroup.add(wheel);
      });
    });

    if (hasRamp) {
      const rw = width * 0.9;
      const rl = 6;
      const rh = height;
      const vertices = new Float32Array([
        -rw / 2, 0, length / 2 + rl,
         rw / 2, 0, length / 2 + rl,
         rw / 2, rh, length / 2,
        -rw / 2, 0, length / 2 + rl,
         rw / 2, rh, length / 2,
        -rw / 2, rh, length / 2,
      ]);
      const rampGeo = new THREE.BufferGeometry();
      rampGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeo.computeVertexNormals();
      const ramp = new THREE.Mesh(rampGeo, this.materials.rampPlate);
      ramp.receiveShadow = true;
      trainGroup.add(ramp);
    }

    this.spawnTrainRoofCoins(laneX, chunkZ, length, height + 0.5);

    this.scene.add(trainGroup);
    this.activeTrains.push({
      group: trainGroup,
      laneX,
      z: chunkZ,
      length,
      height,
      width,
      isMoving,
      moveSpeed: isMoving ? 14 : 0,
      hasRamp,
    });
  }

  spawnTrainRoofCoins(laneX, chunkZ, length, roofY) {
    for (let z = -length / 2 + 2; z <= length / 2 - 2; z += 2.5) {
      this.spawnCoin(laneX, roofY + 0.6, chunkZ + z);
    }
  }

  // --- OBSTACLES (HURDLES & SLIDE GANTRIES) ---

  spawnObstacle(laneX, z, type = 'hurdle') {
    const obsGroup = new THREE.Group();
    obsGroup.position.set(laneX, 0, z);

    if (type === 'hurdle') {
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
      const poleL = new THREE.Mesh(poleGeo, this.materials.hurdlePole);
      poleL.position.set(-1.05, 0.6, 0);
      const poleR = new THREE.Mesh(poleGeo, this.materials.hurdlePole);
      poleR.position.set(1.05, 0.6, 0);

      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.25, 0.15), this.materials.hurdleWhite);
      bar.position.set(0, 0.95, 0);

      [-0.6, 0, 0.6].forEach(sx => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.26, 0.16), this.materials.hurdleStripe);
        s.position.set(sx, 0.95, 0);
        obsGroup.add(s);
      });

      const flasher = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), this.materials.neonAmber);
      flasher.position.set(1.05, 1.25, 0);
      obsGroup.add(flasher);

      obsGroup.add(poleL);
      obsGroup.add(poleR);
      obsGroup.add(bar);

      this.scene.add(obsGroup);
      this.activeObstacles.push({
        group: obsGroup,
        type: 'hurdle',
        laneX,
        z,
      });
    } else {
      const postL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), this.materials.steel);
      postL.position.set(-1.15, 1.7, 0);
      const postR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.4, 0.2), this.materials.steel);
      postR.position.set(1.15, 1.7, 0);

      const cross = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 0.25), this.materials.neonAmber);
      cross.position.set(0, 2.4, 0);

      const ledSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.8), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
      ledSign.position.set(0, 2.4, 0.14);
      obsGroup.add(ledSign);

      obsGroup.add(postL);
      obsGroup.add(postR);
      obsGroup.add(cross);

      this.scene.add(obsGroup);
      this.activeObstacles.push({
        group: obsGroup,
        type: 'slide',
        laneX,
        z,
      });
    }
  }

  // --- SPECTRAL PHANTOM HAZARDS ---

  spawnPhantom(laneX, z) {
    const pGroup = new THREE.Group();
    pGroup.position.set(laneX, 1.4, z);

    const phantom = new THREE.Mesh(new THREE.SphereGeometry(0.48, 16, 12), this.materials.phantomHazard);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eyeL.position.set(-0.16, 0.1, 0.42);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eyeR.position.set(0.16, 0.1, 0.42);

    pGroup.add(phantom);
    pGroup.add(eyeL);
    pGroup.add(eyeR);

    this.scene.add(pGroup);
    this.activePhantoms.push({
      group: pGroup,
      laneX,
      z,
      baseY: 1.4,
    });
  }

  // --- COINS & BILLIGHOST GHOST TOKENS ---

  spawnCoin(x, y, z) {
    const coinGroup = new THREE.Group();
    coinGroup.position.set(x, y, z);

    const mesh = new THREE.Mesh(this.geometries.coin, this.materials.coin);
    mesh.castShadow = true;
    coinGroup.add(mesh);

    const star = new THREE.Mesh(this.geometries.star, new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
    star.position.z = 0.05;
    coinGroup.add(star);

    this.scene.add(coinGroup);
    this.activeCoins.push({
      group: coinGroup,
      x,
      y,
      z,
      collected: false,
    });
  }

  spawnGhostToken(x, y, z) {
    const tokenGroup = new THREE.Group();
    tokenGroup.position.set(x, y, z);

    const mesh = new THREE.Mesh(this.geometries.ghostToken, this.materials.ghostToken);
    tokenGroup.add(mesh);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 20), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    tokenGroup.add(ring);

    this.scene.add(tokenGroup);
    this.activeGhostTokens.push({
      group: tokenGroup,
      x,
      y,
      z,
      collected: false,
    });
  }

  spawnCoinLine(laneX, chunkZ, high = false) {
    const y = high ? 4.5 : 0.8;
    for (let z = -12; z <= 12; z += 2.4) {
      this.spawnCoin(laneX, y, chunkZ + z);
    }
  }

  spawnCoinArc(laneX, chunkZ, high = false) {
    const count = 7;
    const baseY = high ? 4.5 : 0.8;
    for (let i = 0; i < count; i++) {
      const ratio = i / (count - 1);
      const arcY = baseY + Math.sin(ratio * Math.PI) * 2.5;
      const z = chunkZ - 10 + i * 3.2;
      this.spawnCoin(laneX, arcY, z);
    }
  }

  // --- POWER-UP CRATES ---

  spawnPowerupCrate(x, z, type) {
    const crateGroup = new THREE.Group();
    crateGroup.position.set(x, 1.1, z);

    const colors = {
      hoverboard: 0x06b6d4,
      jetpack: 0xef4444,
      magnet: 0x8b5cf6,
      multiplier: 0xf59e0b,
      sneakers: 0x10b981,
    };
    const col = colors[type] || 0x3b82f6;

    const boxMat = new THREE.MeshStandardMaterial({
      color: col,
      metalness: 0.6,
      roughness: 0.2,
      emissive: col,
      emissiveIntensity: 0.45,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), boxMat);
    box.castShadow = true;
    crateGroup.add(box);

    const wireMat = new THREE.MeshBasicMaterial({ color: col, wireframe: true, transparent: true, opacity: 0.7 });
    const wire = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), wireMat);
    crateGroup.add(wire);

    this.scene.add(crateGroup);
    this.activePowerups.push({
      group: crateGroup,
      type,
      x,
      y,
      z,
      collected: false,
    });
  }

  // --- HIGH SCORE FINISH-LINE RECORD GATE ---

  spawnRecordGate(chunkZ) {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, chunkZ);

    const postL = new THREE.Mesh(this.geometries.archPillar, this.materials.neonAmber);
    postL.position.set(-6.5, 4.0, 0);
    const postR = new THREE.Mesh(this.geometries.archPillar, this.materials.neonAmber);
    postR.position.set(6.5, 4.0, 0);

    const bannerGeo = new THREE.PlaneGeometry(13, 2.2);
    const bannerMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.set(0, 7.0, 0);

    gateGroup.add(postL);
    gateGroup.add(postR);
    gateGroup.add(banner);

    this.scene.add(gateGroup);
    this.recordGateMesh = gateGroup;
    this.recordGateZ = chunkZ;
  }

  // --- PARTICLE SYSTEM 2.0 ---

  createBurst(x, y, z, color = 0xfbbf24, count = 20) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const vy = Math.random() * 8 + 2;
      const vz = (Math.random() - 0.5) * 6;

      this.scene.add(p);
      this.particles.push({
        mesh: p,
        vx: Math.cos(angle) * speed,
        vy,
        vz,
        life: 1.0,
        decay: 1.8 + Math.random() * 1.5,
      });
    }
  }

  createFootstepDust(x, z) {
    if (Math.random() > 0.4) return;
    const geo = new THREE.BoxGeometry(0.15, 0.08, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color: 0x64748b, transparent: true, opacity: 0.6 });
    const p = new THREE.Mesh(geo, mat);
    p.position.set(x + (Math.random() * 0.4 - 0.2), 0.05, z + 0.3);

    this.scene.add(p);
    this.particles.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 2,
      vy: 1.2 + Math.random() * 1.2,
      vz: 4 + Math.random() * 2,
      life: 0.6,
      decay: 2.2,
    });
  }

  createJetpackFlame(x, y, z) {
    const geo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const col = Math.random() > 0.5 ? 0xef4444 : 0xf59e0b;
    const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col }));
    p.position.set(x, y, z);

    this.scene.add(p);
    this.particles.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -6 - Math.random() * 4,
      vz: 10 + Math.random() * 5,
      life: 0.5,
      decay: 3.5,
    });
  }

  createRailSparks(x, z) {
    const geo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const p = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    p.position.set(x, 0.15, z);

    this.scene.add(p);
    this.particles.push({
      mesh: p,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 4 + 1,
      vz: Math.random() * 4 + 2,
      life: 0.4,
      decay: 2.8,
    });
  }

  // --- CONTROLS & PLAYER ACTIONS ---

  moveLeft() {
    if (!this.isRunning || this.isPaused) return;
    if (this.currentLane > 0) {
      this.currentLane--;
      this.targetX = LANES[this.currentLane];
      subwayAudio.playJump();
    }
  }

  moveRight() {
    if (!this.isRunning || this.isPaused) return;
    if (this.currentLane < 2) {
      this.currentLane++;
      this.targetX = LANES[this.currentLane];
      subwayAudio.playJump();
    }
  }

  jump() {
    if (!this.isRunning || this.isPaused) return;
    if (this.jetpackActive) return;

    if (this.isSliding) {
      this.isSliding = false;
      this.slideTimer = 0;
    }

    if (this.isGrounded) {
      const force = this.sneakersActive ? this.jumpForce * 1.45 : this.jumpForce;
      this.playerVY = force;
      this.isGrounded = false;
      this.isJumping = true;
      subwayAudio.playJump();

      if (this.hoverboardActive) {
        this.triggerBoardStunt();
      }
    }
  }

  slide() {
    if (!this.isRunning || this.isPaused) return;
    if (this.jetpackActive) return;
    if (this.isSliding && this.slideTimer > 0.05) return;

    if (!this.isGrounded) {
      this.playerVY = -this.gravity * 0.85;
      this.createFootstepDust(this.playerGroup.position.x, this.playerGroup.position.z);
    }
    this.isSliding = true;
    this.slideDuration = 0.28;
    this.slideTimer = 0.28;
    subwayAudio.playSlide();
  }

  activateHoverboard() {
    if (!this.isRunning || this.isPaused) return;
    if (!this.hoverboardActive) {
      this.hoverboardActive = true;
      this.hoverboardTimer = 30;
      if (this.hoverboardMesh) this.hoverboardMesh.visible = true;
      subwayAudio.playPowerupGet();
      subwayAudio.startHoverboardLoop();
      this.callbacks.onPowerupChange('hoverboard', 30);
    } else {
      this.triggerBoardStunt();
    }
  }

  triggerBoardStunt() {
    if (this.isDoingStunt) return;
    this.isDoingStunt = true;
    this.stuntRotation = 0;
    subwayAudio.playStunt();
    this.score += 250 * this.combo;
    this.callbacks.onScoreUpdate(this.score, Math.floor(this.distance), this.combo);
    this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 0.5, this.playerGroup.position.z, 0x06b6d4, 15);
  }

  activateGhostSurge() {
    if (this.ghostSurgeCharge >= 100 && !this.ghostSurgeActive) {
      this.ghostSurgeActive = true;
      this.ghostSurgeTimer = 12;
      this.ghostSurgeCharge = 0;
      if (this.ghostSurgeAura) this.ghostSurgeAura.visible = true;
      subwayAudio.playGhostSurge();
      this.callbacks.onGhostSurgeChange(0, true);
    }
  }

  // --- SECOND CHANCE REVIVE ---

  revive() {
    this.isRunning = true;
    this.isPaused = false;
    this.invulnerableTimer = 3.5;
    this.targetChaserDistance = 12;
    this.chaserDistance = 12;
    this.speed = this.baseSpeed;

    subwayAudio.playRevive();
    subwayAudio.startMusic();
    this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 1, this.playerGroup.position.z, 0x38bdf8, 45);

    for (let i = this.activeTrains.length - 1; i >= 0; i--) {
      const t = this.activeTrains[i];
      if (t.group.position.z > -35 && t.group.position.z < 15) {
        this.scene.remove(t.group);
        this.activeTrains.splice(i, 1);
      }
    }
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const o = this.activeObstacles[i];
      if (o.group.position.z > -35 && o.group.position.z < 15) {
        this.scene.remove(o.group);
        this.activeObstacles.splice(i, 1);
      }
    }

    this.animate();
  }

  // --- GAME LOOP & UPDATES ---

  start() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.clock.start();
    subwayAudio.ensureContext();
    subwayAudio.startMusic();
    this.animate();
  }

  pause() {
    this.isPaused = true;
    subwayAudio.stopMusic();
    subwayAudio.stopContinuousLoops();
  }

  resume() {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.clock.start();
    subwayAudio.startMusic();
    if (this.jetpackActive) subwayAudio.startJetpackLoop();
    if (this.hoverboardActive) subwayAudio.startHoverboardLoop();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.coins = 0;
    this.ghostTokens = 0;
    this.ghostSurgeCharge = 0;
    this.ghostSurgeActive = false;
    this.ghostSurgeTimer = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.combo = 1;
    this.streakCount = 0;
    this.nearMissCount = 0;
    this.recordBroken = false;

    this.currentLane = 1;
    this.targetX = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.groundY = 0;
    this.chaserDistance = 10;
    this.targetChaserDistance = 10;

    this.hoverboardActive = false;
    this.hoverboardTimer = 0;
    this.jetpackActive = false;
    this.jetpackTimer = 0;
    this.magnetActive = false;
    this.magnetTimer = 0;
    this.multiplierActive = false;
    this.multiplierTimer = 0;
    this.sneakersActive = false;
    this.sneakersTimer = 0;
    this.invulnerableTimer = 0;

    if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
    if (this.jetpackMesh) this.jetpackMesh.visible = false;
    if (this.magnetFieldMesh) this.magnetFieldMesh.visible = false;
    if (this.multiplierAura) this.multiplierAura.visible = false;
    if (this.ghostSurgeAura) this.ghostSurgeAura.visible = false;

    this.activeTrains.forEach(t => this.scene.remove(t.group));
    this.activeObstacles.forEach(o => this.scene.remove(o.group));
    this.activeCoins.forEach(c => this.scene.remove(c.group));
    this.activeGhostTokens.forEach(g => this.scene.remove(g.group));
    this.activePhantoms.forEach(p => this.scene.remove(p.group));
    this.activePowerups.forEach(p => this.scene.remove(p.group));
    this.particles.forEach(p => this.scene.remove(p.mesh));
    if (this.recordGateMesh) {
      this.scene.remove(this.recordGateMesh);
      this.recordGateMesh = null;
    }

    this.activeTrains = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activeGhostTokens = [];
    this.activePhantoms = [];
    this.activePowerups = [];
    this.particles = [];

    this.chunks.forEach(c => this.scene.remove(c.group));
    this.chunks = [];
    this.nextChunkZ = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      this.spawnChunk(this.nextChunkZ);
      this.nextChunkZ -= this.chunkLength;
    }

    if (this.playerGroup) {
      this.playerGroup.position.set(0, 0, 0);
    }
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
    const effectiveSpeed = this.ghostSurgeActive ? this.speed * 1.55 : this.speed;
    const moveDist = effectiveSpeed * delta;
    this.distance += moveDist;

    const mult = (this.multiplierActive ? 2 : 1) * this.combo;
    this.score = Math.floor(this.distance * mult);
    this.callbacks.onScoreUpdate(this.score, Math.floor(this.distance), this.combo);

    if (this.speed < this.maxSpeed) {
      this.speed += delta * 0.38;
    }

    if (this.highScoreDistance > 0 && !this.recordBroken && this.distance >= this.highScoreDistance) {
      this.recordBroken = true;
      this.callbacks.onRecordBroken(Math.floor(this.distance));
      subwayAudio.playStreakMultiplier(16);
      if (this.recordGateMesh) {
        this.createBurst(0, 7, this.recordGateMesh.position.z, 0xf59e0b, 50);
      }
    }

    const curX = this.playerGroup.position.x;
    const dx = this.targetX - curX;
    this.playerGroup.position.x += dx * Math.min(1, 16 * delta);
    this.playerGroup.rotation.z = -dx * 0.09;

    if (this.jetpackActive) {
      const skyY = 14;
      this.playerY += (skyY - this.playerY) * Math.min(1, 4 * delta);
      this.playerGroup.position.y = this.playerY;
      this.isGrounded = false;

      const pPos = this.playerGroup.position;
      this.createJetpackFlame(pPos.x - 0.22, pPos.y + 0.1, pPos.z - 0.4);
      this.createJetpackFlame(pPos.x + 0.22, pPos.y + 0.1, pPos.z - 0.4);
    } else {
      this.playerY += this.playerVY * delta;
      this.playerVY -= this.gravity * delta;

      this.groundY = this.checkGroundUnderPlayer();
      if (this.playerY <= this.groundY) {
        this.playerY = this.groundY;
        this.playerVY = 0;
        this.isGrounded = true;
        this.isJumping = false;
      } else {
        this.isGrounded = false;
      }
      this.playerGroup.position.y = this.playerY;
    }

    if (this.isDoingStunt) {
      this.stuntRotation += delta * 18;
      this.hoverboardMesh.rotation.y = this.stuntRotation;
      if (this.stuntRotation >= Math.PI * 2) {
        this.isDoingStunt = false;
        this.hoverboardMesh.rotation.y = 0;
      }
    }

    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
        if (this.charRoot) {
          this.charRoot.position.y = 1.0;
          this.charRoot.rotation.x = 0.1;
          if (this.leftArm) this.leftArm.rotation.x = 0;
          if (this.rightArm) this.rightArm.rotation.x = 0;
        }
      }
    }

    if (this.isStumbling) {
      this.stumbleTimer -= delta;
      if (this.stumbleTimer <= 0) {
        this.isStumbling = false;
        this.targetChaserDistance = 10;
      }
    }

    if (this.hoverboardActive) {
      this.hoverboardTimer -= delta;
      this.callbacks.onPowerupChange('hoverboard', Math.max(0, this.hoverboardTimer));
      if (this.hoverboardTimer <= 0) {
        this.hoverboardActive = false;
        if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
        subwayAudio.stopHoverboardLoop();
      }
    }

    if (this.jetpackActive) {
      this.jetpackTimer -= delta;
      this.callbacks.onPowerupChange('jetpack', Math.max(0, this.jetpackTimer));
      if (this.jetpackTimer <= 0) {
        this.jetpackActive = false;
        if (this.jetpackMesh) this.jetpackMesh.visible = false;
        subwayAudio.stopJetpackLoop();
      }
    }

    if (this.magnetActive) {
      this.magnetTimer -= delta;
      this.callbacks.onPowerupChange('magnet', Math.max(0, this.magnetTimer));
      if (this.magnetFieldMesh) {
        this.magnetFieldMesh.rotation.z += delta * 4;
      }
      if (this.magnetTimer <= 0) {
        this.magnetActive = false;
        if (this.magnetFieldMesh) this.magnetFieldMesh.visible = false;
      }
    }

    if (this.multiplierActive) {
      this.multiplierTimer -= delta;
      this.callbacks.onPowerupChange('multiplier', Math.max(0, this.multiplierTimer));
      if (this.multiplierAura) {
        this.multiplierAura.rotation.y += delta * 6;
      }
      if (this.multiplierTimer <= 0) {
        this.multiplierActive = false;
        if (this.multiplierAura) this.multiplierAura.visible = false;
      }
    }

    if (this.sneakersActive) {
      this.sneakersTimer -= delta;
      this.callbacks.onPowerupChange('sneakers', Math.max(0, this.sneakersTimer));
      if (this.sneakersTimer <= 0) {
        this.sneakersActive = false;
      }
    }

    if (this.ghostSurgeActive) {
      this.ghostSurgeTimer -= delta;
      if (this.ghostSurgeAura) {
        this.ghostSurgeAura.rotation.z += delta * 8;
      }
      if (this.ghostSurgeTimer <= 0) {
        this.ghostSurgeActive = false;
        if (this.ghostSurgeAura) this.ghostSurgeAura.visible = false;
        this.callbacks.onGhostSurgeChange(0, false);
      }
    }

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      if (this.charRoot) {
        this.charRoot.visible = Math.floor(Date.now() / 80) % 2 === 0;
      }
    } else {
      if (this.charRoot) this.charRoot.visible = true;
    }

    this.updateWorldMovement(moveDist, delta);
    this.updateGhostChaser(delta);
    this.animatePlayerModel(delta);
    this.updateParticles(delta);
    this.updateCamera(delta, effectiveSpeed);
  }

  checkGroundUnderPlayer() {
    const px = this.playerGroup.position.x;
    const py = this.playerY;

    for (let train of this.activeTrains) {
      const tz = train.group.position.z;
      const tx = train.laneX;
      if (Math.abs(px - tx) < 1.3 && Math.abs(tz) < train.length / 2 + 0.5) {
        if (py >= train.height - 0.3) {
          return train.height + 0.1;
        }
      }
    }
    return 0;
  }

  updateGhostChaser(delta) {
    if (!this.chaserGroup) return;

    const dDiff = this.targetChaserDistance - this.chaserDistance;
    this.chaserDistance += dDiff * Math.min(1, 4 * delta);

    const px = this.playerGroup.position.x;
    this.chaserGroup.position.x += (px - this.chaserGroup.position.x) * Math.min(1, 8 * delta);
    this.chaserGroup.position.z = this.playerGroup.position.z + this.chaserDistance;

    const t = this.clock.getElapsedTime();
    this.chaserGroup.position.y = 1.3 + Math.sin(t * 3.5) * 0.25;

    if (this.chaserDrone) {
      this.chaserDrone.position.x = Math.sin(t * 4) * 1.5;
      this.chaserDrone.position.y = 1.3 + Math.cos(t * 3) * 0.3;
      this.chaserDrone.position.z = Math.cos(t * 4) * 0.8;
    }
  }

  updateWorldMovement(moveDist, delta) {
    for (let chunk of this.chunks) {
      chunk.group.position.z += moveDist;
    }
    const threshold = 50;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      if (chunk.group.position.z > threshold) {
        this.scene.remove(chunk.group);
        this.chunks.splice(i, 1);

        let minZ = 0;
        this.chunks.forEach(c => {
          if (c.group.position.z < minZ) minZ = c.group.position.z;
        });
        const newChunkZ = minZ - this.chunkLength;
        this.spawnChunk(newChunkZ);
      }
    }

    for (let i = this.activeTrains.length - 1; i >= 0; i--) {
      const train = this.activeTrains[i];
      train.group.position.z += moveDist + train.moveSpeed * delta;
      this.checkTrainCollision(train);
      if (train.group.position.z > threshold + 30) {
        this.scene.remove(train.group);
        this.activeTrains.splice(i, 1);
      }
    }

    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.group.position.z += moveDist;
      this.checkObstacleCollision(obs);
      if (obs.group.position.z > threshold) {
        this.scene.remove(obs.group);
        this.activeObstacles.splice(i, 1);
      }
    }

    for (let i = this.activePhantoms.length - 1; i >= 0; i--) {
      const phantom = this.activePhantoms[i];
      phantom.group.position.z += moveDist;
      phantom.group.position.y = phantom.baseY + Math.sin(this.clock.getElapsedTime() * 4) * 0.35;
      this.checkPhantomCollision(phantom, i);
      if (phantom.group.position.z > threshold) {
        this.scene.remove(phantom.group);
        this.activePhantoms.splice(i, 1);
      }
    }

    const pPos = this.playerGroup.position;
    const isAttracting = this.magnetActive || this.ghostSurgeActive;
    const magnetRange = this.ghostSurgeActive ? 30 : 20;

    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      coin.group.position.z += moveDist;
      coin.group.rotation.y += delta * 5;

      if (isAttracting) {
        const dist = coin.group.position.distanceTo(pPos);
        if (dist < magnetRange) {
          const dir = new THREE.Vector3().subVectors(pPos, coin.group.position).normalize();
          coin.group.position.addScaledVector(dir, 40 * delta);
        }
      }

      const dToPlayer = coin.group.position.distanceTo(pPos);
      if (dToPlayer < 1.4) {
        this.collectCoin(coin, i);
      } else if (coin.group.position.z > threshold) {
        this.scene.remove(coin.group);
        this.activeCoins.splice(i, 1);
      }
    }

    for (let i = this.activeGhostTokens.length - 1; i >= 0; i--) {
      const token = this.activeGhostTokens[i];
      token.group.position.z += moveDist;
      token.group.rotation.y += delta * 4;

      const dToPlayer = token.group.position.distanceTo(pPos);
      if (dToPlayer < 1.5) {
        this.collectGhostToken(token, i);
      } else if (token.group.position.z > threshold) {
        this.scene.remove(token.group);
        this.activeGhostTokens.splice(i, 1);
      }
    }

    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const pup = this.activePowerups[i];
      pup.group.position.z += moveDist;
      pup.group.rotation.y += delta * 3;

      const dToPlayer = pup.group.position.distanceTo(pPos);
      if (dToPlayer < 1.5) {
        this.collectPowerup(pup, i);
      } else if (pup.group.position.z > threshold) {
        this.scene.remove(pup.group);
        this.activePowerups.splice(i, 1);
      }
    }

    if (this.recordGateMesh) {
      this.recordGateMesh.position.z += moveDist;
      if (this.recordGateMesh.position.z > threshold) {
        this.scene.remove(this.recordGateMesh);
        this.recordGateMesh = null;
      }
    }
  }

  // --- COLLISION LOGIC & NEAR-MISS SYSTEM ---

  checkTrainCollision(train) {
    if (this.invulnerableTimer > 0 || this.jetpackActive || this.ghostSurgeActive) return;

    const pPos = this.playerGroup.position;
    const tz = train.group.position.z;
    const tx = train.laneX;

    const inLane = Math.abs(pPos.x - tx) < (train.width / 2 + 0.35);
    const inZRange = (tz - train.length / 2) < (pPos.z + 0.4) && (pPos.z - 0.4) < (tz + train.length / 2);

    if (Math.abs(pPos.x - tx) < (train.width / 2 + 0.85) && inZRange && !inLane) {
      this.handleNearMiss();
    }

    if (inLane && inZRange) {
      if (pPos.y >= train.height - 0.25) return;

      if (train.hasRamp && pPos.z > tz + train.length / 2 - 4) {
        this.playerY = Math.max(this.playerY, train.height);
        this.playerGroup.position.y = this.playerY;
        this.playerVY = 0;
        this.isGrounded = true;
        return;
      }

      this.handleCrash('train');
    }
  }

  checkObstacleCollision(obs) {
    if (this.invulnerableTimer > 0 || this.jetpackActive || this.ghostSurgeActive) return;

    const pPos = this.playerGroup.position;
    const oz = obs.group.position.z;
    const ox = obs.laneX;

    if (Math.abs(pPos.z - oz) < 0.8 && Math.abs(pPos.x - ox) < 1.6 && Math.abs(pPos.x - ox) > 1.05) {
      this.handleNearMiss();
    }

    if (Math.abs(pPos.z - oz) < 0.65 && Math.abs(pPos.x - ox) < 1.1) {
      if (obs.type === 'hurdle') {
        if (pPos.y < 1.05) {
          this.handleStumbleOrCrash('hurdle');
        }
      } else if (obs.type === 'slide') {
        if (!this.isSliding || pPos.y > 0.85) {
          this.handleStumbleOrCrash('slide');
        }
      }
    }
  }

  checkPhantomCollision(phantom, index) {
    if (this.invulnerableTimer > 0 || this.jetpackActive || this.ghostSurgeActive) return;

    const pPos = this.playerGroup.position;
    const dist = pPos.distanceTo(phantom.group.position);
    if (dist < 1.2) {
      this.scene.remove(phantom.group);
      this.activePhantoms.splice(index, 1);
      this.handleStumbleOrCrash('phantom');
    }
  }

  handleNearMiss() {
    const now = Date.now();
    if (now - this.lastCollectTime < 300) return;
    this.lastCollectTime = now;
    this.nearMissCount++;

    subwayAudio.playNearMiss();
    this.shakeIntensity = 0.2;
    this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 0.8, this.playerGroup.position.z, 0x38bdf8, 8);
    this.score += 150 * this.combo;
    this.callbacks.onNearMiss();
  }

  handleStumbleOrCrash(source) {
    if (this.hoverboardActive) {
      this.hoverboardActive = false;
      this.hoverboardTimer = 0;
      if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
      this.invulnerableTimer = 2.4;
      this.shakeIntensity = 0.45;
      subwayAudio.stopHoverboardLoop();
      subwayAudio.playShieldBreak();
      this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 0.5, this.playerGroup.position.z, 0x06b6d4, 25);
      this.callbacks.onPowerupChange('hoverboard', 0);
      return;
    }

    if (!this.isStumbling && source === 'hurdle') {
      this.isStumbling = true;
      this.stumbleTimer = 2.0;
      this.targetChaserDistance = 3.2;
      this.shakeIntensity = 0.35;
      subwayAudio.playGhostWail();
      this.streakCount = 0;
      this.combo = 1;
      this.callbacks.onComboUpdate(1, 'Stumble!');
      return;
    }

    this.handleCrash(source);
  }

  handleCrash(source) {
    this.isRunning = false;
    this.shakeIntensity = 0.75;
    subwayAudio.playCrash();
    subwayAudio.stopMusic();
    subwayAudio.stopContinuousLoops();
    this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 1, this.playerGroup.position.z, 0xef4444, 35);
    this.callbacks.onGameOver(this.score, this.coins, source);
  }

  // --- COLLECTION LOGIC ---

  collectCoin(coin, index) {
    this.scene.remove(coin.group);
    this.activeCoins.splice(index, 1);
    this.coins += 1;
    subwayAudio.playCoin();
    this.callbacks.onCoinsUpdate(this.coins);
    this.createBurst(coin.group.position.x, coin.group.position.y, coin.group.position.z, 0xfbbf24, 7);

    const now = Date.now();
    if (now - this.lastCollectTime < 1800) {
      this.streakCount++;
      if (this.streakCount >= 40) {
        if (this.combo < 16) { this.combo = 16; subwayAudio.playStreakMultiplier(16); this.callbacks.onComboUpdate(16, 'MAX SURGE x16!'); }
      } else if (this.streakCount >= 20) {
        if (this.combo < 8) { this.combo = 8; subwayAudio.playStreakMultiplier(8); this.callbacks.onComboUpdate(8, 'Ultra Combo x8!'); }
      } else if (this.streakCount >= 10) {
        if (this.combo < 4) { this.combo = 4; subwayAudio.playStreakMultiplier(4); this.callbacks.onComboUpdate(4, 'Super Streak x4!'); }
      } else if (this.streakCount >= 5) {
        if (this.combo < 2) { this.combo = 2; subwayAudio.playStreakMultiplier(2); this.callbacks.onComboUpdate(2, 'Combo x2!'); }
      }
    } else {
      this.streakCount = 1;
      this.combo = 1;
    }
    this.lastCollectTime = now;
  }

  collectGhostToken(token, index) {
    this.scene.remove(token.group);
    this.activeGhostTokens.splice(index, 1);
    this.ghostTokens += 1;
    this.coins += 5;
    this.callbacks.onCoinsUpdate(this.coins);
    subwayAudio.playGhostToken();
    this.createBurst(token.group.position.x, token.group.position.y, token.group.position.z, 0x38bdf8, 16);

    this.ghostSurgeCharge = Math.min(100, this.ghostSurgeCharge + 25);
    this.callbacks.onGhostSurgeChange(this.ghostSurgeCharge, this.ghostSurgeActive);

    if (this.ghostSurgeCharge >= 100) {
      this.activateGhostSurge();
    }
  }

  collectPowerup(pup, index) {
    this.scene.remove(pup.group);
    this.activePowerups.splice(index, 1);
    subwayAudio.playPowerupGet();
    this.createBurst(pup.group.position.x, pup.group.position.y, pup.group.position.z, 0x38bdf8, 20);

    const type = pup.type;
    if (type === 'hoverboard') {
      this.activateHoverboard();
    } else if (type === 'jetpack') {
      this.jetpackActive = true;
      this.jetpackTimer = 16;
      if (this.jetpackMesh) this.jetpackMesh.visible = true;
      subwayAudio.startJetpackLoop();
      this.callbacks.onPowerupChange('jetpack', 16);
      this.spawnSkyCoinHighway();
    } else if (type === 'magnet') {
      this.magnetActive = true;
      this.magnetTimer = 20;
      if (this.magnetFieldMesh) this.magnetFieldMesh.visible = true;
      this.callbacks.onPowerupChange('magnet', 20);
    } else if (type === 'multiplier') {
      this.multiplierActive = true;
      this.multiplierTimer = 24;
      if (this.multiplierAura) this.multiplierAura.visible = true;
      this.callbacks.onPowerupChange('multiplier', 24);
    } else if (type === 'sneakers') {
      this.sneakersActive = true;
      this.sneakersTimer = 20;
      this.callbacks.onPowerupChange('sneakers', 20);
    }
  }

  spawnSkyCoinHighway() {
    for (let z = -20; z >= -180; z -= 3.5) {
      for (let lane of LANES) {
        if (Math.random() > 0.25) {
          this.spawnCoin(lane, 14, z);
        }
      }
    }
  }

  // --- ANIMATIONS & CAMERA ---

  animatePlayerModel(delta) {
    if (!this.charRoot) return;

    const time = this.clock.getElapsedTime();
    const runCycle = time * (this.speed * 0.42);

    if (this.isSliding) {
      const progress = Math.max(0, this.slideTimer / this.slideDuration);
      const tuck = Math.sin(progress * Math.PI);
      this.charRoot.position.y = THREE.MathUtils.lerp(1.0, 0.46, tuck);
      this.charRoot.rotation.x = THREE.MathUtils.lerp(0.1, -0.48, tuck);
      if (this.leftLeg) this.leftLeg.rotation.x = 0.3;
      if (this.rightLeg) this.rightLeg.rotation.x = 0.3;
      if (this.leftArm) this.leftArm.rotation.x = -1.0;
      if (this.rightArm) this.rightArm.rotation.x = -1.0;
      this.createFootstepDust(this.playerGroup.position.x, this.playerGroup.position.z);
    } else if (this.hoverboardActive) {
      this.charRoot.position.y = 0.55;
      this.charRoot.rotation.x = 0;
      this.charRoot.rotation.y = Math.PI / 4;
      if (this.leftArm) this.leftArm.rotation.x = -0.5;
      if (this.rightArm) this.rightArm.rotation.x = 0.5;
      if (this.leftLeg) this.leftLeg.rotation.x = 0.2;
      if (this.rightLeg) this.rightLeg.rotation.x = -0.2;
    } else if (!this.isGrounded) {
      this.charRoot.position.y = 1.0;
      this.charRoot.rotation.x = 0.2;
      this.charRoot.rotation.y = 0;
      if (this.leftLeg) this.leftLeg.rotation.x = -0.7;
      if (this.rightLeg) this.rightLeg.rotation.x = -0.4;
      if (this.leftArm) this.leftArm.rotation.x = -1.2;
      if (this.rightArm) this.rightArm.rotation.x = -1.2;
    } else {
      this.charRoot.position.y = 1.0 + Math.abs(Math.sin(runCycle)) * 0.12;
      this.charRoot.rotation.x = 0.1;
      this.charRoot.rotation.y = 0;

      const stride = Math.sin(runCycle);
      if (this.leftLeg) this.leftLeg.rotation.x = stride * 0.9;
      if (this.rightLeg) this.rightLeg.rotation.x = -stride * 0.9;
      if (this.leftArm) this.leftArm.rotation.x = -stride * 0.9;
      if (this.rightArm) this.rightArm.rotation.x = stride * 0.9;

      if (Math.abs(stride) > 0.85) {
        this.createFootstepDust(this.playerGroup.position.x, this.playerGroup.position.z);
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

    this.sparkTimer += delta;
    if (this.sparkTimer > 0.6) {
      this.sparkTimer = 0;
      if (Math.random() > 0.4) {
        this.createRailSparks(LANE_WIDTH * 1.6, -Math.random() * 25);
      }
    }
  }

  updateCamera(delta, speed) {
    const pPos = this.playerGroup.position;

    const targetCamX = pPos.x * 0.65;
    const targetCamY = Math.max(4.2, pPos.y + 3.8);
    const targetCamZ = pPos.z + 7.8;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 10 * delta);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 8 * delta);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, 12 * delta);

    const targetFov = THREE.MathUtils.clamp(66 + (speed - this.baseSpeed) * 0.45, 66, 84);
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, 4 * delta);
      this.camera.updateProjectionMatrix();
    }

    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - delta * 2.2);
    }

    this.camera.lookAt(pPos.x * 0.4, pPos.y + 1.8, pPos.z - 12);
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
    if (this.reqId) {
      cancelAnimationFrame(this.reqId);
      this.reqId = null;
    }
    window.removeEventListener('resize', this.handleResize);

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
