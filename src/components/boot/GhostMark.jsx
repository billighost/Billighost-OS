/**
 * Billighost OS — Primary Brand Mark
 *
 * A ghost silhouette whose contour is a single continuous path so it can
 * self-draw via stroke-dashoffset. The interior (eyes, inner core, aperture
 * rings) fades in after the contour closes, which reads as the mark
 * "constructing itself" rather than simply appearing.
 *
 * Rendered at 120x120 in the boot sequence but scales cleanly — every
 * dimension is derived from the 64-unit viewBox.
 */
export default function GhostMark({ size = 120, phase = 'draw', className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={style}
      aria-label="Billighost"
      role="img"
    >
      <defs>
        {/* Contour gradient — cool white core bleeding to the brand accents */}
        <linearGradient id="gm-stroke" x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#cfe4ff" />
          <stop offset="100%" stopColor="#7eb8ff" />
        </linearGradient>

        {/* Inner body fill — barely-there volume so the mark isn't a flat outline */}
        <radialGradient id="gm-body" cx="32" cy="26" r="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(126, 184, 255, 0.22)" />
          <stop offset="60%" stopColor="rgba(167, 139, 250, 0.10)" />
          <stop offset="100%" stopColor="rgba(126, 184, 255, 0)" />
        </radialGradient>

        {/* Specular sheen that travels across the mark once it is drawn */}
        <linearGradient id="gm-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="55%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        <filter id="gm-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip so the travelling sheen stays inside the silhouette */}
        <clipPath id="gm-clip">
          <path d="M32 5C20.4 5 11 14.4 11 26v25.6c0 2.6 2.9 4.2 5.1 2.8l4.6-2.9a3.3 3.3 0 0 1 3.6.05l3.7 2.5a3.3 3.3 0 0 0 3.8-.05l2.6-1.9a3.3 3.3 0 0 1 3.9 0l2.6 1.9a3.3 3.3 0 0 0 3.8.05l3.7-2.5a3.3 3.3 0 0 1 3.6-.05l4.6 2.9c2.2 1.4 5.1-.2 5.1-2.8V26C53 14.4 43.6 5 32 5Z" />
        </clipPath>
      </defs>

      {/* Volume fill */}
      <path
        className="gmBody"
        d="M32 5C20.4 5 11 14.4 11 26v25.6c0 2.6 2.9 4.2 5.1 2.8l4.6-2.9a3.3 3.3 0 0 1 3.6.05l3.7 2.5a3.3 3.3 0 0 0 3.8-.05l2.6-1.9a3.3 3.3 0 0 1 3.9 0l2.6 1.9a3.3 3.3 0 0 0 3.8.05l3.7-2.5a3.3 3.3 0 0 1 3.6-.05l4.6 2.9c2.2 1.4 5.1-.2 5.1-2.8V26C53 14.4 43.6 5 32 5Z"
        fill="url(#gm-body)"
      />

      {/* Self-drawing contour — one continuous subpath, scalloped hem included */}
      <path
        className="gmContour"
        d="M32 5C20.4 5 11 14.4 11 26v25.6c0 2.6 2.9 4.2 5.1 2.8l4.6-2.9a3.3 3.3 0 0 1 3.6.05l3.7 2.5a3.3 3.3 0 0 0 3.8-.05l2.6-1.9a3.3 3.3 0 0 1 3.9 0l2.6 1.9a3.3 3.3 0 0 0 3.8.05l3.7-2.5a3.3 3.3 0 0 1 3.6-.05l4.6 2.9c2.2 1.4 5.1-.2 5.1-2.8V26C53 14.4 43.6 5 32 5Z"
        stroke="url(#gm-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#gm-glow)"
      />

      {/* Interior detail — appears only once the contour has closed */}
      <g className="gmInterior">
        {/* Aperture rings: the "OS" core */}
        <circle cx="32" cy="27" r="9.5" stroke="rgba(207, 228, 255, 0.30)" strokeWidth="0.9" />
        <circle cx="32" cy="27" r="5.5" stroke="rgba(126, 184, 255, 0.55)" strokeWidth="0.9" />
        <circle className="gmCore" cx="32" cy="27" r="2.1" fill="#cfe4ff" />

        {/* Eyes */}
        <ellipse className="gmEye" cx="24.4" cy="24.5" rx="2.5" ry="3.1" fill="#e8f1ff" />
        <ellipse className="gmEye gmEyeR" cx="39.6" cy="24.5" rx="2.5" ry="3.1" fill="#e8f1ff" />

        {/* Circuitry hairlines — hints at "OS" without literal iconography */}
        <path d="M32 17.5V11.2" stroke="rgba(126, 184, 255, 0.45)" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M22.5 27H16.2" stroke="rgba(126, 184, 255, 0.30)" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M41.5 27h6.3" stroke="rgba(126, 184, 255, 0.30)" strokeWidth="0.8" strokeLinecap="round" />
        <path d="M32 36.5v6.1" stroke="rgba(167, 139, 250, 0.45)" strokeWidth="0.8" strokeLinecap="round" />
        <circle cx="32" cy="10.4" r="1.15" fill="#7eb8ff" />
        <circle cx="15.4" cy="27" r="1" fill="rgba(126, 184, 255, 0.6)" />
        <circle cx="48.6" cy="27" r="1" fill="rgba(126, 184, 255, 0.6)" />
        <circle cx="32" cy="43.4" r="1.15" fill="#a78bfa" />
      </g>

      {/* Travelling specular sheen, clipped to the silhouette */}
      {phase !== 'draw' && (
        <g clipPath="url(#gm-clip)">
          <rect className="gmSheen" x="-70" y="0" width="46" height="64" fill="url(#gm-sheen)" />
        </g>
      )}
    </svg>
  );
}
