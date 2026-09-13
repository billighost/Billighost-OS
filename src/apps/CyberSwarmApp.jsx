/**
 * CyberSwarm: Rogue Overdrive — Top-Down 360° Bullet-Heaven Rogue-Lite Horde Survivor
 * Billighost OS Custom High-Polish Experience
 * Zero emojis, 100% custom SVG icons, ultra-responsive layout down to 320x240
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CyberSwarmEngine } from '../services/games/CyberSwarmEngine';
import { cyberSwarmAudio } from '../services/games/CyberSwarmAudio';
import {
  ZapIcon,
  CrosshairIcon,
  ShieldIcon,
  FlameIcon,
  PlayIcon,
  PauseIcon,
  Volume2Icon,
  VolumeXIcon,
  RotateCcwIcon,
  SkullIcon,
  TargetLockIcon,
  SparklesIcon,
} from '../components/Icons';
import styles from './CyberSwarmApp.module.css';

export default function CyberSwarmApp({ playClick = () => {} }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const keysRef = useRef({});
  const inputLoopRef = useRef(null);

  // Game UI State: 'start' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory'
  const [gameState, setGameState] = useState('start');
  const [isMuted, setIsMuted] = useState(false);

  // Live Operative Stats
  const [stats, setStats] = useState({
    hp: 100,
    maxHp: 100,
    level: 1,
    exp: 0,
    expNext: 40,
    score: 0,
    kills: 0,
    time: 0,
    weapons: {
      pulseRifle: { level: 1 },
      teslaCoil: { level: 0 },
      orbitalBlades: { level: 0 },
      railgun: { level: 0 },
      clusterMines: { level: 0 },
    },
    autoAim: true,
  });

  // Level-up Card Selection Options
  const [levelUpOptions, setLevelUpOptions] = useState([]);

  // Boss Health Status
  const [bossData, setBossData] = useState({
    active: false,
    hp: 1200,
    maxHp: 1200,
    phase: 1,
  });

  // Dash cooldown state for touch button feedback
  const [dashOnCooldown, setDashOnCooldown] = useState(false);

  // Virtual Joystick State
  const joystickRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    dx: 0,
    dy: 0,
  });

  // Game Lifecycle Actions
  const handleStartGame = useCallback(() => {
    playClick();
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.start();
    }
  }, [playClick]);

  const handlePause = useCallback(() => {
    playClick();
    setGameState('paused');
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, [playClick]);

  const handleResume = useCallback(() => {
    playClick();
    setGameState('playing');
    if (engineRef.current) {
      engineRef.current.resume();
    }
  }, [playClick]);

  // Initialize CyberSwarmEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CyberSwarmEngine(canvasRef.current, {
      onStatsUpdate: (newStats) => {
        setStats({ ...newStats });
      },
      onLevelUp: (options) => {
        setLevelUpOptions(options);
        setGameState('levelup');
      },
      onBossUpdate: (boss) => {
        if (boss && boss.hp > 0) {
          setBossData({
            active: true,
            hp: Math.max(0, boss.hp),
            maxHp: boss.maxHp,
            phase: boss.phase || 1,
          });
        } else {
          setBossData(prev => ({ ...prev, active: false }));
        }
      },
      onGameOver: () => {
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    engineRef.current = engine;
    if (typeof window !== 'undefined') {
      window.__cyberEngine = engine;
    }

    // Continuous Input Loop for ultra-smooth 60fps movement vector
    const updateInput = () => {
      if (engineRef.current) {
        let mx = 0;
        let my = 0;
        const k = keysRef.current;

        if (k['KeyW'] || k['ArrowUp']) my -= 1;
        if (k['KeyS'] || k['ArrowDown']) my += 1;
        if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
        if (k['KeyD'] || k['ArrowRight']) mx += 1;

        // Virtual joystick input superposition
        if (joystickRef.current.active) {
          mx += joystickRef.current.dx;
          my += joystickRef.current.dy;
        }

        engineRef.current.setMovement(mx, my);
        setDashOnCooldown(engineRef.current.player.dashCooldown > 0);
      }
      inputLoopRef.current = requestAnimationFrame(updateInput);
    };

    inputLoopRef.current = requestAnimationFrame(updateInput);

    return () => {
      if (typeof window !== 'undefined') {
        window.__cyberEngine = null;
      }
      if (inputLoopRef.current) cancelAnimationFrame(inputLoopRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;

      // Dash on Spacebar
      if (e.code === 'Space') {
        e.preventDefault();
        if (engineRef.current && (gameState === 'playing' || gameState === 'start')) {
          if (gameState === 'start') handleStartGame();
          else engineRef.current.dash();
        }
      }

      // Auto-Aim Toggle on 'Q'
      if (e.code === 'KeyQ') {
        if (engineRef.current) {
          const enabled = engineRef.current.toggleAutoAim();
          setStats(prev => ({ ...prev, autoAim: enabled }));
        }
      }

      // Pause toggle on Escape or 'P'
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'playing') handlePause();
        else if (gameState === 'paused') handleResume();
      }
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, handlePause, handleResume, handleStartGame]);

  const handleRestart = () => {
    playClick();
    if (!canvasRef.current) return;

    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const engine = new CyberSwarmEngine(canvasRef.current, {
      onStatsUpdate: (newStats) => {
        setStats({ ...newStats });
      },
      onLevelUp: (options) => {
        setLevelUpOptions(options);
        setGameState('levelup');
      },
      onBossUpdate: (boss) => {
        if (boss && boss.hp > 0) {
          setBossData({
            active: true,
            hp: Math.max(0, boss.hp),
            maxHp: boss.maxHp,
            phase: boss.phase || 1,
          });
        } else {
          setBossData(prev => ({ ...prev, active: false }));
        }
      },
      onGameOver: () => {
        setGameState('gameover');
      },
      onVictory: () => {
        setGameState('victory');
      },
    });

    engineRef.current = engine;
    setGameState('playing');
    engine.start();
  };

  const handleSelectUpgrade = (upgradeId) => {
    playClick();
    if (engineRef.current) {
      engineRef.current.applyUpgrade(upgradeId);
    }
    setGameState('playing');
  };

  const handleToggleMute = () => {
    playClick();
    const muted = cyberSwarmAudio.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleAutoAim = () => {
    playClick();
    if (engineRef.current) {
      const enabled = engineRef.current.toggleAutoAim();
      setStats(prev => ({ ...prev, autoAim: enabled }));
    }
  };

  const handleDashClick = () => {
    if (engineRef.current) {
      engineRef.current.dash();
    }
  };

  // Mouse Movement Aiming
  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    engineRef.current.setMousePos(screenX, screenY);
  }, []);

  // Touch Virtual Joystick Controls
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    joystickRef.current = {
      active: true,
      startX: touch.clientX,
      startY: touch.clientY,
      dx: 0,
      dy: 0,
    };
  };

  const handleTouchMove = (e) => {
    if (!joystickRef.current.active) return;
    const touch = e.touches[0];
    const rawDx = touch.clientX - joystickRef.current.startX;
    const rawDy = touch.clientY - joystickRef.current.startY;
    const dist = Math.hypot(rawDx, rawDy);
    const maxRadius = 40;

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(rawDy, rawDx);
    const dx = Math.cos(angle) * (clampedDist / maxRadius);
    const dy = Math.sin(angle) * (clampedDist / maxRadius);

    joystickRef.current.dx = dx;
    joystickRef.current.dy = dy;
  };

  const handleTouchEnd = () => {
    joystickRef.current.active = false;
    joystickRef.current.dx = 0;
    joystickRef.current.dy = 0;
  };

  // Helper formatting
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const expPercent = Math.max(0, Math.min(100, (stats.exp / stats.expNext) * 100));

  return (
    <div
      className={styles.container}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className={styles.gameCanvas} />

      {/* TOP HUD BAR */}
      <div className={styles.hudTopBar}>
        {/* Left: Health & EXP Bars */}
        <div className={styles.hudLeft}>
          <div className={styles.hudCard}>
            <div className={styles.meterGroup}>
              <div className={styles.meterRow}>
                <span className={styles.meterLabel}>Operative HP</span>
                <span className={styles.meterVal}>{stats.hp}/{stats.maxHp}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.hpBarFill} style={{ width: `${hpPercent}%` }} />
              </div>
              <div className={styles.meterRow} style={{ marginTop: 2 }}>
                <span className={styles.meterLabel} style={{ color: '#38bdf8' }}>LVL {stats.level} EXP</span>
                <span className={styles.meterVal}>{stats.exp}/{stats.expNext}</span>
              </div>
              <div className={styles.barTrack}>
                <div className={styles.expBarFill} style={{ width: `${expPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Center: Mission Clock & Elimination Stats */}
        <div className={styles.hudCenter}>
          <div className={`${styles.hudBadge} ${styles.timer}`} title="Mission Elapsed Time">
            <SparklesIcon size={14} />
            <span>{formatTime(stats.time)}</span>
          </div>
          <div className={`${styles.hudBadge} ${styles.kills}`} title="Swarm Units Slain">
            <SkullIcon size={14} />
            <span>{stats.kills}</span>
          </div>
          <div className={styles.hudBadge} title="Tactical Score">
            <ZapIcon size={14} />
            <span>{stats.score}</span>
          </div>
        </div>

        {/* Right: Auto-Aim Toggle, Audio & Pause */}
        <div className={styles.hudRight}>
          <button
            className={`${styles.hudBtn} ${stats.autoAim ? styles.active : ''}`}
            onClick={handleToggleAutoAim}
            title={stats.autoAim ? 'Auto-Aim Active [Q]' : 'Manual Mouse Aim [Q]'}
          >
            {stats.autoAim ? <TargetLockIcon size={16} /> : <CrosshairIcon size={16} />}
          </button>
          <button
            className={styles.hudBtn}
            onClick={handleToggleMute}
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeXIcon size={16} /> : <Volume2Icon size={16} />}
          </button>
          {gameState === 'playing' ? (
            <button className={styles.hudBtn} onClick={handlePause} title="Tactical Pause [Esc]">
              <PauseIcon size={16} />
            </button>
          ) : gameState === 'paused' ? (
            <button className={styles.hudBtn} onClick={handleResume} title="Resume Mission [Esc]">
              <PlayIcon size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* BOSS HEALTH BAR OVERLAY */}
      {bossData.active && (
        <div className={styles.bossHpBarContainer}>
          <div className={styles.bossHeader}>
            <span>WARNING: CYBER-TITAN GIGA BOSS [PHASE {bossData.phase}]</span>
            <span>{Math.round(bossData.hp)} / {bossData.maxHp}</span>
          </div>
          <div className={styles.bossTrack}>
            <div
              className={styles.bossFill}
              style={{ width: `${Math.max(0, (bossData.hp / bossData.maxHp) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* BOTTOM HUD: WEAPONS LOADOUT & TOUCH DASH */}
      <div className={styles.hudBottomBar}>
        {/* Active Weapon Grid */}
        <div className={styles.weaponsLoadout}>
          <div className={`${styles.weaponSlot} ${stats.weapons.pulseRifle.level > 0 ? styles.unlocked : ''}`}>
            <span className={styles.weaponSlotName}>Pulse</span>
            <span className={styles.weaponSlotLevel}>L{stats.weapons.pulseRifle.level}</span>
          </div>
          <div className={`${styles.weaponSlot} ${stats.weapons.teslaCoil.level > 0 ? styles.unlocked : ''}`}>
            <span className={styles.weaponSlotName}>Tesla</span>
            <span className={styles.weaponSlotLevel}>{stats.weapons.teslaCoil.level > 0 ? `L${stats.weapons.teslaCoil.level}` : '-'}</span>
          </div>
          <div className={`${styles.weaponSlot} ${stats.weapons.orbitalBlades.level > 0 ? styles.unlocked : ''}`}>
            <span className={styles.weaponSlotName}>Orbit</span>
            <span className={styles.weaponSlotLevel}>{stats.weapons.orbitalBlades.level > 0 ? `L${stats.weapons.orbitalBlades.level}` : '-'}</span>
          </div>
          <div className={`${styles.weaponSlot} ${stats.weapons.railgun.level > 0 ? styles.unlocked : ''}`}>
            <span className={styles.weaponSlotName}>Rail</span>
            <span className={styles.weaponSlotLevel}>{stats.weapons.railgun.level > 0 ? `L${stats.weapons.railgun.level}` : '-'}</span>
          </div>
          <div className={`${styles.weaponSlot} ${stats.weapons.clusterMines.level > 0 ? styles.unlocked : ''}`}>
            <span className={styles.weaponSlotName}>Mines</span>
            <span className={styles.weaponSlotLevel}>{stats.weapons.clusterMines.level > 0 ? `L${stats.weapons.clusterMines.level}` : '-'}</span>
          </div>
        </div>

        {/* Dash Action Button for Touch / Quick Access */}
        <div className={styles.touchControls}>
          <button
            className={`${styles.dashBtn} ${dashOnCooldown ? styles.onCooldown : ''}`}
            onClick={handleDashClick}
            title="Ghost Dash [Space]"
          >
            <FlameIcon size={18} />
            <span>DASH</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          START MISSION MODAL
          ==================================================================== */}
      {gameState === 'start' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h1 className={styles.modalTitle}>CyberSwarm: Rogue Overdrive</h1>
            <p className={styles.modalSubtitle}>
              360° Bullet-Heaven Horde Survivor in the Neon Underbelly
            </p>

            <div className={styles.controlsGuide}>
              <div className={styles.controlItem}>
                <kbd className={styles.keyKbd}>W</kbd>
                <kbd className={styles.keyKbd}>A</kbd>
                <kbd className={styles.keyKbd}>S</kbd>
                <kbd className={styles.keyKbd}>D</kbd>
                <span>Move Operative</span>
              </div>
              <div className={styles.controlItem}>
                <kbd className={styles.keyKbd}>Space</kbd>
                <span>Ghost Dash</span>
              </div>
              <div className={styles.controlItem}>
                <kbd className={styles.keyKbd}>Q</kbd>
                <span>Toggle Auto-Aim</span>
              </div>
              <div className={styles.controlItem}>
                <kbd className={styles.keyKbd}>Mouse</kbd>
                <span>Directional Aim</span>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleStartGame}>
              <PlayIcon size={18} />
              <span>DEPLOY OPERATIVE</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          LEVEL-UP AUGMENT DRAFT MODAL (3 Unique Cards)
          ==================================================================== */}
      {gameState === 'levelup' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>AUGMENT SYSTEM READY</h2>
            <p className={styles.modalSubtitle}>Select one cybernetic upgrade to synthesize into your loadout</p>

            <div className={styles.upgradeGrid}>
              {levelUpOptions.map((opt) => (
                <div
                  key={opt.id}
                  className={styles.upgradeCard}
                  onClick={() => handleSelectUpgrade(opt.id)}
                >
                  <div className={styles.upgradeIconBadge}>
                    {opt.id === 'pulseRifle' ? <ZapIcon size={20} /> :
                     opt.id === 'teslaCoil' ? <SparklesIcon size={20} /> :
                     opt.id === 'orbitalBlades' ? <ShieldIcon size={20} /> :
                     opt.id === 'railgun' ? <TargetLockIcon size={20} /> :
                     opt.id === 'clusterMines' ? <FlameIcon size={20} /> :
                     <ZapIcon size={20} />}
                  </div>
                  <div className={styles.upgradeName}>{opt.name}</div>
                  <div className={styles.upgradeDesc}>{opt.desc}</div>
                  <div className={styles.upgradeLevelTag}>
                    {opt.type === 'weapon' ? `Tier ${opt.currentLevel + 1}` : 'Stat Upgrade'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TACTICAL PAUSE MODAL
          ==================================================================== */}
      {gameState === 'paused' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>TACTICAL PAUSE</h2>
            <p className={styles.modalSubtitle}>Mission clock halted</p>
            <button className={styles.primaryBtn} onClick={handleResume}>
              <PlayIcon size={18} />
              <span>RESUME OVERDRIVE</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          GAME OVER MODAL
          ==================================================================== */}
      {gameState === 'gameover' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle} style={{ color: '#ef4444' }}>OPERATIVE COMPROMISED</h2>
            <p className={styles.modalSubtitle}>Neural link severed by swarm surge</p>

            <div className={styles.statsSummary}>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Survival Time</div>
                <div className={styles.statBoxVal}>{formatTime(stats.time)}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Swarm Slain</div>
                <div className={styles.statBoxVal}>{stats.kills}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Final Score</div>
                <div className={styles.statBoxVal}>{stats.score}</div>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleRestart}>
              <RotateCcwIcon size={18} />
              <span>RE-ENGAGE SWARM</span>
            </button>
          </div>
        </div>
      )}

      {/* ====================================================================
          VICTORY MODAL (CYBER-TITAN BOSS SLAIN)
          ==================================================================== */}
      {gameState === 'victory' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle} style={{ color: '#38bdf8' }}>SECTOR PURGED: VICTORY</h2>
            <p className={styles.modalSubtitle}>Cyber-Titan Core eliminated! The neon grid is secure.</p>

            <div className={styles.statsSummary}>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Clear Time</div>
                <div className={styles.statBoxVal}>{formatTime(stats.time)}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Swarm Slain</div>
                <div className={styles.statBoxVal}>{stats.kills}</div>
              </div>
              <div className={styles.statBox}>
                <div className={styles.statBoxLabel}>Dominance Score</div>
                <div className={styles.statBoxVal}>{stats.score}</div>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleRestart}>
              <RotateCcwIcon size={18} />
              <span>COMMENCE NEW RUN</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
