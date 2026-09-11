import io

# ══ FIX 1: AudioPlayerApp accepts and loads a filePath ══
p = 'src/apps/AudioPlayerApp.jsx'
s = io.open(p, encoding='utf-8').read()

s = s.replace(
    "export default function AudioPlayerApp({ playClick = () => {} }) {",
    "export default function AudioPlayerApp({ playClick = () => {}, filePath = null }) {")

# Load the passed file once the graph helpers exist. Anchor on the sleep-timer
# effect, which sits after stopAudio/initAudio are defined.
anchor = "  // Sleep Timer countdown"
loader = '''  /**
   * Open a track handed in from File Explorer or a desktop icon.
   *
   * Without this the window opened but played nothing — the path was passed
   * and then ignored, so the app looked broken while "working".
   */
  useEffect(() => {
    if (!filePath) return;
    let cancelled = false;

    (async () => {
      try {
        const { url, node } = await urlForPath(filePath);
        if (cancelled) {
          revokeUrl(url);
          return;
        }

        stopAudio();
        if (objectUrlRef.current) revokeUrl(objectUrlRef.current);
        objectUrlRef.current = url;

        initAudio();
        const ctx = audioCtxRef.current;
        if (ctx?.state === 'suspended') ctx.resume().catch(() => {});

        // Replace any previous element/source before wiring a new one.
        if (mediaSourceRef.current) {
          try { mediaSourceRef.current.disconnect(); } catch { /* already detached */ }
          mediaSourceRef.current = null;
        }
        if (audioElementRef.current) {
          audioElementRef.current.pause();
          audioElementRef.current.src = '';
        }

        const audioEl = new Audio(url);
        audioElementRef.current = audioEl;
        audioEl.playbackRate = playbackSpeed;

        const source = ctx.createMediaElementSource(audioEl);
        mediaSourceRef.current = source;
        source.connect(bassFilterRef.current);

        audioEl.onloadedmetadata = () => {
          if (!cancelled) setDuration(Math.floor(audioEl.duration) || 180);
        };
        audioEl.ontimeupdate = () => {
          if (!cancelled) setCurrentTime(Math.floor(audioEl.currentTime));
        };
        audioEl.onended = () => {
          if (isLoopingRef.current) {
            audioEl.currentTime = 0;
            audioEl.play().catch(() => {});
          } else {
            setIsPlaying(false);
          }
        };

        setUploadedAudioUrl(url);
        setTrackTitle(node.name.replace(/\\.[^/.]+$/, ''));
        setTrackArtist('Music Library');
        setCurrentTime(0);

        await audioEl.play().catch(() => {
          // Autoplay may be blocked; the transport button still works.
        });
        if (!cancelled) setIsPlaying(true);
      } catch (err) {
        NotificationService.send({
          title: 'Could not open track',
          message: err?.message || String(err),
          type: 'error',
        });
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

'''
assert anchor in s, 'sleep timer anchor missing'
s = s.replace(anchor, loader + anchor, 1)

# The loader reads isLooping from a ref so it need not be a dependency.
s = s.replace(
    "  const paramsRef = useRef({ volume: 75, isMuted: false, eqBass: 2, eqMid: 0, eqTreble: 3, spatialReverb: true });",
    "  const paramsRef = useRef({ volume: 75, isMuted: false, eqBass: 2, eqMid: 0, eqTreble: 3, spatialReverb: true });\n"
    "  // Read by the file loader's `onended`, which must not re-run per toggle.\n"
    "  const isLoopingRef = useRef(true);")

s = s.replace(
    "    paramsRef.current = { volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb };",
    "    paramsRef.current = { volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb };\n    isLoopingRef.current = isLooping;")

s = s.replace(
    "  }, [volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb]);",
    "  }, [volume, isMuted, eqBass, eqMid, eqTreble, spatialReverb, isLooping]);", 1)

s = s.replace(
    "import { importFile, LIBRARY, ACCEPT } from '../services/storage/fileImport';",
    "import { importFile, LIBRARY, ACCEPT, urlForPath, revokeUrl } from '../services/storage/fileImport';")

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('1. AudioPlayerApp accepts filePath')


# ══ FIX 2: pass filePath through, and route desktop files by type ══
p = 'src/screens/DesktopScreen.jsx'
s = io.open(p, encoding='utf-8').read()

s = s.replace("""            {win.appId === 'media' && (
              <AudioPlayerApp
                playClick={playClick}
              />
            )}""",
"""            {win.appId === 'media' && (
              <AudioPlayerApp
                filePath={win.props?.filePath || null}
                playClick={playClick}
              />
            )}""")
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('2a. DesktopScreen passes filePath to the audio app')

# Desktop icons use the same routing table as File Explorer.
p = 'src/components/desktop/DesktopIconGrid.jsx'
s = io.open(p, encoding='utf-8').read()

old = """              if (node.type === 'dir') {
                onLaunchApp('files', node.name, null, { initialPath: node.path });
              } else if (node.name.endsWith('.svg') || node.name.endsWith('.png') || node.name.endsWith('.jpg')) {
                onLaunchApp('gallery', node.name, null, { filePath: node.path });
              } else {
                onLaunchApp('notepad', node.name, null, { filePath: node.path });
              }"""
new = """              if (node.type === 'dir') {
                onLaunchApp('files', node.name, null, { initialPath: node.path });
              } else {
                // Same routing table File Explorer uses, so a file opens in
                // the same app from either place. The old inline check knew
                // only about images and sent everything else to Notepad.
                onLaunchApp(appForFile(node.name), node.name, null, { filePath: node.path });
              }"""
assert old in s, 'desktop vfs open handler not matched'
s = s.replace(old, new)

s = s.replace("import styles from './DesktopIconGrid.module.css';",
              "import { appForFile } from '../../services/fileRouting';\nimport styles from './DesktopIconGrid.module.css';")
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('2b. desktop icons route by file type')
