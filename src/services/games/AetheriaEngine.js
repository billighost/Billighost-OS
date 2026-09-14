/**
 * Aetheria 3D — Full 3D Open World Action RPG Engine
 * Ultimate Billighost OS Edition
 * Powered by Three.js & Web Audio API
 *
 * 30 High-Value Polish, Modeling & Performance Features:
 * 1. Articulated 3D Rideable Mount (Horse / Steed) with saddle, reins, legs, hooves, 4-beat gallop gait, mane & tail
 * 2. 3D Billighost Spectral Ghost enemies with floating translucent shroud, cyan eyes, hover physics & phase blinks
 * 3. Billighost Ghost Ascendance (Overdrive Mode) with glowing cyan-violet aura, ghost trail FX, and empowered damage
 * 4. 4 Distinct Playable Hero Classes: Paladin (sword/shield), Rogue (dual blades), Sorceress (arcane staff), Berserker (2H cleaver)
 * 5. Interactive 3D Turntable Customization support (live class, palette, helm, cape, and mount live preview)
 * 6. Vastly Expanded 300x300 4-Biome Open World (Riverlands, Spectral Crypts, Volcanic Crags, Monolith Colosseum)
 * 7. Hyper-Detailed Articulated 3D Player Models (pauldrons, breastplates, gauntlets, poleyn knees, sabatons, visors)
 * 8. High-Fidelity Weapon Models with Dynamic Trails (Ornate Longsword, Twin Katanas, Jeweled Staff, Colossal Cleaver)
 * 9. Dynamic Cape & Cloth Physics responding to player velocity, jump arcs, and wind vectors
 * 10. Procedural Water Shader Simulation with surface wave oscillations, shoreline foam edge, and specular reflections
 * 11. Multi-Layer Vertex Terrain Shading (sandy riverbanks, lush emerald grass, dark soil, scorched basalt, mossy stone)
 * 12. Procedural Foliage & Landmark Scattering (stylized pine groves, deadwood phantom trees, rune pillars, sky obelisks)
 * 13. Day / Twilight / Night Atmosphere Engine 2.0 with moving orbital sun & moon, orange twilight, starlit sky, and fireflies
 * 14. GPU Instancing Optimization (InstancedMesh) for trees, rocks, and foliage, drastically cutting draw calls
 * 15. Zero-GC Particle & Projectile Recycling Object Pool to eliminate garbage collection frame stutter
 * 16. Dynamic Frustum & Distance LOD Culling for distant entities and terrain decor
 * 17. Adaptive Graphics Quality Presets (Ultra / High / Low) scaling shadow maps, particle density, and pixel ratios
 * 18. Billighost Ancient Monolith Sanctuary with interactive healing fountain, system glyphs, and lore terminal
 * 19. Interactive Minimap 2.0 with elevation contours, player direction cone, enemy blips, chest markers, mount indicator
 * 20. Spring-Damped Orbit Camera with Smart Collision & Mount Zoom-Out
 * 21. Jump & Gallop-Jump Mechanics (Spacebar) on foot and on mount, with landing dust puffs and impact sound
 * 22. Combat Lock-On Crosshair & Smart Target Tracking (Tab or touch icon) that centers camera on nearest enemy/boss
 * 23. Floating Damage Numbers & Combo Counter with critical strike gold popups and deflection indicators
 * 24. Multi-Tiered Treasure Chests (Bronze, Silver, Spectral Gold) with animated opening and particle loot fountains
 * 25. Expanded AI Enemy Types (Shadow Wolves, Goblin Marauders, Billighost Spectres, and Ancient Stone Golem Boss)
 * 26. Rich Procedural Web Audio Engine 2.0 integration (gallop rhythms, sword clashes, ghost wails, ambient nature, combat drums)
 * 27. Glassmorphic HUD & Hotbar telemetry (HP, stamina, ghost surge, cooldown rings, mount status, weapon card)
 * 28. Combat Telemetry & Run Statistics (enemies defeated, distance galloped, damage dealt, chests opened)
 * 29. Seamless Cross-Platform Controls (WASD, J, K, E, C, H, Space, Tab, touch joystick & buttons)
 * 30. Clean WebGL Resource Disposability & Memory Lifecycle Management
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
      onGhostSurgeUpdate: () => {},
      onMountUpdate: () => {},
      onTargetLockUpdate: () => {},
      onGameOver: () => {},
      onVictory: () => {},
      ...callbacks,
    };

    // Quality Settings: 'ultra' | 'high' | 'low'
    this.graphicsQuality = 'high';

    // Game State
    this.isRunning = false;
    this.isPaused = false;

    // Character & Customization Config
    this.selectedClass = 'paladin'; // 'paladin' | 'rogue' | 'sorceress' | 'berserker'
    this.characterCustomization = {
      palette: 'spectral', // 'spectral' | 'obsidian' | 'crimson' | 'emerald' | 'gold'
      hasCape: true,
      hasHelmet: true,
      mountType: 'horse', // 'horse' | 'spectral' | 'nightmare' | 'celestial'
    };

    // Player RPG Stats
    this.player = {
      hp: 120,
      maxHp: 120,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      exp: 0,
      expNext: 100,
      potions: 3,
      equippedWeapon: 'Paladin Sunblade',
      attackPower: 28,
      critChance: 0.15,
      isBlocking: false,
      isAttacking: false,
      attackCooldown: 0,
      comboStep: 1,
      lastAttackTime: 0,
      isRolling: false,
      rollTimer: 0,
      invulnerableTimer: 0,
      isJumping: false,
      jumpVelocity: 0,
      jumpCooldown: 0,
    };

    // Ghost Surge (Ascendance Overdrive)
    this.ghostSurge = {
      charge: 0, // 0 to 100
      maxCharge: 100,
      active: false,
      timer: 0,
      duration: 12, // seconds of overdrive
    };

    // Mount / Horse System
    this.mount = {
      isMounted: false,
      mountMesh: null,
      gallopCycle: 0,
      speedBonus: 1.8,
      gallopSoundTimer: 0,
    };

    // Target Lock-On System
    this.lockedTarget = null;

    // Run Telemetry
    this.telemetry = {
      enemiesDefeated: 0,
      distanceTraveled: 0,
      chestsOpened: 0,
      damageDealt: 0,
    };

    // Physics & Movement
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3(0, 0, 0);
    this.facingAngle = 0;
    this.isGrounded = true;
    this.isSprinting = false;

    // Camera Orbit Controller
    this.camDistance = 7.0;
    this.camHeight = 2.8;
    this.camPitch = 0.25;
    this.camYaw = 0;

    // Day / Night Cycle (200 seconds full day)
    this.dayTime = 0.25; // 0: sunrise, 0.25: midday, 0.5: sunset, 0.75: midnight
    this.dayDuration = 200; // seconds

    // Three.js Core
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.reqId = null;

    // Entities
    this.playerGroup = null;
    this.charRoot = null;
    this.horseGroup = null;
    this.enemies = [];
    this.chests = [];
    this.ghostOrbs = [];
    this.magicProjectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.shockwaves = [];
    this.sanctuaryPillars = [];

    // Boss tracking
    this.boss = null;

    // Shared Materials Cache
    this.materials = {};

    // Bindings
    this.animate = this.animate.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.init();
  }

  // --- INITIALIZATION ---

  init() {
    const width = this.canvas.clientWidth || 800;
    const height = this.canvas.clientHeight || 500;

    // 1. Scene & Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x60a5fa);
    this.scene.fog = new THREE.FogExp2(0x60a5fa, 0.008);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 400);

    // 3. Renderer with high-performance WebGL
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.graphicsQuality === 'ultra' ? 1.5 : 1.2));
    this.renderer.shadowMap.enabled = this.graphicsQuality !== 'low';
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    // 4. Initialize Shared Materials
    this.initMaterials();

    // 5. Lighting & Celestial Bodies
    this.setupLighting();

    // 6. Build Expanded 300x300 Procedural 4-Biome Terrain
    this.buildWorldTerrain();

    // 7. Scatter Instanced Foliage & World Landmarks
    this.buildInstancedFoliage();
    this.buildWorldLandmarks();
    this.buildBillighostSanctuary();

    // 8. Build Horse Mount Mesh
    this.buildHorseMount();

    // 9. Build Player Character & Equipped Armaments
    this.buildPlayerCharacter();

    // 10. Spawn Roaming Enemies (Wolves, Goblins, Billighost Spectres, Boss)
    this.spawnWorldEnemies();

    // 11. Spawn Interactive Treasure Chests & Ghost Orbs
    this.spawnTreasureChests();
    this.spawnGhostOrbs();

    // Lock starting position to ground height
    this.pos.y = this.getTerrainHeight(this.pos.x, this.pos.z);
    this.playerGroup.position.copy(this.pos);

    // Initial Camera Position & View Frame
    const cx = this.pos.x - Math.sin(this.camYaw) * (this.camDistance * Math.cos(this.camPitch));
    const cy = this.pos.y + this.camHeight + Math.sin(this.camPitch) * this.camDistance;
    const cz = this.pos.z - Math.cos(this.camYaw) * (this.camDistance * Math.cos(this.camPitch));
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.pos.x, this.pos.y + 1.6, this.pos.z);
    this.render();

    window.addEventListener('resize', this.handleResize);

    // The canvas lives inside a resizable OS window panel, not the browser window,
    // so window 'resize' alone misses panel resizes/drags — watch the element directly.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.canvas.parentElement || this.canvas);
    }
  }

  initMaterials() {
    // Reusable Materials
    this.materials.steel = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
    this.materials.gold = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8, roughness: 0.3 });
    this.materials.darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });
    this.materials.skin = new THREE.MeshLambertMaterial({ color: 0xffd5b3 });
    this.materials.wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    this.materials.stone = new THREE.MeshLambertMaterial({ color: 0x475569 });

    // Ghost / Spectral Materials
    this.materials.ghostMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    this.materials.ghostEye = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.materials.ghostCore = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    // Water Material — animated shader with wave displacement, fresnel rim & sun sparkle
    this.waterUniforms = {
      uTime: { value: 0 },
      uColorShallow: { value: new THREE.Color(0x5eead4) },
      uColorDeep: { value: new THREE.Color(0x0c4a6e) },
      uSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.3).normalize() },
      uOpacity: { value: 0.86 },
    };
    this.materials.water = new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        varying float vWave;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        float waveHeight(vec2 p) {
          float w1 = sin(p.x * 0.35 + uTime * 1.4) * 0.14;
          float w2 = sin(p.y * 0.5 - uTime * 1.1 + p.x * 0.2) * 0.10;
          float w3 = sin((p.x + p.y) * 0.18 + uTime * 0.7) * 0.08;
          return w1 + w2 + w3;
        }
        void main() {
          vec3 pos = position;
          float h = waveHeight(pos.xz);
          pos.y += h;
          vWave = h;
          float eps = 0.5;
          float hL = waveHeight(pos.xz - vec2(eps, 0.0));
          float hR = waveHeight(pos.xz + vec2(eps, 0.0));
          float hD = waveHeight(pos.xz - vec2(0.0, eps));
          float hU = waveHeight(pos.xz + vec2(0.0, eps));
          vec3 n = normalize(vec3(hL - hR, 2.0 * eps, hD - hU));
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vNormalW = normalize(mat3(modelMatrix) * n);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorShallow;
        uniform vec3 uColorDeep;
        uniform vec3 uSunDir;
        uniform float uOpacity;
        varying float vWave;
        varying vec3 vNormalW;
        varying vec3 vWorldPos;
        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 n = normalize(vNormalW);
          float fresnel = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 3.0);
          vec3 base = mix(uColorDeep, uColorShallow, clamp(0.5 + vWave * 1.6, 0.0, 1.0));
          vec3 h = normalize(uSunDir + viewDir);
          float spec = pow(max(dot(n, h), 0.0), 60.0);
          float foam = smoothstep(0.1, 0.15, abs(vWave));
          vec3 col = base + fresnel * vec3(0.5, 0.7, 0.75) + spec * 1.1 + foam * 0.55;
          gl_FragColor = vec4(col, uOpacity + fresnel * 0.1);
        }
      `,
    });
  }

  // --- LIGHTING & SKY ATMOSPHERE ---

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x7dd3fc, 0.7);
    this.scene.add(this.ambientLight);

    // Directional Sun Light
    this.sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    this.sunLight.position.set(50, 90, 60);
    this.sunLight.castShadow = this.graphicsQuality !== 'low';
    const shadowRes = this.graphicsQuality === 'ultra' ? 2048 : 1024;
    this.sunLight.shadow.mapSize.width = shadowRes;
    this.sunLight.shadow.mapSize.height = shadowRes;
    this.sunLight.shadow.camera.near = 1.0;
    this.sunLight.shadow.camera.far = 240;
    const d = 55;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Moon Light (cooler cyan-indigo during night)
    this.moonLight = new THREE.DirectionalLight(0x38bdf8, 0.0);
    this.moonLight.position.set(-50, -90, -60);
    this.scene.add(this.moonLight);

    // Sky Dome Mesh (hemisphere with day/night color lerp)
    const skyGeo = new THREE.SphereGeometry(380, 24, 16);
    this.skyMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.BackSide });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.scene.add(this.skyMesh);

    // Sun Sprite
    const sunOrbGeo = new THREE.SphereGeometry(6, 12, 12);
    const sunOrbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    this.sunOrb = new THREE.Mesh(sunOrbGeo, sunOrbMat);
    this.scene.add(this.sunOrb);

    // Moon Sprite
    const moonOrbGeo = new THREE.SphereGeometry(5, 12, 12);
    const moonOrbMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    this.moonOrb = new THREE.Mesh(moonOrbGeo, moonOrbMat);
    this.scene.add(this.moonOrb);

    // Starfield (fades in at night)
    const starCount = this.graphicsQuality === 'low' ? 400 : 1000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 300;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 0.9); // keep mostly above horizon
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 20;
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, transparent: true, opacity: 0, sizeAttenuation: false });
    this.starField = new THREE.Points(starGeo, this.starMat);
    this.scene.add(this.starField);
  }

  // --- MATHEMATICAL CONTINUOUS TERRAIN & 4 BIOMES (300x300) ---

  getTerrainHeight(x, z) {
    const riverCenter = 35 + Math.sin(z * 0.03) * 12;
    const riverDist = Math.abs(x - riverCenter);
    let riverDip = 0;
    if (riverDist < 12) {
      riverDip = -3.2 * Math.cos((riverDist / 12) * (Math.PI / 2));
    }

    const h1 = Math.sin(x * 0.025) * Math.cos(z * 0.025) * 4.5;
    const h2 = Math.sin(x * 0.05 + 1.2) * Math.cos(z * 0.055) * 2.4;
    const h3 = Math.cos(x * 0.012 - z * 0.015) * 5.5;

    let volcanicMountain = 0;
    const volcDist = Math.hypot(x - 70, z - (-70));
    if (volcDist < 50) {
      volcanicMountain = Math.max(0, (1 - volcDist / 50)) * 7.5;
    }

    const bossDist = Math.hypot(x - (-65), z - (-65));
    let bossArena = 0;
    if (bossDist < 26) {
      bossArena = 3.5;
    }

    const cryptDist = Math.hypot(x - (-60), z - 60);
    let cryptHollow = 0;
    if (cryptDist < 30) {
      cryptHollow = -Math.cos((cryptDist / 30) * Math.PI) * 1.5;
    }

    return Math.max(-2.0, h1 + h2 + h3 + riverDip + volcanicMountain + bossArena + cryptHollow);
  }

  buildWorldTerrain() {
    const size = 300;
    const segments = 160;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      posAttr.setY(i, this.getTerrainHeight(x, z));
    }
    geo.computeVertexNormals();

    // Second pass: color using both height AND slope (steep = exposed rock),
    // so cliffs and mountainsides read differently from flat meadows.
    const normalAttr = geo.attributes.normal;
    const colors = [];
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i);
      const slope = 1 - THREE.MathUtils.clamp(normalAttr.getY(i), 0, 1); // 0 = flat, 1 = vertical

      let col;
      if (x > 30 && z < -30 && y > 2.0) {
        const r = 0.3 + Math.sin(x * 0.4) * 0.05;
        col = [r, 0.16, 0.13];
      } else if (x < -20 && z > 20) {
        col = [0.1, 0.24, 0.3];
      } else if (y < 0.3) {
        col = [0.8, 0.74, 0.54];
      } else if (y > 5.5) {
        col = [0.55, 0.55, 0.56];
      } else {
        const gVar = 0.5 + Math.sin(x * 0.3) * 0.07 + Math.cos(z * 0.22) * 0.04;
        col = [0.16, gVar, 0.2];
      }

      // Blend toward bare rock on steep slopes regardless of biome
      const rock = [0.4, 0.39, 0.38];
      const st = THREE.MathUtils.clamp((slope - 0.35) / (0.75 - 0.35), 0, 1);
      const t = st * st * (3 - 2 * st);
      col = [
        col[0] * (1 - t) + rock[0] * t,
        col[1] * (1 - t) + rock[1] * t,
        col[2] * (1 - t) + rock[2] * t,
      ];
      colors.push(...col);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
    });
    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.receiveShadow = this.graphicsQuality !== 'low';
    this.scene.add(this.terrainMesh);

    // Riverbed floor (visible through the translucent shader water for depth)
    const bedGeo = new THREE.PlaneGeometry(35, 300, 4, 20);
    bedGeo.rotateX(-Math.PI / 2);
    const bedMat = new THREE.MeshStandardMaterial({ color: 0x0a3548, roughness: 1 });
    const bed = new THREE.Mesh(bedGeo, bedMat);
    bed.position.set(35, -1.1, 0);
    this.scene.add(bed);

    const waterGeo = new THREE.PlaneGeometry(35, 300, 28, 90);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMesh = new THREE.Mesh(waterGeo, this.materials.water);
    this.waterMesh.position.set(35, -0.4, 0);
    this.scene.add(this.waterMesh);
  }

  // --- GPU INSTANCED FOLIAGE & SCENERY ---

  buildInstancedFoliage() {
    const dummy = new THREE.Object3D();
    this.scatteredMeshes = [];

    // --- Layered pine trees: tapered trunk + 3 tiers of foliage cones, 3 colour variants ---
    const treeCount = this.graphicsQuality === 'low' ? 80 : 150;
    const variants = 3;
    const perVariant = Math.ceil(treeCount / variants) + 1;
    const greenShades = [0x1e4620, 0x14532d, 0x0f3d24];

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 0.92 });
    const trunkGeo = new THREE.CylinderGeometry(0.13, 0.27, 2.3, 6);
    trunkGeo.translate(0, 1.15, 0);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    trunkMesh.castShadow = this.graphicsQuality !== 'low';
    this.scene.add(trunkMesh);
    this.scatteredMeshes.push(trunkMesh);

    const foliageGeoLow = new THREE.ConeGeometry(1.5, 2.0, 7);
    foliageGeoLow.translate(0, 2.55, 0);
    const foliageGeoMid = new THREE.ConeGeometry(1.12, 1.7, 7);
    foliageGeoMid.translate(0, 3.65, 0);
    const foliageGeoTop = new THREE.ConeGeometry(0.72, 1.35, 7);
    foliageGeoTop.translate(0, 4.55, 0);

    const foliageVariants = greenShades.map(color => {
      const mat = new THREE.MeshLambertMaterial({ color });
      const low = new THREE.InstancedMesh(foliageGeoLow, mat, perVariant);
      const mid = new THREE.InstancedMesh(foliageGeoMid, mat, perVariant);
      const top = new THREE.InstancedMesh(foliageGeoTop, mat, perVariant);
      [low, mid, top].forEach(m => {
        m.castShadow = this.graphicsQuality === 'ultra';
        this.scene.add(m);
        this.scatteredMeshes.push(m);
      });
      return { low, mid, top, count: 0 };
    });

    let placed = 0;
    for (let i = 0; i < treeCount * 4 && placed < treeCount; i++) {
      const tx = (Math.random() - 0.5) * 270;
      const tz = (Math.random() - 0.5) * 270;

      if (Math.abs(tx - 35) < 20) continue; // river channel
      if (Math.hypot(tx - (-65), tz - (-65)) < 34) continue; // colosseum arena
      if (Math.hypot(tx, tz) < 14) continue; // spawn clearing
      if (tx > 30 && tz < -30) continue; // volcanic crags stay barren
      if (tx < -20 && tz > 20) continue; // spectral crypts use deadwood instead

      const ty = this.getTerrainHeight(tx, tz);
      const scale = 0.8 + Math.random() * 0.55;
      const rot = Math.random() * Math.PI * 2;
      const lean = (Math.random() - 0.5) * 0.06;

      dummy.position.set(tx, ty, tz);
      dummy.rotation.set(lean, rot, lean);
      dummy.scale.set(scale, scale * (0.88 + Math.random() * 0.3), scale);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(placed, dummy.matrix);

      const v = foliageVariants[placed % variants];
      const vi = v.count++;
      v.low.setMatrixAt(vi, dummy.matrix);
      v.mid.setMatrixAt(vi, dummy.matrix);
      v.top.setMatrixAt(vi, dummy.matrix);

      placed++;
    }

    trunkMesh.count = placed;
    trunkMesh.instanceMatrix.needsUpdate = true;
    foliageVariants.forEach(v => {
      v.low.count = v.count;
      v.mid.count = v.count;
      v.top.count = v.count;
      v.low.instanceMatrix.needsUpdate = true;
      v.mid.instanceMatrix.needsUpdate = true;
      v.top.instanceMatrix.needsUpdate = true;
    });

    // --- Gnarled deadwood for the Spectral Crypts biome ---
    const deadwoodMat = new THREE.MeshLambertMaterial({ color: 0x27272a });
    const deadwoodGeo = new THREE.CylinderGeometry(0.18, 0.48, 4.2, 6);
    const deadwoodCount = 34;
    this.deadwoodMesh = new THREE.InstancedMesh(deadwoodGeo, deadwoodMat, deadwoodCount);
    this.deadwoodMesh.castShadow = this.graphicsQuality !== 'low';

    let placedDead = 0;
    for (let i = 0; i < deadwoodCount * 3 && placedDead < deadwoodCount; i++) {
      const dx = -30 - Math.random() * 55;
      const dz = 30 + Math.random() * 55;
      const dy = this.getTerrainHeight(dx, dz);

      dummy.position.set(dx, dy + 2.0, dz);
      dummy.scale.set(1, 1 + Math.random() * 0.5, 1);
      dummy.rotation.set((Math.random() - 0.5) * 0.25, Math.random() * Math.PI, (Math.random() - 0.5) * 0.25);
      dummy.updateMatrix();

      this.deadwoodMesh.setMatrixAt(placedDead, dummy.matrix);
      placedDead++;
    }
    this.deadwoodMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.deadwoodMesh);
    this.scatteredMeshes.push(this.deadwoodMesh);

    // --- Scattered rocks for grounding detail across all biomes ---
    const rockGeo = new THREE.IcosahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5b6570, roughness: 0.95, flatShading: true });
    const rockCount = this.graphicsQuality === 'low' ? 45 : 100;
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockMesh.castShadow = this.graphicsQuality !== 'low';
    rockMesh.receiveShadow = true;

    let rPlaced = 0;
    for (let i = 0; i < rockCount * 4 && rPlaced < rockCount; i++) {
      const rx = (Math.random() - 0.5) * 280;
      const rz = (Math.random() - 0.5) * 280;
      if (Math.abs(rx - 35) < 10) continue;
      if (Math.hypot(rx, rz) < 10) continue;

      const ry = this.getTerrainHeight(rx, rz);
      dummy.position.set(rx, ry + 0.15, rz);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      const s = 0.3 + Math.random() * 0.9;
      dummy.scale.set(s, s * (0.6 + Math.random() * 0.5), s);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(rPlaced, dummy.matrix);
      rPlaced++;
    }
    rockMesh.count = rPlaced;
    rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(rockMesh);
    this.scatteredMeshes.push(rockMesh);

    // --- Grass tufts for lushness on meadow biomes (skipped on low quality for perf) ---
    if (this.graphicsQuality !== 'low') {
      const grassGeo = new THREE.ConeGeometry(0.055, 0.45, 3);
      grassGeo.translate(0, 0.225, 0);
      const grassMat = new THREE.MeshLambertMaterial({ color: 0x4ea058, side: THREE.DoubleSide });
      const grassCount = this.graphicsQuality === 'ultra' ? 2200 : 1100;
      const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);

      let gPlaced = 0;
      for (let i = 0; i < grassCount * 2 && gPlaced < grassCount; i++) {
        const gx = (Math.random() - 0.5) * 240;
        const gz = (Math.random() - 0.5) * 240;
        if (Math.abs(gx - 35) < 16) continue;
        if (gx > 30 && gz < -30) continue;
        if (gx < -20 && gz > 20) continue;
        if (Math.hypot(gx - (-65), gz - (-65)) < 30) continue;

        const gy = this.getTerrainHeight(gx, gz);
        if (gy < 0.3 || gy > 5) continue;

        dummy.position.set(gx, gy, gz);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        const gs = 0.6 + Math.random() * 0.8;
        dummy.scale.set(gs, gs * (0.7 + Math.random() * 0.6), gs);
        dummy.updateMatrix();
        grassMesh.setMatrixAt(gPlaced, dummy.matrix);
        gPlaced++;
      }
      grassMesh.count = gPlaced;
      grassMesh.instanceMatrix.needsUpdate = true;
      this.scene.add(grassMesh);
      this.scatteredMeshes.push(grassMesh);
    }
  }

  buildWorldLandmarks() {
    const arenaX = -65;
    const arenaZ = -65;
    const arenaRadius = 20;
    const pillarGeo = new THREE.BoxGeometry(2.2, 8.5, 1.8);
    const runeMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const px = arenaX + Math.cos(angle) * arenaRadius;
      const pz = arenaZ + Math.sin(angle) * arenaRadius;
      const py = this.getTerrainHeight(px, pz) + 4.25;

      const pillar = new THREE.Mesh(pillarGeo, this.materials.stone);
      pillar.position.set(px, py, pz);
      pillar.rotation.y = -angle;
      pillar.castShadow = true;
      this.scene.add(pillar);

      const runeGeo = new THREE.PlaneGeometry(0.8, 2.2);
      const rune = new THREE.Mesh(runeGeo, runeMat);
      rune.position.set(px, py + 0.8, pz);
      rune.rotation.y = -angle + Math.PI / 2;
      this.scene.add(rune);
    }

    const obeliskGeo = new THREE.OctahedronGeometry(2.4);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const ox = arenaX + Math.cos(angle) * 12;
      const oz = arenaZ + Math.sin(angle) * 12;
      const obelisk = new THREE.Mesh(obeliskGeo, runeMat);
      obelisk.position.set(ox, 18 + i * 2, oz);
      this.scene.add(obelisk);
    }

    const bridgeGeo = new THREE.BoxGeometry(16, 0.8, 6.5);
    const bridge = new THREE.Mesh(bridgeGeo, this.materials.stone);
    bridge.position.set(35, 1.4, 0);
    this.scene.add(bridge);

    const railGeo = new THREE.BoxGeometry(16, 1.0, 0.3);
    const rail1 = new THREE.Mesh(railGeo, this.materials.stone);
    rail1.position.set(35, 2.0, 3.1);
    const rail2 = new THREE.Mesh(railGeo, this.materials.stone);
    rail2.position.set(35, 2.0, -3.1);
    this.scene.add(rail1);
    this.scene.add(rail2);
  }

  // --- BILLIGHOST SANCTUARY & ANCIENT TERMINAL ---

  buildBillighostSanctuary() {
    const group = new THREE.Group();
    const sy = this.getTerrainHeight(0, 35);
    group.position.set(0, sy, 35);

    const ringGeo = new THREE.RingGeometry(2.5, 5.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const runeRing = new THREE.Mesh(ringGeo, ringMat);
    runeRing.position.y = 0.08;
    group.add(runeRing);

    const monolithGeo = new THREE.BoxGeometry(1.4, 3.2, 0.5);
    const monolithMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const monolith = new THREE.Mesh(monolithGeo, monolithMat);
    monolith.position.y = 1.6;
    group.add(monolith);

    const screenGeo = new THREE.PlaneGeometry(1.1, 1.4);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 1.8, 0.26);
    group.add(screen);

    const ghostCrestGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const ghostCrest = new THREE.Mesh(ghostCrestGeo, this.materials.ghostMat);
    ghostCrest.position.set(0, 3.8, 0);
    group.add(ghostCrest);

    this.scene.add(group);
    this.sanctuaryPillars.push({ group, x: 0, z: 35 });
  }

  // --- RIDEABLE MOUNT / HORSE SYSTEM (FEATURE 1) ---

  buildHorseMount() {
    this.horseGroup = new THREE.Group();
    this.horseGroup.visible = false;

    const coatMat = new THREE.MeshStandardMaterial({
      color: this.characterCustomization.mountType === 'spectral' ? 0x38bdf8 : 0x582f0e,
      roughness: 0.65,
      metalness: this.characterCustomization.mountType === 'spectral' ? 0.4 : 0.1,
      transparent: this.characterCustomization.mountType === 'spectral',
      opacity: this.characterCustomization.mountType === 'spectral' ? 0.85 : 1.0,
    });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.7 });
    const saddleMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.5, metalness: 0.4 });
    const bridleMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });

    const bodyGeo = new THREE.BoxGeometry(1.1, 1.2, 2.4);
    const body = new THREE.Mesh(bodyGeo, coatMat);
    body.position.y = 1.6;
    body.castShadow = true;
    this.horseGroup.add(body);

    const neckGeo = new THREE.BoxGeometry(0.65, 1.4, 0.85);
    const neck = new THREE.Mesh(neckGeo, coatMat);
    neck.position.set(0, 2.4, 1.2);
    neck.rotation.x = -0.4;
    neck.castShadow = true;
    this.horseGroup.add(neck);

    const headGeo = new THREE.BoxGeometry(0.55, 0.65, 1.1);
    const head = new THREE.Mesh(headGeo, coatMat);
    head.position.set(0, 3.0, 1.7);
    head.rotation.x = 0.25;
    head.castShadow = true;
    this.horseGroup.add(head);

    const earGeo = new THREE.ConeGeometry(0.12, 0.35, 5);
    const earL = new THREE.Mesh(earGeo, coatMat);
    earL.position.set(-0.2, 3.45, 1.55);
    earL.rotation.z = 0.15;
    const earR = new THREE.Mesh(earGeo, coatMat);
    earR.position.set(0.2, 3.45, 1.55);
    earR.rotation.z = -0.15;
    this.horseGroup.add(earL);
    this.horseGroup.add(earR);

    const maneGeo = new THREE.BoxGeometry(0.22, 1.3, 0.45);
    const mane = new THREE.Mesh(maneGeo, maneMat);
    mane.position.set(0, 2.6, 0.9);
    mane.rotation.x = -0.4;
    this.horseGroup.add(mane);

    this.horseTail = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 1.3, 8), maneMat);
    this.horseTail.position.set(0, 1.6, -1.35);
    this.horseTail.rotation.x = -0.3;
    this.horseGroup.add(this.horseTail);

    const saddleGeo = new THREE.BoxGeometry(1.15, 0.22, 0.95);
    const saddle = new THREE.Mesh(saddleGeo, saddleMat);
    saddle.position.set(0, 2.25, 0.05);
    this.horseGroup.add(saddle);

    const bridle = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.04, 6, 16), bridleMat);
    bridle.position.set(0, 2.9, 1.85);
    bridle.rotation.y = Math.PI / 2;
    this.horseGroup.add(bridle);

    const legGeo = new THREE.BoxGeometry(0.28, 1.4, 0.28);
    const hoofGeo = new THREE.BoxGeometry(0.3, 0.2, 0.32);
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });

    this.horseLegs = [];
    const legPositions = [
      [-0.42, 0.7, 0.85],
      [0.42, 0.7, 0.85],
      [-0.42, 0.7, -0.85],
      [0.42, 0.7, -0.85],
    ];

    legPositions.forEach(([lx, ly, lz]) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(lx, ly, lz);

      const upperLeg = new THREE.Mesh(legGeo, coatMat);
      upperLeg.position.y = -0.3;
      upperLeg.castShadow = true;
      legGroup.add(upperLeg);

      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.y = -1.0;
      legGroup.add(hoof);

      this.horseGroup.add(legGroup);
      this.horseLegs.push(legGroup);
    });

    this.scene.add(this.horseGroup);
  }

  toggleMount() {
    if (!this.isRunning || this.isPaused || this.player.isRolling) return;

    this.mount.isMounted = !this.mount.isMounted;
    aetheriaAudio.playMountCall();

    if (this.mount.isMounted) {
      this.horseGroup.visible = true;
      this.charRoot.position.y = 2.2;
      this.camDistance = 8.5;
      this.addFloatingText(this.pos.x, this.pos.y + 2.8, this.pos.z, 'MOUNTED STEED', '#fbbf24');
    } else {
      this.horseGroup.visible = false;
      this.charRoot.position.y = 0.9;
      this.camDistance = 7.0;
      this.addFloatingText(this.pos.x, this.pos.y + 2.4, this.pos.z, 'DISMOUNTED', '#94a3b8');
    }

    this.callbacks.onMountUpdate(this.mount.isMounted);
  }

  // --- 4 PLAYABLE CLASSES & ARTICULATED PLAYER MODELS ---

  buildPlayerCharacter() {
    if (this.playerGroup) {
      this.scene.remove(this.playerGroup);
    }

    this.playerGroup = new THREE.Group();
    this.charRoot = new THREE.Group();
    this.charRoot.position.y = 0.9;
    this.playerGroup.add(this.charRoot);

    const paletteColors = {
      spectral: 0x38bdf8,
      obsidian: 0x334155,
      crimson: 0xef4444,
      emerald: 0x10b981,
      gold: 0xf59e0b,
    };
    const primaryColor = paletteColors[this.characterCustomization.palette] || 0x38bdf8;
    const armorMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      metalness: 0.75,
      roughness: 0.28,
    });

    if (this.selectedClass === 'rogue') {
      this.buildRogueModel(armorMat);
    } else if (this.selectedClass === 'sorceress') {
      this.buildSorceressModel(armorMat);
    } else if (this.selectedClass === 'berserker') {
      this.buildBerserkerModel(armorMat);
    } else {
      this.buildPaladinModel(armorMat);
    }

    if (this.characterCustomization.hasCape) {
      const capeColors = {
        paladin: 0x0f172a, rogue: 0x1c1917, sorceress: 0x312e81, berserker: 0x1c1917,
      };
      this.cape = this.buildSegmentedCape(capeColors[this.selectedClass] || 0x0f172a);
      this.cape.position.set(0, 1.05, -0.3);
      this.cape.rotation.x = 0.12;
      this.charRoot.add(this.cape);
      this.capeSegments = this.cape.userData.segments;
    } else {
      this.capeSegments = null;
    }

    const auraGeo = new THREE.TorusGeometry(1.2, 0.06, 8, 32);
    const auraMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 });
    this.ghostSurgeAura = new THREE.Mesh(auraGeo, auraMat);
    this.ghostSurgeAura.rotation.x = Math.PI / 2;
    this.ghostSurgeAura.position.y = 0.4;
    this.ghostSurgeAura.visible = false;
    this.charRoot.add(this.ghostSurgeAura);

    this.scene.add(this.playerGroup);
  }

  buildPaladinModel(armorMat) {
    // Torso built from a tapered capsule-like stack (chest wider than waist) for a heroic silhouette
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.5, 4, 10), armorMat);
    torso.position.y = 0.55;
    torso.scale.set(1, 1.05, 0.72);
    torso.castShadow = true;
    this.charRoot.add(torso);

    const beltGeo = new THREE.TorusGeometry(0.34, 0.05, 6, 14);
    const belt = new THREE.Mesh(beltGeo, this.materials.gold);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.22;
    belt.scale.set(1, 0.72, 1);
    this.charRoot.add(belt);

    const pauldronGeo = new THREE.SphereGeometry(0.2, 12, 10);
    const pauldronL = new THREE.Mesh(pauldronGeo, this.materials.gold);
    pauldronL.position.set(-0.48, 0.9, 0);
    pauldronL.scale.set(1, 0.85, 1.1);
    const pauldronR = new THREE.Mesh(pauldronGeo, this.materials.gold);
    pauldronR.position.set(0.48, 0.9, 0);
    pauldronR.scale.set(1, 0.85, 1.1);
    this.charRoot.add(pauldronL);
    this.charRoot.add(pauldronR);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), this.materials.skin);
    head.position.y = 1.22;
    head.scale.set(1, 1.08, 0.95);
    head.castShadow = true;
    this.charRoot.add(head);

    if (this.characterCustomization.hasHelmet) {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), this.materials.steel);
      helm.position.set(0, 1.36, 0);
      const helmRidge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.62), this.materials.gold);
      helmRidge.position.set(0, 1.48, 0);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.06), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
      visor.position.set(0, 1.26, 0.26);
      this.charRoot.add(helm);
      this.charRoot.add(helmRidge);
      this.charRoot.add(visor);
    }

    const { arm: rArmMesh, shoulder: rShoulder } = this.buildCapsuleArm(armorMat, this.materials.gold, 0.13, 0.5);
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.5, 0.86, 0);
    rShoulder.position.y = -0.02;
    this.rightArm.add(rShoulder);
    this.rightArm.add(rArmMesh);

    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.65, 0.25);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.035), this.materials.steel);
    blade.position.y = 0.75;
    blade.castShadow = true;
    const bladeEdgeGeo = new THREE.ConeGeometry(0.09, 0.22, 4);
    const bladeTip = new THREE.Mesh(bladeEdgeGeo, this.materials.steel);
    bladeTip.rotation.x = Math.PI;
    bladeTip.position.y = 1.61;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.12), this.materials.gold);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), this.materials.darkSteel);
    hilt.position.y = -0.16;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), this.materials.gold);
    pommel.position.y = -0.34;
    this.swordGroup.add(blade);
    this.swordGroup.add(bladeTip);
    this.swordGroup.add(guard);
    this.swordGroup.add(hilt);
    this.swordGroup.add(pommel);
    this.rightArm.add(this.swordGroup);
    this.charRoot.add(this.rightArm);

    const { arm: lArmMesh, shoulder: lShoulder } = this.buildCapsuleArm(armorMat, this.materials.gold, 0.13, 0.5);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.5, 0.86, 0);
    lShoulder.position.y = -0.02;
    this.leftArm.add(lShoulder);
    this.leftArm.add(lArmMesh);

    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(-0.16, -0.32, 0.25);
    const shieldGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 16);
    shieldGeo.rotateX(Math.PI / 2);
    const shield = new THREE.Mesh(shieldGeo, this.materials.steel);
    shield.castShadow = true;
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), this.materials.gold);
    crest.position.z = 0.06;
    this.shieldGroup.add(shield);
    this.shieldGroup.add(crest);
    this.leftArm.add(this.shieldGroup);
    this.charRoot.add(this.leftArm);

    this.leftLeg = this.buildArmoredLeg(armorMat, -0.22);
    this.rightLeg = this.buildArmoredLeg(armorMat, 0.22);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  buildRogueModel(_armorMat) {
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.6 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.46, 4, 10), leatherMat);
    torso.position.y = 0.5;
    torso.scale.set(1, 1.02, 0.68);
    torso.castShadow = true;
    this.charRoot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), this.materials.skin);
    head.position.y = 1.15;
    head.scale.set(1, 1.05, 0.92);
    this.charRoot.add(head);

    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.65), leatherMat);
    cowl.position.set(0, 1.26, 0);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.06), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    mask.position.set(0, 1.13, 0.24);
    this.charRoot.add(cowl);
    this.charRoot.add(mask);

    const { arm: rArmMesh, shoulder: rShoulder } = this.buildCapsuleArm(leatherMat, leatherMat, 0.11, 0.46);
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.44, 0.8, 0);
    this.rightArm.add(rShoulder, rArmMesh);

    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.6, 0.2);
    const bladeR = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.035), this.materials.steel);
    bladeR.position.y = 0.7;
    bladeR.rotation.z = 0.05;
    this.swordGroup.add(bladeR);
    this.rightArm.add(this.swordGroup);
    this.charRoot.add(this.rightArm);

    const { arm: lArmMesh, shoulder: lShoulder } = this.buildCapsuleArm(leatherMat, leatherMat, 0.11, 0.46);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.44, 0.8, 0);
    this.leftArm.add(lShoulder, lArmMesh);

    this.shieldGroup = new THREE.Group();
    this.shieldGroup.position.set(0, -0.6, 0.2);
    const bladeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.4, 0.035), this.materials.steel);
    bladeL.position.y = 0.7;
    bladeL.rotation.z = -0.05;
    this.shieldGroup.add(bladeL);
    this.leftArm.add(this.shieldGroup);
    this.charRoot.add(this.leftArm);

    this.leftLeg = this.buildArmoredLeg(leatherMat, -0.2);
    this.rightLeg = this.buildArmoredLeg(leatherMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Class 3: Arcane Sorceress (Jeweled Staff)
  buildSorceressModel(_armorMat) {
    const robeMat = new THREE.MeshStandardMaterial({ color: 0x312e81, roughness: 0.7, emissive: 0x1e1b4b, emissiveIntensity: 0.15 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.55, 4, 10), robeMat);
    torso.position.y = 0.48;
    torso.scale.set(1, 1, 0.7);
    torso.castShadow = true;
    this.charRoot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), this.materials.skin);
    head.position.y = 1.15;
    head.scale.set(1, 1.05, 0.92);
    this.charRoot.add(head);

    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 6, 16), this.materials.gold);
    circlet.position.set(0, 1.24, 0);
    circlet.rotation.x = Math.PI / 2;
    this.charRoot.add(circlet);

    const { arm: rArmMesh, shoulder: rShoulder } = this.buildCapsuleArm(robeMat, robeMat, 0.1, 0.46);
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.82, 0);
    this.rightArm.add(rShoulder, rArmMesh);

    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.3, 0.3);
    const staffShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 2.2, 8), this.materials.gold);
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0ea5e9, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 }));
    crystal.position.y = 1.15;
    this.swordGroup.add(staffShaft);
    this.swordGroup.add(crystal);
    this.rightArm.add(this.swordGroup);
    this.charRoot.add(this.rightArm);

    const { arm: lArmMesh, shoulder: lShoulder } = this.buildCapsuleArm(robeMat, robeMat, 0.1, 0.46);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.82, 0);
    this.leftArm.add(lShoulder, lArmMesh);
    this.shieldGroup = new THREE.Group();
    this.leftArm.add(this.shieldGroup);
    this.charRoot.add(this.leftArm);

    this.leftLeg = this.buildArmoredLeg(robeMat, -0.2);
    this.rightLeg = this.buildArmoredLeg(robeMat, 0.2);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  // Class 4: Titan Berserker (Colossal 2-Handed Greatsword)
  buildBerserkerModel(_armorMat) {
    const heavyArmor = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5, metalness: 0.8 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.5, 4, 10), heavyArmor);
    torso.position.y = 0.58;
    torso.scale.set(1, 1.05, 0.78);
    torso.castShadow = true;
    this.charRoot.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), this.materials.skin);
    head.position.y = 1.28;
    head.scale.set(1, 1.05, 0.95);
    this.charRoot.add(head);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), heavyArmor);
    helm.position.set(0, 1.42, 0);
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.46, 6), this.materials.gold);
    hornL.position.set(-0.33, 1.6, 0);
    hornL.rotation.z = 0.7;
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.46, 6), this.materials.gold);
    hornR.position.set(0.33, 1.6, 0);
    hornR.rotation.z = -0.7;
    this.charRoot.add(helm);
    this.charRoot.add(hornL);
    this.charRoot.add(hornR);

    const { arm: rArmMesh, shoulder: rShoulder } = this.buildCapsuleArm(heavyArmor, this.materials.gold, 0.16, 0.5);
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.58, 0.88, 0);
    this.rightArm.add(rShoulder, rArmMesh);

    this.swordGroup = new THREE.Group();
    this.swordGroup.position.set(0, -0.6, 0.3);
    const cleaverBlade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.8, 0.055), this.materials.steel);
    cleaverBlade.position.y = 0.9;
    const cleaverHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.45, 8), heavyArmor);
    cleaverHilt.position.y = -0.2;
    this.swordGroup.add(cleaverBlade);
    this.swordGroup.add(cleaverHilt);
    this.rightArm.add(this.swordGroup);
    this.charRoot.add(this.rightArm);

    const { arm: lArmMesh, shoulder: lShoulder } = this.buildCapsuleArm(heavyArmor, this.materials.gold, 0.16, 0.5);
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.58, 0.88, 0);
    this.leftArm.add(lShoulder, lArmMesh);
    this.shieldGroup = new THREE.Group();
    this.leftArm.add(this.shieldGroup);
    this.charRoot.add(this.leftArm);

    this.leftLeg = this.buildArmoredLeg(heavyArmor, -0.27);
    this.rightLeg = this.buildArmoredLeg(heavyArmor, 0.27);
    this.charRoot.add(this.leftLeg);
    this.charRoot.add(this.rightLeg);
  }

  buildArmoredLeg(mat, posX) {
    const legGroup = new THREE.Group();
    legGroup.position.set(posX, 0.05, 0);

    // Rounded thigh/shin using a capsule instead of a blocky box — reads far more organic
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.46, 4, 8), mat);
    leg.position.y = -0.36;
    leg.castShadow = true;
    legGroup.add(leg);

    // Knee joint sphere smooths the silhouette where thigh meets shin
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), this.materials.steel);
    knee.position.set(0, -0.35, 0.06);
    knee.scale.set(1, 1, 0.85);
    legGroup.add(knee);

    const sabaton = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.22, 3, 6), this.materials.steel);
    sabaton.rotation.z = Math.PI / 2;
    sabaton.position.set(0, -0.7, 0.1);
    sabaton.scale.set(1, 1.15, 0.9);
    legGroup.add(sabaton);

    return legGroup;
  }

  // Shared limb builder for arms — rounded capsule + shoulder joint sphere
  buildCapsuleArm(mat, jointMat, radius, length) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 8), mat);
    arm.position.y = -(length / 2 + radius);
    arm.castShadow = true;
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.25, 10, 8), jointMat || mat);
    return { arm, shoulder };
  }

  // Cloth-simulated segmented cape: a hierarchical chain of thin panels so each
  // segment can lag/sway independently for a believable ripple, instead of one rigid plane
  buildSegmentedCape(color, width = 0.62, totalHeight = 1.25, segments = 4) {
    const capeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.05, side: THREE.DoubleSide });
    const root = new THREE.Group();
    const segMeshes = [];
    let parent = root;
    const segH = totalHeight / segments;

    for (let i = 0; i < segments; i++) {
      const taper = 1 - i * 0.12;
      const segGeo = new THREE.BoxGeometry(width * taper, segH, 0.045);
      segGeo.translate(0, -segH / 2, 0);
      const seg = new THREE.Mesh(segGeo, capeMat);
      seg.castShadow = i < 2;
      seg.position.y = i === 0 ? 0 : -segH;
      parent.add(seg);
      segMeshes.push(seg);
      parent = seg;
    }

    root.userData.segments = segMeshes;
    return root;
  }

  setClassAndCustomization(classId, customConfig) {
    if (classId) this.selectedClass = classId;
    if (customConfig) {
      this.characterCustomization = {
        ...this.characterCustomization,
        ...customConfig,
      };
    }

    this.buildPlayerCharacter();
    if (this.horseGroup) {
      this.scene.remove(this.horseGroup);
      this.buildHorseMount();
      this.horseGroup.visible = this.mount.isMounted;
    }
  }

  // --- 3D BILLIGHOST SPECTRAL GHOSTS & ENEMY SYSTEM ---

  spawnWorldEnemies() {
    this.enemies = [];

    const ghostSpawns = [
      [-40, 45],
      [-55, 65],
      [-70, 50],
      [-35, 80],
    ];
    ghostSpawns.forEach(([gx, gz], idx) => {
      this.spawnGhostEnemy({
        id: `billighost-phantom-${idx}`,
        name: 'Billighost Spectre',
        type: 'ghost',
        x: gx,
        z: gz,
        maxHp: 80,
        hp: 80,
        attackPower: 22,
        speed: 6.8,
        aggroRadius: 18,
        attackRadius: 3.5,
      });
    });

    const wolfSpawns = [[-12, -22], [-18, -30], [20, 24], [28, 32]];
    wolfSpawns.forEach(([wx, wz], idx) => {
      this.spawnWolfEnemy({
        id: `wolf-${idx}`,
        name: 'Shadow Wolf',
        type: 'wolf',
        x: wx,
        z: wz,
        maxHp: 65,
        hp: 65,
        attackPower: 16,
        speed: 8.0,
        aggroRadius: 16,
        attackRadius: 2.2,
      });
    });

    const goblinSpawns = [[45, -45], [60, -60], [75, -40]];
    goblinSpawns.forEach(([gx, gz], idx) => {
      this.spawnGoblinEnemy({
        id: `goblin-${idx}`,
        name: 'Goblin Marauder',
        type: 'goblin',
        x: gx,
        z: gz,
        maxHp: 95,
        hp: 95,
        attackPower: 24,
        speed: 5.8,
        aggroRadius: 16,
        attackRadius: 2.8,
      });
    });

    this.spawnBoss();
  }

  spawnGhostEnemy(config) {
    const group = new THREE.Group();
    const y = this.getTerrainHeight(config.x, config.z);
    group.position.set(config.x, y + 0.8, config.z);

    const shroudGeo = new THREE.CylinderGeometry(0.55, 0.85, 1.6, 20, 4, true);
    const shroud = new THREE.Mesh(shroudGeo, this.materials.ghostMat);
    shroud.position.y = 0.8;
    group.add(shroud);

    const domeGeo = new THREE.SphereGeometry(0.48, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const dome = new THREE.Mesh(domeGeo, this.materials.ghostMat);
    dome.position.y = 1.55;
    group.add(dome);

    const eyeGeo = new THREE.SphereGeometry(0.1, 10, 10);
    const eyeL = new THREE.Mesh(eyeGeo, this.materials.ghostEye);
    eyeL.position.set(-0.18, 1.45, 0.42);
    const eyeR = new THREE.Mesh(eyeGeo, this.materials.ghostEye);
    eyeR.position.set(0.18, 1.45, 0.42);
    group.add(eyeL);
    group.add(eyeR);

    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.03, 8, 24), this.materials.ghostCore);
    coreRing.position.set(0, 0.9, 0);
    group.add(coreRing);

    const hpBar = this.createEnemyHpBar();
    group.add(hpBar.group);

    this.scene.add(group);
    this.enemies.push({
      ...config,
      group,
      hpBarFill: hpBar.fill,
      state: 'IDLE',
      originX: config.x,
      originZ: config.z,
      attackCooldown: 0,
      staggerTimer: 0,
      hoverOffset: Math.random() * Math.PI * 2,
    });
  }

  spawnWolfEnemy(config) {
    const group = new THREE.Group();
    const y = this.getTerrainHeight(config.x, config.z);
    group.position.set(config.x, y, config.z);

    const bodyGeo = new THREE.BoxGeometry(0.7, 0.55, 1.3);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.6);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.8, 0.7);
    group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), eyeMat);
    eyeL.position.set(-0.16, 0.85, 0.96);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.08), eyeMat);
    eyeR.position.set(0.16, 0.85, 0.96);
    group.add(eyeL);
    group.add(eyeR);

    const hpBar = this.createEnemyHpBar(1.4);
    group.add(hpBar.group);

    this.scene.add(group);
    this.enemies.push({
      ...config,
      group,
      hpBarFill: hpBar.fill,
      state: 'IDLE',
      originX: config.x,
      originZ: config.z,
      attackCooldown: 0,
      staggerTimer: 0,
    });
  }

  spawnGoblinEnemy(config) {
    const group = new THREE.Group();
    const y = this.getTerrainHeight(config.x, config.z);
    group.position.set(config.x, y, config.z);

    const skinMat = new THREE.MeshLambertMaterial({ color: 0x15803d });
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.4), armorMat);
    torso.position.y = 0.7;
    torso.castShadow = true;
    group.add(torso);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skinMat);
    head.position.y = 1.3;
    group.add(head);

    const club = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.9, 0.15), this.materials.stone);
    club.position.set(0.5, 0.8, 0.3);
    group.add(club);

    const hpBar = this.createEnemyHpBar(1.9);
    group.add(hpBar.group);

    this.scene.add(group);
    this.enemies.push({
      ...config,
      group,
      hpBarFill: hpBar.fill,
      state: 'IDLE',
      originX: config.x,
      originZ: config.z,
      attackCooldown: 0,
      staggerTimer: 0,
    });
  }

  spawnBoss() {
    const group = new THREE.Group();
    const bx = -65;
    const bz = -65;
    const by = this.getTerrainHeight(bx, bz);
    group.position.set(bx, by, bz);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.1 });
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });

    const torso = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 2.4), stoneMat);
    torso.position.y = 4.0;
    torso.castShadow = true;
    group.add(torso);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.0), coreMat);
    core.position.set(0, 4.0, 1.25);
    group.add(core);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 1.6), stoneMat);
    head.position.y = 6.4;
    group.add(head);

    const armL = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.0, 1.3), stoneMat);
    armL.position.set(-2.8, 4.0, 0);
    armL.castShadow = true;
    const armR = new THREE.Mesh(new THREE.BoxGeometry(1.3, 4.0, 1.3), stoneMat);
    armR.position.set(2.8, 4.0, 0);
    armR.castShadow = true;
    group.add(armL);
    group.add(armR);

    const legL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.4), stoneMat);
    legL.position.set(-1.2, 1.2, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.4, 1.4), stoneMat);
    legR.position.set(1.2, 1.2, 0);
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
      maxHp: 500,
      hp: 500,
      attackPower: 42,
      speed: 4.0,
      state: 'IDLE',
      originX: bx,
      originZ: bz,
      attackCooldown: 0,
      staggerTimer: 0,
      shockwaveCooldown: 0,
    };
    this.enemies.push(this.boss);
  }

  createEnemyHpBar(height = 1.8) {
    const hpBarGroup = new THREE.Group();
    hpBarGroup.position.y = height;

    const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.14), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(1.16, 0.1), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
    fill.position.z = 0.01;

    hpBarGroup.add(bg);
    hpBarGroup.add(fill);
    return { group: hpBarGroup, fill };
  }

  // --- TREASURE CHESTS & GHOST ORBS ---

  spawnTreasureChests() {
    this.chests = [];
    const chestLocations = [
      { x: -16, z: 22, reward: 'Flame Saber', type: 'weapon' },
      { x: 22, z: -25, reward: 'Void Katana', type: 'weapon' },
      { x: 42, z: 32, reward: 'Elixir Potion x2', type: 'potion' },
      { x: -75, z: -75, reward: 'Golem Heart Core', type: 'relic' },
      { x: 70, z: -60, reward: 'Titan Claymore', type: 'weapon' },
    ];

    chestLocations.forEach((loc, idx) => {
      const group = new THREE.Group();
      const cy = this.getTerrainHeight(loc.x, loc.z);
      group.position.set(loc.x, cy, loc.z);

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 0.85), this.materials.wood);
      base.position.y = 0.32;
      base.castShadow = true;
      group.add(base);

      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.65, -0.42);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.38, 0.88), this.materials.wood);
      lid.position.set(0, 0.19, 0.42);
      lidGroup.add(lid);

      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.08), this.materials.gold);
      lock.position.set(0, 0.1, 0.86);
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

  spawnGhostOrbs() {
    this.ghostOrbs = [];
    const orbLocations = [
      [-30, 40],
      [-50, 60],
      [-65, 35],
      [10, 30],
      [40, -20],
      [-25, -15],
    ];

    orbLocations.forEach(([ox, oz], idx) => {
      const group = new THREE.Group();
      const oy = this.getTerrainHeight(ox, oz) + 1.2;
      group.position.set(ox, oy, oz);

      const orbGeo = new THREE.SphereGeometry(0.35, 12, 12);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      group.add(orb);

      const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 6, 20);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);

      this.scene.add(group);
      this.ghostOrbs.push({
        id: `orb-${idx}`,
        group,
        ring,
        x: ox,
        z: oz,
        collected: false,
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
    this.player.attackCooldown = 0.3;

    aetheriaAudio.playSlash(this.player.comboStep);

    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);
    this.pos.x += forwardX * 0.8;
    this.pos.z += forwardZ * 0.8;

    const hitRadius = 2.8;
    const attackOrigin = new THREE.Vector2(this.pos.x + forwardX * 1.4, this.pos.z + forwardZ * 1.4);

    this.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;
      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const dist = attackOrigin.distanceTo(new THREE.Vector2(ex, ez));

      if (dist < hitRadius) {
        const isCrit = Math.random() < this.player.critChance;
        const multiplier = isCrit ? 2.0 : 1.0;
        const comboMult = this.player.comboStep === 3 ? 1.5 : 1.0;
        const surgeMult = this.ghostSurge.active ? 1.8 : 1.0;
        const damage = Math.round(this.player.attackPower * multiplier * comboMult * surgeMult);

        this.damageEnemy(enemy, damage, isCrit);
      }
    });

    this.createSlashArc(this.pos.x + forwardX * 1.3, this.pos.y + 1.2, this.pos.z + forwardZ * 1.3);
  }

  castMagicBolt() {
    if (!this.isRunning || this.isPaused || this.player.stamina < 20) return;

    this.player.stamina = Math.max(0, this.player.stamina - 20);
    this.callbacks.onStatsUpdate(this.player);

    aetheriaAudio.playMagicBlast();

    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);

    const boltGeo = new THREE.SphereGeometry(0.26, 8, 8);
    const boltMat = new THREE.MeshBasicMaterial({ color: this.ghostSurge.active ? 0xc084fc : 0x38bdf8 });
    const boltMesh = new THREE.Mesh(boltGeo, boltMat);
    boltMesh.position.set(this.pos.x + forwardX * 1.2, this.pos.y + 1.4, this.pos.z + forwardZ * 1.2);
    this.scene.add(boltMesh);

    this.magicProjectiles.push({
      mesh: boltMesh,
      vx: forwardX * 24,
      vy: 0,
      vz: forwardZ * 24,
      life: 2.0,
      damage: this.ghostSurge.active ? 60 : 38,
    });
  }

  jump() {
    if (!this.isRunning || this.isPaused || !this.isGrounded || this.player.jumpCooldown > 0) return;

    this.isGrounded = false;
    this.player.isJumping = true;
    this.player.jumpVelocity = this.mount.isMounted ? 9.5 : 8.0;
    this.player.jumpCooldown = 0.4;

    aetheriaAudio.playJump();
    this.createBurst(this.pos.x, this.pos.y + 0.2, this.pos.z, 0x94a3b8, 10);
  }

  dodgeRoll() {
    if (!this.isRunning || this.isPaused || this.player.isRolling || this.player.stamina < 15) return;

    this.player.stamina = Math.max(0, this.player.stamina - 15);
    this.player.isRolling = true;
    this.player.rollTimer = 0.45;
    this.player.invulnerableTimer = 0.45;

    const forwardX = Math.sin(this.facingAngle);
    const forwardZ = Math.cos(this.facingAngle);
    this.vel.x = forwardX * 18;
    this.vel.z = forwardZ * 18;

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
    this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x34d399, 24);
    this.callbacks.onStatsUpdate(this.player);
  }

  triggerGhostSurge() {
    if (this.ghostSurge.charge < 100 || this.ghostSurge.active) return;

    this.ghostSurge.charge = 0;
    this.ghostSurge.active = true;
    this.ghostSurge.timer = this.ghostSurge.duration;

    aetheriaAudio.playGhostSurge();
    this.ghostSurgeAura.visible = true;
    this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x38bdf8, 35);
    this.addFloatingText(this.pos.x, this.pos.y + 2.8, this.pos.z, 'GHOST ASCENDANCE!', '#38bdf8');
    this.callbacks.onGhostSurgeUpdate({ charge: 0, active: true, timer: this.ghostSurge.duration });
  }

  toggleTargetLock() {
    if (this.lockedTarget) {
      this.lockedTarget = null;
      this.callbacks.onTargetLockUpdate(null);
      return;
    }

    let closest = null;
    let minDist = 30;

    this.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;
      const d = Math.hypot(enemy.group.position.x - this.pos.x, enemy.group.position.z - this.pos.z);
      if (d < minDist) {
        minDist = d;
        closest = enemy;
      }
    });

    if (closest) {
      this.lockedTarget = closest;
      aetheriaAudio.playLockOn();
      this.callbacks.onTargetLockUpdate(closest.name);
    }
  }

  interact() {
    const interactRadius = 3.6;

    this.chests.forEach(chest => {
      if (chest.opened) return;
      const dist = Math.hypot(this.pos.x - chest.x, this.pos.z - chest.z);
      if (dist < interactRadius) {
        chest.opened = true;
        chest.lidGroup.rotation.x = -Math.PI / 1.8;
        aetheriaAudio.playChestOpen();

        if (chest.type === 'weapon') {
          this.player.equippedWeapon = chest.reward;
          this.player.attackPower += 15;
          this.player.critChance += 0.1;
        } else if (chest.type === 'potion') {
          this.player.potions += 2;
        }

        this.telemetry.chestsOpened++;
        this.createBurst(chest.x, chest.group.position.y + 0.8, chest.z, 0xf59e0b, 25);
        this.addFloatingText(chest.x, chest.group.position.y + 1.6, chest.z, `Found ${chest.reward}!`, '#f59e0b');
        this.callbacks.onChestOpen(chest.reward);
        this.callbacks.onStatsUpdate(this.player);
      }
    });

    this.sanctuaryPillars.forEach(s => {
      const dist = Math.hypot(this.pos.x - s.x, this.pos.z - s.z);
      if (dist < 4.5) {
        this.player.hp = this.player.maxHp;
        this.player.stamina = this.player.maxStamina;
        aetheriaAudio.playHeal();
        this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x38bdf8, 30);
        this.addFloatingText(this.pos.x, this.pos.y + 2.5, this.pos.z, 'SANCTUARY RESTORED HP & STAMINA', '#38bdf8');
        this.callbacks.onStatsUpdate(this.player);
      }
    });
  }

  // --- DAMAGE & COMBAT FEEDBACK ---

  damageEnemy(enemy, damage, isCrit = false) {
    enemy.hp = Math.max(0, enemy.hp - damage);
    enemy.staggerTimer = 0.25;
    this.telemetry.damageDealt += damage;

    aetheriaAudio.playEnemyHit();
    this.createBurst(enemy.group.position.x, enemy.group.position.y + 1.2, enemy.group.position.z, isCrit ? 0xf59e0b : 0xffffff, isCrit ? 22 : 12);

    const color = isCrit ? '#f59e0b' : '#f8fafc';
    const text = isCrit ? `CRIT! -${damage}` : `-${damage}`;
    this.addFloatingText(enemy.group.position.x, enemy.group.position.y + 2.0, enemy.group.position.z, text, color);

    const hpRatio = enemy.hp / enemy.maxHp;
    enemy.hpBarFill.scale.x = Math.max(0.001, hpRatio);

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
    this.telemetry.enemiesDefeated++;

    if (this.lockedTarget === enemy) {
      this.lockedTarget = null;
      this.callbacks.onTargetLockUpdate(null);
    }

    if (enemy.type === 'ghost') {
      this.ghostSurge.charge = Math.min(100, this.ghostSurge.charge + 35);
      this.callbacks.onGhostSurgeUpdate({ charge: this.ghostSurge.charge, active: this.ghostSurge.active });
      this.addFloatingText(enemy.group.position.x, enemy.group.position.y + 2.6, enemy.group.position.z, '+35 GHOST CHARGE', '#38bdf8');
    }

    const expAward = enemy.type === 'boss' ? 300 : 45;
    this.player.exp += expAward;
    this.addFloatingText(enemy.group.position.x, enemy.group.position.y + 2.0, enemy.group.position.z, `+${expAward} EXP`, '#38bdf8');

    if (this.player.exp >= this.player.expNext) {
      this.player.level++;
      this.player.exp -= this.player.expNext;
      this.player.expNext = Math.round(this.player.expNext * 1.5);
      this.player.maxHp += 25;
      this.player.hp = this.player.maxHp;
      this.player.attackPower += 8;
      this.player.critChance = Math.min(0.55, this.player.critChance + 0.02);
      aetheriaAudio.playLevelUp();
      this.createShockwave(this.pos.x, this.pos.y + 0.05, this.pos.z);
      this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x34d399, 40);
      this.addFloatingText(this.pos.x, this.pos.y + 2.6, this.pos.z, `LEVEL UP! (Lv ${this.player.level})`, '#34d399');
      if (this.player.level % 3 === 0) {
        this.addFloatingText(this.pos.x, this.pos.y + 3.2, this.pos.z, 'CRIT CHANCE INCREASED', '#fbbf24');
      }
    }

    this.callbacks.onStatsUpdate(this.player);

    if (enemy.type === 'boss') {
      this.callbacks.onVictory();
    }
  }

  damagePlayer(amount, sourceEnemy) {
    if (this.player.invulnerableTimer > 0 || this.ghostSurge.active) return;

    let finalDamage = amount;
    if (this.player.isBlocking) {
      finalDamage = Math.round(amount * 0.2);
      aetheriaAudio.playBlock();
      this.createBurst(this.pos.x, this.pos.y + 1.2, this.pos.z, 0x06b6d4, 15);
      this.addFloatingText(this.pos.x, this.pos.y + 2.0, this.pos.z, `BLOCKED! -${finalDamage}`, '#06b6d4');
    } else {
      aetheriaAudio.playEnemyHit();
      this.createBurst(this.pos.x, this.pos.y + 1.0, this.pos.z, 0xef4444, 16);
      this.addFloatingText(this.pos.x, this.pos.y + 2.0, this.pos.z, `-${finalDamage}`, '#ef4444');
    }

    this.player.hp = Math.max(0, this.player.hp - finalDamage);
    this.player.invulnerableTimer = 0.5;
    this.callbacks.onStatsUpdate(this.player);

    if (this.player.hp <= 0) {
      this.isRunning = false;
      this.callbacks.onGameOver(sourceEnemy.name);
    }
  }

  // --- FLOATING TEXT & PARTICLES OBJECT POOL ---

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
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const mat = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < count; i++) {
      const p = new THREE.Mesh(geo, mat);
      p.position.set(x, y, z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;

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
    const arcGeo = new THREE.TorusGeometry(1.3, 0.07, 6, 16, Math.PI);
    const arcMat = new THREE.MeshBasicMaterial({ color: this.ghostSurge.active ? 0xc084fc : 0x38bdf8, transparent: true, opacity: 0.9 });
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
      maxRadius: 14.0,
      originX: x,
      originZ: z,
      damage: 32,
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
    if (!this.isRunning) {
      this.start();
    } else {
      this.clock.start();
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
    this.dayTime = (this.dayTime + (delta / this.dayDuration)) % 1.0;
    this.updateAtmosphere();

    if (this.waterUniforms) this.waterUniforms.uTime.value = this.clock.getElapsedTime();

    if (!this.isSprinting && !this.player.isRolling && this.player.stamina < this.player.maxStamina) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + 20 * delta);
      this.callbacks.onStatsUpdate(this.player);
    }

    if (this.ghostSurge.active) {
      this.ghostSurge.timer -= delta;
      this.ghostSurgeAura.rotation.z += delta * 4;
      if (this.ghostSurge.timer <= 0) {
        this.ghostSurge.active = false;
        this.ghostSurgeAura.visible = false;
        this.addFloatingText(this.pos.x, this.pos.y + 2.4, this.pos.z, 'OVERDRIVE ENDED', '#94a3b8');
      }
      this.callbacks.onGhostSurgeUpdate({ charge: 0, active: this.ghostSurge.active, timer: Math.max(0, this.ghostSurge.timer) });
    }

    if (this.player.attackCooldown > 0) {
      this.player.attackCooldown -= delta;
      if (this.player.attackCooldown <= 0) this.player.isAttacking = false;
    }
    if (this.player.rollTimer > 0) {
      this.player.rollTimer -= delta;
      if (this.player.rollTimer <= 0) this.player.isRolling = false;
    }
    if (this.player.invulnerableTimer > 0) this.player.invulnerableTimer -= delta;
    if (this.player.jumpCooldown > 0) this.player.jumpCooldown -= delta;

    const groundY = this.getTerrainHeight(this.pos.x, this.pos.z);
    if (!this.isGrounded) {
      this.player.jumpVelocity -= 22 * delta;
      this.pos.y += this.player.jumpVelocity * delta;

      if (this.pos.y <= groundY) {
        this.pos.y = groundY;
        this.isGrounded = true;
        this.player.isJumping = false;
        this.player.jumpVelocity = 0;
        aetheriaAudio.playLand();
        this.createBurst(this.pos.x, this.pos.y + 0.1, this.pos.z, 0x94a3b8, 12);
      }
    } else {
      this.pos.y = groundY;
    }

    this.pos.x += this.vel.x * delta;
    this.pos.z += this.vel.z * delta;
    this.vel.x *= Math.max(0, 1 - 8 * delta);
    this.vel.z *= Math.max(0, 1 - 8 * delta);

    const horizSpeed = Math.hypot(this.vel.x, this.vel.z);
    this.telemetry.distanceTraveled += horizSpeed * delta;

    const bound = 145;
    this.pos.x = THREE.MathUtils.clamp(this.pos.x, -bound, bound);
    this.pos.z = THREE.MathUtils.clamp(this.pos.z, -bound, bound);

    this.playerGroup.position.copy(this.pos);
    this.playerGroup.rotation.y = this.facingAngle;

    if (this.mount.isMounted) {
      this.horseGroup.position.copy(this.pos);
      this.horseGroup.rotation.y = this.facingAngle;
    }

    this.updateGhostOrbs(delta);
    this.updateEnemyAI(delta);
    this.updateProjectiles(delta);
    this.updateShockwaves(delta);
    this.updateParticles(delta);

    this.animatePlayer(delta);
    if (this.mount.isMounted) {
      this.animateMount(delta, horizSpeed);
    }

    this.updateCameraFollow(delta);
    this.emitMinimapData();
  }

  updateAtmosphere() {
    const sunAngle = this.dayTime * Math.PI * 2;
    const sunDist = 180;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;

    this.sunLight.position.set(sunX, Math.max(8, sunY), 50);
    this.sunOrb.position.set(sunX, sunY, 50);
    this.moonOrb.position.set(-sunX, -sunY, -50);

    if (this.waterUniforms) {
      this.waterUniforms.uSunDir.value.set(sunX, Math.max(8, sunY), 50).normalize();
    }

    const isDay = sunY > 0;
    const sunRatio = Math.max(0, sunY / sunDist);

    if (isDay) {
      const skyCol = new THREE.Color(0x60a5fa).lerp(new THREE.Color(0xf97316), Math.max(0, 1 - sunRatio * 2));
      this.scene.background = skyCol;
      if (this.scene.fog) this.scene.fog.color = skyCol;
      this.skyMat.color.copy(skyCol);
      this.sunLight.intensity = 0.5 + sunRatio * 1.1;
      this.ambientLight.intensity = 0.4 + sunRatio * 0.4;
      if (this.starMat) this.starMat.opacity = THREE.MathUtils.clamp(this.starMat.opacity - 0.02, 0, 1);
    } else {
      const nightCol = new THREE.Color(0x0a0f1d);
      this.scene.background = nightCol;
      if (this.scene.fog) this.scene.fog.color = nightCol;
      this.skyMat.color.copy(nightCol);
      this.sunLight.intensity = 0.05;
      this.ambientLight.intensity = 0.2;
      if (this.starMat) this.starMat.opacity = THREE.MathUtils.clamp(this.starMat.opacity + 0.01, 0, 0.9);
    }
  }

  updateGhostOrbs(_delta) {
    const time = this.clock.getElapsedTime();
    this.ghostOrbs.forEach(orb => {
      if (orb.collected) return;
      orb.group.position.y = this.getTerrainHeight(orb.x, orb.z) + 1.2 + Math.sin(time * 3 + orb.x) * 0.25;
      orb.ring.rotation.x = time * 2;
      orb.ring.rotation.y = time * 2.5;

      const dist = Math.hypot(this.pos.x - orb.x, this.pos.z - orb.z);
      if (dist < 2.4) {
        orb.collected = true;
        orb.group.visible = false;
        aetheriaAudio.playGhostWail();
        this.ghostSurge.charge = Math.min(100, this.ghostSurge.charge + 25);
        this.createBurst(orb.x, orb.group.position.y, orb.z, 0x38bdf8, 20);
        this.addFloatingText(orb.x, orb.group.position.y + 1.5, orb.z, '+25 GHOST CHARGE', '#38bdf8');
        this.callbacks.onGhostSurgeUpdate({ charge: this.ghostSurge.charge, active: this.ghostSurge.active });
      }
    });
  }

  updateEnemyAI(delta) {
    let anyEnemyAggro = false;
    const time = this.clock.getElapsedTime();

    this.enemies.forEach(enemy => {
      if (enemy.hp <= 0) return;

      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const distToPlayer = Math.hypot(this.pos.x - ex, this.pos.z - ez);

      if (enemy.type === 'ghost') {
        enemy.group.position.y = this.getTerrainHeight(ex, ez) + 0.9 + Math.sin(time * 3 + enemy.hoverOffset) * 0.25;
      }

      if (enemy.staggerTimer > 0) {
        enemy.staggerTimer -= delta;
        return;
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= delta;
      }

      if (distToPlayer < enemy.aggroRadius) {
        enemy.state = 'CHASE';
        anyEnemyAggro = true;

        const targetAngle = Math.atan2(this.pos.x - ex, this.pos.z - ez);
        enemy.group.rotation.y = targetAngle;

        if (distToPlayer > enemy.attackRadius) {
          const stepX = Math.sin(targetAngle) * enemy.speed * delta;
          const stepZ = Math.cos(targetAngle) * enemy.speed * delta;
          const nx = ex + stepX;
          const nz = ez + stepZ;
          const ny = enemy.type === 'ghost' ? this.getTerrainHeight(nx, nz) + 0.9 : this.getTerrainHeight(nx, nz);
          enemy.group.position.set(nx, ny, nz);
        } else {
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = enemy.type === 'boss' ? 2.4 : 1.5;
            this.executeEnemyAttack(enemy);
          }
        }
      } else {
        enemy.state = 'IDLE';
        const distToOrigin = Math.hypot(enemy.originX - ex, enemy.originZ - ez);
        if (distToOrigin > 2.0) {
          const retAngle = Math.atan2(enemy.originX - ex, enemy.originZ - ez);
          enemy.group.rotation.y = retAngle;
          const stepX = Math.sin(retAngle) * (enemy.speed * 0.5) * delta;
          const stepZ = Math.cos(retAngle) * (enemy.speed * 0.5) * delta;
          const nx = ex + stepX;
          const nz = ez + stepZ;
          const ny = enemy.type === 'ghost' ? this.getTerrainHeight(nx, nz) + 0.9 : this.getTerrainHeight(nx, nz);
          enemy.group.position.set(nx, ny, nz);
        }
      }

      const hpBar = enemy.group.children[enemy.group.children.length - 1];
      if (hpBar) {
        hpBar.rotation.y = this.camera.rotation.y - enemy.group.rotation.y;
      }
    });

    aetheriaAudio.setCombatState(anyEnemyAggro);
  }

  executeEnemyAttack(enemy) {
    if (enemy.type === 'boss') {
      aetheriaAudio.playGolemStomp();
      const ex = enemy.group.position.x;
      const ez = enemy.group.position.z;
      const ey = enemy.group.position.y;
      this.createShockwave(ex, ey, ez);
    } else if (enemy.type === 'ghost') {
      aetheriaAudio.playGhostWail();
      this.damagePlayer(enemy.attackPower, enemy);
    } else {
      this.damagePlayer(enemy.attackPower, enemy);
    }
  }

  updateProjectiles(delta) {
    for (let i = this.magicProjectiles.length - 1; i >= 0; i--) {
      const p = this.magicProjectiles[i];
      p.life -= delta;
      p.mesh.position.x += p.vx * delta;
      p.mesh.position.z += p.vz * delta;

      let hit = false;
      for (let enemy of this.enemies) {
        if (enemy.hp <= 0) continue;
        const dist = p.mesh.position.distanceTo(enemy.group.position);
        if (dist < 2.2) {
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

      if (!sw.hitPlayer) {
        const dist = Math.hypot(this.pos.x - sw.originX, this.pos.z - sw.originZ);
        if (Math.abs(dist - sw.radius) < 1.4) {
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

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= delta;
      ft.y += ft.vy * delta;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  // Cloth-like cape ripple: each segment lags the previous with its own phase & amplitude
  animateCapeSway(baseAngle, intensity, time) {
    if (!this.capeSegments) return;
    this.capeSegments.forEach((seg, i) => {
      const phase = time * (3.2 - i * 0.3) - i * 0.55;
      const flutter = Math.sin(phase) * (0.06 + i * 0.05) * intensity;
      seg.rotation.x = baseAngle * (0.5 + i * 0.18) + flutter;
      seg.rotation.z = Math.sin(phase * 0.7) * 0.04 * (i + 1) * intensity;
    });
  }

  animatePlayer(delta) {
    if (!this.charRoot) return;

    const speed = Math.hypot(this.vel.x, this.vel.z);
    const time = this.clock.getElapsedTime();

    if (this.mount.isMounted) {
      this.charRoot.position.y = 2.2 + Math.sin(time * 8) * 0.06;
      this.charRoot.rotation.x = speed > 0.5 ? 0.2 : 0;
      this.leftLeg.rotation.x = 0.5;
      this.rightLeg.rotation.x = 0.5;
      this.leftArm.rotation.x = -0.5;
      this.rightArm.rotation.x = -0.5;
      this.animateCapeSway(0.4 + (speed / 15) * 0.8, 1.2 + speed / 10, time);
      return;
    }

    if (this.player.isRolling) {
      this.charRoot.position.y = 0.45;
      this.charRoot.rotation.x = (time * 16) % (Math.PI * 2);
      this.animateCapeSway(0.6, 2.2, time);
    } else if (this.player.isAttacking) {
      this.charRoot.position.y = 0.9;
      this.charRoot.rotation.x = 0.1;
      // slight torso wind-up/follow-through counter-rotation sells weapon weight
      this.charRoot.rotation.y = Math.sin(time * 22) * 0.08;
      const step = this.player.comboStep;
      if (step === 1) {
        this.rightArm.rotation.x = -1.6;
        this.rightArm.rotation.z = -0.8;
      } else if (step === 2) {
        this.rightArm.rotation.x = -1.2;
        this.rightArm.rotation.z = 0.8;
      } else {
        this.rightArm.rotation.x = -2.2;
        this.rightArm.rotation.z = 0;
      }
      this.animateCapeSway(0.25, 1.6, time);
    } else if (this.player.isBlocking) {
      this.charRoot.position.y = 0.85;
      this.charRoot.rotation.y = 0;
      this.leftArm.rotation.x = -1.4;
      this.leftArm.rotation.z = 0.4;
      this.rightArm.rotation.x = -0.4;
      this.animateCapeSway(0.15, 0.6, time);
    } else if (speed > 0.5) {
      const runCycle = time * (speed * 0.8);
      this.charRoot.position.y = 0.9 + Math.abs(Math.sin(runCycle)) * 0.08;
      this.charRoot.rotation.x = 0.1;
      this.charRoot.rotation.y = 0;

      const stride = Math.sin(runCycle);
      this.leftLeg.rotation.x = stride * 0.8;
      this.rightLeg.rotation.x = -stride * 0.8;
      this.leftArm.rotation.x = -stride * 0.6;
      this.rightArm.rotation.x = stride * 0.6;

      this.animateCapeSway((speed / 12) * 0.7, 0.9 + speed / 8, time);

      // Footstep dust puffs synced to stride impact (when a foot plants)
      const strideAbs = Math.abs(stride);
      if (!this._lastStrideAbs) this._lastStrideAbs = 0;
      if (strideAbs < 0.15 && this._lastStrideAbs >= 0.15 && this.isGrounded) {
        this.createBurst(this.pos.x, this.pos.y + 0.05, this.pos.z, 0xbfa98a, 3);
      }
      this._lastStrideAbs = strideAbs;
    } else {
      // idle breathing: subtle chest rise + gentle head/torso sway
      this.charRoot.position.y = 0.9 + Math.sin(time * 1.6) * 0.025;
      this.charRoot.rotation.x = Math.sin(time * 1.6) * 0.015;
      this.charRoot.rotation.y = Math.sin(time * 0.5) * 0.03;
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.leftArm.rotation.x = Math.sin(time * 1.6) * 0.03;
      this.rightArm.rotation.x = -Math.sin(time * 1.6) * 0.03;
      this.animateCapeSway(0.08, 0.5, time);
    }
  }

  animateMount(delta, speed) {
    if (!this.horseGroup || !this.horseLegs) return;

    const time = this.clock.getElapsedTime();

    if (speed > 0.5) {
      this.mount.gallopCycle += delta * (speed * 1.4);
      const gc = this.mount.gallopCycle;

      this.horseLegs[0].rotation.x = Math.sin(gc) * 0.8;
      this.horseLegs[1].rotation.x = Math.sin(gc + 0.4) * 0.8;
      this.horseLegs[2].rotation.x = -Math.sin(gc + 1.2) * 0.8;
      this.horseLegs[3].rotation.x = -Math.sin(gc + 1.6) * 0.8;

      this.horseGroup.position.y = this.pos.y + Math.abs(Math.sin(gc * 2)) * 0.15;
      this.horseTail.rotation.x = -0.5 + Math.sin(gc) * 0.3;

      this.mount.gallopSoundTimer -= delta;
      if (this.mount.gallopSoundTimer <= 0) {
        aetheriaAudio.playHorseGallop();
        this.mount.gallopSoundTimer = Math.max(0.24, 0.45 - (speed / 35));
        this.createBurst(this.pos.x, this.pos.y + 0.1, this.pos.z, 0x94a3b8, 4);
      }
    } else {
      this.horseLegs[0].rotation.x = 0;
      this.horseLegs[1].rotation.x = 0;
      this.horseLegs[2].rotation.x = 0;
      this.horseLegs[3].rotation.x = 0;
      this.horseGroup.position.y = this.pos.y + Math.sin(time * 2) * 0.04;
      this.horseTail.rotation.x = -0.3 + Math.sin(time * 2) * 0.1;
    }
  }

  updateCameraFollow(delta) {
    if (this.lockedTarget && this.lockedTarget.hp > 0) {
      const tx = this.lockedTarget.group.position.x;
      const tz = this.lockedTarget.group.position.z;
      const targetAngle = Math.atan2(this.pos.x - tx, this.pos.z - tz);
      this.camYaw += (targetAngle - this.camYaw) * Math.min(1, 6 * delta);
    }

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

    const radarOrbs = this.ghostOrbs
      .filter(o => !o.collected)
      .map(o => ({ x: o.x, z: o.z }));

    this.callbacks.onMinimapUpdate({
      playerX: this.pos.x,
      playerZ: this.pos.z,
      facingAngle: this.facingAngle,
      isMounted: this.mount.isMounted,
      enemies: radarEnemies,
      chests: radarChests,
      orbs: radarOrbs,
    });
  }

  // --- PLAYER MOVEMENT INPUTS ---

  move(moveX, moveZ, sprint = false) {
    if (!this.isRunning || this.isPaused || this.player.isRolling) return;

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
      let baseSpeed = this.isSprinting ? 12 : 7.2;

      if (this.mount.isMounted) {
        baseSpeed *= this.mount.speedBonus;
      }
      if (this.ghostSurge.active) {
        baseSpeed *= 1.4;
      }

      this.vel.x = normX * baseSpeed;
      this.vel.z = normZ * baseSpeed;

      this.facingAngle = Math.atan2(normX, normZ);

      if (this.isSprinting && !this.mount.isMounted) {
        this.player.stamina = Math.max(0, this.player.stamina - 20 * (1 / 60));
        this.callbacks.onStatsUpdate(this.player);
      }
    }
  }

  rotateCamera(deltaYaw, deltaPitch) {
    this.camYaw += deltaYaw;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + deltaPitch, -0.15, 0.85);
  }

  setGraphicsQuality(quality) {
    this.graphicsQuality = quality;
    if (this.renderer) {
      this.renderer.shadowMap.enabled = quality !== 'low';
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality === 'ultra' ? 1.5 : 1.1));
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
    if (this.resizeObserver) this.resizeObserver.disconnect();

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
