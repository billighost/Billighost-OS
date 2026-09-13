/**
 * VoidStrike 3D — 3D Starfighter Space Combat & Dogfight Simulator 2.0
 * Billighost OS High-Polish Experience
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VoidStrikeEngine } from '../services/games/VoidStrikeEngine';
import { voidStrikeAudio } from '../services/games/VoidStrikeAudio';
import {
  RocketIcon,
  CrosshairIcon,
  ShieldIcon,
  FlameIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  RotateCcwIcon,
  TrophyIcon,
  SkullIcon,
  SparklesIcon,
  CameraIcon,
  GhostIcon,
  TargetLockIcon,
  ZapIcon,
} from '../components/Icons';
import styles from './VoidStrikeApp.module.css';

// Starfighters Roster
const SHIPS = [
  {
    id: 'apex',
    name: 'APEX-X',
    class: 'Ghost Interceptor',
    desc: 'Flagship starfighter with balanced delta wings and high agility.',
    speed: 85,
    hull: 100,
    shield: 100,
    turn: 90,
  },
  {
    id: 'wraith',
    name: 'WRAITH-V',
    class: 'Stealth Infiltrator',
    desc: 'Forward-swept dark-matter wings with superior top-end afterburner velocity.',
    speed: 100,
    hull: 80,
    shield: 90,
    turn: 95,
  },
  {
    id: 'titan',
    name: 'TITAN-IX',
    class: 'Armored Dreadnought',
    desc: 'Twin-keel catamaran battlecruiser with massive reinforced hull and shield capacitors.',
    speed: 65,
    hull: 160,
    shield: 150,
    turn: 60,
  },
  {
    id: 'chrono',
    name: 'CHRONO-7',
    class: 'Quantum Racer',
    desc: 'Tri-wing hyper-maneuverable interceptor with high-cycle plasma rotary blasters.',
    speed: 95,
    hull: 85,
    shield: 85,
    turn: 100,
  },
  {
    id: 'valkyrie',
    name: 'VALKYRIE-OS',
    class: 'Spec-Ops Prototype',
    desc: 'Spectral-tuned prototype vessel engineered with enhanced Ghost Surge affinity.',
    speed: 90,
    hull: 110,
    shield: 120,
    turn: 85,
  },
];

// Ace Pilots Roster
const PILOTS = [
  {
    id: 'billi',
    name: 'Billi',
    callsign: 'Spectral Ghost',
    perk: '+25% Ghost Surge & Spectral Shielding',
  },
  {
    id: 'dash',
    name: 'Capt. Dash',
    callsign: 'Apex Vanguard',
    perk: '+15% Plasma Bolt Velocity & Damage',
  },
  {
    id: 'nova',
    name: 'Cmdr. Nova',
    callsign: 'Cyber Ninja',
    perk: '+25% Shield Regeneration Rate',
  },
  {
    id: 'pulse',
    name: 'Ens. Pulse',
    callsign: 'Synth Outrunner',
    perk: '+35% Boost Energy & Afterburner Speed',
  },
  {
    id: 'zero',
    name: 'Shadow Zero',
    callsign: 'Black Ops',
    perk: '+2 Torpedoes & Longer Roll Dodge',
  },
];

// Color Customization Palettes
const HULL_COLORS = [
  { name: 'Billighost Cyan', hex: 0x0284c7, css: '#0284c7' },
  { name: 'Midnight Obsidian', hex: 0x0f172a, css: '#0f172a' },
  { name: 'Solar Flare Gold', hex: 0xd97706, css: '#d97706' },
  { name: 'Cyberpunk Neon', hex: 0xdb2777, css: '#db2777' },
  { name: 'Ghost White', hex: 0xe2e8f0, css: '#e2e8f0' },
];

const LASER_COLORS = [
  { name: 'Cyan Plasma', hex: 0x38bdf8, css: '#38bdf8' },
  { name: 'Emerald Quantum', hex: 0x10b981, css: '#10b981' },
  { name: 'Crimson Laser', hex: 0xef4444, css: '#ef4444' },
  { name: 'Violet Void', hex: 0xa855f7, css: '#a855f7' },
  { name: 'Amber Star', hex: 0xf59e0b, css: '#f59e0b' },
];

export default function VoidStrikeApp({ playClick = () => {} }) {
  const canvasRef = useRef(null);
  const radarCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const flightLoopRef = useRef(null);
  const keysRef = useRef({});

  // Game UI State
  const [gameState, setGameState] = useState('start'); // 'start' | 'playing' | 'paused' | 'gameover' | 'victory'
  const [isMuted, setIsMuted] = useState(false);
  const [cameraMode, setCameraMode] = useState('chase');

  // Customization State
  const [activeShip, setActiveShip] = useState('apex');
  const [activePilot, setActivePilot] = useState('billi');
  const [activeHullColor, setActiveHullColor] = useState(HULL_COLORS[0]);
  const [activeLaserColor, setActiveLaserColor] = useState(LASER_COLORS[0]);
  const [hangarTab, setHangarTab] = useState('ships'); // 'ships' | 'pilots' | 'paint'

  // Player Telemetry State
  const [playerStats, setPlayerStats] = useState({
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    boostEnergy: 100,
    maxBoostEnergy: 100,
    speed: 35,
    cruiseSpeed: 35,
    boostSpeed: 75,
    missiles: 6,
    score: 0,
    wave: 1,
    ghostSurgeCharge: 0,
    ghostSurgeActive: false,
    ghostSurgeTimer: 0,
    ghostTokensCollected: 0,
  });

  // Combo Streak & Near Miss Alerts
  const [comboMultiplier, setComboMultiplier] = useState(1);
  const [nearMissAlert, setNearMissAlert] = useState(false);

  // Boss Dreadnought Stats
  const [bossData, setBossData] = useState({
    active: false,
    hp: 650,
    maxHp: 650,
    phase: 1,
  });

  // Target Lock-On State
  const [targetLock, setTargetLock] = useState({
    hasTarget: false,
    isLocked: false,
    progress: 0,
    distance: 0,
  });

  // Virtual Joystick Flight Stick
  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    pitch: 0,
    yaw: 0,
  });
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });

  // Mouse Flight Steering
  const mouseSteerRef = useRef({
    isDown: false,
    lastX: 0,
    lastY: 0,
    pitch: 0,
    yaw: 0,
  });

  // Initialize Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new VoidStrikeEngine(canvasRef.current, {
      onStatsUpdate: (stats) => {
        setPlayerStats({
          hull: Math.round(stats.hull),
          maxHull: stats.maxHull,
          shield: Math.round(stats.shield),
          maxShield: stats.maxShield,
          boostEnergy: Math.round(stats.boostEnergy),
          maxBoostEnergy: stats.maxBoostEnergy,
          speed: Math.round(stats.speed),
          cruiseSpeed: stats.cruiseSpeed,
          boostSpeed: stats.boostSpeed,
          missiles: stats.missiles,
          score: stats.score,
          wave: stats.wave,
          ghostSurgeCharge: Math.round(stats.ghostSurgeCharge),
          ghostSurgeActive: stats.ghostSurgeActive,
          ghostSurgeTimer: stats.ghostSurgeTimer,
          ghostTokensCollected: stats.ghostTokensCollected,
        });
      },
      onRadarUpdate: (radar) => {
        drawRadar(radar);
      },
      onLockUpdate: (lock) => {
        setTargetLock(lock);
      },
      onBossUpdate: (hp, maxHp, phase) => {
        setBossData({
          active: hp > 0,
          hp: Math.max(0, hp),
          maxHp,
          phase,
        });
      },
      onNearMiss: () => {
        setNearMissAlert(true);
        setTimeout(() => setNearMissAlert(false), 1200);
      },
      onComboUpdate: (multiplier) => {
        setComboMultiplier(multiplier);
      },
      onGhostSurgeUpdate: (active, timer) => {
        setPlayerStats((prev) => ({
          ...prev,
          ghostSurgeActive: active,
          ghostSurgeTimer: timer,
        }));
      },
      onGameOver: () => {
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    // Start in interactive turntable preview mode for the Hangar
    engine.enableTurntableMode(true);
    engineRef.current = engine;

    return () => {
      if (flightLoopRef.current) cancelAnimationFrame(flightLoopRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Update engine when user changes ship or colors in Hangar
  const handleSelectShip = (shipId) => {
    playClick();
    setActiveShip(shipId);
    engineRef.current?.setStarfighter(shipId);
  };

  const handleSelectPilot = (pilotId) => {
    playClick();
    setActivePilot(pilotId);
    engineRef.current?.setPilot(pilotId);
  };

  const handleSelectHullColor = (color) => {
    playClick();
    setActiveHullColor(color);
    engineRef.current?.setCustomColors({ hull: color.hex });
  };

  const handleSelectLaserColor = (color) => {
    playClick();
    setActiveLaserColor(color);
    engineRef.current?.setCustomColors({ laser: color.hex });
  };

  // 3D Tactical Radar Drawing with Ghosts
  const drawRadar = (radar) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarRange = 180;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);

    // Concentric range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (cx - 2) * 0.45, 0, Math.PI * 2);
    ctx.arc(cx, cy, (cx - 2) * 0.85, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshair axis
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw Asteroids
    if (radar.asteroids) {
      ctx.fillStyle = '#64748b';
      radar.asteroids.forEach((ast) => {
        const rx = cx + (ast.x / radarRange) * (cx - 6);
        const rz = cy + (ast.z / radarRange) * (cy - 6);
        const dist = Math.hypot(ast.x, ast.z);
        if (dist < radarRange) {
          ctx.beginPath();
          ctx.arc(rx, rz, 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Enemies & Billighost Spectral Ghosts
    if (radar.enemies) {
      radar.enemies.forEach((enemy) => {
        const rx = cx + (enemy.x / radarRange) * (cx - 6);
        const rz = cy + (enemy.z / radarRange) * (cy - 6);
        const dist = Math.hypot(enemy.x, enemy.z);
        if (dist < radarRange) {
          if (enemy.type === 'ghost') {
            ctx.fillStyle = '#38bdf8'; // Cyan spectral ghost dot
            ctx.beginPath();
            ctx.arc(rx, rz, 3.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (enemy.type === 'gunship') {
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(rx, rz, 3.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rx, rz, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Draw Boss Dreadnought
    if (radar.boss) {
      const bx = cx + (radar.boss.x / radarRange) * (cx - 8);
      const bz = cy + (radar.boss.z / radarRange) * (cy - 8);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(bx, bz, 5.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Player Starfighter at Center
    ctx.fillStyle = playerStats.ghostSurgeActive ? '#38bdf8' : '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 4);
    ctx.lineTo(cx - 3, cy + 3);
    ctx.lineTo(cx, cy + 1);
    ctx.lineTo(cx + 3, cy + 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Continuous Flight & Steering Input Loop
  useEffect(() => {
    const updateFlight = () => {
      if (engineRef.current && gameState === 'playing') {
        const keys = keysRef.current;
        let pitch = 0;
        let yaw = 0;
        let roll = 0;

        if (keys['KeyW'] || keys['ArrowUp']) pitch -= 1.0;
        if (keys['KeyS'] || keys['ArrowDown']) pitch += 1.0;
        if (keys['KeyA'] || keys['ArrowLeft']) roll -= 1.5;
        if (keys['KeyD'] || keys['ArrowRight']) roll += 1.5;
        if (keys['KeyQ']) yaw -= 1.0;
        if (keys['KeyE']) yaw += 1.0;

        const mouse = mouseSteerRef.current;
        if (mouse.isDown) {
          pitch += mouse.pitch;
          yaw += mouse.yaw;
        }

        const joy = joystickRef.current;
        if (joy.active) {
          yaw += joy.yaw * 1.5;
          pitch += joy.pitch * 1.5;
        }

        engineRef.current.setPitch(pitch);
        engineRef.current.setYaw(yaw);
        engineRef.current.setRoll(roll);

        const isBoost = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
        engineRef.current.setBoost(isBoost);

        if (keys['Space']) {
          engineRef.current.firePlasmaCannons();
        }
      }
      flightLoopRef.current = requestAnimationFrame(updateFlight);
    };

    flightLoopRef.current = requestAnimationFrame(updateFlight);
    return () => {
      if (flightLoopRef.current) cancelAnimationFrame(flightLoopRef.current);
    };
  }, [gameState]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      keysRef.current[e.code] = true;

      if (gameState !== 'playing') {
        if (e.code === 'Space' && gameState === 'start') {
          handleStartGame();
        }
        return;
      }

      if (e.code === 'KeyF') {
        engineRef.current?.fireHomingTorpedo();
      } else if (e.code === 'KeyC') {
        engineRef.current?.barrelRoll();
      } else if (e.code === 'KeyG') {
        // Trigger Ghost Surge Overdrive
        engineRef.current?.triggerGhostSurge();
      } else if (e.code === 'KeyV') {
        engineRef.current?.toggleCameraMode();
        setCameraMode((prev) => (prev === 'chase' ? 'cockpit' : 'chase'));
      } else if (e.code === 'Escape') {
        handleTogglePause();
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        engineRef.current?.setBoost(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  // Mouse Flight Steering Handlers
  const handlePointerDown = (e) => {
    if (gameState !== 'playing') return;
    if (e.button === 0) {
      engineRef.current?.firePlasmaCannons();
    } else if (e.button === 2) {
      engineRef.current?.fireHomingTorpedo();
    }

    mouseSteerRef.current.isDown = true;
    mouseSteerRef.current.lastX = e.clientX;
    mouseSteerRef.current.lastY = e.clientY;
  };

  const handlePointerMove = (e) => {
    if (!mouseSteerRef.current.isDown || !engineRef.current) return;
    const deltaX = e.clientX - mouseSteerRef.current.lastX;
    const deltaY = e.clientY - mouseSteerRef.current.lastY;

    mouseSteerRef.current.lastX = e.clientX;
    mouseSteerRef.current.lastY = e.clientY;

    mouseSteerRef.current.yaw = deltaX * 0.05;
    mouseSteerRef.current.pitch = deltaY * 0.05;
  };

  const handlePointerUp = () => {
    mouseSteerRef.current.isDown = false;
    mouseSteerRef.current.yaw = 0;
    mouseSteerRef.current.pitch = 0;
  };

  // Virtual Flight Stick Handlers
  const handleJoyStart = (e) => {
    const touch = e.touches ? e.touches[0] : e;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    joystickRef.current = {
      active: true,
      startX: cx,
      startY: cy,
      pitch: 0,
      yaw: 0,
    };
  };

  const handleJoyMove = (e) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches ? e.touches[0] : e;
    const dx = touch.clientX - joystickRef.current.startX;
    const dy = touch.clientY - joystickRef.current.startY;
    const dist = Math.hypot(dx, dy);
    const maxRadius = 32;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * clampedDist;
    const cy = Math.sin(angle) * clampedDist;

    setThumbPos({ x: cx, y: cy });
    joystickRef.current.yaw = cx / maxRadius;
    joystickRef.current.pitch = cy / maxRadius;
  };

  const handleJoyEnd = () => {
    joystickRef.current.active = false;
    joystickRef.current.yaw = 0;
    joystickRef.current.pitch = 0;
    setThumbPos({ x: 0, y: 0 });
  };

  // Button Actions
  const handleStartGame = () => {
    playClick();
    voidStrikeAudio.ensureContext();
    engineRef.current?.start();
    setGameState('playing');
  };

  const handleTogglePause = () => {
    playClick();
    if (gameState === 'playing') {
      engineRef.current?.pause();
      setGameState('paused');
    } else if (gameState === 'paused') {
      engineRef.current?.resume();
      setGameState('playing');
    }
  };

  const handleRestart = () => {
    playClick();
    engineRef.current?.destroy();

    const engine = new VoidStrikeEngine(canvasRef.current, {
      onStatsUpdate: (stats) => {
        setPlayerStats({
          hull: Math.round(stats.hull),
          maxHull: stats.maxHull,
          shield: Math.round(stats.shield),
          maxShield: stats.maxShield,
          boostEnergy: Math.round(stats.boostEnergy),
          maxBoostEnergy: stats.maxBoostEnergy,
          speed: Math.round(stats.speed),
          cruiseSpeed: stats.cruiseSpeed,
          boostSpeed: stats.boostSpeed,
          missiles: stats.missiles,
          score: stats.score,
          wave: stats.wave,
          ghostSurgeCharge: Math.round(stats.ghostSurgeCharge),
          ghostSurgeActive: stats.ghostSurgeActive,
          ghostSurgeTimer: stats.ghostSurgeTimer,
          ghostTokensCollected: stats.ghostTokensCollected,
        });
      },
      onRadarUpdate: (radar) => drawRadar(radar),
      onLockUpdate: (lock) => setTargetLock(lock),
      onBossUpdate: (hp, maxHp, phase) => setBossData({ active: hp > 0, hp: Math.max(0, hp), maxHp, phase }),
      onNearMiss: () => {
        setNearMissAlert(true);
        setTimeout(() => setNearMissAlert(false), 1200);
      },
      onComboUpdate: (m) => setComboMultiplier(m),
      onGhostSurgeUpdate: (active, timer) => {
        setPlayerStats((prev) => ({
          ...prev,
          ghostSurgeActive: active,
          ghostSurgeTimer: timer,
        }));
      },
      onGameOver: () => setGameState('gameover'),
      onVictory: () => setGameState('victory'),
    });

    engine.setStarfighter(activeShip);
    engine.setPilot(activePilot);
    engine.setCustomColors({ hull: activeHullColor.hex, laser: activeLaserColor.hex });

    engineRef.current = engine;
    engine.start();
    setGameState('playing');
  };

  const handleToggleMute = () => {
    playClick();
    const muted = voidStrikeAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className={styles.container} onContextMenu={(e) => e.preventDefault()}>
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Active Game HUD */}
      {gameState === 'playing' && (
        <div className={styles.hud}>
          {/* Top Bar */}
          <div className={styles.topBar}>
            {/* Starfighter Telemetry Card */}
            <div className={styles.telemetryCard}>
              <div className={styles.telemetryHeader}>
                <div className={styles.shipClassBadge}>
                  <RocketIcon size={12} />
                  <span>{SHIPS.find((s) => s.id === activeShip)?.name || 'APEX-X'}</span>
                </div>
                <div className={styles.speedReadout}>{playerStats.speed} M/S</div>
              </div>

              {/* Shield Bar */}
              <div className={styles.gaugeRow}>
                <div className={styles.gaugeLabel}>
                  <span>SHIELD</span>
                  <span>{playerStats.shield}%</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.shieldFill}
                    style={{ width: `${Math.max(0, (playerStats.shield / playerStats.maxShield) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Hull Bar */}
              <div className={styles.gaugeRow}>
                <div className={styles.gaugeLabel}>
                  <span>HULL</span>
                  <span>{playerStats.hull}%</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.hullFill}
                    style={{ width: `${Math.max(0, (playerStats.hull / playerStats.maxHull) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Boost Afterburner Bar */}
              <div className={styles.gaugeRow}>
                <div className={styles.gaugeLabel}>
                  <span>AFTERBURNER</span>
                  <span>{playerStats.boostEnergy}%</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={styles.boostFill}
                    style={{ width: `${Math.max(0, (playerStats.boostEnergy / playerStats.maxBoostEnergy) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Spectral Ghost Surge Bar */}
              <div className={styles.gaugeRow}>
                <div className={styles.gaugeLabel}>
                  <span className={styles.ghostSurgeLabel}>
                    <GhostIcon size={11} /> GHOST SURGE
                  </span>
                  <span>{playerStats.ghostSurgeActive ? `${Math.ceil(playerStats.ghostSurgeTimer)}s ACTIVE` : `${playerStats.ghostSurgeCharge}%`}</span>
                </div>
                <div className={styles.gaugeTrack}>
                  <div
                    className={`${styles.ghostSurgeFill} ${playerStats.ghostSurgeActive ? styles.ghostSurgePulse : ''}`}
                    style={{ width: `${playerStats.ghostSurgeActive ? (playerStats.ghostSurgeTimer / 8) * 100 : playerStats.ghostSurgeCharge}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Center Mission & Boss Status */}
            <div className={styles.centerStatusCol}>
              {/* Mission Wave Badge */}
              <div className={styles.missionPill}>
                <span className={styles.missionWaveText}>SECTOR PATROL — WAVE {playerStats.wave}</span>
                <span className={styles.scoreText}>{playerStats.score} PTS</span>
              </div>

              {/* Boss Dreadnought Bar (if active) */}
              {bossData.active && (
                <div className={styles.bossBarContainer}>
                  <div className={styles.bossTitleRow}>
                    <span>
                      DREADNOUGHT FLAGSHIP {bossData.phase === 1 ? '(SHIELD CORES)' : '(REACTOR VULNERABLE)'}
                    </span>
                    <span>{bossData.hp} / {bossData.maxHp}</span>
                  </div>
                  <div className={styles.bossTrack}>
                    <div
                      className={styles.bossFill}
                      style={{ width: `${Math.max(0, (bossData.hp / bossData.maxHp) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Near-Miss Alert Notification */}
              {nearMissAlert && (
                <div className={styles.nearMissBadge}>
                  <ZapIcon size={14} /> NEAR MISS +50 PTS!
                </div>
              )}

              {/* Combo Multiplier Streak */}
              {comboMultiplier >= 2 && (
                <div className={styles.comboBadge}>
                  <SparklesIcon size={14} /> x{comboMultiplier} COMBO STREAK!
                </div>
              )}
            </div>

            {/* Top Right Actions & Tactical Radar */}
            <div className={styles.topRightCol}>
              <div className={styles.topActions}>
                <button
                  className={styles.hudButton}
                  onClick={() => {
                    playClick();
                    engineRef.current?.toggleCameraMode();
                    setCameraMode((prev) => (prev === 'chase' ? 'cockpit' : 'chase'));
                  }}
                  title={`Toggle View (V): ${cameraMode === 'chase' ? 'Chase Cam' : 'Cockpit'}`}
                >
                  <CameraIcon size={16} />
                </button>
                <button
                  className={styles.hudButton}
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
                </button>
                <button
                  className={styles.hudButton}
                  onClick={handleTogglePause}
                  title="Pause (Esc)"
                >
                  <PauseIcon size={16} />
                </button>
              </div>

              {/* 3D Tactical Radar */}
              <div className={styles.radarCard}>
                <canvas ref={radarCanvasRef} className={styles.radarCanvas} width={96} height={96} />
              </div>
            </div>
          </div>

          {/* Center Targeting Crosshair & Lock-on Reticle */}
          <div className={styles.crosshairOverlay}>
            <div className={styles.crosshairRing}>
              <div className={styles.crosshairDot} />
            </div>

            {targetLock.hasTarget && (
              <div className={`${styles.lockBox} ${targetLock.isLocked ? styles.lockBoxSolid : ''}`}>
                <span className={styles.lockText}>
                  {targetLock.isLocked ? 'TARGET LOCKED' : `${Math.round(targetLock.progress * 100)}%`}
                </span>
                <span className={styles.lockText}>{targetLock.distance}M</span>
              </div>
            )}
          </div>

          {/* Bottom Controls Bar */}
          <div className={styles.bottomBar}>
            <div className={styles.leftControls}>
              {/* Virtual Flight Stick */}
              <div
                className={styles.joystickZone}
                onPointerDown={handleJoyStart}
                onPointerMove={handleJoyMove}
                onPointerUp={handleJoyEnd}
                onPointerLeave={handleJoyEnd}
              >
                <div
                  className={styles.joystickThumb}
                  style={{
                    transform: `translate(${thumbPos.x}px, ${thumbPos.y}px)`,
                  }}
                />
              </div>
            </div>

            {/* Combat Action Buttons */}
            <div className={styles.actionButtonGroup}>
              {/* Ghost Surge Overdrive */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnGhost} ${
                  playerStats.ghostSurgeCharge >= 100 || playerStats.ghostSurgeActive ? styles.actionBtnGhostReady : ''
                }`}
                onClick={() => {
                  playClick();
                  engineRef.current?.triggerGhostSurge();
                }}
                title="Ghost Surge Overdrive (G)"
              >
                <GhostIcon size={20} />
                <span className={styles.actionKeyHint}>G</span>
              </button>

              {/* Barrel Roll Evasive */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.barrelRoll();
                }}
                title="Barrel Roll Dodge (C)"
              >
                <RotateCcwIcon size={18} />
                <span className={styles.actionKeyHint}>C</span>
              </button>

              {/* Afterburners Boost */}
              <button
                className={styles.actionBtn}
                onPointerDown={() => engineRef.current?.setBoost(true)}
                onPointerUp={() => engineRef.current?.setBoost(false)}
                title="Afterburners (Hold Shift)"
              >
                <FlameIcon size={18} />
                <span className={styles.actionKeyHint}>SHIFT</span>
              </button>

              {/* Photon Torpedo */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.fireHomingTorpedo();
                }}
                title="Homing Torpedo (F / Right Click)"
              >
                <RocketIcon size={18} />
                <span className={styles.actionKeyHint}>F</span>
                <span className={styles.missileBadge}>{playerStats.missiles}</span>
              </button>

              {/* Plasma Cannons (Primary) */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.firePlasmaCannons();
                }}
                title="Twin Plasma Cannons (Space / Click)"
              >
                <CrosshairIcon size={22} />
                <span className={styles.actionKeyHint}>SPACE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* 1. Start / 3D Hangar Customization Bay */}
      {gameState === 'start' && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modalCard} ${styles.hangarModalCard}`}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <GhostIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>VOIDSTRIKE 3D: BILLIGHOST OS</h2>
              <p className={styles.modalSubtitle}>
                Deep space sector under siege by alien interceptors and rogue Void Wraiths. Configure your starfighter, select your ace pilot, and launch!
              </p>
            </div>

            {/* Customization Navigation Tabs */}
            <div className={styles.hangarTabs}>
              <button
                className={`${styles.hangarTab} ${hangarTab === 'ships' ? styles.hangarTabActive : ''}`}
                onClick={() => {
                  playClick();
                  setHangarTab('ships');
                }}
              >
                <RocketIcon size={14} />
                <span>Starfighters</span>
              </button>
              <button
                className={`${styles.hangarTab} ${hangarTab === 'pilots' ? styles.hangarTabActive : ''}`}
                onClick={() => {
                  playClick();
                  setHangarTab('pilots');
                }}
              >
                <GhostIcon size={14} />
                <span>Ace Pilots</span>
              </button>
              <button
                className={`${styles.hangarTab} ${hangarTab === 'paint' ? styles.hangarTabActive : ''}`}
                onClick={() => {
                  playClick();
                  setHangarTab('paint');
                }}
              >
                <SparklesIcon size={14} />
                <span>Livery & Lasers</span>
              </button>
            </div>

            {/* Tab 1: Starfighters */}
            {hangarTab === 'ships' && (
              <div className={styles.hangarGrid}>
                {SHIPS.map((ship) => (
                  <div
                    key={ship.id}
                    className={`${styles.hangarCard} ${activeShip === ship.id ? styles.hangarCardSelected : ''}`}
                    onClick={() => handleSelectShip(ship.id)}
                  >
                    <div className={styles.hangarCardTop}>
                      <span className={styles.hangarShipName}>{ship.name}</span>
                      <span className={styles.hangarShipClass}>{ship.class}</span>
                    </div>
                    <p className={styles.hangarShipDesc}>{ship.desc}</p>
                    <div className={styles.statRadar}>
                      <div className={styles.statMini}>
                        <span>SPD {ship.speed}</span>
                        <div className={styles.statMiniBar} style={{ width: `${ship.speed}%` }} />
                      </div>
                      <div className={styles.statMini}>
                        <span>HULL {ship.hull}</span>
                        <div className={styles.statMiniBar} style={{ width: `${(ship.hull / 160) * 100}%` }} />
                      </div>
                      <div className={styles.statMini}>
                        <span>SHD {ship.shield}</span>
                        <div className={styles.statMiniBar} style={{ width: `${(ship.shield / 150) * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Pilots */}
            {hangarTab === 'pilots' && (
              <div className={styles.hangarGrid}>
                {PILOTS.map((pilot) => (
                  <div
                    key={pilot.id}
                    className={`${styles.hangarCard} ${activePilot === pilot.id ? styles.hangarCardSelected : ''}`}
                    onClick={() => handleSelectPilot(pilot.id)}
                  >
                    <div className={styles.hangarCardTop}>
                      <span className={styles.hangarShipName}>{pilot.name}</span>
                      <span className={styles.hangarShipClass}>{pilot.callsign}</span>
                    </div>
                    <div className={styles.pilotPerkBadge}>
                      <SparklesIcon size={12} />
                      <span>{pilot.perk}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 3: Livery & Lasers */}
            {hangarTab === 'paint' && (
              <div className={styles.paintCustomizer}>
                <div className={styles.paintSection}>
                  <span className={styles.paintLabel}>Hull Finish:</span>
                  <div className={styles.colorPillRow}>
                    {HULL_COLORS.map((c) => (
                      <button
                        key={c.name}
                        className={`${styles.colorSwatch} ${activeHullColor.name === c.name ? styles.colorSwatchActive : ''}`}
                        style={{ backgroundColor: c.css }}
                        onClick={() => handleSelectHullColor(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.paintSection}>
                  <span className={styles.paintLabel}>Laser Plasma Hue:</span>
                  <div className={styles.colorPillRow}>
                    {LASER_COLORS.map((c) => (
                      <button
                        key={c.name}
                        className={`${styles.colorSwatch} ${activeLaserColor.name === c.name ? styles.colorSwatchActive : ''}`}
                        style={{ backgroundColor: c.css }}
                        onClick={() => handleSelectLaserColor(c)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Controls Cheat Sheet */}
            <div className={styles.controlsCheatSheet}>
              <div className={styles.controlRow}>
                <span>Flight Pitch / Yaw</span>
                <span className={styles.keyBadge}>Drag Screen / Mouse / Joy</span>
              </div>
              <div className={styles.controlRow}>
                <span>Twin Plasma Cannons</span>
                <span className={styles.keyBadge}>Space / Left Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Homing Torpedo</span>
                <span className={styles.keyBadge}>F / Right Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Ghost Surge Overdrive</span>
                <span className={styles.keyBadge}>G (When Charged)</span>
              </div>
              <div className={styles.controlRow}>
                <span>Afterburners Boost</span>
                <span className={styles.keyBadge}>Hold Shift</span>
              </div>
              <div className={styles.controlRow}>
                <span>Barrel Roll Dodge</span>
                <span className={styles.keyBadge}>C</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleStartGame}>
                <PlayIcon size={16} />
                <span>Launch Starfighter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Pause Screen */}
      {gameState === 'paused' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <PauseIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>MISSION PAUSED</h2>
              <p className={styles.modalSubtitle}>Vessel sub-systems in stasis.</p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Combat Wave</span>
                <span className={styles.statVal}>Wave {playerStats.wave}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Score</span>
                <span className={styles.statVal}>{playerStats.score} PTS</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Hull Integrity</span>
                <span className={styles.statVal}>{playerStats.hull}%</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Torpedoes</span>
                <span className={styles.statVal}>{playerStats.missiles} left</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleTogglePause}>
                <PlayIcon size={16} />
                <span>Resume Flight</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleToggleMute}>
                {isMuted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
                <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Abort & Restart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Game Over Screen */}
      {gameState === 'gameover' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRingRed}>
                <SkullIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>VESSEL DESTROYED</h2>
              <p className={styles.modalSubtitle}>
                Hull integrity collapsed. Ejection pod deployed. The Billighost defense fleet awaits your return.
              </p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Wave Reached</span>
                <span className={styles.statVal}>Wave {playerStats.wave}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Combat Score</span>
                <span className={styles.statVal}>{playerStats.score} PTS</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Deploy New Interceptor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Victory Screen */}
      {gameState === 'victory' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRingGold}>
                <TrophyIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>SECTOR LIBERATED!</h2>
              <p className={styles.modalSubtitle}>
                The alien Dreadnought Flagship has detonated! All spectral anomalies secured. Ace pilot status confirmed by Billighost High Command.
              </p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Final Score</span>
                <span className={styles.statVal}>{playerStats.score} PTS</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Hull Remaining</span>
                <span className={styles.statVal}>{playerStats.hull}%</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Fly Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
