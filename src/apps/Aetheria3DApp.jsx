/**
 * Aetheria 3D — Full 3D Open World Action RPG Application
 * Billighost OS Ultimate Experience
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AetheriaEngine } from '../services/games/AetheriaEngine';
import { aetheriaAudio } from '../services/games/AetheriaAudio';
import {
  SwordIcon,
  ShieldIcon,
  SparklesIcon,
  PotionIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  RotateCcwIcon,
  TrophyIcon,
  SkullIcon,
  HorseIcon,
  GhostIcon,
  PaletteIcon,
  TargetLockIcon,
} from '../components/Icons';
import styles from './Aetheria3DApp.module.css';

export default function Aetheria3DApp({ playClick = () => {} }) {
  const canvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputLoopRef = useRef(null);
  const keysRef = useRef({});

  // Game UI State: 'start' | 'playing' | 'paused' | 'customizer' | 'settings' | 'gameover' | 'victory'
  const [gameState, setGameState] = useState('start');
  const [isMuted, setIsMuted] = useState(false);
  const [killerName, setKillerName] = useState('Wild Beast');
  const [toastMessage, setToastMessage] = useState(null);

  // Character Class & Customization State
  const [selectedClass, setSelectedClass] = useState('paladin');
  const [customization, setCustomization] = useState({
    palette: 'spectral',
    hasCape: true,
    hasHelmet: true,
    mountType: 'horse',
  });

  // Graphics Quality Preset: 'ultra' | 'high' | 'low'
  const [graphicsQuality, setGraphicsQuality] = useState('high');

  // Player RPG Stats
  const [playerStats, setPlayerStats] = useState({
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
  });

  // Boss Stats
  const [bossData, setBossData] = useState({
    active: false,
    hp: 500,
    maxHp: 500,
  });

  // Ghost Surge (Ascendance Overdrive)
  const [ghostSurgeData, setGhostSurgeData] = useState({
    charge: 0,
    active: false,
    timer: 0,
  });

  // Mount & Lock-On States
  const [isMounted, setIsMounted] = useState(false);
  const [lockedTargetName, setLockedTargetName] = useState(null);

  // Virtual Joystick State
  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
  });
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });

  // Camera Drag State
  const cameraDragRef = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  // Toast Notification
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Minimap Radar Drawing (Topographic Elevation & Icons)
  const drawMinimap = useCallback((data) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarScale = 0.38; // 1 unit in 3D = 0.38 pixels on radar

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Concentric elevation rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (cx - 2) * 0.38, 0, Math.PI * 2);
    ctx.arc(cx, cy, (cx - 2) * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw Ghost Orbs (Cyan dots)
    if (data.orbs) {
      ctx.fillStyle = '#38bdf8';
      data.orbs.forEach((orb) => {
        const dx = (orb.x - data.playerX) * radarScale;
        const dz = (orb.z - data.playerZ) * radarScale;
        const rx = cx + dx;
        const ry = cy + dz;
        if (Math.hypot(dx, dz) < cx - 4) {
          ctx.beginPath();
          ctx.arc(rx, ry, 2.0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Chests (Gold squares)
    if (data.chests) {
      data.chests.forEach((chest) => {
        const dx = (chest.x - data.playerX) * radarScale;
        const dz = (chest.z - data.playerZ) * radarScale;
        const rx = cx + dx;
        const ry = cy + dz;
        if (Math.hypot(dx, dz) < cx - 6) {
          ctx.fillStyle = chest.opened ? '#64748b' : '#fbbf24';
          ctx.fillRect(rx - 2, ry - 2, 4, 4);
        }
      });
    }

    // Draw Enemies (Boss = large red, Ghost = purple/cyan, Wolves = amber)
    if (data.enemies) {
      data.enemies.forEach((enemy) => {
        const dx = (enemy.x - data.playerX) * radarScale;
        const dz = (enemy.z - data.playerZ) * radarScale;
        const rx = cx + dx;
        const ry = cy + dz;
        if (Math.hypot(dx, dz) < cx - 4) {
          if (enemy.type === 'boss') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
          } else if (enemy.type === 'ghost') {
            ctx.fillStyle = '#c084fc';
            ctx.beginPath();
            ctx.arc(rx, ry, 3.0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = enemy.type === 'wolf' ? '#f97316' : '#22c55e';
            ctx.beginPath();
            ctx.arc(rx, ry, 2.6, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Draw Player Pointer at center (with horse ring if mounted)
    ctx.save();
    ctx.translate(cx, cy);

    if (data.isMounted) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.rotate(data.facingAngle);
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4, -4);
    ctx.lineTo(0, -2);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }, []);

  // Initialize Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new AetheriaEngine(canvasRef.current, {
      onStatsUpdate: (stats) => {
        setPlayerStats({
          hp: stats.hp,
          maxHp: stats.maxHp,
          stamina: Math.round(stats.stamina),
          maxStamina: stats.maxStamina,
          level: stats.level,
          exp: stats.exp,
          expNext: stats.expNext,
          potions: stats.potions,
          equippedWeapon: stats.equippedWeapon,
          attackPower: stats.attackPower,
        });
      },
      onMinimapUpdate: (data) => {
        drawMinimap(data);
      },
      onBossUpdate: (hp, maxHp) => {
        setBossData({
          active: hp > 0,
          hp,
          maxHp,
        });
      },
      onGhostSurgeUpdate: (surge) => {
        setGhostSurgeData({ ...surge });
      },
      onMountUpdate: (mounted) => {
        setIsMounted(mounted);
      },
      onTargetLockUpdate: (target) => {
        setLockedTargetName(target);
      },
      onChestOpen: (reward) => {
        showToast(`Discovered ${reward}!`);
      },
      onGameOver: (killer) => {
        setKillerName(killer || 'Wild Beast');
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    engineRef.current = engine;

    return () => {
      if (inputLoopRef.current) cancelAnimationFrame(inputLoopRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, [showToast, drawMinimap]);

  // Continuous Movement Input Loop
  useEffect(() => {
    const updateMovement = () => {
      if (engineRef.current && gameState === 'playing') {
        const keys = keysRef.current;
        let moveX = 0;
        let moveZ = 0;

        if (keys['KeyW'] || keys['ArrowUp']) moveZ += 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ -= 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        const joy = joystickRef.current;
        if (joy.active) {
          moveX += joy.dx;
          moveZ -= joy.dy;
        }

        const isSprint = Boolean(keys['ShiftLeft'] || keys['ShiftRight']);
        if (Math.abs(moveX) > 0.05 || Math.abs(moveZ) > 0.05) {
          engineRef.current.move(moveX, moveZ, isSprint);
        }
      }
      inputLoopRef.current = requestAnimationFrame(updateMovement);
    };

    inputLoopRef.current = requestAnimationFrame(updateMovement);
    return () => {
      if (inputLoopRef.current) cancelAnimationFrame(inputLoopRef.current);
    };
  }, [gameState]);

  // Button Actions with useCallback
  const handleStartGame = useCallback(() => {
    playClick();
    aetheriaAudio.ensureContext();
    engineRef.current?.start();
    setGameState('playing');
  }, [playClick]);

  const handleTogglePause = useCallback(() => {
    playClick();
    setGameState((prev) => {
      if (prev === 'playing') {
        engineRef.current?.pause();
        return 'paused';
      } else if (prev === 'paused') {
        engineRef.current?.resume();
        return 'playing';
      }
      return prev;
    });
  }, [playClick]);

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

      // Feature 1: Mount/Dismount Steed (H)
      if (e.code === 'KeyH') {
        engineRef.current?.toggleMount();
      }
      // Feature 21: Jump (Spacebar)
      else if (e.code === 'Space') {
        engineRef.current?.jump();
      }
      // Feature 22: Target Lock (Tab)
      else if (e.code === 'Tab') {
        e.preventDefault();
        engineRef.current?.toggleTargetLock();
      }
      // Feature 3: Ghost Surge Overdrive (G)
      else if (e.code === 'KeyG') {
        engineRef.current?.triggerGhostSurge();
      }
      // Combat Attack (J / F)
      else if (e.code === 'KeyJ' || e.code === 'KeyF') {
        engineRef.current?.attack();
      }
      // Shield Block (Hold K)
      else if (e.code === 'KeyK') {
        engineRef.current?.block(true);
      }
      // Magic Bolt (E)
      else if (e.code === 'KeyE') {
        engineRef.current?.castMagicBolt();
      }
      // Dodge Roll (C)
      else if (e.code === 'KeyC') {
        engineRef.current?.dodgeRoll();
      }
      // Power Attack / AOE Ground Slam (V)
      else if (e.code === 'KeyV') {
        engineRef.current?.powerAttack();
      }
      // Health Potion (Q)
      else if (e.code === 'KeyQ') {
        engineRef.current?.usePotion();
      }
      // Interact (F / R)
      else if (e.code === 'KeyR') {
        engineRef.current?.interact();
      }
      // Pause (Escape)
      else if (e.code === 'Escape') {
        handleTogglePause();
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
      if (e.code === 'KeyK') {
        engineRef.current?.block(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handleStartGame, handleTogglePause]);

  // Mouse / Touch Camera Drag
  const handlePointerDown = (e) => {
    if (gameState !== 'playing') return;
    cameraDragRef.current = {
      dragging: true,
      lastX: e.clientX,
      lastY: e.clientY,
    };
  };

  const handlePointerMove = (e) => {
    if (!cameraDragRef.current.dragging || !engineRef.current) return;
    const deltaX = e.clientX - cameraDragRef.current.lastX;
    const deltaY = e.clientY - cameraDragRef.current.lastY;

    cameraDragRef.current.lastX = e.clientX;
    cameraDragRef.current.lastY = e.clientY;

    engineRef.current.rotateCamera(-deltaX * 0.005, deltaY * 0.004);
  };

  const handlePointerUp = () => {
    cameraDragRef.current.dragging = false;
  };

  // Virtual Joystick Handlers
  const handleJoyStart = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    joystickRef.current = {
      active: true,
      startX: cx,
      startY: cy,
      dx: 0,
      dy: 0,
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
    joystickRef.current.dx = cx / maxRadius;
    joystickRef.current.dy = cy / maxRadius;
  };

  const handleJoyEnd = () => {
    joystickRef.current.active = false;
    joystickRef.current.dx = 0;
    joystickRef.current.dy = 0;
    setThumbPos({ x: 0, y: 0 });
  };

  // Navigation Actions
  const handleOpenCustomizer = () => {
    playClick();
    if (gameState === 'playing') engineRef.current?.pause();
    setGameState('customizer');
  };

  const handleOpenSettings = () => {
    playClick();
    if (gameState === 'playing') engineRef.current?.pause();
    setGameState('settings');
  };

  const handleApplyClass = (classId) => {
    playClick();
    setSelectedClass(classId);
    engineRef.current?.setClassAndCustomization(classId, customization);
  };

  const handleApplyPalette = (palette) => {
    playClick();
    const newCust = { ...customization, palette };
    setCustomization(newCust);
    engineRef.current?.setClassAndCustomization(selectedClass, newCust);
  };

  const handleApplyQuality = (quality) => {
    playClick();
    setGraphicsQuality(quality);
    engineRef.current?.setGraphicsQuality(quality);
  };

  const handleRestart = () => {
    playClick();
    engineRef.current?.destroy();

    const engine = new AetheriaEngine(canvasRef.current, {
      onStatsUpdate: (stats) => {
        setPlayerStats({
          hp: stats.hp,
          maxHp: stats.maxHp,
          stamina: Math.round(stats.stamina),
          maxStamina: stats.maxStamina,
          level: stats.level,
          exp: stats.exp,
          expNext: stats.expNext,
          potions: stats.potions,
          equippedWeapon: stats.equippedWeapon,
          attackPower: stats.attackPower,
        });
      },
      onMinimapUpdate: (data) => drawMinimap(data),
      onBossUpdate: (hp, maxHp) => setBossData({ active: hp > 0, hp, maxHp }),
      onGhostSurgeUpdate: (surge) => setGhostSurgeData({ ...surge }),
      onMountUpdate: (mounted) => setIsMounted(mounted),
      onTargetLockUpdate: (target) => setLockedTargetName(target),
      onChestOpen: (reward) => showToast(`Discovered ${reward}!`),
      onGameOver: (killer) => {
        setKillerName(killer || 'Wild Beast');
        setGameState('gameover');
      },
      onVictory: () => setGameState('victory'),
    });

    engine.setClassAndCustomization(selectedClass, customization);
    engine.setGraphicsQuality(graphicsQuality);
    engineRef.current = engine;
    engine.start();
    setGameState('playing');
  };

  const handleToggleMute = () => {
    playClick();
    const muted = aetheriaAudio.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className={styles.container}>
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {/* Floating Notice Toast */}
      {toastMessage && (
        <div className={styles.floatingNotice}>
          <SparklesIcon size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Active Game HUD */}
      {gameState === 'playing' && (
        <div className={styles.hud}>
          {/* Top Bar */}
          <div className={styles.topBar}>
            {/* Player RPG Stats Card */}
            <div className={styles.playerCard}>
              <div className={styles.playerHeader}>
                <div className={styles.playerLevelBadge}>
                  <SwordIcon size={12} />
                  <span>LV. {playerStats.level}</span>
                </div>
                {isMounted && (
                  <div className={styles.mountBadge}>
                    <HorseIcon size={12} />
                    <span>MOUNTED</span>
                  </div>
                )}
                {lockedTargetName && (
                  <div className={styles.targetLockBadge}>
                    <TargetLockIcon size={12} />
                    <span>{lockedTargetName}</span>
                  </div>
                )}
                <div className={styles.weaponTag} title={playerStats.equippedWeapon}>
                  {playerStats.equippedWeapon}
                </div>
              </div>

              {/* HP Bar */}
              <div className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span>HP</span>
                  <span>{playerStats.hp} / {playerStats.maxHp}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.hpFill}
                    style={{ width: `${Math.max(0, (playerStats.hp / playerStats.maxHp) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Stamina Bar */}
              <div className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span>STAMINA</span>
                  <span>{playerStats.stamina} / {playerStats.maxStamina}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.staminaFill}
                    style={{ width: `${Math.max(0, (playerStats.stamina / playerStats.maxStamina) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Ghost Surge Overdrive Bar */}
              <div className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span>GHOST SURGE</span>
                  <span>{ghostSurgeData.active ? `${Math.ceil(ghostSurgeData.timer)}s` : `${ghostSurgeData.charge}%`}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.ghostFill}
                    style={{
                      width: ghostSurgeData.active
                        ? `${(ghostSurgeData.timer / 12) * 100}%`
                        : `${ghostSurgeData.charge}%`,
                    }}
                  />
                </div>
              </div>

              {/* EXP Bar */}
              <div className={styles.barRow}>
                <div className={styles.barLabel}>
                  <span>EXP</span>
                  <span>{playerStats.exp} / {playerStats.expNext}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={styles.expFill}
                    style={{ width: `${Math.max(0, (playerStats.exp / playerStats.expNext) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Boss Bar (if active) */}
            {bossData.active && (
              <div className={styles.bossBarContainer}>
                <div className={styles.bossTitleRow}>
                  <span>ANCIENT STONE GOLEM</span>
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

            {/* Top Right: Controls & Minimap */}
            <div className={styles.topRightCol}>
              <div className={styles.topActions}>
                <button
                  className={styles.hudButton}
                  onClick={handleOpenCustomizer}
                  title="Customize Hero & Mount"
                >
                  <PaletteIcon size={16} />
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
                  title="Pause Game (Esc)"
                >
                  <PauseIcon size={16} />
                </button>
              </div>

              {/* Minimap Radar */}
              <div className={styles.minimapCard}>
                <div className={styles.minimapNorth}>N</div>
                <canvas
                  ref={minimapCanvasRef}
                  className={styles.minimapCanvas}
                  width={90}
                  height={90}
                />
              </div>
            </div>
          </div>

          {/* Bottom Bar: Virtual Joystick & Action Buttons */}
          <div className={styles.bottomBar}>
            <div className={styles.leftControls}>
              {/* Virtual Touch Joystick */}
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

              {/* Potion Quick Button */}
              <button
                className={styles.potionButton}
                onClick={() => {
                  playClick();
                  engineRef.current?.usePotion();
                }}
                title="Use Potion (Q)"
              >
                <PotionIcon size={20} />
                <span className={styles.potionBadge}>{playerStats.potions}</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className={styles.actionButtonGroup}>
              {/* Mount / Dismount Steed */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnMount} ${isMounted ? styles.actionBtnMountActive : ''}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.toggleMount();
                }}
                title="Mount / Dismount Steed (H)"
              >
                <HorseIcon size={18} />
                <span className={styles.actionKeyHint}>H</span>
              </button>

              {/* Jump Button */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.jump();
                }}
                title="Jump / Gallop-Jump (Space)"
              >
                <RotateCcwIcon size={18} />
                <span className={styles.actionKeyHint}>Spc</span>
              </button>

              {/* Target Lock-on Button */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnLock} ${lockedTargetName ? styles.actionBtnLockActive : ''}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.toggleTargetLock();
                }}
                title="Lock-On Target (Tab)"
              >
                <TargetLockIcon size={18} />
                <span className={styles.actionKeyHint}>Tab</span>
              </button>

              {/* Ghost Surge Overdrive */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnGhost} ${ghostSurgeData.charge >= 100 || ghostSurgeData.active ? styles.actionBtnGhostReady : ''}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.triggerGhostSurge();
                }}
                title="Ghost Ascendance Overdrive (G)"
              >
                <GhostIcon size={18} />
                <span className={styles.actionKeyHint}>G</span>
              </button>

              {/* Magic Bolt */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.castMagicBolt();
                }}
                title="Cast Magic Bolt (E)"
              >
                <SparklesIcon size={18} />
                <span className={styles.actionKeyHint}>E</span>
              </button>

              {/* Block Shield */}
              <button
                className={styles.actionBtn}
                onPointerDown={() => engineRef.current?.block(true)}
                onPointerUp={() => engineRef.current?.block(false)}
                title="Block (Hold K)"
              >
                <ShieldIcon size={18} />
                <span className={styles.actionKeyHint}>K</span>
              </button>

              {/* Power Attack (AOE Ground Slam) */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.powerAttack();
                }}
                title="Power Attack — AOE Slam (V)"
              >
                <SwordIcon size={18} />
                <span className={styles.actionKeyHint}>V</span>
              </button>

              {/* Attack (Primary) */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.attack();
                }}
                title="Combo Attack (J / Click)"
              >
                <SwordIcon size={22} />
                <span className={styles.actionKeyHint}>J</span>
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
                <SwordIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>AETHERIA 3D</h2>
              <p className={styles.modalSubtitle}>
                Ultimate Billighost OS Edition. Ride mounts, hunt Phantoms, unearth ancient relic chests, level up your warrior, and conquer the Monolith Colosseum.
              </p>
            </div>

            <div className={styles.controlsCheatSheet}>
              <div className={styles.controlRow}>
                <span>Move Warrior / Mount</span>
                <span className={styles.keyBadge}>W A S D / Joystick</span>
              </div>
              <div className={styles.controlRow}>
                <span>Mount / Dismount Steed</span>
                <span className={styles.keyBadge}>H</span>
              </div>
              <div className={styles.controlRow}>
                <span>Jump / Gallop-Jump</span>
                <span className={styles.keyBadge}>Spacebar</span>
              </div>
              <div className={styles.controlRow}>
                <span>3-Hit Combo + Spin Finisher</span>
                <span className={styles.keyBadge}>J / Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Power Attack (AOE Slam)</span>
                <span className={styles.keyBadge}>V</span>
              </div>
              <div className={styles.controlRow}>
                <span>Lock-On Target</span>
                <span className={styles.keyBadge}>Tab</span>
              </div>
              <div className={styles.controlRow}>
                <span>Ghost Ascendance</span>
                <span className={styles.keyBadge}>G</span>
              </div>
              <div className={styles.controlRow}>
                <span>Shield Block (80% def)</span>
                <span className={styles.keyBadge}>Hold K</span>
              </div>
              <div className={styles.controlRow}>
                <span>Arcane Bolt / Heal</span>
                <span className={styles.keyBadge}>E / Q</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleStartGame}>
                <PlayIcon size={16} />
                <span>Embark on Adventure</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleOpenCustomizer}>
                <PaletteIcon size={16} />
                <span>Customize Hero & Mount</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Character Customizer Modal */}
      {gameState === 'customizer' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <PaletteIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>HERO & MOUNT STUDIO</h2>
              <p className={styles.modalSubtitle}>Select your class, armor palette, and steed type.</p>
            </div>

            {/* Class Selection */}
            <div className={styles.customizerSection}>
              <span className={styles.sectionHeading}>Hero Class</span>
              <div className={styles.classGrid}>
                {[
                  { id: 'paladin', name: 'Paladin', desc: 'Sword & Crest Shield' },
                  { id: 'rogue', name: 'Shadow Rogue', desc: 'Dual Katana Crits' },
                  { id: 'sorceress', name: 'Sorceress', desc: 'Arcane Staff & Magic' },
                  { id: 'berserker', name: 'Berserker', desc: 'Colossal 2H Cleaver' },
                ].map((c) => (
                  <button
                    key={c.id}
                    className={`${styles.classCard} ${selectedClass === c.id ? styles.classCardActive : ''}`}
                    onClick={() => handleApplyClass(c.id)}
                  >
                    <span className={styles.className}>{c.name}</span>
                    <span className={styles.classDesc}>{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Armor Color Palette */}
            <div className={styles.customizerSection}>
              <span className={styles.sectionHeading}>Armor Palette</span>
              <div className={styles.paletteRow}>
                {[
                  { id: 'spectral', color: '#38bdf8' },
                  { id: 'obsidian', color: '#334155' },
                  { id: 'crimson', color: '#ef4444' },
                  { id: 'emerald', color: '#10b981' },
                  { id: 'gold', color: '#f59e0b' },
                ].map((p) => (
                  <button
                    key={p.id}
                    className={`${styles.paletteCircle} ${customization.palette === p.id ? styles.paletteCircleActive : ''}`}
                    style={{ backgroundColor: p.color }}
                    onClick={() => handleApplyPalette(p.id)}
                    title={p.id}
                  />
                ))}
              </div>
            </div>

            {/* Mount Selection */}
            <div className={styles.customizerSection}>
              <span className={styles.sectionHeading}>Steed Breed</span>
              <div className={styles.segmentedControl}>
                {[
                  { id: 'horse', label: 'Warhorse' },
                  { id: 'spectral', label: 'Spectral' },
                ].map((m) => (
                  <button
                    key={m.id}
                    className={`${styles.segmentedBtn} ${customization.mountType === m.id ? styles.segmentedBtnActive : ''}`}
                    onClick={() => {
                      playClick();
                      const newCust = { ...customization, mountType: m.id };
                      setCustomization(newCust);
                      engineRef.current?.setClassAndCustomization(selectedClass, newCust);
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalActions}>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  playClick();
                  if (!engineRef.current?.isRunning) {
                    handleStartGame();
                  } else {
                    engineRef.current?.resume();
                    setGameState('playing');
                  }
                }}
              >
                <PlayIcon size={16} />
                <span>Return to Adventure</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Settings Modal */}
      {gameState === 'settings' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <SparklesIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>GRAPHICS & SOUND SETTINGS</h2>
              <p className={styles.modalSubtitle}>Adjust performance and visual fidelity presets.</p>
            </div>

            <div className={styles.customizerSection}>
              <div className={styles.toggleRow}>
                <span>Graphics Quality Preset</span>
                <div className={styles.segmentedControl}>
                  {['low', 'high', 'ultra'].map((q) => (
                    <button
                      key={q}
                      className={`${styles.segmentedBtn} ${graphicsQuality === q ? styles.segmentedBtnActive : ''}`}
                      onClick={() => handleApplyQuality(q)}
                    >
                      {q.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnSecondary} onClick={handleToggleMute}>
                {isMuted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
                <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
              </button>
              <button
                className={styles.btnPrimary}
                onClick={() => {
                  playClick();
                  engineRef.current?.resume();
                  setGameState('playing');
                }}
              >
                <PlayIcon size={16} />
                <span>Resume Journey</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Pause Screen */}
      {gameState === 'paused' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRing}>
                <PauseIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>GAME PAUSED</h2>
              <p className={styles.modalSubtitle}>Catch your breath, warrior.</p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Class</span>
                <span className={styles.statVal}>{selectedClass.toUpperCase()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Level</span>
                <span className={styles.statVal}>Lv. {playerStats.level}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Weapon</span>
                <span className={styles.statVal}>{playerStats.equippedWeapon}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Potions</span>
                <span className={styles.statVal}>{playerStats.potions} remaining</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleTogglePause}>
                <PlayIcon size={16} />
                <span>Resume Journey</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleOpenCustomizer}>
                <PaletteIcon size={16} />
                <span>Hero Customizer</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleOpenSettings}>
                <SparklesIcon size={16} />
                <span>Graphics & Settings</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Restart Game</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Game Over Screen */}
      {gameState === 'gameover' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRingRed}>
                <SkullIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>FALLEN IN BATTLE</h2>
              <p className={styles.modalSubtitle}>
                You were vanquished by the {killerName}. The realm awaits your return.
              </p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Hero Class</span>
                <span className={styles.statVal}>{selectedClass.toUpperCase()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Warrior Level</span>
                <span className={styles.statVal}>Lv. {playerStats.level}</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Rise Again</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Victory Screen */}
      {gameState === 'victory' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.modalHeader}>
              <div className={styles.modalIconRingGold}>
                <TrophyIcon size={26} />
              </div>
              <h2 className={styles.modalTitle}>VICTORY ACHIEVED!</h2>
              <p className={styles.modalSubtitle}>
                The Ancient Stone Golem has crumbled! Peace has been restored to Aetheria. You are hailed as the realm's champion.
              </p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Champion Class</span>
                <span className={styles.statVal}>{selectedClass.toUpperCase()}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Final Level</span>
                <span className={styles.statVal}>Lv. {playerStats.level}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Final Weapon</span>
                <span className={styles.statVal}>{playerStats.equippedWeapon}</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Play Again</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
