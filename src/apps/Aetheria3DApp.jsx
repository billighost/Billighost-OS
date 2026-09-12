/**
 * Aetheria 3D — Full 3D Open World Action RPG Application
 * Billighost OS High-Polish Experience
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AetheriaEngine } from '../services/games/AetheriaEngine';
import { aetheriaAudio } from '../services/games/AetheriaAudio';
import {
  SwordIcon,
  ShieldIcon,
  SparklesIcon,
  HeartIcon,
  PotionIcon,
  CompassIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  RotateCcwIcon,
  TrophyIcon,
  SkullIcon,
  CrosshairIcon,
} from '../components/Icons';
import styles from './Aetheria3DApp.module.css';

export default function Aetheria3DApp({ playClick = () => {} }) {
  const canvasRef = useRef(null);
  const minimapCanvasRef = useRef(null);
  const engineRef = useRef(null);
  const inputLoopRef = useRef(null);
  const keysRef = useRef({});

  // Game UI State
  const [gameState, setGameState] = useState('start'); // 'start' | 'playing' | 'paused' | 'gameover' | 'victory'
  const [isMuted, setIsMuted] = useState(false);
  const [killerName, setKillerName] = useState('Wild Beast');
  const [toastMessage, setToastMessage] = useState(null);

  // Player RPG Stats
  const [playerStats, setPlayerStats] = useState({
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
  });

  // Boss Stats
  const [bossData, setBossData] = useState({
    active: false,
    hp: 400,
    maxHp: 400,
  });

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

  // Toast Notification timer
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
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
  }, [showToast]);

  // Minimap Radar Drawing
  const drawMinimap = (data) => {
    const canvas = minimapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radarScale = 0.55; // 1 unit in 3D = 0.55 pixels on radar

    ctx.clearRect(0, 0, w, h);

    // Background circle clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Radar concentric rings
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, (cx - 2) * 0.4, 0, Math.PI * 2);
    ctx.arc(cx, cy, (cx - 2) * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();

    // Draw Chests
    if (data.chests) {
      data.chests.forEach((chest) => {
        const dx = (chest.x - data.playerX) * radarScale;
        const dz = (chest.z - data.playerZ) * radarScale;
        const rx = cx + dx;
        const ry = cy + dz;
        const dist = Math.hypot(dx, dz);
        if (dist < cx - 6) {
          ctx.fillStyle = chest.opened ? '#64748b' : '#fbbf24';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw Enemies
    if (data.enemies) {
      data.enemies.forEach((enemy) => {
        const dx = (enemy.x - data.playerX) * radarScale;
        const dz = (enemy.z - data.playerZ) * radarScale;
        const rx = cx + dx;
        const ry = cy + dz;
        const dist = Math.hypot(dx, dz);
        if (dist < cx - 4) {
          if (enemy.type === 'boss') {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else {
            ctx.fillStyle = enemy.type === 'wolf' ? '#a855f7' : '#f97316';
            ctx.beginPath();
            ctx.arc(rx, ry, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
    }

    // Draw Player Pointer at center
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(data.facingAngle);

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-4, -4);
    ctx.lineTo(0, -2);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  // Continuous Movement Input Loop
  useEffect(() => {
    const updateMovement = () => {
      if (engineRef.current && gameState === 'playing') {
        const keys = keysRef.current;
        let moveX = 0;
        let moveZ = 0;

        // Keyboard WASD / Arrows
        if (keys['KeyW'] || keys['ArrowUp']) moveZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX += 1;

        // Virtual Touch Joystick input
        const joy = joystickRef.current;
        if (joy.active) {
          moveX += joy.dx;
          moveZ += joy.dy;
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

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Avoid key repeat loops
      if (e.repeat) return;

      keysRef.current[e.code] = true;

      if (gameState !== 'playing') {
        if (e.code === 'Space' && gameState === 'start') {
          handleStartGame();
        }
        return;
      }

      if (e.code === 'KeyJ' || e.code === 'KeyF') {
        // Combat Attack
        engineRef.current?.attack();
      } else if (e.code === 'KeyK') {
        // Shield Block
        engineRef.current?.block(true);
      } else if (e.code === 'KeyE') {
        // Arcane Bolt
        engineRef.current?.castMagicBolt();
      } else if (e.code === 'KeyC' || e.code === 'Space') {
        // Dodge Roll
        engineRef.current?.dodgeRoll();
      } else if (e.code === 'KeyQ') {
        // Health Potion
        engineRef.current?.usePotion();
      } else if (e.code === 'KeyE') {
        // Chest Interaction
        engineRef.current?.interactChest();
      } else if (e.code === 'Escape') {
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
  }, [gameState]);

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

    engineRef.current.rotateCamera(deltaX * 0.006, -deltaY * 0.005);
  };

  const handlePointerUp = () => {
    cameraDragRef.current.dragging = false;
  };

  // Virtual Joystick Handlers
  const handleJoyStart = (e) => {
    const touch = e.touches ? e.touches[0] : e;
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

  // Button Actions
  const handleStartGame = () => {
    playClick();
    aetheriaAudio.ensureContext();
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

    // Re-initialize engine
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
      onChestOpen: (reward) => showToast(`Discovered ${reward}!`),
      onGameOver: (killer) => {
        setKillerName(killer || 'Wild Beast');
        setGameState('gameover');
      },
      onVictory: () => setGameState('victory'),
    });

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

              {/* Dodge Roll */}
              <button
                className={styles.actionBtn}
                onClick={() => {
                  playClick();
                  engineRef.current?.dodgeRoll();
                }}
                title="Dodge Roll (C / Space)"
              >
                <RotateCcwIcon size={18} />
                <span className={styles.actionKeyHint}>C</span>
              </button>

              {/* Attack (Primary) */}
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                onClick={() => {
                  playClick();
                  engineRef.current?.attack();
                }}
                title="Sword Combo Attack (J / Click)"
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
                Venture into the mystical realm of Aetheria. Hunt shadow beasts, unearth ancient relic chests, level up your warrior, and slay the Ancient Stone Golem.
              </p>
            </div>

            <div className={styles.controlsCheatSheet}>
              <div className={styles.controlRow}>
                <span>Move Warrior</span>
                <span className={styles.keyBadge}>W A S D / Joystick</span>
              </div>
              <div className={styles.controlRow}>
                <span>Sprint</span>
                <span className={styles.keyBadge}>Shift</span>
              </div>
              <div className={styles.controlRow}>
                <span>3-Hit Sword Attack</span>
                <span className={styles.keyBadge}>J / Click</span>
              </div>
              <div className={styles.controlRow}>
                <span>Shield Block (80% def)</span>
                <span className={styles.keyBadge}>Hold K</span>
              </div>
              <div className={styles.controlRow}>
                <span>Arcane Magic Bolt</span>
                <span className={styles.keyBadge}>E</span>
              </div>
              <div className={styles.controlRow}>
                <span>Dodge Roll (I-Frames)</span>
                <span className={styles.keyBadge}>C / Space</span>
              </div>
              <div className={styles.controlRow}>
                <span>Heal Potion</span>
                <span className={styles.keyBadge}>Q</span>
              </div>
              <div className={styles.controlRow}>
                <span>Orbit Camera</span>
                <span className={styles.keyBadge}>Drag Screen</span>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.btnPrimary} onClick={handleStartGame}>
                <PlayIcon size={16} />
                <span>Embark on Adventure</span>
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
              <h2 className={styles.modalTitle}>GAME PAUSED</h2>
              <p className={styles.modalSubtitle}>Catch your breath, warrior.</p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Level</span>
                <span className={styles.statVal}>Lv. {playerStats.level}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Weapon</span>
                <span className={styles.statVal}>{playerStats.equippedWeapon}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Health</span>
                <span className={styles.statVal}>{playerStats.hp} / {playerStats.maxHp}</span>
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
              <button className={styles.btnSecondary} onClick={handleToggleMute}>
                {isMuted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
                <span>{isMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
              </button>
              <button className={styles.btnSecondary} onClick={handleRestart}>
                <RotateCcwIcon size={16} />
                <span>Restart Game</span>
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
              <h2 className={styles.modalTitle}>FALLEN IN BATTLE</h2>
              <p className={styles.modalSubtitle}>
                You were vanquished by the {killerName}. The realm awaits your return.
              </p>
            </div>

            <div className={styles.statGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Warrior Level</span>
                <span className={styles.statVal}>Lv. {playerStats.level}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Attack Power</span>
                <span className={styles.statVal}>{playerStats.attackPower}</span>
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

      {/* 4. Victory Screen */}
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
