/**
 * VoidStrike 3D — 3D Starfighter Space Combat & Dogfight Simulator
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
} from '../components/Icons';
import styles from './VoidStrikeApp.module.css';

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

  // Player Starfighter Stats
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
  });

  // Boss Dreadnought Stats
  const [bossData, setBossData] = useState({
    active: false,
    hp: 500,
    maxHp: 500,
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
      onWaveComplete: (waveNum) => {
        // Wave progression
      },
      onGameOver: () => {
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    engineRef.current = engine;

    return () => {
      if (flightLoopRef.current) cancelAnimationFrame(flightLoopRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // 3D Tactical Radar Drawing
  const drawRadar = (radar) => {
    const canvas = radarCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarRange = 160; // Max radar range

    ctx.clearRect(0, 0, w, h);

    // Radar background circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#02040a';
    ctx.fillRect(0, 0, w, h);

    // Concentric range rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
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

    // Draw Enemies (Scouts / Gunships)
    if (radar.enemies) {
      radar.enemies.forEach((enemy) => {
        const rx = cx + (enemy.x / radarRange) * (cx - 6);
        const rz = cy + (enemy.z / radarRange) * (cy - 6);
        const dist = Math.hypot(enemy.x, enemy.z);
        if (dist < radarRange) {
          ctx.fillStyle = enemy.type === 'gunship' ? '#f59e0b' : '#ef4444';
          ctx.beginPath();
          ctx.arc(rx, rz, enemy.type === 'gunship' ? 3.5 : 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Boss Dreadnought
    if (radar.boss) {
      const bx = cx + (radar.boss.x / radarRange) * (cx - 8);
      const bz = cy + (radar.boss.z / radarRange) * (cy - 8);
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(bx, bz, 5.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Player Starfighter at Center
    ctx.fillStyle = '#38bdf8';
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

        // Keyboard Pitch & Yaw controls
        if (keys['KeyW'] || keys['ArrowUp']) pitch -= 1.0;
        if (keys['KeyS'] || keys['ArrowDown']) pitch += 1.0;
        if (keys['KeyA'] || keys['ArrowLeft']) roll -= 1.5;
        if (keys['KeyD'] || keys['ArrowRight']) roll += 1.5;
        if (keys['KeyQ']) yaw -= 1.0;
        if (keys['KeyE']) yaw += 1.0;

        // Mouse steering input
        const mouse = mouseSteerRef.current;
        if (mouse.isDown) {
          pitch += mouse.pitch;
          yaw += mouse.yaw;
        }

        // Virtual Touch Joystick input
        const joy = joystickRef.current;
        if (joy.active) {
          yaw += joy.yaw * 1.5;
          pitch += joy.pitch * 1.5;
        }

        engineRef.current.setPitch(pitch);
        engineRef.current.setYaw(yaw);
        engineRef.current.setRoll(roll);

        // Afterburner Boost
        const isBoost = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
        engineRef.current.setBoost(isBoost);

        // Continuous Plasma Cannon fire on held Space or Mouse
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
        // Homing Torpedo
        engineRef.current?.fireHomingTorpedo();
      } else if (e.code === 'KeyC') {
        // Barrel Roll Evasive
        engineRef.current?.barrelRoll();
      } else if (e.code === 'KeyV') {
        // Toggle Camera Mode
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

  // Mouse Pointer Flight Drag Steering
  const handlePointerDown = (e) => {
    if (gameState !== 'playing') return;
    if (e.button === 0) {
      // Left click fires plasma cannons
      engineRef.current?.firePlasmaCannons();
    } else if (e.button === 2) {
      // Right click launches torpedo
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

    // Steering rates
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
        });
      },
      onRadarUpdate: (radar) => drawRadar(radar),
      onLockUpdate: (lock) => setTargetLock(lock),
      onBossUpdate: (hp, maxHp, phase) => setBossData({ active: hp > 0, hp: Math.max(0, hp), maxHp, phase }),
      onWaveComplete: () => {},
      onGameOver: () => setGameState('gameover'),
      onVictory: () => setGameState('victory'),
    });

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
    <div
      className={styles.container}
      onContextMenu={(e) => e.preventDefault()}
    >
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
                  <span>APEX-X</span>
                </div>
                <div className={styles.speedReadout}>
                  {playerStats.speed} M/S
                </div>
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
            </div>

            {/* Boss Dreadnought Bar (if active) */}
            {bossData.active && (
              <div className={styles.bossBarContainer}>
                <div className={styles.bossTitleRow}>
                  <span>
                    DREADNOUGHT FLAGSHIP {bossData.phase === 1 ? '(SHIELD GENERATORS)' : '(CORE VULNERABLE)'}
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
                <canvas
                  ref={radarCanvasRef}
                  className={styles.radarCanvas}
                  width={96}
                  height={96}
                />
              </div>
            </div>
          </div>

          {/* Center Targeting Crosshair & Lock-on Reticle */}
          <div className={styles.crosshairOverlay}>
            <div className={styles.crosshairRing}>
              <div className={styles.crosshairDot} />
            </div>

            {targetLock.hasTarget && (
              <div
                className={`${styles.lockBox} ${targetLock.isLocked ? styles.lockBoxSolid : ''}`}
              >
                <span className={styles.lockText}>
                  {targetLock.isLocked ? 'LOCKED' : `${Math.round(targetLock.progress * 100)}%`}
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

      {/* 1. Start Screen */}
      {gameState === 'start' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <RocketIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>VOIDSTRIKE 3D</h2>
              <p className={styles.modalSubtitle}>
                Deep space sector under siege. Pilot the Apex-X Interceptor, neutralize alien interceptor swarms, and obliterate the Dreadnought Flagship.
              </p>
            </div>

            <div className={styles.controlsCheatSheet}>
              <div className={styles.controlRow}>
                <span>Flight Pitch / Yaw</span>
                <span className={styles.keyBadge}>Drag Screen / Mouse / Joy</span>
              </div>
              <div className={styles.controlRow}>
                <span>Flight Banking Roll</span>
                <span className={styles.keyBadge}>A / D</span>
              </div>
              <div className={styles.controlRow}>
                <span>Twin Plasma Cannons</span>
                <span className={styles.keyBadge}>Space / Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Homing Torpedo</span>
                <span className={styles.keyBadge}>F / Right Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Afterburners Boost</span>
                <span className={styles.keyBadge}>Hold Shift</span>
              </div>
              <div className={styles.controlRow}>
                <span>Barrel Roll Dodge</span>
                <span className={styles.keyBadge}>C</span>
              </div>
              <div className={styles.controlRow}>
                <span>Camera Mode</span>
                <span className={styles.keyBadge}>V</span>
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
              <p className={styles.modalSubtitle}>Sub-systems nominal.</p>
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
                Hull breach critical. Ejection pod deployed. The orbital relay awaits your return.
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
                The alien Dreadnought Flagship has detonated! The orbital relay is secure. Ace pilot status confirmed.
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
