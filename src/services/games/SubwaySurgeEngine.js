/**
 * Subway Surge 3D — Full 3D Endless Runner Game Engine
 * Powered by Three.js
 * 
 * Features:
 * - 3-Lane dynamic procedural subway track with rails, ballast, catenary poles, and neon tunnel/skyline
 * - Moving & parked subway train cars with rooftop surf ramps
 * - Jump hurdles, slide clearance barriers, traffic hazard lights
 * - Articulated procedural 3D runner character with run, jump, slide, and hoverboard animations
 * - Powerups: Hoverboard (crash shield), Jetpack (sky coin-highway), Magnet (attracts coins), 2x Multiplier, Super Sneakers
 * - Collectible 3D gold coins with magnet attraction physics
 * - Particle system: sparks, dust, jetpack flames, coin sparkle explosions
 * - Full performance disposal and dynamic responsive resizing
 */

import * as THREE from 'three';
import { subwayAudio } from './SubwaySurgeAudio';

export const LANE_WIDTH = 2.8;
export const LANES = [-LANE_WIDTH, 0, LANE_WIDTH]; // Left, Center, Right

export class SubwaySurgeEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.callbacks = {
      onScoreUpdate: () => {},
      onCoinsUpdate: () => {},
      onPowerupChange: () => {},
      onGameOver: () => {},
      ...callbacks,
    };

    // State
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.coins = 0;
    this.speed = 28; // starting forward speed (units/sec)
    this.baseSpeed = 28;
    this.maxSpeed = 65;
    this.distance = 0;

    // Lanes and Player Physics
    this.currentLane = 1; // 0: Left, 1: Center, 2: Right
    this.targetX = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.slideTimer = 0;
    this.gravity = 55;
    this.jumpForce = 18.5;
    this.groundY = 0;

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

    // Customization (skins)
    this.characterSkin = {
      hoodie: 0x3b82f6, // Blue
      pants: 0x1e293b,  // Dark slate
      cap: 0xef4444,    // Red cap
    };
    this.boardSkin = {
      deck: 0x06b6d4,   // Cyan neon
      glow: 0x22d3ee,
    };

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.reqId = null;

    // World Objects
    this.playerGroup = null;
    this.characterMesh = null;
    this.hoverboardMesh = null;
    this.jetpackMesh = null;
    this.sneakersMeshes = [];

    // Chunks & Obstacles
    this.chunks = [];
    this.chunkLength = 50;
    this.totalChunks = 7;
    this.nextChunkZ = 0;

    this.activeTrains = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.particles = [];

    // Camera Shake
    this.shakeIntensity = 0;

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    // 1. Scene & Atmosphere
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.012);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 350);
    this.camera.position.set(0, 4.5, 7.5);
    this.camera.lookAt(0, 2, -10);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. Lighting
    this.setupLighting();

    // 5. Build Player 3D Articulated Model
    this.buildPlayerCharacter();

    // 6. Generate Initial Track Chunks
    this.nextChunkZ = 0;
    for (let i = 0; i < this.totalChunks; i++) {
      this.spawnChunk(this.nextChunkZ);
      this.nextChunkZ -= this.chunkLength;
    }

    // 7. Particle System Setup
    this.setupParticleSystem();

    // Resize observer
    window.addEventListener('resize', this.handleResize);
  }

  setupLighting() {
    // Ambient Light (subtle cool blue fill)
    const ambientLight = new THREE.AmbientLight(0x435b80, 0.9);
    this.scene.add(ambientLight);

    // Key Directional Sun / Tunnel Light (casts soft shadows)
    this.dirLight = new THREE.DirectionalLight(0xfff3db, 1.4);
    this.dirLight.position.set(15, 30, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    const d = 25;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Neon Accent Rim Light
    const rimLight = new THREE.DirectionalLight(0x06b6d4, 0.8);
    rimLight.position.set(-15, 10, -20);
    this.scene.add(rimLight);
  }

  setSkins(charSkin, boardSkin) {
    if (charSkin) this.characterSkin = { ...this.characterSkin, ...charSkin };
    if (boardSkin) this.boardSkin = { ...this.boardSkin, ...boardSkin };
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
      this.buildPlayerCharacter();
    }
  }

  buildPlayerCharacter() {
    this.playerGroup = new THREE.Group();
    this.playerGroup.position.set(0, 0, 0);

    // Materials
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xffd5b3 });
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: this.characterSkin.hoodie,
      roughness: 0.6,
      metalness: 0.1,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: this.characterSkin.pants,
      roughness: 0.7,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: this.characterSkin.cap,
      roughness: 0.5,
    });
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 0.6,
    });

    // Root Root Offset
    this.charRoot = new THREE.Group();
    this.charRoot.position.y = 1.0; // center of mass
    this.playerGroup.add(this.charRoot);

    // 1. Torso / Hoodie
    const torsoGeo = new THREE.BoxGeometry(0.7, 0.85, 0.45);
    const torso = new THREE.Mesh(torsoGeo, hoodieMat);
    torso.position.y = 0.45;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.charRoot.add(torso);

    // 2. Head & Cap
    const headGeo = new THREE.BoxGeometry(0.5, 0.52, 0.48);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.15;
    head.castShadow = true;
    this.charRoot.add(head);

    // Cap
    const capGeo = new THREE.BoxGeometry(0.54, 0.22, 0.52);
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.34, 0.02);
    const capBrimGeo = new THREE.BoxGeometry(0.48, 0.06, 0.35);
    const capBrim = new THREE.Mesh(capBrimGeo, capMat);
    capBrim.position.set(0, 1.25, 0.38); // facing forward or backwards
    this.charRoot.add(cap);
    this.charRoot.add(capBrim);

    // Visor / Eyes
    const visorGeo = new THREE.BoxGeometry(0.38, 0.12, 0.1);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.15, 0.24);
    this.charRoot.add(visor);

    // 3. Arms (L & R articulable shoulders)
    const armGeo = new THREE.BoxGeometry(0.2, 0.65, 0.2);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.8, 0);
    const leftArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    leftArmMesh.position.y = -0.3;
    leftArmMesh.castShadow = true;
    this.leftArm.add(leftArmMesh);
    this.charRoot.add(this.leftArm);

    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.8, 0);
    const rightArmMesh = new THREE.Mesh(armGeo, hoodieMat);
    rightArmMesh.position.y = -0.3;
    rightArmMesh.castShadow = true;
    this.rightArm.add(rightArmMesh);
    this.charRoot.add(this.rightArm);

    // 4. Legs & Shoes
    const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.24);
    const shoeGeo = new THREE.BoxGeometry(0.26, 0.18, 0.44);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.2, 0.05, 0);
    const leftLegMesh = new THREE.Mesh(legGeo, pantsMat);
    leftLegMesh.position.y = -0.35;
    leftLegMesh.castShadow = true;
    const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
    leftShoe.position.set(0, -0.68, 0.08);
    leftShoe.castShadow = true;
    this.leftLeg.add(leftLegMesh);
    this.leftLeg.add(leftShoe);
    this.charRoot.add(this.leftLeg);

    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.2, 0.05, 0);
    const rightLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rightLegMesh.position.y = -0.35;
    rightLegMesh.castShadow = true;
    const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
    rightShoe.position.set(0, -0.68, 0.08);
    rightShoe.castShadow = true;
    this.rightLeg.add(rightLegMesh);
    this.rightLeg.add(rightShoe);
    this.charRoot.add(this.rightLeg);

    // 5. Hoverboard (toggled on activation)
    this.hoverboardMesh = this.buildHoverboard();
    this.hoverboardMesh.visible = false;
    this.playerGroup.add(this.hoverboardMesh);

    // 6. Jetpack (toggled on activation)
    this.jetpackMesh = this.buildJetpack();
    this.jetpackMesh.visible = false;
    this.charRoot.add(this.jetpackMesh);

    // 7. Magnet Indicator Ring
    const magnetRingGeo = new THREE.TorusGeometry(0.9, 0.04, 8, 24);
    const magnetRingMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.8,
    });
    this.magnetRing = new THREE.Mesh(magnetRingGeo, magnetRingMat);
    this.magnetRing.rotation.x = Math.PI / 2;
    this.magnetRing.position.y = 0.5;
    this.magnetRing.visible = false;
    this.playerGroup.add(this.magnetRing);

    // 8. 2x Multiplier Aura
    const multiplierGeo = new THREE.OctahedronGeometry(0.25);
    const multiplierMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
    });
    this.multiplierAura = new THREE.Mesh(multiplierGeo, multiplierMat);
    this.multiplierAura.position.set(0, 2.0, 0);
    this.multiplierAura.visible = false;
    this.charRoot.add(this.multiplierAura);

    this.scene.add(this.playerGroup);
  }

  buildHoverboard() {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, 0.12, 0);

    // Board Deck
    const deckShape = new THREE.Shape();
    deckShape.moveTo(-0.45, -1.2);
    deckShape.lineTo(0.45, -1.2);
    deckShape.quadraticCurveTo(0.55, 0, 0.45, 1.2);
    deckShape.lineTo(-0.45, 1.2);
    deckShape.quadraticCurveTo(-0.55, 0, -0.45, -1.2);

    const extrudeSettings = { depth: 0.08, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
    const deckGeo = new THREE.ExtrudeGeometry(deckShape, extrudeSettings);
    deckGeo.rotateX(Math.PI / 2);

    const deckMat = new THREE.MeshStandardMaterial({
      color: this.boardSkin.deck,
      metalness: 0.8,
      roughness: 0.2,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.castShadow = true;
    boardGroup.add(deck);

    // Glowing Neon Thrusters underneath
    const thrusterGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.12, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: this.boardSkin.glow });

    const frontThruster = new THREE.Mesh(thrusterGeo, glowMat);
    frontThruster.position.set(0, -0.06, -0.75);
    const rearThruster = new THREE.Mesh(thrusterGeo, glowMat);
    rearThruster.position.set(0, -0.06, 0.75);
    boardGroup.add(frontThruster);
    boardGroup.add(rearThruster);

    // Neon Edge Trim
    const trimGeo = new THREE.TorusGeometry(0.5, 0.03, 6, 24);
    const trim = new THREE.Mesh(trimGeo, glowMat);
    trim.rotation.x = Math.PI / 2;
    trim.scale.set(0.9, 2.2, 1);
    trim.position.y = 0.02;
    boardGroup.add(trim);

    return boardGroup;
  }

  buildJetpack() {
    const jetGroup = new THREE.Group();
    jetGroup.position.set(0, 0.45, -0.32);

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const nozzMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.3 });
    const redStripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // Left & Right Cylinders
    const tankGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.65, 16);
    const leftTank = new THREE.Mesh(tankGeo, metalMat);
    leftTank.position.x = -0.22;
    const rightTank = new THREE.Mesh(tankGeo, metalMat);
    rightTank.position.x = 0.22;
    jetGroup.add(leftTank);
    jetGroup.add(rightTank);

    // Nozzles
    const nozzGeo = new THREE.ConeGeometry(0.12, 0.18, 16);
    const leftNozz = new THREE.Mesh(nozzGeo, nozzMat);
    leftNozz.position.set(-0.22, -0.38, 0);
    const rightNozz = new THREE.Mesh(nozzGeo, nozzMat);
    rightNozz.position.set(0.22, -0.38, 0);
    jetGroup.add(leftNozz);
    jetGroup.add(rightNozz);

    // Center Crossplate
    const plateGeo = new THREE.BoxGeometry(0.35, 0.3, 0.08);
    const plate = new THREE.Mesh(plateGeo, redStripeMat);
    jetGroup.add(plate);

    return jetGroup;
  }

  // --- PROCEDURAL TRACK & OBSTACLE CHUNKS ---

  spawnChunk(chunkZ) {
    const chunk = new THREE.Group();
    chunk.position.z = chunkZ;

    // 1. Ground Trackbed (Ballast Gravel)
    const bedGeo = new THREE.PlaneGeometry(16, this.chunkLength);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x181e28,
      roughness: 0.95,
      metalness: 0.05,
    });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.rotation.x = -Math.PI / 2;
    bed.position.y = 0;
    bed.receiveShadow = true;
    chunk.add(bed);

    // 2. Concrete Track Divider Curbs
    const curbGeo = new THREE.BoxGeometry(0.2, 0.3, this.chunkLength);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    [-LANE_WIDTH * 1.5, -LANE_WIDTH * 0.5, LANE_WIDTH * 0.5, LANE_WIDTH * 1.5].forEach(cx => {
      const curb = new THREE.Mesh(curbGeo, curbMat);
      curb.position.set(cx, 0.15, 0);
      curb.receiveShadow = true;
      chunk.add(curb);
    });

    // 3. Rails & Sleepers (Ties) for all 3 Lanes
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
    });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x271e16, roughness: 0.9 });
    const tieGeo = new THREE.BoxGeometry(1.9, 0.08, 0.3);
    const railGeo = new THREE.BoxGeometry(0.08, 0.12, this.chunkLength);

    LANES.forEach(laneX => {
      // Rails (Left & Right of each track)
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(laneX - 0.75, 0.06, 0);
      railL.receiveShadow = true;
      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(laneX + 0.75, 0.06, 0);
      railR.receiveShadow = true;
      chunk.add(railL);
      chunk.add(railR);

      // Sleepers / Wooden Ties along track
      for (let z = -this.chunkLength / 2 + 1; z < this.chunkLength / 2; z += 1.8) {
        const tie = new THREE.Mesh(tieGeo, tieMat);
        tie.position.set(laneX, 0.04, z);
        tie.receiveShadow = true;
        chunk.add(tie);
      }
    });

    // 4. Overhead Catenary Power Arch
    const arch = this.buildCatenaryArch();
    arch.position.set(0, 0, 0);
    chunk.add(arch);

    // 5. Background City Skyline / Tunnel Walls
    this.addCityScenery(chunk);

    // 6. Populate Gameplay Elements in Chunk (Obstacles, Trains, Coins, Powerups)
    if (Math.abs(chunkZ) > 40) { // Keep starting zone safe and clear
      this.populateChunkGameplay(chunkZ);
    }

    this.scene.add(chunk);
    this.chunks.push({ group: chunk, z: chunkZ });
  }

  buildCatenaryArch() {
    const archGroup = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const neonMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Left & Right Pillars
    const pillarGeo = new THREE.BoxGeometry(0.3, 7.5, 0.3);
    const leftPillar = new THREE.Mesh(pillarGeo, steelMat);
    leftPillar.position.set(-6.8, 3.75, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, steelMat);
    rightPillar.position.set(6.8, 3.75, 0);
    archGroup.add(leftPillar);
    archGroup.add(rightPillar);

    // Crossbeam
    const beamGeo = new THREE.BoxGeometry(14, 0.35, 0.35);
    const beam = new THREE.Mesh(beamGeo, steelMat);
    beam.position.set(0, 7.3, 0);
    archGroup.add(beam);

    // Overhead Signal Lamps
    LANES.forEach(lx => {
      const lampGeo = new THREE.BoxGeometry(0.4, 0.6, 0.3);
      const lamp = new THREE.Mesh(lampGeo, steelMat);
      lamp.position.set(lx, 6.8, 0);

      const lightGeo = new THREE.CircleGeometry(0.12, 12);
      const light = new THREE.Mesh(lightGeo, neonMat);
      light.position.set(lx, 6.8, 0.16);
      archGroup.add(lamp);
      archGroup.add(light);
    });

    return archGroup;
  }

  addCityScenery(chunk) {
    const bldgMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.9,
      metalness: 0.2,
    });
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Left and Right Skyscraper silhouettes
    [-14, 14].forEach(sideX => {
      for (let i = 0; i < 3; i++) {
        const h = 18 + Math.random() * 22;
        const w = 7 + Math.random() * 4;
        const d = 8 + Math.random() * 5;
        const bldgGeo = new THREE.BoxGeometry(w, h, d);
        const bldg = new THREE.Mesh(bldgGeo, bldgMat);
        bldg.position.set(sideX + (Math.random() * 4 - 2), h / 2, -this.chunkLength / 2 + i * 15);
        chunk.add(bldg);

        // Window glow matrix
        const winGeo = new THREE.PlaneGeometry(0.4, 0.6);
        for (let row = 4; row < h - 2; row += 2.5) {
          if (Math.random() > 0.4) {
            const win = new THREE.Mesh(winGeo, windowMat);
            win.position.set(sideX > 0 ? sideX - w / 2 - 0.05 : sideX + w / 2 + 0.05, row, bldg.position.z);
            win.rotation.y = sideX > 0 ? -Math.PI / 2 : Math.PI / 2;
            chunk.add(win);
          }
        }
      }
    });
  }

  populateChunkGameplay(chunkZ) {
    const laneOccupied = [false, false, false];

    // Decide pattern for this chunk:
    // 0: Train + Ramp surf
    // 1: Moving Train + Hurdles
    // 2: Double Hurdle + High Slide Clearance
    // 3: Power-up lane + Coin Arcs
    const pattern = Math.floor(Math.random() * 5);

    if (pattern === 0 || pattern === 1) {
      // Spawn Train on one lane
      const trainLane = Math.floor(Math.random() * 3);
      laneOccupied[trainLane] = true;
      const isMoving = pattern === 1;
      const hasRamp = !isMoving && Math.random() > 0.35;
      this.spawnTrain(LANES[trainLane], chunkZ, isMoving, hasRamp);

      // On other lanes, spawn hurdle or slide barrier
      const otherLanes = [0, 1, 2].filter(l => l !== trainLane);
      const hurdleLane = otherLanes[Math.floor(Math.random() * otherLanes.length)];
      if (Math.random() > 0.3) {
        laneOccupied[hurdleLane] = true;
        const isSlide = Math.random() > 0.5;
        this.spawnObstacle(LANES[hurdleLane], chunkZ + (Math.random() * 10 - 5), isSlide ? 'slide' : 'hurdle');
      }
    } else {
      // Hurdle & Slide Barriers
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

    // Spawn Coins in open lanes
    for (let l = 0; l < 3; l++) {
      if (!laneOccupied[l]) {
        // Spawn coin run
        const coinPattern = Math.random();
        if (coinPattern > 0.4) {
          this.spawnCoinArc(LANES[l], chunkZ, false);
        } else if (coinPattern > 0.15) {
          this.spawnCoinLine(LANES[l], chunkZ, false);
        }
      }
    }

    // Chance to spawn Power-up crate
    if (Math.random() < 0.28) {
      const availableLanes = [0, 1, 2].filter(l => !laneOccupied[l]);
      if (availableLanes.length > 0) {
        const pLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
        const types = ['hoverboard', 'jetpack', 'magnet', 'multiplier', 'sneakers'];
        const pType = types[Math.floor(Math.random() * types.length)];
        this.spawnPowerupCrate(LANES[pLane], chunkZ + (Math.random() * 12 - 6), pType);
      }
    }
  }

  // --- TRAINS ---

  spawnTrain(laneX, chunkZ, isMoving = false, hasRamp = false) {
    const trainGroup = new THREE.Group();
    trainGroup.position.set(laneX, 0, chunkZ);

    const length = 22;
    const height = 3.8;
    const width = 2.4;

    // Train Body Material (Bright Metro Blue / Silver)
    const trainMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.65,
      roughness: 0.3,
    });
    const trainRoofMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.8,
      roughness: 0.35,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const lightGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Train Body Box
    const bodyGeo = new THREE.BoxGeometry(width, height - 0.4, length);
    const body = new THREE.Mesh(bodyGeo, trainMat);
    body.position.y = (height - 0.4) / 2 + 0.4;
    body.castShadow = true;
    body.receiveShadow = true;
    trainGroup.add(body);

    // 2. Train Roof with ridges (allows player to run on top)
    const roofGeo = new THREE.BoxGeometry(width + 0.1, 0.2, length + 0.1);
    const roof = new THREE.Mesh(roofGeo, trainRoofMat);
    roof.position.y = height + 0.1;
    roof.receiveShadow = true;
    trainGroup.add(roof);

    // Roof A/C units
    for (let rz = -length / 3; rz <= length / 3; rz += length / 3) {
      const acGeo = new THREE.BoxGeometry(1.4, 0.35, 2.2);
      const ac = new THREE.Mesh(acGeo, trainRoofMat);
      ac.position.set(0, height + 0.3, rz);
      trainGroup.add(ac);
    }

    // 3. Front Windshield & Glowing Headlights
    const windshieldGeo = new THREE.BoxGeometry(width - 0.3, 1.2, 0.1);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    windshield.position.set(0, height - 1.0, length / 2 + 0.05);
    trainGroup.add(windshield);

    // Headlights
    const hlGeo = new THREE.CircleGeometry(0.24, 16);
    const hlL = new THREE.Mesh(hlGeo, lightGlowMat);
    hlL.position.set(-0.7, 1.1, length / 2 + 0.06);
    const hlR = new THREE.Mesh(hlGeo, lightGlowMat);
    hlR.position.set(0.7, 1.1, length / 2 + 0.06);
    trainGroup.add(hlL);
    trainGroup.add(hlR);

    // 4. Surf Ramp (allows leaping onto roof without jumping over the front)
    if (hasRamp) {
      const rampGeo = new THREE.BufferGeometry();
      // Triangle ramp wedge
      const rw = width * 0.9;
      const rl = 6;
      const rh = height;
      const vertices = new Float32Array([
        // Front slope
        -rw / 2, 0, length / 2 + rl,
         rw / 2, 0, length / 2 + rl,
         rw / 2, rh, length / 2,
        -rw / 2, 0, length / 2 + rl,
         rw / 2, rh, length / 2,
        -rw / 2, rh, length / 2,
      ]);
      rampGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeo.computeVertexNormals();

      const rampMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.5,
        metalness: 0.4,
      });
      const ramp = new THREE.Mesh(rampGeo, rampMat);
      ramp.receiveShadow = true;
      trainGroup.add(ramp);
    }

    // Also place coins on top of train roof!
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

  // --- OBSTACLES (HURDLES & SLIDE BARRIERS) ---

  spawnObstacle(laneX, z, type = 'hurdle') {
    const obsGroup = new THREE.Group();
    obsGroup.position.set(laneX, 0, z);

    if (type === 'hurdle') {
      // Track hurdle (jump over)
      // Height ~1.1, Width ~2.4
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const barGeo = new THREE.BoxGeometry(2.3, 0.25, 0.15);
      const barMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

      const poleL = new THREE.Mesh(poleGeo, poleMat);
      poleL.position.set(-1.05, 0.6, 0);
      const poleR = new THREE.Mesh(poleGeo, poleMat);
      poleR.position.set(1.05, 0.6, 0);
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.set(0, 0.95, 0);

      // Hazard stripes on bar
      const stripeGeo = new THREE.BoxGeometry(0.35, 0.26, 0.16);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      [-0.6, 0, 0.6].forEach(sx => {
        const s = new THREE.Mesh(stripeGeo, stripeMat);
        s.position.set(sx, 0.95, 0);
        obsGroup.add(s);
      });

      obsGroup.add(poleL);
      obsGroup.add(poleR);
      obsGroup.add(bar);

      this.scene.add(obsGroup);
      this.activeObstacles.push({
        group: obsGroup,
        type: 'hurdle',
        laneX,
        z,
        bounds: { minX: laneX - 1.1, maxX: laneX + 1.1, minY: 0, maxY: 1.1, minZ: z - 0.4, maxZ: z + 0.4 },
      });
    } else {
      // High caution clearance sign (slide / roll under)
      // Clearance: bottom is at y=1.2, top is at y=3.2
      const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
      const warnMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });

      const postGeo = new THREE.BoxGeometry(0.2, 3.4, 0.2);
      const postL = new THREE.Mesh(postGeo, archMat);
      postL.position.set(-1.15, 1.7, 0);
      const postR = new THREE.Mesh(postGeo, archMat);
      postR.position.set(1.15, 1.7, 0);

      const crossGeo = new THREE.BoxGeometry(2.5, 1.4, 0.25);
      const cross = new THREE.Mesh(crossGeo, warnMat);
      cross.position.set(0, 2.4, 0);

      // Warning lights blinking
      const warnLightGeo = new THREE.CircleGeometry(0.16, 12);
      const warnLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      const wl1 = new THREE.Mesh(warnLightGeo, warnLightMat);
      wl1.position.set(-0.8, 2.7, 0.14);
      const wl2 = new THREE.Mesh(warnLightGeo, warnLightMat);
      wl2.position.set(0.8, 2.7, 0.14);

      obsGroup.add(postL);
      obsGroup.add(postR);
      obsGroup.add(cross);
      obsGroup.add(wl1);
      obsGroup.add(wl2);

      this.scene.add(obsGroup);
      this.activeObstacles.push({
        group: obsGroup,
        type: 'slide',
        laneX,
        z,
        bounds: { minX: laneX - 1.1, maxX: laneX + 1.1, minY: 1.1, maxY: 3.2, minZ: z - 0.4, maxZ: z + 0.4 },
      });
    }
  }

  // --- COINS & PATTERNS ---

  spawnCoin(x, y, z) {
    const coinGroup = new THREE.Group();
    coinGroup.position.set(x, y, z);

    // Gold Coin Cylinder with Embossed Star
    const coinGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.08, 20);
    coinGeo.rotateX(Math.PI / 2);
    const coinMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.15,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
    });
    const mesh = new THREE.Mesh(coinGeo, coinMat);
    mesh.castShadow = true;
    coinGroup.add(mesh);

    // Inner embossed star
    const starGeo = new THREE.OctahedronGeometry(0.14);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    const star = new THREE.Mesh(starGeo, starMat);
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

    // Glowing Holographic Box
    const boxGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
    const colors = {
      hoverboard: 0x06b6d4, // Cyan
      jetpack: 0xef4444,    // Red
      magnet: 0x8b5cf6,     // Purple
      multiplier: 0xf59e0b, // Gold
      sneakers: 0x10b981,   // Green
    };
    const col = colors[type] || 0x3b82f6;

    const boxMat = new THREE.MeshStandardMaterial({
      color: col,
      metalness: 0.6,
      roughness: 0.2,
      emissive: col,
      emissiveIntensity: 0.4,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.castShadow = true;
    crateGroup.add(box);

    // Pulsing Outer Wireframe
    const wireGeo = new THREE.BoxGeometry(1.05, 1.05, 1.05);
    const wireMat = new THREE.MeshBasicMaterial({
      color: col,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const wire = new THREE.Mesh(wireGeo, wireMat);
    crateGroup.add(wire);

    this.scene.add(crateGroup);
    this.activePowerups.push({
      group: crateGroup,
      type,
      x,
      y: 1.1,
      z,
      collected: false,
    });
  }

  // --- PARTICLE SYSTEM ---

  setupParticleSystem() {
    this.particles = [];
  }

  createBurst(x, y, z, color = 0xfbbf24, count = 18) {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const vz = (Math.random() - 0.5) * 6;
      const vy = (Math.random() * 8) + 2;

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
    const mat = new THREE.MeshBasicMaterial({ color: col });
    const p = new THREE.Mesh(geo, mat);
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

  // --- PLAYER ACTIONS & CONTROLS ---

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
    if (this.isGrounded && !this.jetpackActive) {
      const force = this.sneakersActive ? this.jumpForce * 1.5 : this.jumpForce;
      this.playerVY = force;
      this.isGrounded = false;
      this.isJumping = true;
      this.isSliding = false;
      subwayAudio.playJump();
    }
  }

  slide() {
    if (!this.isRunning || this.isPaused) return;
    if (this.jetpackActive) return;

    if (!this.isGrounded) {
      // Fast fall down
      this.playerVY = -this.gravity * 0.7;
    }
    this.isSliding = true;
    this.slideTimer = 0.85; // 0.85s slide duration
    subwayAudio.playSlide();
  }

  activateHoverboard() {
    if (!this.isRunning || this.isPaused) return;
    if (!this.hoverboardActive) {
      this.hoverboardActive = true;
      this.hoverboardTimer = 30; // 30s hoverboard duration
      if (this.hoverboardMesh) this.hoverboardMesh.visible = true;
      subwayAudio.playPowerupGet();
      subwayAudio.startHoverboardLoop();
      this.callbacks.onPowerupChange('hoverboard', 30);
    }
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
    this.distance = 0;
    this.speed = this.baseSpeed;

    this.currentLane = 1;
    this.targetX = 0;
    this.playerY = 0;
    this.playerVY = 0;
    this.isGrounded = true;
    this.isJumping = false;
    this.isSliding = false;
    this.groundY = 0;

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
    if (this.magnetRing) this.magnetRing.visible = false;
    if (this.multiplierAura) this.multiplierAura.visible = false;

    // Clear active obstacles, trains, coins
    this.activeTrains.forEach(t => this.scene.remove(t.group));
    this.activeObstacles.forEach(o => this.scene.remove(o.group));
    this.activeCoins.forEach(c => this.scene.remove(c.group));
    this.activePowerups.forEach(p => this.scene.remove(p.group));
    this.particles.forEach(p => this.scene.remove(p.mesh));

    this.activeTrains = [];
    this.activeObstacles = [];
    this.activeCoins = [];
    this.activePowerups = [];
    this.particles = [];

    // Reset chunks
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
    // 1. Advance Distance & Speed Curve
    const moveDist = this.speed * delta;
    this.distance += moveDist;
    const multiplier = this.multiplierActive ? 2 : 1;
    this.score = Math.floor(this.distance * multiplier);
    this.callbacks.onScoreUpdate(this.score, this.distance);

    // Speed ramps up gently over time
    if (this.speed < this.maxSpeed) {
      this.speed += delta * 0.35;
    }

    // 2. Player Lateral Movement Easing (Snappy lane transitions)
    const currentX = this.playerGroup.position.x;
    const dx = this.targetX - currentX;
    this.playerGroup.position.x += dx * Math.min(1, 16 * delta);

    // Subtle lateral bank angle when shifting lanes
    this.playerGroup.rotation.z = -dx * 0.08;

    // 3. Jump, Gravity & Grounding
    if (this.jetpackActive) {
      // Elevate to high coin highway in the sky (y ~ 14)
      const targetSkyY = 14;
      this.playerY += (targetSkyY - this.playerY) * Math.min(1, 4 * delta);
      this.playerGroup.position.y = this.playerY;
      this.isGrounded = false;

      // Emit thruster flames
      const pPos = this.playerGroup.position;
      this.createJetpackFlame(pPos.x - 0.22, pPos.y + 0.1, pPos.z - 0.4);
      this.createJetpackFlame(pPos.x + 0.22, pPos.y + 0.1, pPos.z - 0.4);
    } else {
      // Standard ground / rooftop gravity
      this.playerY += this.playerVY * delta;
      this.playerVY -= this.gravity * delta;

      // Check current ground height under player (either trackbed y=0 or train roof y=3.9)
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

    // 4. Slide Timer
    if (this.isSliding) {
      this.slideTimer -= delta;
      if (this.slideTimer <= 0) {
        this.isSliding = false;
      }
    }

    // 5. Power-Up Timers
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
      if (this.magnetRing) {
        this.magnetRing.rotation.z += delta * 4;
      }
      if (this.magnetTimer <= 0) {
        this.magnetActive = false;
        if (this.magnetRing) this.magnetRing.visible = false;
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

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= delta;
      // Flashing character opacity
      if (this.charRoot) {
        this.charRoot.visible = Math.floor(Date.now() / 80) % 2 === 0;
      }
    } else {
      if (this.charRoot) this.charRoot.visible = true;
    }

    // 6. Move World Chunks & Objects towards Camera (+Z)
    this.updateWorldMovement(moveDist, delta);

    // 7. Procedural Articulated Player Animation
    this.animatePlayerModel(delta);

    // 8. Update Particles
    this.updateParticles(delta);

    // 9. Camera Follow & Dynamic Shake
    this.updateCamera(delta);
  }

  checkGroundUnderPlayer() {
    const px = this.playerGroup.position.x;
    const py = this.playerY;

    // Check if directly on top of any active train
    for (let train of this.activeTrains) {
      const tz = train.group.position.z;
      const tx = train.laneX;
      if (Math.abs(px - tx) < 1.3 && Math.abs(tz) < train.length / 2 + 0.5) {
        if (py >= train.height - 0.4) {
          return train.height + 0.1; // train roof height
        }
      }
    }
    return 0; // standard ground level
  }

  updateWorldMovement(moveDist, delta) {
    // 1. Move Chunks
    for (let chunk of this.chunks) {
      chunk.group.position.z += moveDist;
    }

    // Recycle chunks that pass behind player
    const threshold = 45;
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      const chunk = this.chunks[i];
      if (chunk.group.position.z > threshold) {
        this.scene.remove(chunk.group);
        this.chunks.splice(i, 1);

        // Find furthest chunk Z
        let minZ = 0;
        this.chunks.forEach(c => {
          if (c.group.position.z < minZ) minZ = c.group.position.z;
        });

        const newChunkZ = minZ - this.chunkLength;
        this.spawnChunk(newChunkZ);
      }
    }

    // 2. Move Active Trains (including oncoming moving trains)
    for (let i = this.activeTrains.length - 1; i >= 0; i--) {
      const train = this.activeTrains[i];
      train.group.position.z += moveDist + (train.moveSpeed * delta);

      // Check Collision with Front / Side of Train
      this.checkTrainCollision(train);

      // Remove train if passed far behind
      if (train.group.position.z > threshold + 30) {
        this.scene.remove(train.group);
        this.activeTrains.splice(i, 1);
      }
    }

    // 3. Move Active Obstacles
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      obs.group.position.z += moveDist;

      // Check Collision
      this.checkObstacleCollision(obs);

      if (obs.group.position.z > threshold) {
        this.scene.remove(obs.group);
        this.activeObstacles.splice(i, 1);
      }
    }

    // 4. Move Coins & Magnet Attraction
    const playerPos = this.playerGroup.position;
    for (let i = this.activeCoins.length - 1; i >= 0; i--) {
      const coin = this.activeCoins[i];
      coin.group.position.z += moveDist;

      // Rotate coin
      coin.group.rotation.y += delta * 5;

      // Magnet pull towards player if active
      if (this.magnetActive) {
        const dist = coin.group.position.distanceTo(playerPos);
        if (dist < 22) {
          const dir = new THREE.Vector3().subVectors(playerPos, coin.group.position).normalize();
          coin.group.position.addScaledVector(dir, 35 * delta);
        }
      }

      // Collect Coin Check
      const distToPlayer = coin.group.position.distanceTo(playerPos);
      if (distToPlayer < 1.4) {
        this.collectCoin(coin, i);
      } else if (coin.group.position.z > threshold) {
        this.scene.remove(coin.group);
        this.activeCoins.splice(i, 1);
      }
    }

    // 5. Move Powerup Crates
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const pup = this.activePowerups[i];
      pup.group.position.z += moveDist;
      pup.group.rotation.y += delta * 3;

      const dist = pup.group.position.distanceTo(playerPos);
      if (dist < 1.5) {
        this.collectPowerup(pup, i);
      } else if (pup.group.position.z > threshold) {
        this.scene.remove(pup.group);
        this.activePowerups.splice(i, 1);
      }
    }
  }

  // --- COLLISION LOGIC ---

  checkTrainCollision(train) {
    if (this.invulnerableTimer > 0 || this.jetpackActive) return;

    const pPos = this.playerGroup.position;
    const tz = train.group.position.z;
    const tx = train.laneX;

    // Check lateral and depth intersection
    const inLane = Math.abs(pPos.x - tx) < (train.width / 2 + 0.35);
    const inZRange = (tz - train.length / 2) < (pPos.z + 0.4) && (pPos.z - 0.4) < (tz + train.length / 2);

    if (inLane && inZRange) {
      // If player is on top of train roof (within tolerance), they are surfing, not crashing!
      if (pPos.y >= train.height - 0.2) {
        return;
      }

      // If train has front ramp and player is at front slope, they surf up!
      if (train.hasRamp && pPos.z > tz + train.length / 2 - 4) {
        this.playerY = Math.max(this.playerY, train.height);
        this.playerGroup.position.y = this.playerY;
        this.playerVY = 0;
        this.isGrounded = true;
        return;
      }

      // Impact Crash!
      this.handleCrash('train');
    }
  }

  checkObstacleCollision(obs) {
    if (this.invulnerableTimer > 0 || this.jetpackActive) return;

    const pPos = this.playerGroup.position;
    const oz = obs.group.position.z;
    const ox = obs.laneX;

    // Depth check
    if (Math.abs(pPos.z - oz) < 0.65 && Math.abs(pPos.x - ox) < 1.1) {
      if (obs.type === 'hurdle') {
        // Hurdle can be cleared by jumping (player y > 1.05)
        if (pPos.y < 1.05) {
          this.handleCrash('hurdle');
        }
      } else if (obs.type === 'slide') {
        // High barrier can be cleared by sliding (player is sliding and y < 0.8)
        if (!this.isSliding || pPos.y > 0.85) {
          this.handleCrash('slide');
        }
      }
    }
  }

  handleCrash(source) {
    if (this.hoverboardActive) {
      // Hoverboard absorbs crash! Break shield!
      this.hoverboardActive = false;
      this.hoverboardTimer = 0;
      if (this.hoverboardMesh) this.hoverboardMesh.visible = false;
      this.invulnerableTimer = 2.2; // 2.2s grace invulnerability
      this.shakeIntensity = 0.4;
      subwayAudio.stopHoverboardLoop();
      subwayAudio.playShieldBreak();
      this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 0.5, this.playerGroup.position.z, 0x06b6d4, 24);
      this.callbacks.onPowerupChange('hoverboard', 0);
      return;
    }

    // Fatal Crash -> Game Over
    this.isRunning = false;
    this.shakeIntensity = 0.7;
    subwayAudio.playCrash();
    subwayAudio.stopMusic();
    subwayAudio.stopContinuousLoops();
    this.createBurst(this.playerGroup.position.x, this.playerGroup.position.y + 1, this.playerGroup.position.z, 0xef4444, 30);
    this.callbacks.onGameOver(this.score, this.coins, source);
  }

  collectCoin(coin, index) {
    this.scene.remove(coin.group);
    this.activeCoins.splice(index, 1);
    this.coins += 1;
    subwayAudio.playCoin();
    this.callbacks.onCoinsUpdate(this.coins);
    this.createBurst(coin.group.position.x, coin.group.position.y, coin.group.position.z, 0xfbbf24, 8);
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
      // Spawn sky highway of gold coins above current chunk!
      this.spawnSkyCoinHighway();
    } else if (type === 'magnet') {
      this.magnetActive = true;
      this.magnetTimer = 20;
      if (this.magnetRing) this.magnetRing.visible = true;
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
    // Generate rows of coins high in the sky (y=14)
    for (let z = -20; z >= -180; z -= 3.5) {
      for (let lane of LANES) {
        if (Math.random() > 0.25) {
          this.spawnCoin(lane, 14, z);
        }
      }
    }
  }

  // --- ANIMATION & CAMERA ---

  animatePlayerModel(delta) {
    if (!this.charRoot) return;

    const time = this.clock.getElapsedTime();
    const runCycle = time * (this.speed * 0.4);

    if (this.isSliding) {
      // Slide Pose: Flat horizontal forward roll
      this.charRoot.position.y = 0.35;
      this.charRoot.rotation.x = -Math.PI / 2.6;
      this.leftArm.rotation.x = -Math.PI / 2;
      this.rightArm.rotation.x = -Math.PI / 2;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.createFootstepDust(this.playerGroup.position.x, this.playerGroup.position.z);
    } else if (this.hoverboardActive) {
      // Hoverboard Stance: Surfer stance sideways
      this.charRoot.position.y = 0.55;
      this.charRoot.rotation.x = 0;
      this.charRoot.rotation.y = Math.PI / 4;
      this.leftArm.rotation.x = -0.5;
      this.rightArm.rotation.x = 0.5;
      this.leftLeg.rotation.x = 0.2;
      this.rightLeg.rotation.x = -0.2;
    } else if (!this.isGrounded) {
      // Jump Pose: Legs tucked, arms spread
      this.charRoot.position.y = 1.0;
      this.charRoot.rotation.x = 0.2;
      this.charRoot.rotation.y = 0;
      this.leftLeg.rotation.x = -0.7;
      this.rightLeg.rotation.x = -0.4;
      this.leftArm.rotation.x = -1.2;
      this.rightArm.rotation.x = -1.2;
    } else {
      // Running Gait: Rhythmic leg stride and counter arm swings
      this.charRoot.position.y = 1.0 + Math.abs(Math.sin(runCycle)) * 0.12;
      this.charRoot.rotation.x = 0.1;
      this.charRoot.rotation.y = 0;

      const stride = Math.sin(runCycle);
      this.leftLeg.rotation.x = stride * 0.9;
      this.rightLeg.rotation.x = -stride * 0.9;
      this.leftArm.rotation.x = -stride * 0.9;
      this.rightArm.rotation.x = stride * 0.9;

      if (Math.abs(stride) > 0.8) {
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
      p.vy -= 9.8 * delta; // particle gravity

      p.mesh.scale.setScalar(Math.max(0.01, p.life));

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }
  }

  updateCamera(delta) {
    const pPos = this.playerGroup.position;

    // Base chase camera positioning
    const targetCamX = pPos.x * 0.65;
    const targetCamY = Math.max(4.2, pPos.y + 3.8);
    const targetCamZ = pPos.z + 7.8;

    this.camera.position.x += (targetCamX - this.camera.position.x) * Math.min(1, 10 * delta);
    this.camera.position.y += (targetCamY - this.camera.position.y) * Math.min(1, 8 * delta);
    this.camera.position.z += (targetCamZ - this.camera.position.z) * Math.min(1, 12 * delta);

    // Apply camera shake if any
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

    // Dispose all objects
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
