import { useState, useRef, useEffect, useCallback } from 'react';
import { NotificationService } from '../services/notificationService';
import {
  importFile, LIBRARY, ACCEPT, urlForPath, revokeUrl, saveToLibrary, formatBytes,
} from '../services/storage/fileImport';
import { VFS } from '../services/storage/indexedDB';
import {
  FilmIcon, PlayIcon, PauseIcon, ScissorsIcon, CameraIcon, UploadIcon,
  DownloadIcon, VolumeIcon, VolumeMuteIcon, FolderIcon, TrashIcon,
} from '../components/Icons';
import styles from './VideoEditorApp.module.css';

/**
 * Billighost OS — Video Studio
 *
 * A real editor within what a browser can actually do:
 *   • plays anything the browser can decode (mp4/webm/ogv natively; mkv
 *     depends on its internal codecs — see CONTAINER_NOTES)
 *   • trim by in/out points, with frame-accurate stepping
 *   • live colour grading via CSS filters on the video element
 *   • frame grab to PNG, straight into the Pictures library
 *   • export the trimmed, graded result by re-encoding through
 *     MediaRecorder + canvas, saved into the Videos library
 *
 * Honest about the limits: browsers expose no transcoder, so "export" is a
 * real-time re-record of the playing frames rather than a remux. That is
 * why the export runs at playback speed and is capped to the trim range.
 */

const FPS_ASSUMED = 30;   // used for frame stepping when metadata omits it

const FILTER_PRESETS = [
  { id: 'none', name: 'None', f: {} },
  { id: 'cine', name: 'Cinematic', f: { contrast: 112, saturate: 92, brightness: 98, sepia: 8 } },
  { id: 'noir', name: 'Noir', f: { grayscale: 100, contrast: 128, brightness: 94 } },
  { id: 'neon', name: 'Neon Night', f: { saturate: 150, contrast: 115, hue: 190, brightness: 104 } },
  { id: 'warm', name: 'Golden Hour', f: { sepia: 24, saturate: 118, brightness: 106, contrast: 104 } },
  { id: 'cold', name: 'Arctic', f: { hue: 200, saturate: 88, brightness: 104, contrast: 108 } },
];

/** Formats seconds as m:ss.cc — centiseconds matter when trimming. */
function tc(secs) {
  if (!Number.isFinite(secs)) return '0:00.00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  const cs = Math.floor((secs % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export default function VideoEditorApp({ playClick = () => {}, filePath = null, osModal = null }) {
  // Source
  const [videoUrl, setVideoUrl] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [loadError, setLoadError] = useState(null);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [rate, setRate] = useState(1);

  // Trim
  const [trimIn, setTrimIn] = useState(0);
  const [trimOut, setTrimOut] = useState(0);

  // Grade
  const [preset, setPreset] = useState('none');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);
  const [grayscale, setGrayscale] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [hue, setHue] = useState(0);
  const [blur, setBlur] = useState(0);

  /*
   * Mode.
   *
   * Opens as a plain player — a big picture and transport controls, nothing
   * else. Editing is opt-in, which keeps the default experience uncluttered
   * and matches how someone actually uses this: watch first, edit sometimes.
   */
  const [editMode, setEditMode] = useState(false);

  // Shell
  const [tab, setTab] = useState('grade');      // 'grade' | 'trim' | 'library'
  const [library, setLibrary] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
  const [meta, setMeta] = useState({ w: 0, h: 0 });

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const urlRef = useRef(null);
  const recorderRef = useRef(null);
  const exportChunksRef = useRef([]);

  const cssFilter = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturate}%)`,
    grayscale ? `grayscale(${grayscale}%)` : '',
    sepia ? `sepia(${sepia}%)` : '',
    hue ? `hue-rotate(${hue}deg)` : '',
    blur ? `blur(${blur}px)` : '',
  ].filter(Boolean).join(' ');

  /* ── Library ──────────────────────────────── */

  const loadLibrary = useCallback(async () => {
    try {
      const items = await VFS.listDirectory(LIBRARY.video);
      setLibrary(items.filter(i => i.type === 'file'));
    } catch {
      setLibrary([]);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    const onUpdate = () => loadLibrary();
    window.addEventListener('billighost:vfs-update', onUpdate);
    return () => window.removeEventListener('billighost:vfs-update', onUpdate);
  }, [loadLibrary]);

  /* ── Opening a clip ───────────────────────── */

  const openUrl = useCallback((url, name, size) => {
    // Release the previous blob URL before replacing it.
    if (urlRef.current) revokeUrl(urlRef.current);
    urlRef.current = url;
    setVideoUrl(url);
    setFileName(name);
    setFileSize(size || 0);
    setLoadError(null);
    setCurrentTime(0);
    setTrimIn(0);
    setTrimOut(0);
    setIsPlaying(false);
  }, []);

  const openFromVfs = useCallback(async (path) => {
    try {
      const { url, node } = await urlForPath(path);
      openUrl(url, node.name, node.size);
      setTab('grade');
    } catch (err) {
      NotificationService.send({ title: 'Open Failed', message: err.message, type: 'error' });
    }
  }, [openUrl]);

  // Open a clip passed in from File Explorer.
  useEffect(() => {
    if (filePath) openFromVfs(filePath);
  }, [filePath, openFromVfs]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playClick();
    e.target.value = '';

    try {
      const saved = await importFile(file, { dir: LIBRARY.video });
      window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
      openUrl(saved.url, saved.name, saved.size);
      NotificationService.send({
        title: 'Added to Videos',
        message: `${saved.name} — saved to ${LIBRARY.video}`,
        type: 'success',
      });
    } catch (err) {
      NotificationService.send({ title: 'Import Failed', message: err.message, type: 'error' });
    }
  };

  /* ── Playback wiring ──────────────────────── */

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = isMuted ? 0 : volume / 100;
    v.playbackRate = rate;
  }, [volume, isMuted, rate, videoUrl]);

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    const d = Number.isFinite(v.duration) ? v.duration : 0;
    setDuration(d);
    setTrimOut(d);
    setMeta({ w: v.videoWidth, h: v.videoHeight });
    setLoadError(null);
  };

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);

    // Loop within the trim range so the edit is what you preview.
    if (trimOut > trimIn && v.currentTime >= trimOut - 0.02) {
      v.currentTime = trimIn;
      if (!isPlaying) v.pause();
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    playClick();
    if (v.paused) {
      if (v.currentTime < trimIn || v.currentTime >= trimOut) v.currentTime = trimIn;
      v.play().then(() => setIsPlaying(true)).catch(() => {
        setLoadError('This browser cannot play this file’s codec.');
      });
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const seekTo = (t) => {
    const v = videoRef.current;
    if (!v) return;
    const clamped = Math.max(0, Math.min(duration || 0, t));
    v.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const stepFrame = (dir) => {
    playClick();
    seekTo(currentTime + dir / FPS_ASSUMED);
  };

  const handleScrub = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio * (duration || 0));
  };

  /* ── Grade presets ────────────────────────── */

  const applyPreset = (id) => {
    playClick();
    setPreset(id);
    const p = FILTER_PRESETS.find(x => x.id === id);
    const f = p?.f || {};
    setBrightness(f.brightness ?? 100);
    setContrast(f.contrast ?? 100);
    setSaturate(f.saturate ?? 100);
    setGrayscale(f.grayscale ?? 0);
    setSepia(f.sepia ?? 0);
    setHue(f.hue ?? 0);
    setBlur(f.blur ?? 0);
  };

  /* ── Frame grab ───────────────────────────── */

  const grabFrame = async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    playClick();

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth || 1280;
    canvas.height = v.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    // Bake the grade into the still, so the export matches the preview.
    ctx.filter = cssFilter;
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
    if (!blob) return;

    const stem = fileName.replace(/\.[^/.]+$/, '') || 'frame';
    const saved = await saveToLibrary(blob, `${stem}_${tc(currentTime).replace(/[:.]/g, '-')}.png`, 'image');
    window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
    NotificationService.send({
      title: 'Frame Saved',
      message: `${saved.name} — in ${LIBRARY.image}`,
      type: 'success',
    });
  };

  /* ── Export ───────────────────────────────── */

  /**
   * Re-records the trimmed, graded range through a canvas.
   *
   * Browsers ship no transcoder, so this captures the frames as they play
   * and muxes them with MediaRecorder. It therefore runs at playback speed
   * and produces WebM — the only container MediaRecorder is guaranteed to
   * write. Audio is captured too where the browser allows it.
   */
  const exportClip = async () => {
    const v = videoRef.current;
    if (!v || !videoUrl || isExporting) return;
    if (!window.MediaRecorder) {
      NotificationService.send({
        title: 'Export Unavailable',
        message: 'This browser does not support MediaRecorder.',
        type: 'error',
      });
      return;
    }
    playClick();

    const canvas = canvasRef.current;
    const w = v.videoWidth || 1280;
    const h = v.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');

    const stream = canvas.captureStream(FPS_ASSUMED);

    // Attach the audio track if the source exposes one.
    try {
      const srcStream = v.captureStream?.() || v.mozCaptureStream?.();
      const audio = srcStream?.getAudioTracks?.() || [];
      audio.forEach(t => stream.addTrack(t));
    } catch { /* audio capture unsupported — video-only export */ }

    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    exportChunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
    recorderRef.current = rec;
    rec.ondataavailable = (e) => { if (e.data.size) exportChunksRef.current.push(e.data); };

    const finished = new Promise((resolve) => { rec.onstop = resolve; });

    setIsExporting(true);
    setExportPct(0);

    const from = trimIn;
    const to = trimOut > trimIn ? trimOut : duration;
    v.currentTime = from;
    await new Promise(res => { v.onseeked = res; });
    v.onseeked = null;

    rec.start(250);
    await v.play().catch(() => {});

    let raf = 0;
    const pump = () => {
      if (v.currentTime >= to || v.ended) {
        cancelAnimationFrame(raf);
        v.pause();
        rec.stop();
        return;
      }
      ctx.filter = cssFilter;
      ctx.drawImage(v, 0, 0, w, h);
      setExportPct(Math.min(100, Math.round(((v.currentTime - from) / (to - from)) * 100)));
      raf = requestAnimationFrame(pump);
    };
    raf = requestAnimationFrame(pump);

    await finished;
    stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(exportChunksRef.current, { type: mime });
    exportChunksRef.current = [];
    const stem = fileName.replace(/\.[^/.]+$/, '') || 'export';
    const saved = await saveToLibrary(blob, `${stem}_edit.webm`, 'video');

    setIsExporting(false);
    setExportPct(100);
    setIsPlaying(false);
    window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
    NotificationService.send({
      title: 'Export Complete',
      message: `${saved.name} (${formatBytes(saved.size)}) — in ${LIBRARY.video}`,
      type: 'success',
    });
  };

  const deleteFromLibrary = async (item) => {
    const go = async () => {
      await VFS.deleteNode(item.path);
      window.dispatchEvent(new CustomEvent('billighost:vfs-update'));
      if (fileName === item.name) {
        if (urlRef.current) revokeUrl(urlRef.current);
        urlRef.current = null;
        setVideoUrl(null);
        setFileName('');
      }
    };
    if (osModal?.confirm) {
      osModal.confirm({
        title: 'Delete clip',
        message: `Permanently delete "${item.name}"?`,
        onConfirm: go,
      });
    } else {
      await go();
    }
  };

  /* ── Teardown ─────────────────────────────── */

  useEffect(() => {
    // Capture the ref objects themselves; reading `.current` at cleanup time
    // is what the lint rule warns about, and the objects are stable.
    const videoEl = videoRef;
    const recorder = recorderRef;
    const url = urlRef;

    return () => {
      // Stop playback, release the blob URL, and abort any export in flight.
      const v = videoEl.current;
      if (v) {
        v.pause();
        v.src = '';
        v.load();
      }
      if (recorder.current && recorder.current.state !== 'inactive') {
        try { recorder.current.stop(); } catch { /* already stopped */ }
      }
      if (url.current) revokeUrl(url.current);
      url.current = null;
    };
  }, []);

  const trimPct = duration ? {
    left: `${(trimIn / duration) * 100}%`,
    width: `${((Math.max(trimIn, trimOut) - trimIn) / duration) * 100}%`,
  } : { left: '0%', width: '100%' };

  return (
    <div
      className={`${styles.studio} ${editMode ? styles.studioEditing : styles.studioPlayer}`}
      data-testid="video-editor-app"
      data-mode={editMode ? 'edit' : 'player'}
    >
      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.identity}>
          <FilmIcon size={15} />
          <span className={styles.clipName}>{fileName || 'No clip open'}</span>
          {meta.w > 0 && (
            <span className={styles.clipMeta}>
              {meta.w}×{meta.h} · {formatBytes(fileSize)}
            </span>
          )}
        </div>

        <div className={styles.topActions}>
          <input
            type="file"
            ref={fileInputRef}
            accept={ACCEPT.video}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
          <button className={styles.action} onClick={() => fileInputRef.current?.click()} title="Import a video">
            <UploadIcon size={13} /> Import
          </button>

          {/* Editing tools only exist once editing is switched on. */}
          {editMode && (
            <>
              <button className={styles.action} onClick={grabFrame} disabled={!videoUrl} title="Save the current frame as PNG">
                <CameraIcon size={13} /> Frame
              </button>
              <button
                className={`${styles.action} ${styles.primary}`}
                onClick={exportClip}
                disabled={!videoUrl || isExporting}
                title="Render the trimmed, graded clip"
              >
                <DownloadIcon size={13} /> {isExporting ? `${exportPct}%` : 'Export'}
              </button>
            </>
          )}

          <button
            className={`${styles.action} ${styles.modeToggle} ${editMode ? styles.modeOn : ''}`}
            onClick={() => { playClick(); setEditMode(m => !m); }}
            disabled={!videoUrl}
            title={editMode ? 'Leave editing mode' : 'Enter editing mode'}
            data-testid="video-edit-toggle"
          >
            <ScissorsIcon size={13} /> {editMode ? 'Editing' : 'Edit'}
          </button>
        </div>
      </div>

      {/* ── Stage ── */}
      <div className={styles.stage}>
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className={styles.video}
            style={{ filter: cssFilter }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onError={() => setLoadError('This browser cannot decode this file.')}
            playsInline
          />
        ) : (
          <div className={styles.empty}>
            <FilmIcon size={46} />
            <span className={styles.emptyTitle}>Video Studio</span>
            <span className={styles.emptyDesc}>
              Import a clip to trim, grade, grab frames and export.
            </span>
            <button className={styles.emptyAction} onClick={() => fileInputRef.current?.click()}>
              Import Video
            </button>
          </div>
        )}

        {loadError && (
          <div className={styles.errorOverlay}>
            <span className={styles.errorTitle}>Cannot play this file</span>
            <span className={styles.errorDesc}>
              {loadError} MP4 (H.264) and WebM play everywhere. MKV depends on the
              codecs inside it — a Matroska file holding H.264 usually plays; one
              holding HEVC or AV1 may not.
            </span>
          </div>
        )}

        {isExporting && (
          <div className={styles.exportOverlay}>
            <span className={styles.exportLabel}>Rendering {exportPct}%</span>
            <div className={styles.exportTrack}>
              <div className={styles.exportFill} style={{ width: `${exportPct}%` }} />
            </div>
            <span className={styles.exportNote}>
              Browsers have no transcoder, so the clip is re-recorded in real time.
            </span>
          </div>
        )}
      </div>

      {/* Offscreen canvas used as the export source. */}
      <canvas ref={canvasRef} className={styles.exportCanvas} />

      {/* ── Timeline ── */}
      <div className={styles.timeline}>
        <div className={styles.timeRow}>
          <span className={styles.time}>{tc(currentTime)}</span>
          <div className={styles.track} onClick={handleScrub}>
            {editMode && <div className={styles.trimRange} style={trimPct} />}
            <div
              className={styles.playhead}
              style={{ left: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
          <span className={styles.time}>{tc(duration)}</span>
        </div>

        <div className={styles.transport}>
          <button className={styles.tBtn} onClick={() => stepFrame(-1)} disabled={!videoUrl} title="Previous frame">⟨</button>
          <button className={`${styles.tBtn} ${styles.tPlay}`} onClick={togglePlay} disabled={!videoUrl}
                  title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
          </button>
          <button className={styles.tBtn} onClick={() => stepFrame(1)} disabled={!videoUrl} title="Next frame">⟩</button>

          {editMode && (
            <>
              <div className={styles.divider} />
              <button className={styles.tBtn} onClick={() => { playClick(); setTrimIn(currentTime); }}
                      disabled={!videoUrl} title="Set trim in-point">
                <ScissorsIcon size={13} /> In
              </button>
              <button className={styles.tBtn} onClick={() => { playClick(); setTrimOut(currentTime); }}
                      disabled={!videoUrl} title="Set trim out-point">
                Out <ScissorsIcon size={13} />
              </button>
              <span className={styles.trimReadout}>
                {tc(trimIn)} → {tc(trimOut)}
              </span>
            </>
          )}

          <div className={styles.spacer} />

          <button className={styles.tBtn} onClick={() => { playClick(); setIsMuted(m => !m); }} title="Mute">
            {isMuted ? <VolumeMuteIcon size={14} /> : <VolumeIcon size={14} />}
          </button>
          <input
            type="range" min="0" max="100" value={volume}
            onChange={(e) => { setVolume(Number(e.target.value)); setIsMuted(false); }}
            className={styles.vol}
            aria-label="Volume"
          />
          <select
            className={styles.rate}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            aria-label="Playback speed"
          >
            {[0.25, 0.5, 1, 1.5, 2].map(r => <option key={r} value={r}>{r}×</option>)}
          </select>
        </div>
      </div>

      {/* ── Side panel: editing only ── */}
      {editMode && (
      <div className={styles.panel}>
        <div className={styles.panelTabs}>
          {[['grade', 'Grade'], ['trim', 'Clip'], ['library', 'Library']].map(([id, label]) => (
            <button
              key={id}
              className={`${styles.panelTab} ${tab === id ? styles.panelTabActive : ''}`}
              onClick={() => { playClick(); setTab(id); }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'grade' && (
          <div className={styles.panelBody}>
            <div className={styles.presetRow}>
              {FILTER_PRESETS.map(p => (
                <button
                  key={p.id}
                  className={`${styles.preset} ${preset === p.id ? styles.presetActive : ''}`}
                  onClick={() => applyPreset(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {[
              ['Brightness', brightness, setBrightness, 0, 200, '%'],
              ['Contrast', contrast, setContrast, 0, 200, '%'],
              ['Saturation', saturate, setSaturate, 0, 200, '%'],
              ['Hue', hue, setHue, 0, 360, '°'],
              ['Grayscale', grayscale, setGrayscale, 0, 100, '%'],
              ['Sepia', sepia, setSepia, 0, 100, '%'],
              ['Blur', blur, setBlur, 0, 12, 'px'],
            ].map(([label, val, set, min, max, unit]) => (
              <label key={label} className={styles.slider}>
                <span className={styles.sliderLabel}>
                  {label}<span className={styles.sliderVal}>{val}{unit}</span>
                </span>
                <input
                  type="range" min={min} max={max} value={val}
                  onChange={(e) => { set(Number(e.target.value)); setPreset('custom'); }}
                />
              </label>
            ))}
          </div>
        )}

        {tab === 'trim' && (
          <div className={styles.panelBody}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>In point</span>
              <input
                type="range" min="0" max={duration || 0} step="0.01" value={trimIn}
                onChange={(e) => setTrimIn(Math.min(Number(e.target.value), trimOut))}
              />
              <span className={styles.fieldVal}>{tc(trimIn)}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Out point</span>
              <input
                type="range" min="0" max={duration || 0} step="0.01" value={trimOut}
                onChange={(e) => setTrimOut(Math.max(Number(e.target.value), trimIn))}
              />
              <span className={styles.fieldVal}>{tc(trimOut)}</span>
            </div>

            <div className={styles.statBlock}>
              <div className={styles.stat}><span>Selection</span><span>{tc(Math.max(0, trimOut - trimIn))}</span></div>
              <div className={styles.stat}><span>Source</span><span>{tc(duration)}</span></div>
              <div className={styles.stat}><span>Resolution</span><span>{meta.w}×{meta.h}</span></div>
              <div className={styles.stat}><span>Size</span><span>{formatBytes(fileSize)}</span></div>
            </div>

            <button className={styles.wideBtn} onClick={() => { playClick(); setTrimIn(0); setTrimOut(duration); }}>
              Reset to full clip
            </button>
          </div>
        )}

        {tab === 'library' && (
          <div className={styles.panelBody}>
            {library.length === 0 ? (
              <div className={styles.libEmpty}>
                <FolderIcon size={26} />
                <span>No clips in {LIBRARY.video}</span>
              </div>
            ) : (
              library.map(item => (
                <div key={item.path} className={styles.libItem}>
                  <button className={styles.libOpen} onClick={() => { playClick(); openFromVfs(item.path); }}>
                    <FilmIcon size={13} />
                    <span className={styles.libName}>{item.name}</span>
                    <span className={styles.libSize}>{formatBytes(item.size)}</span>
                  </button>
                  <button className={styles.libDel} onClick={() => deleteFromLibrary(item)} title="Delete">
                    <TrashIcon size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
