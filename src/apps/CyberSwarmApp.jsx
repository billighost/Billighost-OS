/**
 * CyberSwarm: Rogue Overdrive — Top-Down 360° Bullet-Heaven Rogue-Lite Horde Survivor
 * Billighost OS Custom High-Polish Experience
 * Zero emojis, 100% custom SVG icons, ultra-responsive layout down to 320x240
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CyberSwarmEngine, drawCyberOperative } from '../services/games/CyberSwarmEngine';
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

const POWERUP_LABELS = {
  nuke: 'NUCLEAR PURGE',
  magnet: 'GEM MAGNET',
  heal: 'NANITE REPAIR',
  overdrive: 'OVERDRIVE ENGAGED',
  shield: 'AEGIS SHIELD',
};

const DEFAULT_STATS = {
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
    novaPulse: { level: 0 },
  },
  autoAim: true,
  wave: 1,
  waveState: 'banner_start',
  isBossWave: false,
  critChance: 0,
  buffs: { shieldTimer: 0, overdriveTimer: 0 },
  skinTier: 1,
  upgradeCounts: { statSpeed: 0, statMagnet: 0, statHealth: 0, statCrit: 0 },
};

export default function CyberSwarmApp({ playClick = () => {} }) {
  const canvasRef = useRef(null);
  const engineRef = useRef(null);
  const keysRef = useRef({});
  const inputLoopRef = useRef(null);
  const previousStateRef = useRef('playing');
  const powerupTimeoutRef = useRef(null);
  const profilePreviewCanvasRef = useRef(null);
  const profileAnimRef = useRef(null);
  const cheatKeyRef = useRef({ count: 0, lastTime: 0 });

  // Game UI State: 'start' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory' | 'profile'
  const [gameState, setGameState] = useState('start');
  const [isMuted, setIsMuted] = useState(false);

  // Live Operative Stats
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Level-up Card Selection Options
  const [levelUpOptions, setLevelUpOptions] = useState([]);

  // Boss Health Status
  const [bossData, setBossData] = useState({ active: false, hp: 1200, maxHp: 1200, phase: 1, type: 'titan' });

  // Wave banner (danger-text callouts at the start/end of each wave)
  const [waveBanner, setWaveBanner] = useState({ visible: false, kind: 'start', wave: 1, isBoss: false });

  // Transient powerup pickup toast
  const [powerupToast, setPowerupToast] = useState(null);

  // Dash cooldown state for touch button feedback
  const [dashOnCooldown, setDashOnCooldown] = useState(false);

  // Virtual Joystick State
  const joystickRef = useRef({ active: false, startX: 0, startY: 0, dx: 0, dy: 0 });

  const buildEngineCallbacks = useCallback(() => ({
    onStatsUpdate: (newStats) => setStats({ ...newStats }),
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
          type: boss.type || 'titan',
        });
      } else {
        setBossData(prev => ({ ...prev, active: false }));
      }
    },
    onWaveBanner: (banner) => setWaveBanner(prev => ({ ...prev, ...banner })),
    onPowerup: (type) => {
      if (powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
      setPowerupToast({ type, key: Date.now() });
      powerupTimeoutRef.current = setTimeout(() => setPowerupToast(null), 2000);
    },
    onGameOver: () => setGameState('gameover'),
    onVictory: () => setGameState('victory'),
  }), []);

  // Game Lifecycle Actions
  const handleStartGame = useCallback(() => {
    playClick();
    setGameState('playing');
    if (engineRef.current) engineRef.current.start();
  }, [playClick]);

  const handlePause = useCallback(() => {
    playClick();
    setGameState('paused');
    if (engineRef.current) engineRef.current.pause();
  }, [playClick]);

  const handleResume = useCallback(() => {
    playClick();
    setGameState('playing');
    if (engineRef.current) engineRef.current.resume();
  }, [playClick]);

  // Initialize CyberSwarmEngine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new CyberSwarmEngine(canvasRef.current, buildEngineCallbacks());

    engineRef.current = engine;
    if (typeof window !== 'undefined') window.__cyberEngine = engine;

    const updateInput = () => {
      if (engineRef.current) {
        let mx = 0;
        let my = 0;
        const k = keysRef.current;

        if (k['KeyW'] || k['ArrowUp']) my -= 1;
        if (k['KeyS'] || k['ArrowDown']) my += 1;
        if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
        if (k['KeyD'] || k['ArrowRight']) mx += 1;

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
      if (typeof window !== 'undefined') window.__cyberEngine = null;
      if (inputLoopRef.current) cancelAnimationFrame(inputLoopRef.current);
      if (powerupTimeoutRef.current) clearTimeout(powerupTimeoutRef.current);
      engine.destroy();
      engineRef.current = null;
    };
  }, [buildEngineCallbacks]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;

      if (e.code === 'Space') {
        e.preventDefault();
        if (engineRef.current && (gameState === 'playing' || gameState === 'start')) {
          if (gameState === 'start') handleStartGame();
          else engineRef.current.dash();
        }
      }

      if (e.code === 'KeyQ') {
        if (engineRef.current) {
          const enabled = engineRef.current.toggleAutoAim();
          setStats(prev => ({ ...prev, autoAim: enabled }));
        }
      }

      // CHEAT CODE: tap H three times in quick succession to fully top off
      // the XP bar (whatever amount is needed) and trigger a level-up.
      if (e.code === 'KeyH' && gameState === 'playing') {
        const now = performance.now();
        const cheat = cheatKeyRef.current;
        if (now - cheat.lastTime > 1200) cheat.count = 0;
        cheat.count += 1;
        cheat.lastTime = now;

        if (cheat.count >= 3) {
          cheat.count = 0;
          if (engineRef.current) engineRef.current.cheatFillXP();
        }
      }

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

  // Animate the ship preview on the character/profile screen
  useEffect(() => {
    if (gameState !== 'profile') return undefined;
    const canvas = profilePreviewCanvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const size = canvas.clientWidth || 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let angle = 0;
    const tick = () => {
      angle += 0.012;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(1.7, 1.7);
      ctx.rotate(Math.sin(angle) * 0.5);
      drawCyberOperative(ctx, stats.skinTier);
      ctx.restore();
      profileAnimRef.current = requestAnimationFrame(tick);
    };
    profileAnimRef.current = requestAnimationFrame(tick);

    return () => {
      if (profileAnimRef.current) cancelAnimationFrame(profileAnimRef.current);
    };
  }, [gameState, stats.skinTier]);

  const handleRestart = () => {
    playClick();
    if (!canvasRef.current) return;

    if (engineRef.current) engineRef.current.destroy();

    const engine = new CyberSwarmEngine(canvasRef.current, buildEngineCallbacks());

    engineRef.current = engine;
    setBossData({ active: false, hp: 1200, maxHp: 1200, phase: 1, type: 'titan' });
    setWaveBanner({ visible: false, kind: 'start', wave: 1, isBoss: false });
    setPowerupToast(null);
    setGameState('playing');
    engine.start();
  };

  const handleSelectUpgrade = (upgradeId) => {
    playClick();
    if (engineRef.current) engineRef.current.applyUpgrade(upgradeId);
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
    if (engineRef.current) engineRef.current.dash();
  };

  const handleOpenProfile = () => {
    playClick();
    previousStateRef.current = gameState;
    if (engineRef.current && gameState === 'playing') engineRef.current.pause();
    setGameState('profile');
  };

  const handleCloseProfile = () => {
    playClick();
    const restoreState = previousStateRef.current === 'profile' ? 'playing' : previousStateRef.current;
    if (engineRef.current && restoreState === 'playing') engineRef.current.resume();
    setGameState(restoreState);
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
    joystickRef.current = { active: true, startX: touch.clientX, startY: touch.clientY, dx: 0, dy: 0 };
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
    joystickRef.current.dx = Math.cos(angle) * (clampedDist / maxRadius);
    joystickRef.current.dy = Math.sin(angle) * (clampedDist / maxRadius);
  };

  const handleTouchEnd = () => {
    joystickRef.current.active = false;
    joystickRef.current.dx = 0;
    joystickRef.current.dy = 0;
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const hpPercent = Math.max(0, Math.min(100, (stats.hp / stats.maxHp) * 100));
  const expPercent = Math.max(0, Math.min(100, (stats.exp / stats.expNext) * 100));
  const weaponSlots = [
    { key: 'pulseRifle', label: 'Pulse' },
    { key: 'teslaCoil', label: 'Tesla' },
    { key: 'orbitalBlades', label: 'Orbit' },
    { key: 'railgun', label: 'Rail' },
    { key: 'clusterMines', label: 'Mines' },
    { key: 'novaPulse', label: 'Nova' },
  ];

  const upgradeIconFor = (id) => {
    switch (id) {
      case 'pulseRifle': return <ZapIcon size={20} />;
      case 'teslaCoil': return <SparklesIcon size={20} />;
      case 'orbitalBlades': return <ShieldIcon size={20} />;
      case 'railgun': return <TargetLockIcon size={20} />;
      case 'clusterMines': return <FlameIcon size={20} />;
      case 'novaPulse': return <SparklesIcon size={20} />;
      default: return <ZapIcon size={20} />;
    }
  };

  return (
    <div
      className={styles.container}
      onMouseMove={handleMouseMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas ref={canvasRef} className={styles.gameCanvas} />

      {/* WAVE DANGER-TEXT BANNER */}
      {waveBanner.visible && (
        <div className={`${styles.waveBanner} ${waveBanner.kind === 'clear' ? styles.waveBannerClear : styles.waveBannerStart}`}>
          {waveBanner.kind === 'start' ? (
            <>
              <div className={styles.waveBannerEyebrow}>{waveBanner.isBoss ? 'WARNING — HOSTILE SIGNATURE' : 'INCOMING SWARM'}</div>
              <div className={styles.waveBannerTitle}>{waveBanner.isBoss ? 'BOSS WAVE' : `WAVE ${waveBanner.wave}`}</div>
            </>
          ) : (
            <>
              <div className={styles.waveBannerEyebrow}>SECTOR SECURE</div>
              <div className={styles.waveBannerTitle}>WAVE {waveBanner.wave} CLEARED</div>
            </>
          )}
        </div>
      )}

      {/* POWERUP TOAST */}
      {powerupToast && (
        <div key={powerupToast.key} className={styles.powerupToast}>
          {POWERUP_LABELS[powerupToast.type] || 'SYSTEM BOOST'}
        </div>
      )}

      {/* TOP HUD BAR */}
      <div className={styles.hudTopBar}>
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
          {(stats.buffs.shieldTimer > 0 || stats.buffs.overdriveTimer > 0) && (
            <div className={styles.buffStack}>
              {stats.buffs.shieldTimer > 0 && (
                <div className={`${styles.hudBadge} ${styles.buffShield}`} title="Aegis Shield Active">
                  <ShieldIcon size={12} />
                  <span>{stats.buffs.shieldTimer.toFixed(1)}s</span>
                </div>
              )}
              {stats.buffs.overdriveTimer > 0 && (
                <div className={`${styles.hudBadge} ${styles.buffOverdrive}`} title="Overdrive Active">
                  <FlameIcon size={12} />
                  <span>{stats.buffs.overdriveTimer.toFixed(1)}s</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.hudCenter}>
          <div className={styles.hudBadge} title="Current Wave">
            <TargetLockIcon size={14} />
            <span>WAVE {stats.wave}</span>
          </div>
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

        <div className={styles.hudRight}>
          <button
            className={styles.hudBtn}
            onClick={handleOpenProfile}
            title="Operative Profile"
          >
            <ShieldIcon size={16} />
          </button>
          <button
            className={`${styles.hudBtn} ${stats.autoAim ? styles.active : ''}`}
            onClick={handleToggleAutoAim}
            title={stats.autoAim ? 'Auto-Aim Active [Q]' : 'Manual Mouse Aim [Q]'}
          >
            {stats.autoAim ? <TargetLockIcon size={16} /> : <CrosshairIcon size={16} />}
          </button>
          <button className={styles.hudBtn} onClick={handleToggleMute} title={isMuted ? 'Unmute Audio' : 'Mute Audio'}>
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
            <span>
              {bossData.type === 'warlord' ? 'WARNING: WARLORD MECH' : 'WARNING: CYBER-TITAN'} [PHASE {bossData.phase}]
            </span>
            <span>{Math.round(bossData.hp)} / {bossData.maxHp}</span>
          </div>
          <div className={styles.bossTrack}>
            <div className={styles.bossFill} style={{ width: `${Math.max(0, (bossData.hp / bossData.maxHp) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* BOTTOM HUD: WEAPONS LOADOUT & TOUCH DASH */}
      <div className={styles.hudBottomBar}>
        <div className={styles.weaponsLoadout}>
          {weaponSlots.map(({ key, label }) => {
            const lvl = stats.weapons[key]?.level || 0;
            return (
              <div key={key} className={`${styles.weaponSlot} ${lvl > 0 ? styles.unlocked : ''}`}>
                <span className={styles.weaponSlotName}>{label}</span>
                <span className={styles.weaponSlotLevel}>{lvl > 0 ? `L${lvl}` : '-'}</span>
              </div>
            );
          })}
        </div>

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

            <p className={styles.modalSubtitle} style={{ marginTop: -8, marginBottom: 16 }}>
              Survive escalating waves, chain-detonate volatile drones, collect powerups,
              and take down the mega-bosses that show up every 5th wave.
            </p>

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
                <div key={opt.id} className={styles.upgradeCard} onClick={() => handleSelectUpgrade(opt.id)}>
                  <div className={styles.upgradeIconBadge}>{upgradeIconFor(opt.id)}</div>
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
          OPERATIVE PROFILE / CHARACTER SCREEN
          ==================================================================== */}
      {gameState === 'profile' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle}>OPERATIVE PROFILE</h2>
            <p className={styles.modalSubtitle}>Your chassis visibly evolves as you level up</p>

            <div className={styles.profileLayout}>
              <div className={styles.profilePreviewWrap}>
                <canvas ref={profilePreviewCanvasRef} className={styles.profilePreviewCanvas} />
                <div className={styles.profileTierTag}>CHASSIS TIER {stats.skinTier}</div>
              </div>

              <div className={styles.profileStatsList}>
                <div className={styles.profileStatRow}>
                  <span>Level</span>
                  <span>{stats.level}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Max HP</span>
                  <span>{stats.maxHp}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Crit Chance</span>
                  <span>{Math.round(stats.critChance * 100)}%</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Speed Augments</span>
                  <span>{stats.upgradeCounts.statSpeed}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Magnet Augments</span>
                  <span>{stats.upgradeCounts.statMagnet}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Armor Augments</span>
                  <span>{stats.upgradeCounts.statHealth}</span>
                </div>
                <div className={styles.profileStatRow}>
                  <span>Wave Reached</span>
                  <span>{stats.wave}</span>
                </div>
              </div>
            </div>

            <div className={styles.upgradeGrid}>
              {weaponSlots.map(({ key, label }) => {
                const lvl = stats.weapons[key]?.level || 0;
                return (
                  <div key={key} className={styles.upgradeCard} style={{ cursor: 'default' }}>
                    <div className={styles.upgradeIconBadge}>{upgradeIconFor(key)}</div>
                    <div className={styles.upgradeName}>{label}</div>
                    <div className={styles.upgradeLevelTag}>{lvl > 0 ? `Level ${lvl}` : 'Not Equipped'}</div>
                  </div>
                );
              })}
            </div>

            <button className={styles.primaryBtn} onClick={handleCloseProfile}>
              <PlayIcon size={18} />
              <span>{previousStateRef.current === 'playing' ? 'RESUME OVERDRIVE' : 'CLOSE'}</span>
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
                <div className={styles.statBoxLabel}>Wave Reached</div>
                <div className={styles.statBoxVal}>{stats.wave}</div>
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
          VICTORY MODAL (BOSS SLAIN)
          ==================================================================== */}
      {gameState === 'victory' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <h2 className={styles.modalTitle} style={{ color: '#38bdf8' }}>SECTOR PURGED: VICTORY</h2>
            <p className={styles.modalSubtitle}>Hostile core eliminated! The neon grid is secure.</p>

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
