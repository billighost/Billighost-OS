import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { SubwaySurgeEngine } from '../services/games/SubwaySurgeEngine';
import { subwayAudio } from '../services/games/SubwaySurgeAudio';
import {
  GamepadIcon,
  SubwayIcon,
  TrophyIcon,
  CoinsIcon,
  RocketIcon,
  MagnetIcon,
  SkateboardIcon,
  FlameIcon,
  SparklesIcon,
  SneakersIcon,
  GhostIcon,
  SkullIcon,
  VolumeIcon,
  VolumeMuteIcon,
  RotateIcon,
} from '../components/Icons';
import styles from './SubwaySurgeApp.module.css';

const STORAGE_KEY = 'billighost:subway-surge-data';

export const CHARACTERS = [
  { id: 'dash', name: 'Dash (Street Runner)', desc: 'Agile parkour runner with cyber hoodie & high-tops', price: 0, color: '#0284c7' },
  { id: 'billi', name: 'Billi (Spectral Master)', desc: 'Legendary Billighost OS mascot in ethereal ghost form', price: 300, color: '#7eb8ff' },
  { id: 'nova', name: 'Nova (Valkyrie Chrome)', desc: 'Android ninja with chrome armor & ion thrusters', price: 80, color: '#ec4899' },
  { id: 'pulse', name: 'Pulse (Synthwave Rebel)', desc: 'Retro 80s arcade runner with neon wire trims', price: 160, color: '#8b5cf6' },
  { id: 'zero', name: 'Zero (Shadow Operative)', desc: 'Stealth tactical operative with digital matrix mask', price: 240, color: '#10b981' },
];

export const HOVERBOARDS = [
  { id: 'cyan', name: 'Cyan Glider', desc: 'Dual ion plasma exhaust with crisp turning', price: 0, color: '#06b6d4' },
  { id: 'phantom', name: 'Phantom Drift', desc: 'Ectoplasm spectral smoke trail & soft glide', price: 75, color: '#6366f1' },
  { id: 'solar', name: 'Solar Flare', desc: 'Thermal flame thruster & high velocity', price: 150, color: '#f59e0b' },
  { id: 'void', name: 'Void Singularity', desc: 'Dark gravitational vortex ring exhaust', price: 225, color: '#8b5cf6' },
  { id: 'glitch', name: 'Matrix Glitch', desc: 'Digital square pixel dissipation trail', price: 300, color: '#10b981' },
];

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    highScore: 0,
    totalCoins: 0,
    unlockedCharacters: ['dash'],
    unlockedBoards: ['cyan'],
    selectedCharacter: 'dash',
    selectedBoard: 'cyan',
    soundEnabled: true,
    bgmVolume: 0.8,
    sfxVolume: 0.9,
    missions: { trainsDodged: 0, coinsRun: 0, nearMisses: 0 },
  };
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export default function SubwaySurgeApp({ playClick = () => {} }) {
  // Game View State: 'start' | 'playing' | 'paused' | 'gameover' | 'locker' | 'revive'
  const [gameState, setGameState] = useState('start');

  // Stats
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [sessionCoins, setSessionCoins] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [totalCoins, setTotalCoins] = useState(0);
  const [combo, setCombo] = useState(1);
  const [comboBanner, setComboBanner] = useState('');
  const [ghostSurgeCharge, setGhostSurgeCharge] = useState(0);
  const [ghostSurgeActive, setGhostSurgeActive] = useState(false);

  // Active Powerups: { [type]: remainingSeconds }
  const [powerups, setPowerups] = useState({});

  // Audio settings
  const [isMuted, setIsMuted] = useState(false);
  const [bgmVolume, setBgmVolume] = useState(0.8);
  const [sfxVolume, setSfxVolume] = useState(0.9);

  // Locker / Customization
  const [lockerTab, setLockerTab] = useState('chars');
  const [unlockedCharacters, setUnlockedCharacters] = useState(['dash']);
  const [unlockedBoards, setUnlockedBoards] = useState(['cyan']);
  const [selectedCharacter, setSelectedCharacter] = useState('dash');
  const [selectedBoard, setSelectedBoard] = useState('cyan');

  // Missions & Objectives
  const [trainsDodged, setTrainsDodged] = useState(0);
  const [nearMisses, setNearMisses] = useState(0);

  // Revive Dialog Timer
  const [reviveCountdown, setReviveCountdown] = useState(5);
  const reviveTimerRef = useRef(null);

  // Container & Canvas Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const engineRef = useRef(null);

  // Interactive 3D Turntable Refs
  const turntableCanvasRef = useRef(null);
  const turntableSceneRef = useRef(null);
  const turntableRendererRef = useRef(null);
  const turntableGroupRef = useRef(null);
  const turntableReqId = useRef(null);
  const isDraggingTurntable = useRef(false);
  const lastMouseX = useRef(0);

  // Touch tracking
  const touchStartRef = useRef(null);

  // Load Saved Game Data on Mount
  useEffect(() => {
    const data = loadSavedData();
    setHighScore(data.highScore || 0);
    setTotalCoins(data.totalCoins || 0);
    setUnlockedCharacters(data.unlockedCharacters || ['dash']);
    setUnlockedBoards(data.unlockedBoards || ['cyan']);
    setSelectedCharacter(data.selectedCharacter || 'dash');
    setSelectedBoard(data.selectedBoard || 'cyan');
    setIsMuted(!data.soundEnabled);
    setBgmVolume(data.bgmVolume ?? 0.8);
    setSfxVolume(data.sfxVolume ?? 0.9);
    subwayAudio.setMuted(!data.soundEnabled);
    subwayAudio.setBgmVolume(data.bgmVolume ?? 0.8);
    subwayAudio.setSfxVolume(data.sfxVolume ?? 0.9);
  }, []);

  // Initialize Three.js Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new SubwaySurgeEngine(canvasRef.current, {
      onScoreUpdate: (currScore, currDist, currCombo) => {
        setScore(currScore);
        setDistance(currDist);
        setCombo(currCombo);
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
      onGhostSurgeChange: (charge, active) => {
        setGhostSurgeCharge(charge);
        setGhostSurgeActive(active);
      },
      onComboUpdate: (c, banner) => {
        setCombo(c);
        setComboBanner(banner);
        setTimeout(() => setComboBanner(''), 1500);
      },
      onNearMiss: () => {
        setNearMisses(n => n + 1);
      },
      onRecordBroken: (newDist) => {
        setHighScore(prev => Math.max(prev, newDist));
      },
      onGameOver: (finalScore, earnedCoins) => {
        // Offer Second Chance if player has at least 20 coins
        const currentSaved = loadSavedData();
        const availableCoins = (currentSaved.totalCoins || 0) + earnedCoins;
        if (availableCoins >= 20) {
          setGameState('revive');
          setReviveCountdown(5);
        } else {
          handleTriggerGameOver(finalScore, earnedCoins);
        }
      },
    });

    engine.highScoreDistance = loadSavedData().highScore || 0;
    engine.setCharacter(selectedCharacter);
    engine.setBoard(selectedBoard);
    engineRef.current = engine;

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
      if (reviveTimerRef.current) clearInterval(reviveTimerRef.current);
    };
  }, []);

  // Handle Revive Countdown Timer
  useEffect(() => {
    if (gameState === 'revive') {
      reviveTimerRef.current = setInterval(() => {
        setReviveCountdown(prev => {
          if (prev <= 1) {
            clearInterval(reviveTimerRef.current);
            handleTriggerGameOver(score, sessionCoins);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (reviveTimerRef.current) clearInterval(reviveTimerRef.current);
    };
  }, [gameState, score, sessionCoins]);

  // Sync Character / Board changes to active Engine
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.setCharacter(selectedCharacter);
    engineRef.current.setBoard(selectedBoard);
  }, [selectedCharacter, selectedBoard]);

  // Interactive 3D Turntable in Locker
  useEffect(() => {
    if (gameState !== 'locker' || !turntableCanvasRef.current) return;

    const canvas = turntableCanvasRef.current;
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 180;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101f);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 50);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    // Studio Lights
    const amb = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dir.position.set(3, 5, 4);
    scene.add(dir);
    const rim = new THREE.DirectionalLight(0xec4899, 1.2);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    // Turntable Pedestal
    const baseGeo = new THREE.CylinderGeometry(1.2, 1.3, 0.15, 32);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    const pedestal = new THREE.Mesh(baseGeo, baseMat);
    pedestal.position.y = -0.08;
    scene.add(pedestal);

    const ringGeo = new THREE.TorusGeometry(1.22, 0.02, 8, 32);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0;
    scene.add(ring);

    // Preview Mesh Group
    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    // Build Character Preview Mesh
    const dummyEngine = new SubwaySurgeEngine(document.createElement('canvas'));
    dummyEngine.setCharacter(selectedCharacter);
    dummyEngine.setBoard(selectedBoard);
    if (dummyEngine.playerGroup) {
      previewGroup.add(dummyEngine.playerGroup);
      if (dummyEngine.hoverboardMesh) dummyEngine.hoverboardMesh.visible = (lockerTab === 'boards');
    }

    turntableGroupRef.current = previewGroup;
    turntableRendererRef.current = renderer;
    turntableSceneRef.current = scene;

    let rot = 0;
    const renderTurntable = () => {
      turntableReqId.current = requestAnimationFrame(renderTurntable);
      if (!isDraggingTurntable.current) {
        rot += 0.008;
        previewGroup.rotation.y = rot;
      }
      renderer.render(scene, camera);
    };
    renderTurntable();

    return () => {
      if (turntableReqId.current) cancelAnimationFrame(turntableReqId.current);
      dummyEngine.destroy();
      renderer.dispose();
    };
  }, [gameState, selectedCharacter, selectedBoard, lockerTab]);

  // Turntable Mouse/Touch Drag Handlers
  const handleTurntablePointerDown = (e) => {
    isDraggingTurntable.current = true;
    lastMouseX.current = e.clientX;
  };

  const handleTurntablePointerMove = (e) => {
    if (!isDraggingTurntable.current || !turntableGroupRef.current) return;
    const dx = e.clientX - lastMouseX.current;
    lastMouseX.current = e.clientX;
    turntableGroupRef.current.rotation.y += dx * 0.015;
  };

  const handleTurntablePointerUp = () => {
    isDraggingTurntable.current = false;
  };

  // Keyboard Controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!engineRef.current) return;

      if (gameState === 'playing') {
        if (e.repeat) return;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          engineRef.current.moveLeft();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          engineRef.current.moveRight();
        } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          engineRef.current.jump();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
          e.preventDefault();
          engineRef.current.slide();
        } else if (e.key === 'b' || e.key === 'B') {
          e.preventDefault();
          engineRef.current.activateHoverboard();
        } else if (e.key === ' ') {
          e.preventDefault();
          if (ghostSurgeCharge >= 100) {
            engineRef.current.activateGhostSurge();
          } else {
            engineRef.current.jump();
          }
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
  }, [gameState, ghostSurgeCharge]);

  // Touch Swipe Handlers
  const handlePointerDown = (e) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handlePointerUp = (e) => {
    if (!touchStartRef.current || !engineRef.current || gameState !== 'playing') return;

    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 14 && absDy < 14 && dt < 240) {
      engineRef.current.activateHoverboard();
      return;
    }

    const minSwipe = 24;
    if (absDx > absDy && absDx > minSwipe) {
      if (dx < 0) engineRef.current.moveLeft();
      else engineRef.current.moveRight();
    } else if (absDy > absDx && absDy > minSwipe) {
      if (dy < 0) engineRef.current.jump();
      else engineRef.current.slide();
    }
  };

  // Game Lifecycle Handlers
  const handleStartGame = () => {
    playClick();
    setScore(0);
    setDistance(0);
    setSessionCoins(0);
    setCombo(1);
    setGhostSurgeCharge(0);
    setGhostSurgeActive(false);
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

  const handleTriggerGameOver = (finalScore, earnedCoins) => {
    if (reviveTimerRef.current) clearInterval(reviveTimerRef.current);
    setGameState('gameover');
    setHighScore(prev => {
      const nextBest = Math.max(prev, finalScore);
      setTotalCoins(tCoins => {
        const newTotal = tCoins + earnedCoins;
        saveLocalData({
          highScore: nextBest,
          totalCoins: newTotal,
          unlockedCharacters,
          unlockedBoards,
          selectedCharacter,
          selectedBoard,
          soundEnabled: !isMuted,
          bgmVolume,
          sfxVolume,
        });
        return newTotal;
      });
      return nextBest;
    });
  };

  const handleReviveConfirm = () => {
    playClick();
    if (reviveTimerRef.current) clearInterval(reviveTimerRef.current);
    const cost = 20;
    setTotalCoins(t => {
      const nextCoins = Math.max(0, t - cost);
      saveLocalData({
        highScore,
        totalCoins: nextCoins,
        unlockedCharacters,
        unlockedBoards,
        selectedCharacter,
        selectedBoard,
        soundEnabled: !isMuted,
        bgmVolume,
        sfxVolume,
      });
      return nextCoins;
    });
    setGameState('playing');
    engineRef.current?.revive();
  };

  const handleToggleMute = () => {
    playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    subwayAudio.setMuted(nextMuted);
    saveLocalData({
      highScore,
      totalCoins,
      unlockedCharacters,
      unlockedBoards,
      selectedCharacter,
      selectedBoard,
      soundEnabled: !nextMuted,
      bgmVolume,
      sfxVolume,
    });
  };

  const handleBgmChange = (e) => {
    const vol = parseFloat(e.target.value);
    setBgmVolume(vol);
    subwayAudio.setBgmVolume(vol);
    saveLocalData({
      highScore,
      totalCoins,
      unlockedCharacters,
      unlockedBoards,
      selectedCharacter,
      selectedBoard,
      soundEnabled: !isMuted,
      bgmVolume: vol,
      sfxVolume,
    });
  };

  const handleSfxChange = (e) => {
    const vol = parseFloat(e.target.value);
    setSfxVolume(vol);
    subwayAudio.setSfxVolume(vol);
    saveLocalData({
      highScore,
      totalCoins,
      unlockedCharacters,
      unlockedBoards,
      selectedCharacter,
      selectedBoard,
      soundEnabled: !isMuted,
      bgmVolume,
      sfxVolume: vol,
    });
  };

  const handleSelectCharacter = (char) => {
    playClick();
    if (unlockedCharacters.includes(char.id)) {
      setSelectedCharacter(char.id);
      saveLocalData({
        highScore,
        totalCoins,
        unlockedCharacters,
        unlockedBoards,
        selectedCharacter: char.id,
        selectedBoard,
        soundEnabled: !isMuted,
        bgmVolume,
        sfxVolume,
      });
    } else if (totalCoins >= char.price) {
      const newTotal = totalCoins - char.price;
      const nextUnlocked = [...unlockedCharacters, char.id];
      setTotalCoins(newTotal);
      setUnlockedCharacters(nextUnlocked);
      setSelectedCharacter(char.id);
      saveLocalData({
        highScore,
        totalCoins: newTotal,
        unlockedCharacters: nextUnlocked,
        unlockedBoards,
        selectedCharacter: char.id,
        selectedBoard,
        soundEnabled: !isMuted,
        bgmVolume,
        sfxVolume,
      });
      subwayAudio.playPowerupGet();
    }
  };

  const handleSelectBoard = (board) => {
    playClick();
    if (unlockedBoards.includes(board.id)) {
      setSelectedBoard(board.id);
      saveLocalData({
        highScore,
        totalCoins,
        unlockedCharacters,
        unlockedBoards,
        selectedCharacter,
        selectedBoard: board.id,
        soundEnabled: !isMuted,
        bgmVolume,
        sfxVolume,
      });
    } else if (totalCoins >= board.price) {
      const newTotal = totalCoins - board.price;
      const nextUnlocked = [...unlockedBoards, board.id];
      setTotalCoins(newTotal);
      setUnlockedBoards(nextUnlocked);
      setSelectedBoard(board.id);
      saveLocalData({
        highScore,
        totalCoins: newTotal,
        unlockedCharacters,
        unlockedBoards: nextUnlocked,
        selectedCharacter,
        selectedBoard: board.id,
        soundEnabled: !isMuted,
        bgmVolume,
        sfxVolume,
      });
      subwayAudio.playPowerupGet();
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {/* 3D WebGL Canvas */}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      />

      {/* Dynamic Glass HUD */}
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

              {/* Ghost Surge Energy Meter */}
              <div
                className={`${styles.ghostSurgeContainer} ${ghostSurgeCharge >= 100 ? styles.ghostSurgeReady : ''}`}
                onClick={() => engineRef.current?.activateGhostSurge()}
                title="Ghost Surge Hyperdrive (Space)"
              >
                <GhostIcon size={16} />
                <div className={styles.ghostSurgeBar}>
                  <div
                    className={styles.ghostSurgeFill}
                    style={{ width: `${ghostSurgeActive ? 100 : ghostSurgeCharge}%` }}
                  />
                </div>
              </div>

              {/* Combo Multiplier Badge */}
              {combo > 1 && (
                <div className={styles.comboBadge}>
                  {comboBanner || `x${combo}`}
                </div>
              )}
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
                  {isMuted ? <VolumeMuteIcon size={16} /> : <VolumeIcon size={16} />}
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

          {/* Middle Row: Active Powerup Timers */}
          <div className={styles.hudMiddle}>
            <div className={styles.powerupTray}>
              {powerups.hoverboard && (
                <div className={styles.powerupMeter} style={{ borderColor: '#06b6d4' }}>
                  <span className={styles.powerupIcon} style={{ color: '#06b6d4' }}><SkateboardIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div className={styles.powerupBarFill} style={{ width: `${(powerups.hoverboard / 30) * 100}%`, background: '#06b6d4' }} />
                  </div>
                </div>
              )}
              {powerups.jetpack && (
                <div className={styles.powerupMeter} style={{ borderColor: '#ef4444' }}>
                  <span className={styles.powerupIcon} style={{ color: '#ef4444' }}><RocketIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div className={styles.powerupBarFill} style={{ width: `${(powerups.jetpack / 16) * 100}%`, background: '#ef4444' }} />
                  </div>
                </div>
              )}
              {powerups.magnet && (
                <div className={styles.powerupMeter} style={{ borderColor: '#8b5cf6' }}>
                  <span className={styles.powerupIcon} style={{ color: '#8b5cf6' }}><MagnetIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div className={styles.powerupBarFill} style={{ width: `${(powerups.magnet / 20) * 100}%`, background: '#8b5cf6' }} />
                  </div>
                </div>
              )}
              {powerups.multiplier && (
                <div className={styles.powerupMeter} style={{ borderColor: '#f59e0b' }}>
                  <span className={styles.powerupIcon} style={{ color: '#f59e0b' }}><FlameIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div className={styles.powerupBarFill} style={{ width: `${(powerups.multiplier / 24) * 100}%`, background: '#f59e0b' }} />
                  </div>
                </div>
              )}
              {powerups.sneakers && (
                <div className={styles.powerupMeter} style={{ borderColor: '#10b981' }}>
                  <span className={styles.powerupIcon} style={{ color: '#10b981' }}><SneakersIcon size={16} /></span>
                  <div className={styles.powerupBarTrack}>
                    <div className={styles.powerupBarFill} style={{ width: `${(powerups.sneakers / 20) * 100}%`, background: '#10b981' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Row: Hoverboard Summon & Touch Controls */}
          <div className={styles.hudBottom}>
            <button
              className={`${styles.hoverboardSummonBtn} ${powerups.hoverboard ? styles.activeHoverboardBadge : ''}`}
              onClick={() => engineRef.current?.activateHoverboard()}
            >
              <SkateboardIcon size={18} />
              <span>{powerups.hoverboard ? 'Stunt (Double-Tap)' : 'Hoverboard (B)'}</span>
            </button>

            <div className={styles.touchControls}>
              <button className={styles.touchBtn} onClick={() => engineRef.current?.moveLeft()} title="Move Left">&larr;</button>
              <button className={styles.touchBtn} onClick={() => engineRef.current?.jump()} title="Jump">&uarr;</button>
              <button className={styles.touchBtn} onClick={() => engineRef.current?.slide()} title="Slide">&darr;</button>
              <button className={styles.touchBtn} onClick={() => engineRef.current?.moveRight()} title="Move Right">&rarr;</button>
            </div>
          </div>
        </div>
      )}

      {/* START MENU MODAL */}
      {gameState === 'start' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <div className={styles.brandIcon}><SubwayIcon size={46} /></div>
              <h1 className={styles.gameTitle}>Subway Surge 3D</h1>
              <p className={styles.gameSubtitle}>Billighost OS Edition • High-Speed Cyber Metro</p>
            </div>

            <div className={styles.instructionsGrid}>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>A / D / &larr; &rarr;</span>
                <span className={styles.keyDesc}>Dodge 3 Lanes</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>W / Space / &uarr;</span>
                <span className={styles.keyDesc}>Jump & Roof Surf</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>S / &darr;</span>
                <span className={styles.keyDesc}>Slide Under Gantries</span>
              </div>
              <div className={styles.instructionItem}>
                <span className={styles.keyTag}>B / Double-Tap</span>
                <span className={styles.keyDesc}>Shield Hoverboard</span>
              </div>
            </div>

            {/* Missions Card */}
            <div className={styles.missionsCard}>
              <span className={styles.missionTitle}>Daily Objectives</span>
              <div className={styles.missionItem}>
                <span>Collect 80 Coins</span>
                <div className={styles.missionBarTrack}>
                  <div className={styles.missionBarFill} style={{ width: `${Math.min(100, (sessionCoins / 80) * 100)}%` }} />
                </div>
                <span className={styles.missionReward}>+60c</span>
              </div>
              <div className={styles.missionItem}>
                <span>3 Near Misses</span>
                <div className={styles.missionBarTrack}>
                  <div className={styles.missionBarFill} style={{ width: `${Math.min(100, (nearMisses / 3) * 100)}%` }} />
                </div>
                <span className={styles.missionReward}>+75c</span>
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

      {/* SECOND CHANCE / REVIVE MODAL */}
      {gameState === 'revive' && (
        <div className={styles.modalOverlay}>
          <div className={styles.reviveModalCard}>
            <div className={styles.brandIcon} style={{ color: '#38bdf8' }}>
              <GhostIcon size={44} />
            </div>
            <h2 className={styles.gameTitle}>Second Chance!</h2>
            <p className={styles.gameSubtitle}>
              Activate a Spectral Revive Shockwave to clear hazards ahead and keep running!
            </p>

            <button className={styles.reviveBtn} onClick={handleReviveConfirm}>
              <SparklesIcon size={18} />
              <span>Revive Now (20 Coins) • {reviveCountdown}s</span>
            </button>

            <button
              className={styles.secondaryBtn}
              onClick={() => handleTriggerGameOver(score, sessionCoins)}
            >
              <span>Give Up</span>
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
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

            {/* Audio Volume Sliders */}
            <div className={styles.volumeGroup}>
              <div className={styles.volumeRow}>
                <span>Music Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={handleBgmChange}
                  className={styles.volumeSlider}
                />
              </div>
              <div className={styles.volumeRow}>
                <span>SFX Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={handleSfxChange}
                  className={styles.volumeSlider}
                />
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

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div className={styles.brandHeader}>
              <div className={styles.brandIcon} style={{ color: '#ef4444' }}>
                <SkullIcon size={42} />
              </div>
              <h2 className={styles.gameOverTitle}>Crash! Run Ended</h2>
              <p className={styles.gameSubtitle}>The Billighost Inspector caught up on the tracks</p>
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
                <span className={styles.statCardLabel}>Coins Earned</span>
                <span className={styles.statCardVal}>+{sessionCoins}</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statCardLabel}>Bank Balance</span>
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

      {/* LOCKER & 3D TURNTABLE MODAL */}
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

            {/* Interactive 3D Turntable Viewport */}
            <div
              className={styles.turntableContainer}
              onPointerDown={handleTurntablePointerDown}
              onPointerMove={handleTurntablePointerMove}
              onPointerUp={handleTurntablePointerUp}
              title="Drag horizontally to rotate 3D character"
            >
              <canvas ref={turntableCanvasRef} className={styles.turntableCanvas} />
              <span className={styles.turntableHint}>&harr; Drag to rotate 3D model</span>
            </div>

            <div className={styles.lockerTabs}>
              <button
                className={`${styles.lockerTabBtn} ${lockerTab === 'chars' ? styles.lockerTabActive : ''}`}
                onClick={() => setLockerTab('chars')}
              >
                Runners
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
                {CHARACTERS.map((char) => {
                  const isUnlocked = unlockedCharacters.includes(char.id);
                  const isSelected = selectedCharacter === char.id;
                  return (
                    <div
                      key={char.id}
                      className={`${styles.skinCard} ${isSelected ? styles.skinCardSelected : ''}`}
                      onClick={() => handleSelectCharacter(char)}
                    >
                      <div className={styles.skinPreviewCircle} style={{ backgroundColor: char.color }} />
                      <span className={styles.skinName}>{char.name}</span>
                      <span className={styles.skinPrice}>
                        {isSelected ? 'Equipped' : isUnlocked ? 'Select' : `${char.price} Coins`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {lockerTab === 'boards' && (
              <div className={styles.lockerGrid}>
                {HOVERBOARDS.map((board) => {
                  const isUnlocked = unlockedBoards.includes(board.id);
                  const isSelected = selectedBoard === board.id;
                  return (
                    <div
                      key={board.id}
                      className={`${styles.skinCard} ${isSelected ? styles.skinCardSelected : ''}`}
                      onClick={() => handleSelectBoard(board)}
                    >
                      <div className={styles.skinPreviewCircle} style={{ backgroundColor: board.color }} />
                      <span className={styles.skinName}>{board.name}</span>
                      <span className={styles.skinPrice}>
                        {isSelected ? 'Equipped' : isUnlocked ? 'Select' : `${board.price} Coins`}
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
