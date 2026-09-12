/**
 * Billighost OS — Animated Icon Library
 *
 * Every icon is built from MULTIPLE parts (bodies, plates, gears, cores,
 * scanlines, sparks) rather than a single outline, and each declares
 * animatable parts via `data-part`. The shared vocabulary in icons.css
 * drives idle / hover / press states, including when the icon sits inside
 * any button — so call sites need no changes.
 *
 * Props (backwards compatible with the previous library):
 *   size, color, className, style, strokeWidth
 *   ambient  — opt into a resting animation (status icons only)
 *   animate  — force a state: 'spin' | 'pulse' | 'wave' | 'draw' | 'press'
 *
 * Conventions:
 *   • 24×24 viewBox everywhere
 *   • stroke inherits `color` (currentColor by default)
 *   • accent fills use the OS accent tokens so icons tint with the theme
 */

import './icons.css';

const A_GLOW = 'var(--accent-glow, #7eb8ff)';
const A_SOFT = 'var(--accent-soft, #a78bfa)';
const A_OK = 'var(--accent-success, #34d399)';
const A_WARN = 'var(--accent-warning, #fbbf24)';
const A_ERR = 'var(--accent-error, #ff4d6a)';

/**
 * Icon factory.
 * @param {Function} render  (ctx) => SVG children, where ctx carries stroke props
 */
function makeIcon(name, render) {
  const Icon = ({
    size = 18,
    color = 'currentColor',
    className = '',
    style = {},
    strokeWidth = 1.7,
    ambient = false,
    animate,
    title,
    ...rest
  }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`bh-icon ${animate ? `bh-anim-${animate}` : ''} ${className}`}
      style={style}
      data-icon={name}
      data-ambient={ambient ? 'true' : undefined}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {render({ color, strokeWidth })}
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

/** Radial gear teeth — n spokes between r1 and r2 around (cx, cy). */
function teeth(cx, cy, r1, r2, n, width = 1.5) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    out.push(
      <line
        key={i}
        x1={(cx + c * r1).toFixed(2)}
        y1={(cy + s * r1).toFixed(2)}
        x2={(cx + c * r2).toFixed(2)}
        y2={(cy + s * r2).toFixed(2)}
        strokeWidth={width}
      />
    );
  }
  return out;
}

/* ══════════════════════════════════════════════
   HERO ICONS — desktop, taskbar, start menu
   ══════════════════════════════════════════════ */

/**
 * Settings — a three-gear train.
 * hover: gears counter-rotate (large CW, small CCW) + core glows
 * press: each gear snaps a quarter turn, ring flashes outward
 */
export const GearIcon = makeIcon('gear', () => (
  <>
    {/* press ring */}
    <circle data-part="ring" cx="12" cy="12" r="10.5" stroke={A_GLOW} strokeWidth="1" />

    {/* primary gear */}
    <g data-part="spin">
      <circle cx="10.5" cy="10.5" r="5" />
      {teeth(10.5, 10.5, 5, 7.1, 8)}
      <circle cx="10.5" cy="10.5" r="2.1" />
    </g>

    {/* secondary gear, meshing lower-right */}
    <g data-part="spinRev">
      <circle cx="18.2" cy="17.4" r="3.1" />
      {teeth(18.2, 17.4, 3.1, 4.5, 6, 1.3)}
      <circle cx="18.2" cy="17.4" r="1.1" />
    </g>

    {/* tertiary micro gear */}
    <g data-part="spinFast">
      <circle cx="18.6" cy="6.4" r="1.9" strokeWidth="1.4" />
      {teeth(18.6, 6.4, 1.9, 2.9, 5, 1.1)}
    </g>

    <circle data-part="glow" cx="10.5" cy="10.5" r="1" fill={A_GLOW} stroke="none" opacity="0.4" />
    <circle data-part="flash" cx="12" cy="12" r="4" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * Folder — body, hinged lid, two documents inside.
 * hover: lid swings open, papers rise out
 * press: contents pop
 */
export const FolderIcon = makeIcon('folder', () => (
  <>
    {/* papers behind the lid */}
    <g data-part="rise">
      <rect x="8.2" y="5.4" width="7.6" height="8" rx="1" stroke={A_GLOW} strokeWidth="1.3" opacity="0.75" />
      <line x1="10" y1="8.2" x2="14" y2="8.2" strokeWidth="1.1" opacity="0.5" />
      <line x1="10" y1="10.4" x2="13" y2="10.4" strokeWidth="1.1" opacity="0.5" />
    </g>

    {/* back plate with tab */}
    <path d="M2.8 19V6.2a1.6 1.6 0 0 1 1.6-1.6h4.2l1.7 2.5h8.1a1.6 1.6 0 0 1 1.6 1.6v1" />

    {/* hinged front lid */}
    <g data-part="lid" style={{ transformBox: 'view-box', transformOrigin: '3.5px 19px' }}>
      <path d="M2.8 19a1.6 1.6 0 0 0 1.6 1.6h15.2a1.6 1.6 0 0 0 1.6-1.6v-8.3H8.6a1.6 1.6 0 0 0-1.5 1.1L5 19z" fill="rgba(126,184,255,0.07)" />
    </g>

    <circle data-part="flash" cx="12" cy="13" r="5" fill={A_GLOW} stroke="none" />
  </>
));

export const FolderOpenIcon = makeIcon('folderOpen', () => (
  <>
    <g data-part="rise">
      <rect x="8.6" y="4.6" width="7" height="7" rx="1" stroke={A_GLOW} strokeWidth="1.3" opacity="0.7" />
    </g>
    <path d="M2.6 19V6.2a1.6 1.6 0 0 1 1.6-1.6h4.2l1.7 2.5h8.1a1.6 1.6 0 0 1 1.6 1.6v1.4" />
    <g data-part="lid" style={{ transformBox: 'view-box', transformOrigin: '3px 20px' }}>
      <path d="M3.4 20.6h15.3a1 1 0 0 0 .96-.72L22 12.6H7.3a1 1 0 0 0-.96.72L3.4 20.6" fill="rgba(126,184,255,0.07)" />
    </g>
  </>
));

/**
 * Terminal — window chrome, prompt, blinking caret, scanline.
 * hover: caret blinks, command line types in, scanline sweeps
 * press: screen flashes
 */
export const TerminalIcon = makeIcon('terminal', () => (
  <>
    <rect x="2.4" y="3.4" width="19.2" height="17.2" rx="2.2" />
    <line x1="2.4" y1="7.6" x2="21.6" y2="7.6" opacity="0.55" />
    <circle cx="5.2" cy="5.5" r="0.75" fill={A_ERR} stroke="none" />
    <circle cx="7.6" cy="5.5" r="0.75" fill={A_WARN} stroke="none" />
    <circle cx="10" cy="5.5" r="0.75" fill={A_OK} stroke="none" />

    {/* prompt chevron */}
    <polyline points="5.4 11.6 7.6 13.6 5.4 15.6" stroke={A_OK} strokeWidth="1.5" />

    {/* command line that types in on hover */}
    <line data-part="typeIn" x1="9.4" y1="15.6" x2="16.4" y2="15.6" stroke={A_GLOW} strokeWidth="1.4" />
    <line data-part="typeIn" data-i="1" x1="9.4" y1="12.2" x2="13.6" y2="12.2" opacity="0.6" strokeWidth="1.3" />

    {/* caret */}
    <rect data-part="blink" x="17.6" y="14.4" width="1.7" height="2.6" rx="0.3" fill={A_OK} stroke="none" />

    {/* scanline */}
    <line data-part="scan" x1="3.6" y1="12" x2="20.4" y2="12" stroke={A_GLOW} strokeWidth="1" opacity="0" />
    <rect data-part="flash" x="3.4" y="8.6" width="17.2" height="11" rx="1" fill={A_OK} stroke="none" />
  </>
));

/**
 * Browser / Globe — meridians, orbital ring, satellite.
 * hover: satellite orbits, meridians shimmer
 * press: ring pulse
 */
export const GlobeIcon = makeIcon('globe', () => (
  <>
    <circle cx="12" cy="12" r="8.4" />
    <ellipse data-part="shimmer" cx="12" cy="12" rx="3.6" ry="8.4" opacity="0.55" />
    <line x1="3.6" y1="12" x2="20.4" y2="12" opacity="0.55" />
    <path d="M4.9 7.4c2 1.1 4.4 1.7 7.1 1.7s5.1-.6 7.1-1.7" opacity="0.42" strokeWidth="1.3" />
    <path d="M4.9 16.6c2-1.1 4.4-1.7 7.1-1.7s5.1.6 7.1 1.7" opacity="0.42" strokeWidth="1.3" />

    {/* orbital plane + satellite */}
    <g data-part="orbit">
      <ellipse cx="12" cy="12" rx="11" ry="4.2" stroke={A_SOFT} strokeWidth="0.9" opacity="0.4" transform="rotate(-22 12 12)" />
      <circle cx="22.6" cy="7.8" r="1.3" fill={A_SOFT} stroke="none" />
    </g>

    <circle data-part="flash" cx="12" cy="12" r="7" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * Music — note, staff, live equaliser bars.
 * hover: bars dance in sequence, note bobs
 * press: note pops
 */
export const MusicNoteIcon = makeIcon('music', () => (
  <>
    {/* staff */}
    <line x1="2.6" y1="7" x2="21.4" y2="7" opacity="0.18" strokeWidth="1" />
    <line x1="2.6" y1="17" x2="21.4" y2="17" opacity="0.18" strokeWidth="1" />

    {/* note */}
    <g data-part="bob">
      <path d="M9.4 17V6.4l7.4-1.5v9.6" strokeWidth="1.6" />
      <ellipse data-part="pulse" cx="7.2" cy="17.4" rx="2.7" ry="2.3" fill="rgba(126,184,255,0.18)" />
      <ellipse cx="14.6" cy="14.9" rx="2.5" ry="2.1" fill="rgba(167,139,250,0.18)" />
    </g>

    {/* equaliser */}
    <g stroke={A_GLOW} strokeWidth="1.5" opacity="0.9">
      <line data-part="wave" x1="19" y1="13.4" x2="19" y2="9.2" />
      <line data-part="wave" data-i="1" x1="21.4" y1="13.4" x2="21.4" y2="6.6" />
      <line data-part="wave" data-i="2" x1="16.6" y1="19.6" x2="16.6" y2="17.4" />
    </g>
  </>
));

/**
 * Gallery — frame, layered photo behind, mountains, sun.
 * hover: sun rises, back photo slides out
 * press: shutter flash
 */
export const ImageIcon = makeIcon('image', () => (
  <>
    {/* photo behind */}
    <g data-part="spreadR">
      <rect x="7" y="2.6" width="14.4" height="12" rx="1.8" opacity="0.35" strokeWidth="1.3" />
    </g>

    <rect x="2.6" y="5.4" width="15.6" height="15.6" rx="2.2" />

    {/* sun */}
    <circle data-part="rise" cx="7.6" cy="10" r="1.9" fill={A_WARN} stroke="none" opacity="0.85" />

    {/* landscape */}
    <path d="M2.6 17.8l4.2-4.2 3.1 3.1 3.4-3.8 4.9 5.3" strokeWidth="1.5" stroke={A_GLOW} />
    <rect data-part="flash" x="2.6" y="5.4" width="15.6" height="15.6" rx="2.2" fill="#ffffff" stroke="none" />
  </>
));

/**
 * Code — angle brackets, slash, code lines, caret.
 * hover: brackets spread apart, lines type in
 * press: caret pop
 */
export const CodeIcon = makeIcon('code', () => (
  <>
    <g data-part="spread">
      <polyline points="8.6 7 3.4 12 8.6 17" strokeWidth="1.8" />
    </g>
    <g data-part="spreadR">
      <polyline points="15.4 7 20.6 12 15.4 17" strokeWidth="1.8" />
    </g>
    <line x1="13.4" y1="5.4" x2="10.6" y2="18.6" stroke={A_SOFT} strokeWidth="1.5" opacity="0.8" />
    <g stroke={A_GLOW} strokeWidth="1.2" opacity="0.45">
      <line data-part="typeIn" x1="10.2" y1="9.4" x2="12.2" y2="9.4" />
      <line data-part="typeIn" data-i="1" x1="11.6" y1="14.6" x2="13.8" y2="14.6" />
    </g>
  </>
));

/**
 * Paint — brush with ferrule and bristles, palette dots, drip.
 * hover: brush swings, paint drips
 * press: splash
 */
export const BrushIcon = makeIcon('brush', () => (
  <>
    {/* palette dots */}
    <circle cx="4.4" cy="6.2" r="1.15" fill={A_ERR} stroke="none" opacity="0.75" />
    <circle cx="3.6" cy="10.2" r="1.15" fill={A_GLOW} stroke="none" opacity="0.75" />
    <circle cx="5" cy="14.2" r="1.15" fill={A_OK} stroke="none" opacity="0.75" />

    <g data-part="swing" style={{ transformBox: 'view-box', transformOrigin: '20px 4px' }}>
      {/* handle */}
      <path d="M20.4 3.6c.9.9.9 2.4 0 3.3l-7.7 7.7" strokeWidth="1.7" />
      {/* ferrule */}
      <path d="M12.7 14.6l-2.6-2.6" strokeWidth="2.4" stroke={A_SOFT} opacity="0.85" />
      {/* bristles */}
      <path d="M10.1 12l-2.5 2.5a3.4 3.4 0 0 0-1 2.4v1.7l1.8-.2a3.4 3.4 0 0 0 2.2-1l2.4-2.4z" fill="rgba(167,139,250,0.2)" strokeWidth="1.5" />
      {/* drip */}
      <circle data-part="drip" cx="8.4" cy="19.6" r="1.2" fill={A_SOFT} stroke="none" opacity="0" />
    </g>
    <circle data-part="flash" cx="9" cy="15" r="5" fill={A_SOFT} stroke="none" />
  </>
));

/**
 * Recycle bin — hinged lid, handle, ribs, crumpled ball inside.
 * hover: lid lifts, ball jiggles
 * press: flash
 */
export const TrashIcon = makeIcon('trash', () => (
  <>
    {/* hinged lid + handle */}
    <g data-part="lid" style={{ transformBox: 'view-box', transformOrigin: '4px 6.4px' }}>
      <line x1="3.2" y1="6.4" x2="20.8" y2="6.4" strokeWidth="1.8" />
      <path d="M9.4 6.4V4.6a1.6 1.6 0 0 1 1.6-1.6h2a1.6 1.6 0 0 1 1.6 1.6v1.8" strokeWidth="1.5" />
    </g>

    {/* can */}
    <path d="M18.6 6.4v13a2 2 0 0 1-2 2H7.4a2 2 0 0 1-2-2v-13" />

    {/* crumpled contents */}
    <g data-part="jiggle">
      <path d="M10.4 13.4l1.4-1.2 1.8 1 .9 1.7-1.7 1.1-1.9-.4z" fill="rgba(255,255,255,0.14)" strokeWidth="1.1" opacity="0.85" />
    </g>

    {/* ribs */}
    <line x1="9.6" y1="10.4" x2="9.6" y2="18" opacity="0.32" strokeWidth="1.2" />
    <line x1="14.4" y1="10.4" x2="14.4" y2="18" opacity="0.32" strokeWidth="1.2" />
    <circle data-part="flash" cx="12" cy="14" r="5" fill={A_ERR} stroke="none" />
  </>
));

/**
 * Calculator — body, display, keypad.
 * hover: keys light in sequence, display shimmers
 * press: display flash
 */
export const CalculatorIcon = makeIcon('calculator', () => (
  <>
    <rect x="4.2" y="2.4" width="15.6" height="19.2" rx="2.4" />
    <rect data-part="shimmer" x="6.6" y="4.8" width="10.8" height="4" rx="1" fill="rgba(126,184,255,0.16)" strokeWidth="1.2" />
    <line x1="8.4" y1="6.8" x2="15.6" y2="6.8" stroke={A_GLOW} strokeWidth="1.2" opacity="0.8" />

    {/* keypad */}
    <g fill="currentColor" stroke="none" opacity="0.55">
      <rect data-part="wave" x="6.8" y="11.2" width="2.6" height="2.2" rx="0.6" />
      <rect data-part="wave" data-i="1" x="10.7" y="11.2" width="2.6" height="2.2" rx="0.6" />
      <rect data-part="wave" data-i="2" x="14.6" y="11.2" width="2.6" height="2.2" rx="0.6" />
      <rect data-part="wave" data-i="1" x="6.8" y="15" width="2.6" height="2.2" rx="0.6" />
      <rect data-part="wave" data-i="2" x="10.7" y="15" width="2.6" height="2.2" rx="0.6" />
      <rect data-part="wave" data-i="3" x="14.6" y="15" width="2.6" height="4.4" rx="0.6" fill={A_GLOW} />
      <rect data-part="wave" data-i="2" x="6.8" y="18.2" width="6.5" height="1.2" rx="0.6" />
    </g>
    <rect data-part="flash" x="6.6" y="4.8" width="10.8" height="4" rx="1" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * This PC / Monitor — bezel, stand, UI bars, scanline.
 * hover: scanline sweeps, bars shimmer
 * press: power pulse
 */
export const MonitorIcon = makeIcon('monitor', () => (
  <>
    <rect x="2.2" y="3.4" width="19.6" height="13.4" rx="2" />
    <line x1="8.4" y1="20.6" x2="15.6" y2="20.6" strokeWidth="1.8" />
    <line x1="12" y1="16.8" x2="12" y2="20.6" strokeWidth="1.6" />

    {/* on-screen content */}
    <g stroke={A_GLOW} strokeWidth="1.3">
      <line data-part="wave" x1="5.4" y1="13.2" x2="5.4" y2="9.6" />
      <line data-part="wave" data-i="1" x1="8.2" y1="13.2" x2="8.2" y2="7.2" />
      <line data-part="wave" data-i="2" x1="11" y1="13.2" x2="11" y2="10.8" />
      <line data-part="wave" data-i="3" x1="13.8" y1="13.2" x2="13.8" y2="8.2" />
    </g>
    <line data-part="scan" x1="3.2" y1="10" x2="20.8" y2="10" stroke={A_GLOW} strokeWidth="1" opacity="0" />
    <circle data-part="pulse" cx="18" cy="13" r="1.1" fill={A_OK} stroke="none" />
  </>
));

/**
 * Notepad / Pen — nib, body, ruled lines, ink dot.
 * hover: pen writes (line draws), pen bobs
 * press: ink splash
 */
export const PenIcon = makeIcon('pen', () => (
  <>
    {/* ruled sheet */}
    <g opacity="0.3" strokeWidth="1.1">
      <line x1="3.2" y1="19.6" x2="12.4" y2="19.6" />
      <line x1="3.2" y1="16.2" x2="8.4" y2="16.2" />
    </g>

    {/* written stroke that draws on hover */}
    <path
      data-part="draw"
      pathLength="1"
      d="M3.6 20.4c2.4-.4 4-1.6 5.6-3.2"
      stroke={A_GLOW}
      strokeWidth="1.5"
      strokeDasharray="1"
      strokeDashoffset="1"
    />

    <g data-part="bob">
      {/* barrel */}
      <path d="M16.8 3.2a2.4 2.4 0 0 1 3.4 3.4L9.4 17.4l-4.2 1 1-4.2z" strokeWidth="1.6" />
      {/* nib band */}
      <line x1="15.2" y1="4.8" x2="18.6" y2="8.2" strokeWidth="1.5" stroke={A_SOFT} opacity="0.85" />
      {/* tip */}
      <path d="M6.2 14.2l1.6 1.6" strokeWidth="1.4" opacity="0.6" />
    </g>
    <circle data-part="flash" cx="6" cy="18" r="3.4" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * Task View — four panes at staggered depth.
 * hover: panes lift in sequence
 * press: converge flash
 */
export const WindowsIcon = makeIcon('windows', () => (
  <>
    <rect data-part="wave" x="2.6" y="2.6" width="8.4" height="8.4" rx="1.6" fill="rgba(126,184,255,0.12)" />
    <rect data-part="wave" data-i="1" x="13" y="2.6" width="8.4" height="8.4" rx="1.6" fill="rgba(167,139,250,0.12)" />
    <rect data-part="wave" data-i="2" x="2.6" y="13" width="8.4" height="8.4" rx="1.6" fill="rgba(167,139,250,0.12)" />
    <rect data-part="wave" data-i="3" x="13" y="13" width="8.4" height="8.4" rx="1.6" fill="rgba(126,184,255,0.12)" />
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * Search — lens, reticle crosshair, sweep line.
 * hover: reticle spins, sweep travels
 * press: lens pulse
 */
export const SearchIcon = makeIcon('search', () => (
  <>
    <circle data-part="pulse" cx="10.6" cy="10.6" r="7.2" />
    <line x1="21" y1="21" x2="15.7" y2="15.7" strokeWidth="1.9" />

    {/* reticle */}
    <g data-part="spin" opacity="0.6">
      <line x1="10.6" y1="5.4" x2="10.6" y2="7.4" strokeWidth="1.2" stroke={A_GLOW} />
      <line x1="10.6" y1="13.8" x2="10.6" y2="15.8" strokeWidth="1.2" stroke={A_GLOW} />
      <line x1="5.4" y1="10.6" x2="7.4" y2="10.6" strokeWidth="1.2" stroke={A_GLOW} />
      <line x1="13.8" y1="10.6" x2="15.8" y2="10.6" strokeWidth="1.2" stroke={A_GLOW} />
    </g>
    <circle data-part="glow" cx="10.6" cy="10.6" r="3" fill={A_GLOW} stroke="none" opacity="0.2" />
    <circle data-part="flash" cx="10.6" cy="10.6" r="6" fill={A_GLOW} stroke="none" />
  </>
));

/**
 * Ghost — the Billighost brand mark, icon scale.
 * hover: body bobs, eyes blink, core pulses
 */
export const GhostIcon = makeIcon('ghost', () => (
  <>
    <g data-part="bob">
      <path d="M12 2.6c-4.4 0-7.9 3.6-7.9 7.9v9.1c0 1 1.1 1.6 1.9 1.1l1.7-1.1a1.3 1.3 0 0 1 1.4 0l1.4.95a1.3 1.3 0 0 0 1.45 0l1-.7a1.3 1.3 0 0 1 1.5 0l1 .7a1.3 1.3 0 0 0 1.45 0l1.4-.95a1.3 1.3 0 0 1 1.4 0l1.7 1.1c.8.5 1.9-.1 1.9-1.1v-9.1c0-4.3-3.5-7.9-7.9-7.9z" fill="rgba(126,184,255,0.1)" />
      <ellipse data-part="blink" cx="9.2" cy="10" rx="1.25" ry="1.6" fill="currentColor" stroke="none" />
      <ellipse data-part="blink" data-i="1" cx="14.8" cy="10" rx="1.25" ry="1.6" fill="currentColor" stroke="none" />
      <circle data-part="pulse" cx="12" cy="14.2" r="1.15" fill={A_GLOW} stroke="none" opacity="0.7" />
    </g>
  </>
));

/**
 * Widgets — tile grid that breathes.
 * hover: tiles pulse in sequence
 */
export const WidgetsIcon = makeIcon('widgets', () => (
  <>
    <rect data-part="wave" x="2.8" y="2.8" width="7.4" height="9.4" rx="1.6" fill="rgba(126,184,255,0.1)" />
    <rect data-part="wave" data-i="2" x="13.8" y="2.8" width="7.4" height="5.4" rx="1.6" fill="rgba(167,139,250,0.1)" />
    <rect data-part="wave" data-i="1" x="13.8" y="11.8" width="7.4" height="9.4" rx="1.6" fill="rgba(126,184,255,0.1)" />
    <rect data-part="wave" data-i="3" x="2.8" y="15.8" width="7.4" height="5.4" rx="1.6" fill="rgba(167,139,250,0.1)" />
  </>
));

/* ══════════════════════════════════════════════
   SYSTEM / TRAY / STATUS
   ══════════════════════════════════════════════ */

export const BoltIcon = makeIcon('bolt', () => (
  <>
    <polygon data-part="pulse" points="13 2.4 3.6 14.2 11.6 14.2 10.8 21.6 20.4 9.8 12.4 9.8 13 2.4" fill="rgba(251,191,36,0.16)" />
    <line data-part="glow" x1="11.4" y1="6.6" x2="7.6" y2="11.6" stroke={A_WARN} strokeWidth="1.2" opacity="0.5" />
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_WARN} stroke="none" />
  </>
));

export const LockIcon = makeIcon('lock', () => (
  <>
    <g data-part="shackle">
      <path d="M7.4 11V7.4a4.6 4.6 0 0 1 9.2 0V11" />
    </g>
    <rect x="3.4" y="10.8" width="17.2" height="10.4" rx="2.2" fill="rgba(255,255,255,0.05)" />
    <circle data-part="pulse" cx="12" cy="15" r="1.5" fill={A_GLOW} stroke="none" />
    <line x1="12" y1="16.4" x2="12" y2="18.4" strokeWidth="1.5" />
  </>
));

export const ShieldIcon = makeIcon('shield', () => (
  <>
    <path d="M12 21.6s7.6-3.8 7.6-9.6V4.8L12 2 4.4 4.8v7.2c0 5.8 7.6 9.6 7.6 9.6z" fill="rgba(52,211,153,0.08)" />
    <polyline data-part="draw" pathLength="1" points="8.4 11.8 11 14.4 15.8 9.6" stroke={A_OK} strokeWidth="1.7" strokeDasharray="1" strokeDashoffset="1" />
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_OK} stroke="none" />
  </>
));

export const BellIcon = makeIcon('bell', () => (
  <>
    <g data-part="swing" style={{ transformBox: 'view-box', transformOrigin: '12px 3px' }}>
      <path d="M18.4 8.6a6.4 6.4 0 0 0-12.8 0c0 6.4-2.6 8.4-2.6 8.4h18s-2.6-2-2.6-8.4" fill="rgba(255,255,255,0.05)" />
      <line x1="12" y1="2.2" x2="12" y2="3.4" strokeWidth="1.5" />
    </g>
    <path data-part="pulse" d="M13.7 20.2a2 2 0 0 1-3.4 0" strokeWidth="1.6" />
    {/* sound arcs */}
    <path data-part="wave" d="M20.6 5.6a9 9 0 0 1 1.8 4" stroke={A_GLOW} strokeWidth="1.1" opacity="0" />
    <path data-part="wave" data-i="1" d="M3.4 5.6a9 9 0 0 0-1.8 4" stroke={A_GLOW} strokeWidth="1.1" opacity="0" />
  </>
));

export const WifiIcon = makeIcon('wifi', () => (
  <>
    <path data-part="wave" data-i="2" d="M1.6 8.8a16 16 0 0 1 20.8 0" opacity="0.9" />
    <path data-part="wave" data-i="1" d="M5 12.4a11 11 0 0 1 14 0" opacity="0.9" />
    <path data-part="wave" d="M8.5 15.9a6 6 0 0 1 7 0" opacity="0.9" />
    <circle data-part="pulse" cx="12" cy="19.6" r="1.3" fill="currentColor" stroke="none" />
  </>
));

export const WifiOffIcon = makeIcon('wifiOff', () => (
  <>
    <path d="M1.6 8.8a16 16 0 0 1 4.8-2.9" opacity="0.5" />
    <path d="M10.8 5.1a16 16 0 0 1 11.6 3.7" opacity="0.5" />
    <path d="M5 12.4a11 11 0 0 1 5.2-2.4" opacity="0.5" />
    <path d="M16.8 11.1a11 11 0 0 1 2.2 1.3" opacity="0.5" />
    <path d="M8.5 15.9a6 6 0 0 1 7 0" opacity="0.5" />
    <circle cx="12" cy="19.6" r="1.3" fill="currentColor" stroke="none" opacity="0.5" />
    <line data-part="pulse" x1="2.4" y1="2.4" x2="21.6" y2="21.6" stroke={A_ERR} strokeWidth="1.8" />
  </>
));

export const SignalIcon = makeIcon('signal', () => (
  <>
    <g strokeWidth="1.6">
      <line data-part="wave" x1="4" y1="20" x2="4" y2="16.4" opacity="0.9" />
      <line data-part="wave" data-i="1" x1="9.4" y1="20" x2="9.4" y2="12.8" opacity="0.9" />
      <line data-part="wave" data-i="2" x1="14.8" y1="20" x2="14.8" y2="8.6" opacity="0.9" />
      <line data-part="wave" data-i="3" x1="20.2" y1="20" x2="20.2" y2="4.4" opacity="0.9" />
    </g>
  </>
));

export const BatteryFullIcon = makeIcon('batteryFull', () => (
  <>
    <rect x="1.6" y="6.4" width="18" height="11.2" rx="2.4" />
    <line x1="22.4" y1="13.2" x2="22.4" y2="10.8" strokeWidth="2.4" />
    <rect data-part="glow" x="3.6" y="8.4" width="14" height="7.2" rx="1.2" fill={A_OK} stroke="none" opacity="0.45" />
  </>
));

export const BatteryChargingIcon = makeIcon('batteryCharging', () => (
  <>
    <rect x="1.6" y="6.4" width="18" height="11.2" rx="2.4" />
    <line x1="22.4" y1="13.2" x2="22.4" y2="10.8" strokeWidth="2.4" />
    <rect x="3.6" y="8.4" width="14" height="7.2" rx="1.2" fill={A_OK} stroke="none" opacity="0.2" />
    <polygon data-part="pulse" points="11.4 8 8.4 12.6 10.9 12.6 10.1 16.4 13.6 11.4 11.1 11.4 11.4 8" fill={A_WARN} stroke="none" />
  </>
));

export const PlugIcon = makeIcon('plug', () => (
  <>
    <path d="M12 21.6v-4.4" strokeWidth="1.7" />
    <line data-part="wave" x1="9.2" y1="8" x2="9.2" y2="2.4" />
    <line data-part="wave" data-i="1" x1="14.8" y1="8" x2="14.8" y2="2.4" />
    <path d="M18 8v4.6a6 6 0 0 1-12 0V8z" fill="rgba(52,211,153,0.08)" />
    <circle data-part="pulse" cx="12" cy="12" r="1.2" fill={A_OK} stroke="none" />
  </>
));

export const VolumeIcon = makeIcon('volume', () => (
  <>
    <polygon points="11 5.2 6 9.2 2.2 9.2 2.2 14.8 6 14.8 11 18.8 11 5.2" fill="rgba(126,184,255,0.12)" />
    <path data-part="wave" d="M14.8 8.9a5 5 0 0 1 0 6.2" opacity="0.9" />
    <path data-part="wave" data-i="1" d="M17.8 6.2a9 9 0 0 1 0 11.6" opacity="0.9" />
    <path data-part="wave" data-i="2" d="M20.6 3.8a13 13 0 0 1 0 16.4" opacity="0.7" />
  </>
));

export const VolumeMuteIcon = makeIcon('volumeMute', () => (
  <>
    <polygon points="11 5.2 6 9.2 2.2 9.2 2.2 14.8 6 14.8 11 18.8 11 5.2" fill="rgba(255,255,255,0.05)" />
    <g data-part="pulse" stroke={A_ERR} strokeWidth="1.8">
      <line x1="21.6" y1="9" x2="15.4" y2="15.2" />
      <line x1="15.4" y1="9" x2="21.6" y2="15.2" />
    </g>
  </>
));

export const SpeakerIcon = makeIcon('speaker', () => (
  <>
    <polygon points="11 5.2 6 9.2 2.2 9.2 2.2 14.8 6 14.8 11 18.8 11 5.2" fill="rgba(126,184,255,0.12)" />
    <path data-part="wave" d="M14.8 8.9a5 5 0 0 1 0 6.2" />
  </>
));

export const PowerIcon = makeIcon('power', () => (
  <>
    <path
      data-part="draw"
      pathLength="1"
      d="M18.4 6.6a9 9 0 1 1-12.8 0"
      strokeWidth="1.8"
      strokeDasharray="1"
      strokeDashoffset="1"
    />
    <path d="M18.4 6.6a9 9 0 1 1-12.8 0" opacity="0.2" />
    <line data-part="pulse" x1="12" y1="2.4" x2="12" y2="11.6" strokeWidth="1.9" stroke={A_ERR} />
    <circle data-part="flash" cx="12" cy="12" r="6.5" fill={A_ERR} stroke="none" />
  </>
));

export const MoonIcon = makeIcon('moon', () => (
  <>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" fill="rgba(167,139,250,0.1)" />
    <circle data-part="wave" cx="17.4" cy="5.4" r="0.8" fill={A_SOFT} stroke="none" />
    <circle data-part="wave" data-i="1" cx="20" cy="9" r="0.6" fill={A_SOFT} stroke="none" />
  </>
));

export const SunIcon = makeIcon('sun', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="4.6" fill="rgba(251,191,36,0.14)" />
    <g data-part="spin" strokeWidth="1.6">
      <line x1="12" y1="1.6" x2="12" y2="3.8" />
      <line x1="12" y1="20.2" x2="12" y2="22.4" />
      <line x1="1.6" y1="12" x2="3.8" y2="12" />
      <line x1="20.2" y1="12" x2="22.4" y2="12" />
      <line x1="4.6" y1="4.6" x2="6.2" y2="6.2" />
      <line x1="17.8" y1="17.8" x2="19.4" y2="19.4" />
      <line x1="4.6" y1="19.4" x2="6.2" y2="17.8" />
      <line x1="17.8" y1="6.2" x2="19.4" y2="4.6" />
    </g>
  </>
));

export const CloudIcon = makeIcon('cloud', () => (
  <>
    <path data-part="bob" d="M18 10h-1.3A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="rgba(126,184,255,0.08)" />
  </>
));

export const CalendarIcon = makeIcon('calendar', () => (
  <>
    <rect x="3.2" y="4.4" width="17.6" height="17.2" rx="2.2" />
    <line data-part="lift" x1="16" y1="2.4" x2="16" y2="6" strokeWidth="1.7" />
    <line data-part="lift" x1="8" y1="2.4" x2="8" y2="6" strokeWidth="1.7" />
    <line x1="3.2" y1="9.6" x2="20.8" y2="9.6" />
    <g fill={A_GLOW} stroke="none" opacity="0.6">
      <rect data-part="wave" x="6.4" y="12.4" width="2.4" height="2.2" rx="0.5" />
      <rect data-part="wave" data-i="1" x="10.8" y="12.4" width="2.4" height="2.2" rx="0.5" />
      <rect data-part="wave" data-i="2" x="15.2" y="12.4" width="2.4" height="2.2" rx="0.5" />
      <rect data-part="wave" data-i="3" x="6.4" y="16.4" width="2.4" height="2.2" rx="0.5" />
    </g>
  </>
));

export const GaugeIcon = makeIcon('gauge', () => (
  <>
    <path d="M3.4 17.4a9.6 9.6 0 1 1 17.2 0" strokeWidth="1.7" />
    <g opacity="0.4" strokeWidth="1.2">
      <line x1="4.6" y1="10.6" x2="6.2" y2="11.2" />
      <line x1="12" y1="4.4" x2="12" y2="6.2" />
      <line x1="19.4" y1="10.6" x2="17.8" y2="11.2" />
    </g>
    <line data-part="needle" x1="12" y1="17" x2="16" y2="10.4" strokeWidth="1.8" stroke={A_GLOW} />
    <circle data-part="pulse" cx="12" cy="17" r="1.8" fill="rgba(126,184,255,0.2)" />
  </>
));

export const ChartBarIcon = makeIcon('chartBar', () => (
  <>
    <line x1="3" y1="20.6" x2="21" y2="20.6" opacity="0.3" strokeWidth="1.2" />
    <g strokeWidth="2.2">
      <line data-part="wave" x1="6.4" y1="20.6" x2="6.4" y2="14.4" />
      <line data-part="wave" data-i="1" x1="12" y1="20.6" x2="12" y2="4.4" stroke={A_GLOW} />
      <line data-part="wave" data-i="2" x1="17.6" y1="20.6" x2="17.6" y2="10.4" />
    </g>
  </>
));

/* ══════════════════════════════════════════════
   FILES & DOCUMENTS
   ══════════════════════════════════════════════ */

export const FileIcon = makeIcon('file', () => (
  <>
    <g data-part="lift">
      <path d="M13.2 2.4H6.4a2 2 0 0 0-2 2v15.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.8z" fill="rgba(255,255,255,0.03)" />
      <polyline points="13.2 2.4 13.2 8.8 19.6 8.8" />
    </g>
  </>
));

export const FileTextIcon = makeIcon('fileText', () => (
  <>
    <g data-part="lift">
      <path d="M13.6 2.4H6.4a2 2 0 0 0-2 2v15.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.4z" fill="rgba(255,255,255,0.03)" />
      <polyline points="13.6 2.4 13.6 8.4 19.6 8.4" />
    </g>
    <g stroke={A_GLOW} strokeWidth="1.2" opacity="0.6">
      <line data-part="typeIn" x1="7.8" y1="13.2" x2="15.4" y2="13.2" />
      <line data-part="typeIn" data-i="1" x1="7.8" y1="16.6" x2="13.2" y2="16.6" />
    </g>
  </>
));

export const StickyNoteIcon = makeIcon('stickyNote', () => (
  <>
    <g data-part="lift">
      <path d="M13.6 2.4H6.4a2 2 0 0 0-2 2v15.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.4z" fill="rgba(251,191,36,0.07)" />
      <polyline points="13.6 2.4 13.6 8.4 19.6 8.4" />
    </g>
    <g stroke={A_WARN} strokeWidth="1.2" opacity="0.7">
      <line data-part="typeIn" x1="7.8" y1="13.2" x2="15.4" y2="13.2" />
      <line data-part="typeIn" data-i="1" x1="7.8" y1="16.6" x2="12.6" y2="16.6" />
    </g>
  </>
));

export const ScrollIcon = makeIcon('scroll', () => (
  <>
    <g data-part="lift">
      <path d="M13.6 2.4H6.4a2 2 0 0 0-2 2v15.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.4z" />
      <polyline points="13.6 2.4 13.6 8.4 19.6 8.4" />
    </g>
    <g opacity="0.6" strokeWidth="1.2">
      <line data-part="typeIn" x1="7.8" y1="13.2" x2="15.4" y2="13.2" />
      <line data-part="typeIn" data-i="1" x1="7.8" y1="16.6" x2="13.2" y2="16.6" />
    </g>
  </>
));

export const SaveIcon = makeIcon('save', () => (
  <>
    <path d="M19 21.6H5a2 2 0 0 1-2-2V4.4a2 2 0 0 1 2-2h11l5 5v12.2a2 2 0 0 1-2 2z" />
    <polyline data-part="lift" points="17 21.6 17 13.2 7 13.2 7 21.6" fill="rgba(126,184,255,0.1)" />
    <polyline points="7 2.4 7 8 15 8" opacity="0.6" />
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_GLOW} stroke="none" />
  </>
));

export const PackageIcon = makeIcon('package', () => (
  <>
    <g data-part="lift">
      <path d="M21 16.2V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8.2a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73z" fill="rgba(126,184,255,0.06)" />
      <polyline points="3.3 7 12 12.05 20.7 7" opacity="0.6" />
      <line x1="12" y1="22.1" x2="12" y2="12" opacity="0.6" />
    </g>
    <line x1="16.5" y1="9.4" x2="7.5" y2="4.2" opacity="0.45" strokeWidth="1.3" />
  </>
));

export const UploadIcon = makeIcon('upload', () => (
  <>
    <path d="M21 15.2v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.4" />
    <g data-part="lift">
      <polyline points="17 8 12 3 7 8" strokeWidth="1.8" stroke={A_GLOW} />
      <line x1="12" y1="3" x2="12" y2="15" strokeWidth="1.8" />
    </g>
  </>
));

export const DownloadIcon = makeIcon('download', () => (
  <>
    <path d="M21 15.2v4.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4.4" />
    <g data-part="bob">
      <polyline points="7 10 12 15 17 10" strokeWidth="1.8" stroke={A_GLOW} />
      <line x1="12" y1="15" x2="12" y2="3" strokeWidth="1.8" />
    </g>
  </>
));

export const RecycleIcon = makeIcon('recycle', () => (
  <>
    <g data-part="spin">
      <polyline points="7.5 4 3 9 7.5 14" />
      <path d="M3 9h13a4 4 0 0 1 0 8h-2" />
      <polyline points="16.5 20 21 15 16.5 10" />
      <path d="M21 15H8a4 4 0 0 1 0-8h2" />
    </g>
  </>
));

/**
 * Refresh — arcs that rotate, with a leading spark.
 * hover: continuous rotation
 * press: quarter-turn snap
 */
export const RefreshIcon = makeIcon('refresh', () => (
  <>
    <g data-part="spin">
      <polyline points="22.4 4 22.4 10 16.4 10" strokeWidth="1.7" />
      <polyline points="1.6 20 1.6 14 7.6 14" strokeWidth="1.7" />
      <path d="M3.5 9a9 9 0 0 1 14.85-3.36L22.4 10" strokeWidth="1.7" />
      <path d="M1.6 14l4.05 4.36A9 9 0 0 0 20.5 15" strokeWidth="1.7" />
      <circle cx="22.4" cy="10" r="1.1" fill={A_GLOW} stroke="none" />
    </g>
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_GLOW} stroke="none" />
  </>
));

/** Alias — `RefreshCwIcon` is the lucide-style name used by TaskManagerApp. */
export const RefreshCwIcon = RefreshIcon;

export const UndoIcon = makeIcon('undo', () => (
  <>
    <g data-part="spread">
      <polyline points="9 14 4 9 9 4" strokeWidth="1.8" stroke={A_GLOW} />
    </g>
    <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
  </>
));

export const RedoIcon = makeIcon('redo', () => (
  <>
    <g data-part="spreadR">
      <polyline points="15 14 20 9 15 4" strokeWidth="1.8" stroke={A_GLOW} />
    </g>
    <path d="M4 20v-7a4 4 0 0 1 4-4h12" />
  </>
));

/* ══════════════════════════════════════════════
   NAVIGATION & CONTROLS
   ══════════════════════════════════════════════ */

export const HomeIcon = makeIcon('home', () => (
  <>
    <path d="M3 9.4l9-7 9 7v10.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="rgba(126,184,255,0.06)" />
    <polyline data-part="lift" points="9.2 21.6 9.2 12.4 14.8 12.4 14.8 21.6" fill="rgba(126,184,255,0.1)" />
  </>
));

export const ArrowUpIcon = makeIcon('arrowUp', () => (
  <>
    <g data-part="lift">
      <line x1="12" y1="19.6" x2="12" y2="4.6" strokeWidth="1.8" />
      <polyline points="5.4 11.2 12 4.6 18.6 11.2" strokeWidth="1.8" />
    </g>
  </>
));

export const ChevronLeftIcon = makeIcon('chevronLeft', () => (
  <>
    <g data-part="spread">
      <polyline points="15 18 9 12 15 6" strokeWidth="1.9" />
    </g>
  </>
));

export const ChevronRightIcon = makeIcon('chevronRight', () => (
  <>
    <g data-part="spreadR">
      <polyline points="9 18 15 12 9 6" strokeWidth="1.9" />
    </g>
  </>
));

export const PlusIcon = makeIcon('plus', () => (
  <>
    <g data-part="spin">
      <line x1="12" y1="5" x2="12" y2="19" strokeWidth="1.9" />
      <line x1="5" y1="12" x2="19" y2="12" strokeWidth="1.9" />
    </g>
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_GLOW} stroke="none" />
  </>
));

export const MinusIcon = makeIcon('minus', () => (
  <>
    <line data-part="pulse" x1="5" y1="12" x2="19" y2="12" strokeWidth="1.9" />
  </>
));

export const CloseIcon = makeIcon('close', () => (
  <>
    <g data-part="spin">
      <line x1="18" y1="6" x2="6" y2="18" strokeWidth="1.9" />
      <line x1="6" y1="6" x2="18" y2="18" strokeWidth="1.9" />
    </g>
    <circle data-part="flash" cx="12" cy="12" r="6" fill={A_ERR} stroke="none" />
  </>
));

export const CheckIcon = makeIcon('check', () => (
  <>
    <polyline
      data-part="draw"
      pathLength="1"
      points="20 6.4 9 17.4 4 12.4"
      strokeWidth="2"
      stroke={A_OK}
      strokeDasharray="1"
      strokeDashoffset="1"
    />
    <polyline points="20 6.4 9 17.4 4 12.4" strokeWidth="2" opacity="0.18" />
  </>
));

export const MaximizeIcon = makeIcon('maximize', () => (
  <>
    <rect data-part="pulse" x="3.4" y="3.4" width="17.2" height="17.2" rx="2.2" />
    <rect x="7" y="7" width="10" height="10" rx="1.2" opacity="0.3" />
  </>
));

export const ExpandIcon = makeIcon('expand', () => (
  <>
    <g data-part="spreadR">
      <polyline points="15 3.4 20.6 3.4 20.6 9" strokeWidth="1.8" />
    </g>
    <g data-part="spread">
      <polyline points="9 20.6 3.4 20.6 3.4 15" strokeWidth="1.8" />
    </g>
    <line x1="20.6" y1="3.4" x2="14" y2="10" opacity="0.6" />
    <line x1="3.4" y1="20.6" x2="10" y2="14" opacity="0.6" />
  </>
));

export const RotateIcon = makeIcon('rotate', () => (
  <>
    <g data-part="spin">
      <path d="M20.4 12a8.4 8.4 0 1 1-2.46-5.94" strokeWidth="1.7" />
      <polyline points="18 2.4 18 6.6 13.8 6.6" strokeWidth="1.7" stroke={A_GLOW} />
    </g>
  </>
));

export const ExternalLinkIcon = makeIcon('externalLink', () => (
  <>
    <path d="M18 13.2v6.4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2h6.4" />
    <g data-part="lift">
      <polyline points="15 2.4 21.6 2.4 21.6 9" strokeWidth="1.7" stroke={A_GLOW} />
      <line x1="10" y1="14" x2="21.6" y2="2.4" strokeWidth="1.7" />
    </g>
  </>
));

export const GridHashIcon = makeIcon('gridHash', () => (
  <>
    <g data-part="spread">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="10" y1="3" x2="8" y2="21" />
    </g>
    <g data-part="spreadR">
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </g>
  </>
));

/* ══════════════════════════════════════════════
   IDENTITY, INFO & MISC
   ══════════════════════════════════════════════ */

export const UserIcon = makeIcon('user', () => (
  <>
    <circle data-part="lift" cx="12" cy="7.4" r="4.2" fill="rgba(126,184,255,0.1)" />
    <path d="M20 21.6v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle data-part="glow" cx="12" cy="7.4" r="1.6" fill={A_GLOW} stroke="none" opacity="0.25" />
  </>
));

export const InfoIcon = makeIcon('info', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="9.4" />
    <line x1="12" y1="16.4" x2="12" y2="11.4" strokeWidth="1.8" stroke={A_GLOW} />
    <circle data-part="glow" cx="12" cy="8" r="1" fill={A_GLOW} stroke="none" />
  </>
));

export const AlertTriangleIcon = makeIcon('alertTriangle', () => (
  <>
    <path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h16.94a2 2 0 0 0 1.71-3L13.7 3.9a2 2 0 0 0-3.4 0z" fill="rgba(251,191,36,0.08)" />
    <line data-part="pulse" x1="12" y1="9" x2="12" y2="13.4" strokeWidth="1.9" stroke={A_WARN} />
    <circle data-part="blink" cx="12" cy="17" r="1.05" fill={A_WARN} stroke="none" />
  </>
));

export const PaletteIcon = makeIcon('palette', () => (
  <>
    <path d="M12 2.4C6.5 2.4 2.4 6.5 2.4 12s4.1 9.6 9.6 9.6c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04a1.5 1.5 0 0 1 1.13-2.46H16c3.31 0 5.6-2.29 5.6-5.6 0-5.17-4.09-8.6-9.6-8.6z" fill="rgba(255,255,255,0.03)" />
    <circle data-part="wave" cx="8.4" cy="7.6" r="1.35" fill={A_ERR} stroke="none" />
    <circle data-part="wave" data-i="1" cx="13.4" cy="6.6" r="1.35" fill={A_WARN} stroke="none" />
    <circle data-part="wave" data-i="2" cx="17.4" cy="10.4" r="1.35" fill={A_GLOW} stroke="none" />
    <circle data-part="wave" data-i="3" cx="6.6" cy="12.4" r="1.35" fill={A_SOFT} stroke="none" />
  </>
));

export const BookIcon = makeIcon('book', () => (
  <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <g data-part="lid" style={{ transformBox: 'view-box', transformOrigin: '4px 12px' }}>
      <path d="M6.5 2.4H20v19.2H6.5A2.5 2.5 0 0 1 4 19.1V4.9a2.5 2.5 0 0 1 2.5-2.5z" fill="rgba(126,184,255,0.05)" />
    </g>
    <line data-part="typeIn" x1="8.4" y1="7.4" x2="16.4" y2="7.4" opacity="0.45" strokeWidth="1.2" />
    <line data-part="typeIn" data-i="1" x1="8.4" y1="11" x2="14.4" y2="11" opacity="0.45" strokeWidth="1.2" />
  </>
));

export const NewspaperIcon = makeIcon('newspaper', () => (
  <>
    <path d="M4 21.6h16a2 2 0 0 0 2-2V4.4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v15.2a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9h4" />
    <g stroke={A_GLOW} strokeWidth="1.2" opacity="0.6">
      <line data-part="typeIn" x1="10" y1="6.4" x2="18" y2="6.4" />
      <line data-part="typeIn" data-i="1" x1="10" y1="10" x2="18" y2="10" />
      <line data-part="typeIn" data-i="2" x1="10" y1="13.6" x2="14" y2="13.6" />
    </g>
  </>
));

export const DuckSearchIcon = makeIcon('duckSearch', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="9.4" fill="rgba(251,131,66,0.08)" />
    <path d="M15 9c0-1.55-1.34-2.8-3-2.8S9 7.45 9 9c0 2 3 2.5 3 5" strokeWidth="1.8" />
    <circle data-part="blink" cx="12" cy="17.2" r="1.05" fill="currentColor" stroke="none" />
  </>
));

export const SmartphoneIcon = makeIcon('smartphone', () => (
  <>
    <rect x="5.4" y="2.4" width="13.2" height="19.2" rx="2.4" />
    <line x1="10" y1="4.8" x2="14" y2="4.8" opacity="0.45" strokeWidth="1.3" />
    <circle data-part="pulse" cx="12" cy="18.4" r="1.1" fill="currentColor" stroke="none" />
    <rect data-part="shimmer" x="7.4" y="7.2" width="9.2" height="8.4" rx="1" fill="rgba(126,184,255,0.1)" stroke="none" />
  </>
));

/* ══════════════════════════════════════════════
   MEDIA & VIDEO STUDIO
   ══════════════════════════════════════════════ */

/**
 * Film — reel body with sprocket perforations and a frame divider.
 * hover: perforations march in sequence, scanline sweeps
 * press: shutter flash
 */
export const FilmIcon = makeIcon('film', () => (
  <>
    <rect x="2.4" y="4.2" width="19.2" height="15.6" rx="2.2" />
    <line x1="7.4" y1="4.2" x2="7.4" y2="19.8" opacity="0.5" strokeWidth="1.2" />
    <line x1="16.6" y1="4.2" x2="16.6" y2="19.8" opacity="0.5" strokeWidth="1.2" />
    <g fill={A_GLOW} stroke="none" opacity="0.75">
      <rect data-part="wave" x="4.1" y="6.4" width="1.8" height="1.8" rx="0.4" />
      <rect data-part="wave" data-i="1" x="4.1" y="11.1" width="1.8" height="1.8" rx="0.4" />
      <rect data-part="wave" data-i="2" x="4.1" y="15.8" width="1.8" height="1.8" rx="0.4" />
      <rect data-part="wave" data-i="2" x="18.1" y="6.4" width="1.8" height="1.8" rx="0.4" />
      <rect data-part="wave" data-i="1" x="18.1" y="11.1" width="1.8" height="1.8" rx="0.4" />
      <rect data-part="wave" x="18.1" y="15.8" width="1.8" height="1.8" rx="0.4" />
    </g>
    <line data-part="scan" x1="8" y1="12" x2="16" y2="12" stroke={A_SOFT} strokeWidth="1" opacity="0" />
    <rect data-part="flash" x="7.4" y="4.2" width="9.2" height="15.6" fill="#ffffff" stroke="none" />
  </>
));

export const PlayIcon = makeIcon('play', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="9.6" opacity="0.28" />
    <polygon data-part="core" points="9.4 6.8 18 12 9.4 17.2" fill="currentColor" stroke="none" />
    <circle data-part="flash" cx="12" cy="12" r="7" fill={A_OK} stroke="none" />
  </>
));

export const PauseIcon = makeIcon('pause', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="9.6" opacity="0.28" />
    <rect data-part="spread" x="8.6" y="7.2" width="2.6" height="9.6" rx="0.8" fill="currentColor" stroke="none" />
    <rect data-part="spreadR" x="12.8" y="7.2" width="2.6" height="9.6" rx="0.8" fill="currentColor" stroke="none" />
  </>
));

export const StopIcon = makeIcon('stop', () => (
  <>
    <circle data-part="pulse" cx="12" cy="12" r="9.6" opacity="0.28" />
    <rect data-part="core" x="8.4" y="8.4" width="7.2" height="7.2" rx="1.2" fill="currentColor" stroke="none" />
  </>
));

/** Scissors — blades open on hover, rivet pulses at the pivot. */
export const ScissorsIcon = makeIcon('scissors', () => (
  <>
    <g data-part="spread">
      <circle cx="6.2" cy="18.2" r="2.5" />
      <line x1="19.6" y1="4.4" x2="8.1" y2="16.3" strokeWidth="1.6" />
    </g>
    <g data-part="spreadR">
      <circle cx="6.2" cy="5.8" r="2.5" />
      <line x1="19.6" y1="19.6" x2="8.1" y2="7.7" strokeWidth="1.6" />
    </g>
    <circle data-part="pulse" cx="12" cy="12" r="1.15" fill={A_GLOW} stroke="none" />
  </>
));

/** Camera — body, lens, viewfinder hump, flash bulb. */
export const CameraIcon = makeIcon('camera', () => (
  <>
    <path d="M3.4 8.2h3.1l1.5-2.3h7.9l1.5 2.3h3.2a1.8 1.8 0 0 1 1.8 1.8v8.2a1.8 1.8 0 0 1-1.8 1.8H3.4a1.8 1.8 0 0 1-1.8-1.8V10a1.8 1.8 0 0 1 1.8-1.8z" />
    <circle data-part="pulse" cx="12" cy="13.8" r="4" />
    <circle cx="12" cy="13.8" r="1.7" fill={A_GLOW} stroke="none" opacity="0.6" />
    <circle data-part="glow" cx="19.2" cy="10.6" r="0.9" fill={A_WARN} stroke="none" />
    <circle data-part="flash" cx="12" cy="13.8" r="6.5" fill="#ffffff" stroke="none" />
  </>
));

/* ══════════════════════════════════════════════
   FILE TYPE ICONS

   Each is the same page silhouette plus a type glyph and a coloured fold,
   so a folder of mixed files is readable at a glance without labels.
   ══════════════════════════════════════════════ */

/** Shared page outline with a folded corner tinted per type. */
function pageBase(accent) {
  return (
    <>
      <path
        d="M13.6 2.4H6.4a2 2 0 0 0-2 2v15.2a2 2 0 0 0 2 2h11.2a2 2 0 0 0 2-2V8.4z"
        fill="rgba(255,255,255,0.03)"
      />
      <polyline points="13.6 2.4 13.6 8.4 19.6 8.4" opacity="0.7" />
      <path d="M13.6 2.4L19.6 8.4" stroke={accent} strokeWidth="1.2" opacity="0.55" />
    </>
  );
}

export const FileAudioIcon = makeIcon('fileAudio', () => (
  <>
    <g data-part="lift">{pageBase(A_SOFT)}</g>
    <g stroke={A_SOFT} strokeWidth="1.5">
      <line data-part="wave" x1="8" y1="16.4" x2="8" y2="13.6" />
      <line data-part="wave" data-i="1" x1="10.4" y1="17.6" x2="10.4" y2="12.4" />
      <line data-part="wave" data-i="2" x1="12.8" y1="16.8" x2="12.8" y2="13.2" />
      <line data-part="wave" data-i="3" x1="15.2" y1="18" x2="15.2" y2="12" />
    </g>
  </>
));

export const FileVideoIcon = makeIcon('fileVideo', () => (
  <>
    <g data-part="lift">{pageBase(A_GLOW)}</g>
    <rect x="7.2" y="12.4" width="6.6" height="5.4" rx="1" stroke={A_GLOW} strokeWidth="1.3" />
    <polygon data-part="pulse" points="14.2 13.6 17.4 12.2 17.4 18 14.2 16.6" fill={A_GLOW} stroke="none" opacity="0.75" />
    <polygon points="9.2 14.1 11.6 15.1 9.2 16.1" fill="#fff" stroke="none" opacity="0.85" />
  </>
));

export const FileImageIcon = makeIcon('fileImage', () => (
  <>
    <g data-part="lift">{pageBase(A_OK)}</g>
    <rect x="7.2" y="12" width="9.6" height="6.4" rx="1" stroke={A_OK} strokeWidth="1.3" />
    <circle data-part="rise" cx="9.8" cy="14.2" r="1" fill={A_WARN} stroke="none" />
    <path d="M7.6 17.8l2.6-2.4 1.9 1.7 2.1-2.2 2.4 2.9" stroke={A_OK} strokeWidth="1.2" />
  </>
));

export const FileCodeIcon = makeIcon('fileCode', () => (
  <>
    <g data-part="lift">{pageBase(A_GLOW)}</g>
    <g strokeWidth="1.4" stroke={A_GLOW}>
      <polyline data-part="spread" points="10 13.4 7.6 15.6 10 17.8" />
      <polyline data-part="spreadR" points="14 13.4 16.4 15.6 14 17.8" />
    </g>
  </>
));

export const FileArchiveIcon = makeIcon('fileArchive', () => (
  <>
    <g data-part="lift">{pageBase(A_WARN)}</g>
    <g stroke={A_WARN} strokeWidth="1.4">
      <line data-part="wave" x1="12" y1="11.4" x2="12" y2="12.6" />
      <line data-part="wave" data-i="1" x1="12" y1="14" x2="12" y2="15.2" />
      <line data-part="wave" data-i="2" x1="12" y1="16.6" x2="12" y2="17.8" />
    </g>
    <rect data-part="pulse" x="10.5" y="18.2" width="3" height="2.2" rx="0.6" stroke={A_WARN} strokeWidth="1.2" />
  </>
));

export const FilePdfIcon = makeIcon('filePdf', () => (
  <>
    <g data-part="lift">{pageBase(A_ERR)}</g>
    <path
      data-part="draw"
      pathLength="1"
      d="M8 17.6c2.6-.6 4.2-3.1 4-5 -.1-1.1-1.3-1.3-1.6-.3-.5 1.6 1.1 4.2 3 5 1 .4 2 .4 2.6.2"
      stroke={A_ERR}
      strokeWidth="1.3"
      strokeDasharray="1"
      strokeDashoffset="1"
    />
  </>
));

export const FileSheetIcon = makeIcon('fileSheet', () => (
  <>
    <g data-part="lift">{pageBase(A_OK)}</g>
    <g stroke={A_OK} strokeWidth="1.1" opacity="0.85">
      <rect x="7.2" y="12" width="9.6" height="6.6" rx="0.8" />
      <line data-part="typeIn" x1="7.2" y1="14.2" x2="16.8" y2="14.2" />
      <line data-part="typeIn" data-i="1" x1="7.2" y1="16.4" x2="16.8" y2="16.4" />
      <line x1="10.4" y1="12" x2="10.4" y2="18.6" />
      <line x1="13.6" y1="12" x2="13.6" y2="18.6" />
    </g>
  </>
));

export const FileFontIcon = makeIcon('fileFont', () => (
  <>
    <g data-part="lift">{pageBase(A_SOFT)}</g>
    <g stroke={A_SOFT} strokeWidth="1.5">
      <line data-part="typeIn" x1="8.4" y1="12.6" x2="15.6" y2="12.6" />
      <line x1="12" y1="12.6" x2="12" y2="18.4" />
    </g>
  </>
));

export const GamepadIcon = makeIcon('gamepad', () => (
  <>
    <rect data-part="body" x="2.5" y="6.5" width="19" height="11.5" rx="5.5" stroke="currentColor" strokeWidth="1.6" />
    <path data-part="pulse" d="M6 12.25h4M8 10.25v4" stroke={A_GLOW} strokeWidth="1.6" strokeLinecap="round" />
    <circle data-part="spark" cx="15" cy="11" r="1" fill={A_ERR} stroke={A_ERR} strokeWidth="0.8" />
    <circle data-part="spark" cx="17.5" cy="13.5" r="1" fill={A_OK} stroke={A_OK} strokeWidth="0.8" />
    <circle cx="12.5" cy="8.5" r="0.6" fill="currentColor" opacity="0.6" />
  </>
));

export const SubwayIcon = makeIcon('subway', () => (
  <>
    <rect data-part="body" x="4.5" y="3.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
    <line x1="4.5" y1="11.5" x2="19.5" y2="11.5" stroke="currentColor" strokeWidth="1.4" />
    <rect x="7" y="5.5" width="10" height="4.5" rx="1" stroke={A_GLOW} strokeWidth="1.2" />
    <circle data-part="spark" cx="7.5" cy="15" r="1.2" fill={A_WARN} stroke={A_WARN} strokeWidth="0.6" />
    <circle data-part="spark" cx="16.5" cy="15" r="1.2" fill={A_WARN} stroke={A_WARN} strokeWidth="0.6" />
    <line data-part="draw" x1="6.5" y1="18.5" x2="4.5" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <line data-part="draw" x1="17.5" y1="18.5" x2="19.5" y2="21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </>
));

export const TrophyIcon = makeIcon('trophy', () => (
  <>
    <path data-part="body" d="M7 4h10v5c0 2.8-2.2 5-5 5s-5-2.2-5-5V4z" stroke={A_WARN} strokeWidth="1.6" />
    <path d="M7 6H4c0 2.5 1.5 4 3 4M17 6h3c0 2.5-1.5 4-3 4" stroke={A_WARN} strokeWidth="1.4" strokeLinecap="round" />
    <line x1="12" y1="14" x2="12" y2="18" stroke={A_WARN} strokeWidth="1.6" />
    <line data-part="draw" x1="8" y1="18" x2="16" y2="18" stroke={A_WARN} strokeWidth="1.8" strokeLinecap="round" />
  </>
));

export const RocketIcon = makeIcon('rocket', () => (
  <>
    <path data-part="body" d="M12 2.5c3.5 1.5 6 5.5 6 10.5l-3 3-3-2-3 2-3-3c0-5 2.5-9 6-10.5z" stroke={A_ERR} strokeWidth="1.6" />
    <circle cx="12" cy="8.5" r="1.5" stroke={A_GLOW} strokeWidth="1.2" />
    <path data-part="spark" d="M9 18l3 3.5 3-3.5" stroke={A_WARN} strokeWidth="1.6" strokeLinecap="round" />
  </>
));

export const MagnetIcon = makeIcon('magnet', () => (
  <>
    <path data-part="body" d="M5.5 4v7a6.5 6.5 0 0 0 13 0V4" stroke={A_ERR} strokeWidth="1.8" strokeLinecap="round" />
    <path d="M4 8h3M17 8h3" stroke={A_GLOW} strokeWidth="1.4" strokeLinecap="round" />
    <line data-part="pulse" x1="4" y1="4" x2="7" y2="4" stroke={A_GLOW} strokeWidth="2.2" strokeLinecap="round" />
    <line data-part="pulse" x1="17" y1="4" x2="20" y2="4" stroke={A_GLOW} strokeWidth="2.2" strokeLinecap="round" />
  </>
));

export const FlameIcon = makeIcon('flame', () => (
  <>
    <path data-part="body" d="M8.5 14c0 2 1.6 3.5 3.5 3.5s3.5-1.5 3.5-3.5c0-2-1.5-3.5-2-5-.5 1.5-1 2-1 2s-.5-2.5-2-4.5c-1.5 2.5-2 5.5-2 7.5z" stroke={A_WARN} strokeWidth="1.6" fill="none" />
  </>
));

export const SparklesIcon = makeIcon('sparkles', () => (
  <>
    <path data-part="pulse" d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" stroke={A_WARN} strokeWidth="1.5" strokeLinejoin="round" />
    <circle data-part="spark" cx="19" cy="5" r="1" fill={A_GLOW} />
    <circle data-part="spark" cx="5" cy="18" r="1" fill={A_GLOW} />
  </>
));

export const CoinsIcon = makeIcon('coins', () => (
  <>
    <circle data-part="body" cx="9" cy="13" r="5.5" stroke={A_WARN} strokeWidth="1.6" />
    <path data-part="lift" d="M14.5 7.5a5.5 5.5 0 0 0-5.5-2c-.3 0-.6 0-.9.1a5.5 5.5 0 0 1 6.9 6.9c.1-.3.1-.6.1-.9a5.5 5.5 0 0 0-.6-4.1z" stroke={A_WARN} strokeWidth="1.4" />
    <text x="9" y="15" fontSize="6" fontWeight="bold" textAnchor="middle" fill={A_WARN} stroke="none">$</text>
  </>
));

export const SkateboardIcon = makeIcon('skateboard', () => (
  <>
    <path data-part="body" d="M3 9c1.5-2 3-2 6-1.5l6 1c3 .5 4.5.5 6-1.5" stroke={A_GLOW} strokeWidth="1.8" strokeLinecap="round" />
    <circle data-part="spark" cx="7" cy="13" r="1.6" stroke={A_OK} strokeWidth="1.4" />
    <circle data-part="spark" cx="17" cy="15" r="1.6" stroke={A_OK} strokeWidth="1.4" />
  </>
));

export const SneakersIcon = makeIcon('sneakers', () => (
  <>
    <path data-part="body" d="M4 14l3-7 5 2 7 2v3H4z" stroke={A_SOFT} strokeWidth="1.6" strokeLinejoin="round" />
    <line x1="4" y1="16.5" x2="19" y2="16.5" stroke={A_GLOW} strokeWidth="1.8" strokeLinecap="round" />
    <path data-part="pulse" d="M8 9l2 2m-1-4l2 2" stroke={A_WARN} strokeWidth="1.3" strokeLinecap="round" />
  </>
));

