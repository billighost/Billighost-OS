import { useState, useEffect, useRef, useCallback } from 'react';
import { SubwaySurgeEngine } from '../services/games/SubwaySurgeEngine';
import { subwayAudio } from '../services/games/SubwaySurgeAudio';
import {
  GamepadIcon,
  SubwayIcon,
  TrophyIcon,
  CoinsIcon,
  RocketIcon,
  MagnetIcon,
  ShieldIcon,
  SkateboardIcon,
  FlameIcon,
  SparklesIcon,
  SneakersIcon,
} from '../components/Icons';
import styles from './SubwaySurgeApp.module.css';

const STORAGE_KEY = 'billighost:subway-surge-data';

const CHAR_SKINS = [
  { id: 'cyber', name: 'Cyber Blue', price: 0, hoodie: 0x0284c7, pants: 0x0f172a, cap: 0xef4444 },
  { id: 'crimson', name: 'Volt Crimson', price: 50, hoodie: 0xe11d48, pants: 0x18181b, cap: 0xf59e0b },
  { id: 'emerald', name: 'Matrix Green', price: 120, hoodie: 0x10b981, pants: 0x064e3b, cap: 0x047857 },
  { id: 'sunset', name: 'Solar Eclipse', price: 250, hoodie: 0x8b5cf6, pants: 0x2e1065, cap: 0xec4899 },
];

const BOARD_SKINS = [
  { id: 'cyan', name: 'Cyan Glider', price: 0, deck: 0x06b6d4, glow: 0x22d3ee },
  { id: 'solar', name: 'Solar Flare', price: 80, deck: 0xf59e0b, glow: 0xfbbf24 },
  { id: 'toxic', name: 'Toxic Vapor', price: 150, deck: 0x84cc16, glow: 0xa3e635 },
  { id: 'void', name: 'Void Phantom', price: 300, deck: 0x9333ea, glow: 0xc084fc },
];

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    highScore: 0,
    totalCoins: 0,
    unlockedCharSkins: ['cyber'],
    unlockedBoardSkins: ['cyan'],
    selectedCharSkin: 'cyber',
    selectedBoardSkin: 'cyan',
    soundEnabled: true,
  };
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function SubwaySurgeApp({ playClick = () => {} }) {
  // Game View State: 'start' | 'playing' | 'paused' | 'gameover' | 'locker'
  const [gameState, setGameState] = useState('start');

  // Stats
  const [score, setScore] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);

  // Powerups active: { [type]: remainingSeconds }
  const [powerups, setPowerups] = useState({});

  // Audio mute
  const [isMuted, setIsMuted] = useState(false);

  // Locker / Customization state
  const [lockerTab, setLockerTab] = useState('chars');
  const [unlockedCharSkins, setUnlockedCharSkins] = useState(['cyber']);
  const [unlockedBoardSkins, setUnlockedBoardSkins] = useState(['cyan']);
  const [selectedCharSkin, setSelectedCharSkin] = useState('cyber');
  const [selectedBoardSkin, setSelectedBoardSkin] = useState('cyan');

  // Container & Canvas Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Swipe gesture tracking
  const touchStartRef = useRef(null);

  // Load Saved Game Data
  useEffect(() => {
    const data = loadSavedData();
    setHighScore(data.highScore || 0);
    setTotalCoins(data.totalCoins || 0);
    setUnlockedCharSkins(data.unlockedCharSkins || ['cyber']);
    setUnlockedBoardSkins(data.unlockedBoardSkins || ['cyan']);
    setSelectedCharSkin(data.selectedCharSkin || 'cyber');
    setSelectedBoardSkin(data.selectedBoardSkin || 'cyan');
    setIsMuted(!data.soundEnabled);
    subwayAudio.setMuted(!data.soundEnabled);
  }, []);

  // Initialize Three.js Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const charDef = CHAR_SKINS.find(s => s.id === selectedCharSkin) || CHAR_SKINS[0];
    const boardDef = BOARD_SKINS.find(s => s.id === selectedBoardSkin) || BOARD_SKINS[0];

    const engine = new SubwaySurgeEngine(canvasRef.current, {
      onScoreUpdate: (currScore) => {
        setScore(currScore);
      },
      onCoinsUpdate: (c) => {
        setSessionCoins(c);
      },
      onPowerupChange: (type, duration) => {
        setPowerups(prev => {
          if (duration <= 0) {
            const next = { ...prev };
            delete next[type];
            return next;
          }
          return { ...prev, [type]: duration };
        });
      },
      onGameOver: (finalScore, earnedCoins) => {
        setGameState('gameover');
        setHighScore(prev => {
          const nextBest = Math.max(prev, finalScore);
          setTotalCoins(tCoins => {
            const newTotal = tCoins + earnedCoins;
            saveLocalData({
              highScore: nextBest,
              totalCoins: newTotal,
              unlockedCharSkins,
              unlockedBoardSkins,
              selectedCharSkin,
              selectedBoardSkin,
              soundEnabled: !isMuted,
            });
            return newTotal;
          });
          return nextBest;
        });
      },
    });

    engine.setSkins(
      { hoodie: charDef.hoodie, pants: charDef.pants, cap: charDef.cap },
      { deck: boardDef.deck, glow: boardDef.glow }
    );

    engineRef.current = engine;

    // Responsive Canvas Resize Observer
    const ro = new ResizeObserver(() => {
      engine.handleResize();
    });
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }

    return () => {
      ro.disconnect();
      engine.destroy();
      subwayAudio.stopMusic();
    };
  }, []);

  // Sync Skin Changes with Engine
  useEffect(() => {
    if (!engineRef.current) return;
    const charDef = CHAR_SKINS.find(s => s.id === selectedCharSkin) || CHAR_SKINS[0];
    const boardDef = BOARD_SKINS.find(s => s.id === selectedBoardSkin) || BOARD_SKINS[0];
    engineRef.current.setSkins(
      { hoodie: charDef.hoodie, pants: charDef.pants, cap: charDef.cap },
      { deck: boardDef.deck, glow: boardDef.glow }
    );
  }, [selectedCharSkin, selectedBoardSkin]);

  // Keyboard Navigation Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!engineRef.current) return;

      // When in play
      if (gameState === 'playing') {
        if (e.repeat) return; // Prevent key repeat flooding when holding keys down

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          engineRef.current.moveLeft();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          engineRef.current.moveRight();
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
          e.preventDefault();
          engineRef.current.jump();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          engineRef.current.slide();
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          engineRef.current.activateHoverboard();
        } else if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          handlePause();
        }
      } else if (gameState === 'start' || gameState === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleStartGame();
        }
      } else if (gameState === 'paused') {
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === ' ') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // Touch / Swipe Gestures on Canvas
  const handlePointerDown = (e) => {
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handlePointerUp = (e) => {
    if (!touchStartRef.current || !engineRef.current || gameState !== 'playing') return;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Double tap or fast click -> Hoverboard
    if (absDx < 12 && absDy < 12 && dt < 220) {
      engineRef.current.activateHoverboard();
      return;
    }

    const minSwipe = 24;
    if (absDx > absDy && absDx > minSwipe) {
      if (dx < 0) {
        engineRef.current.moveLeft();
      } else {
        engineRef.current.moveRight();
      }
    } else if (absDy > absDx && absDy > minSwipe) {
      if (dy < 0) {
        engineRef.current.jump();
      } else {
        engineRef.current.slide();
      }
    }
  };

  // Game Action Handlers
  const handleStartGame = () => {
    playClick();
    setScore(0);
    setSessionCoins(0);
    setPowerups({});
    setGameState('playing');
    engineRef.current?.start();
  };

  const handlePause = () => {
    playClick();
    setGameState('paused');
    engineRef.current?.pause();
  };

  const handleResume = () => {
    playClick();
    setGameState('playing');
    engineRef.current?.resume();
  };

  const handleToggleMute = () => {
    playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    subwayAudio.setMuted(nextMuted);
    saveLocalData({
      highScore,
      totalCoins,
      unlockedCharSkins,
      unlockedBoardSkins,
      selectedCharSkin,
      selectedBoardSkin,
      soundEnabled: !nextMuted,
    });
  };

  const handleSummonBoard = () => {
    playClick();
    engineRef.current?.activateHoverboard();
  };

  // Locker Actions
  const handleSelectCharSkin = (skin) => {
    playClick();
    if (unlockedCharSkins.includes(skin.id)) {
      setSelectedCharSkin(skin.id);
      saveLocalData({
        highScore,
        totalCoins,
        unlockedCharSkins,
        unlockedBoardSkins,
        selectedCharSkin: skin.id,
        selectedBoardSkin,
        soundEnabled: !isMuted,
      });
    } else if (totalCoins >= skin.price) {
      const newCoins = totalCoins - skin.price;
      const newUnlocked = [...unlockedCharSkins, skin.id];
      setTotalCoins(newCoins);
      setUnlockedCharSkins(newUnlocked);
      setSelectedCharSkin(skin.id);
      saveLocalData({
        highScore,
        totalCoins: newCoins,
        unlockedCharSkins: newUnlocked,
        unlockedBoardSkins,
        selectedCharSkin: skin.id,
        selectedBoardSkin,
        soundEnabled: !isMuted,
      });
      subwayAudio.playPowerupGet();
    }
  };

  const handleSelectBoardSkin = (skin) => {
    playClick();
    if (unlockedBoardSkins.includes(skin.id)) {
      setSelectedBoardSkin(skin.id);
      saveLocalData({
        highScore,
        totalCoins,
        unlockedCharSkins,
        unlockedBoardSkins,
        selectedCharSkin,
        selectedBoardSkin: skin.id,
        soundEnabled: !isMuted,
      });
    } else if (totalCoins >= skin.price) {
      const newCoins = totalCoins - skin.price;
      const newUnlocked = [...unlockedBoardSkins, skin.id];
      setTotalCoins(newCoins);
      setUnlockedBoardSkins(newUnlocked);
      setSelectedBoardSkin(skin.id);
      saveLocalData({
        highScore,
        totalCoins: newCoins,
        unlockedCharSkins,
        unlockedBoardSkins,
        selectedCharSkin,
        selectedBoardSkin: skin.id,
        soundEnabled: !isMuted,
      });
      subwayAudio.playPowerupGet();
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* Three.js 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      {/* Dynamic In-Game Glass HUD */}
      {gameState === 'playing' && (
        <div className={styles.hudOverlay}>
          {/* Top Row: Score, Coins, High Score & Controls */}
          <div className={styles.hudTop}>
            <div className={styles.hudTopLeft}>
              <div className={styles.statBadge}>
                <span className={styles.statLabel}>Score</span>
                <span className={styles.statValue}>{score}</span>
              </div>

              <div className={`${styles.statBadge} ${styles.coinBadge}`}>
                <span className={styles.statIcon}><CoinsIcon size={16} /></span>
                <span className={styles.statValue}>{sessionCoins}</span>
              </div>
            </div>

            <div className={styles.hudTopRight}>
              <div className={`${styles.statBadge} ${styles.highScoreBadge}`}>
                <span className={styles.statIcon}><TrophyIcon size={16} /></span>
                <span className={styles.statValue}>{highScore}</span>
              </div>

              <div className={styles.hudActions}>
                <button
                  className={styles.iconBtn}
                  onClick={handleToggleMute}
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  <SparklesIcon size={16} />
                </button>
                <button
                  className={styles.iconBtn}
                  onClick={handlePause}
                  title="Pause Game (Esc)"
                >
                  <SubwayIcon size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Middle Row: Active Power-Up Gauges Tray */}
          <div className={styles.hudMiddle}>
            <div className={styles.powerupTray}>
              {powerups.hoverboard && (
                <div className={styles.powerupMeter} style={{ borderColor: '#06b6d4' }}>
                  <span className={styles.powerupIcon} style={{ color: '#06b6d4' }}><SkateboardIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div
                      className={styles.powerupBarFill}
                      style={{ width: `${(powerups.hoverboard / 30) * 100}%`, background: '#06b6d4' }}
                    />
                  </div>
                </div>
              )}

              {powerups.jetpack && (
                <div className={styles.powerupMeter} style={{ borderColor: '#ef4444' }}>
                  <span className={styles.powerupIcon} style={{ color: '#ef4444' }}><RocketIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div
                      className={styles.powerupBarFill}
                      style={{ width: `${(powerups.jetpack / 16) * 100}%`, background: '#ef4444' }}
                    />
                  </div>
                </div>
              )}

              {powerups.magnet && (
                <div className={styles.powerupMeter} style={{ borderColor: '#8b5cf6' }}>
                  <span className={styles.powerupIcon} style={{ color: '#8b5cf6' }}><MagnetIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div
                      className={styles.powerupBarFill}
                      style={{ width: `${(powerups.magnet / 20) * 100}%`, background: '#8b5cf6' }}
                    />
                  </div>
                </div>
              )}

              {powerups.multiplier && (
                <div className={styles.powerupMeter} style={{ borderColor: '#f59e0b' }}>
                  <span className={styles.powerupIcon} style={{ color: '#f59e0b' }}><FlameIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div
                      className={styles.powerupBarFill}
                      style={{ width: `${(powerups.multiplier / 24) * 100}%`, background: '#f59e0b' }}
                    />
                  </div>
                </div>
              )}

              {powerups.sneakers && (
                <div className={styles.powerupMeter} style={{ borderColor: '#10b981' }}>
                  <span className={styles.powerupIcon} style={{ color: '#10b981' }}><SneakersIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div
                      className={styles.powerupBarFill}
                      style={{ width: `${(powerups.sneakers / 20) * 100}%`, background: '#10b981' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Hoverboard Summon & Touch D-Pad */}
          <div className={styles.hudBottom}>
            <button
              className={`${styles.hoverboardSummonBtn} ${powerups.hoverboard ? styles.activeHoverboardBadge : ''}`}
              onClick={handleSummonBoard}
            >
              <SkateboardIcon size={18} />
              <span>{powerups.hoverboard ? 'Shield Active' : 'Hoverboard (B)'}</span>
            </button>

            {/* Virtual On-Screen Controls for Small Viewports or Touch */}
            <div className={styles.touchControls}>
              <button
                className={styles.touchBtn}
                onClick={() => engineRef.current?.moveLeft()}
                title="Move Left"
              >
                &larr;
              </button>
              <button
                className={styles.touchBtn}
                onClick={() => engineRef.current?.jump()}
                title="Jump"
              >
                &uarr;
              </button>
              <button
                className={styles.touchBtn}
                onClick={() => engineRef.current?.slide()}
                title="Slide"
              >
                &darr;
              </button>
              <button
                className={styles.touchBtn}
                onClick={() => engineRef.current?.moveRight()}
                title="Move Right"
              >
                &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START MENU OVERLAY */}
      {gameState === 'start' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <div className={styles.brandIcon}><SubwayIcon size={44} /></div>
              <h1 className={styles.gameTitle}>Subway Surge 3D</h1>
              <p className={styles.gameSubtitle}>Endless High-Speed Cyber Metro Runner</p>
            </div>

            <div className={styles.instructionsGrid}>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>A / D / &larr; &rarr;</span>
                <span className={styles.keyDesc}>Dodge 3 Lanes</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>W / Space / &uarr;</span>
                <span className={styles.keyDesc}>Jump Over Hurdles</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>S / &darr;</span>
                <span className={styles.keyDesc}>Slide Under Beams</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>B / Double-Tap</span>
                <span className={styles.keyDesc}>Shield Hoverboard</span>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleStartGame}>
              <GamepadIcon size={20} />
              <span>Launch Run</span>
            </button>

            <button className={styles.secondaryBtn} onClick={() => setGameState('locker')}>
              <SkateboardIcon size={18} />
              <span>Locker & Upgrades ({totalCoins} Coins)</span>
            </button>
          </div>
        </div>
      )}

      {/* PAUSE OVERLAY */}
      {gameState === 'paused' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <div className={styles.brandIcon}><SubwayIcon size={36} /></div>
              <h2 className={styles.gameTitle}>Paused</h2>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Current Score</span>
                <span className={styles.statCardVal}>{score}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Coins Run</span>
                <span className={styles.statCardVal}>{sessionCoins}</span>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleResume}>
              <span>Resume Run</span>
            </button>

            <button className={styles.secondaryBtn} onClick={() => setGameState('start')}>
              <span>Exit to Menu</span>
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState === 'gameover' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <div className={styles.brandIcon} style={{ color: '#f43f5e' }}>
                <SubwayIcon size={42} />
              </div>
              <h2 className={styles.gameOverTitle}>Crash! Game Over</h2>
              <p className={styles.gameSubtitle}>You hit a barrier on the track</p>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Final Score</span>
                <span className={styles.statCardVal}>{score}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>High Score</span>
                <span className={styles.statCardVal}>{highScore}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Coins Collected</span>
                <span className={styles.statCardVal}>+{sessionCoins}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Total Bank</span>
                <span className={styles.statCardVal}>{totalCoins}</span>
              </div>
            </div>

            <button className={styles.primaryBtn} onClick={handleStartGame}>
              <GamepadIcon size={20} />
              <span>Run Again</span>
            </button>

            <button className={styles.secondaryBtn} onClick={() => setGameState('locker')}>
              <SkateboardIcon size={18} />
              <span>Locker & Upgrades</span>
            </button>
          </div>
        </div>
      )}

      {/* LOCKER / SKINS OVERLAY */}
      {gameState === 'locker' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <h2 className={styles.gameTitle}>Runner Locker</h2>
              <div className={`${styles.statBadge} ${styles.coinBadge}`}>
                <span className={styles.statIcon}><CoinsIcon size={16} /></span>
                <span className={styles.statValue}>{totalCoins} Coins</span>
              </div>
            </div>

            <div className={styles.lockerTabs}>
              <button
                className={`${styles.lockerTabBtn} ${lockerTab === 'chars' ? styles.lockerTabActive : ''}`}
                onClick={() => setLockerTab('chars')}
              >
                Outfits
              </button>
              <button
                className={`${styles.lockerTabBtn} ${lockerTab === 'boards' ? styles.lockerTabActive : ''}`}
                onClick={() => setLockerTab('boards')}
              >
                Hoverboards
              </button>
            </div>

            {lockerTab === 'chars' && (
              <div className={styles.lockerGrid}>
                {CHAR_SKINS.map((skin) => {
                  const isUnlocked = unlockedCharSkins.includes(skin.id);
                  const isSelected = selectedCharSkin === skin.id;
                  return (
                    <div
                      key={skin.id}
                      className={`${styles.skinCard} ${isSelected ? styles.skinCardSelected : ''}`}
                      onClick={() => handleSelectCharSkin(skin)}
                    >
                      <div
                        className={styles.skinPreviewCircle}
                        style={{ backgroundColor: `#${skin.hoodie.toString(16).padStart(6, '0')}` }}
                      />
                      <span className={styles.skinName}>{skin.name}</span>
                      <span className={styles.skinPrice}>
                        {isSelected ? 'Equipped' : isUnlocked ? 'Unlocked' : `${skin.price} Coins`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {lockerTab === 'boards' && (
              <div className={styles.lockerGrid}>
                {BOARD_SKINS.map((board) => {
                  const isUnlocked = unlockedBoardSkins.includes(board.id);
                  const isSelected = selectedBoardSkin === board.id;
                  return (
                    <div
                      key={board.id}
                      className={`${styles.skinCard} ${isSelected ? styles.skinCardSelected : ''}`}
                      onClick={() => handleSelectBoardSkin(board)}
                    >
                      <div
                        className={styles.skinPreviewCircle}
                        style={{ backgroundColor: `#${board.deck.toString(16).padStart(6, '0')}` }}
                      />
                      <span className={styles.skinName}>{board.name}</span>
                      <span className={styles.skinPrice}>
                        {isSelected ? 'Equipped' : isUnlocked ? 'Unlocked' : `${board.price} Coins`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <button className={styles.primaryBtn} onClick={() => setGameState('start')}>
              <span>Back to Menu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
