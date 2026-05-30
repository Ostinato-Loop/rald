// RALD — Tricolor Wordmark
// R + LD: dark navy | A: teal (top) · ember (bottom-left) · amber (bottom-right)
// Matches the official brand identity — LILCKY STUDIO LIMITED

export type RaldLogoVariant = "full" | "icon";

interface RaldLogoProps {
  className?: string;
  dark?: boolean;          // true → R/LD white (for dark backgrounds)
  size?: number;           // height in px — controls the icon-only variant
  variant?: RaldLogoVariant;
  style?: React.CSSProperties;
}

// ── Brand colours ────────────────────────────────────────────────────────────
const NAVY_DARK  = "#0D2137";  // light-bg: R and LD
const NAVY_WHITE = "#FFFFFF";  // dark-bg:  R and LD
const TEAL  = "#2ECFA3";       // A top arch
const EMBER = "#E63946";       // A bottom-left leg
const AMBER = "#F4A261";       // A bottom-right leg

// ── Full wordmark: R · A(tricolor) · LD ──────────────────────────────────────
function WordMark({ textColor }: { textColor: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 460 112"
      role="img"
      aria-label="RALD"
      style={{ display: "block", overflow: "visible", background: "transparent" }}
    >
      <defs>
        {/* Mask cuts the tricolor rects into the exact shape of the letter A */}
        <mask id="rald-a-mask" maskUnits="userSpaceOnUse" x="106" y="2" width="92" height="108">
          <text
            fontFamily="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif"
            fontSize="106"
            fontWeight="900"
            x="106"
            y="104"
            fill="white"
            letterSpacing="-3"
          >A</text>
        </mask>
      </defs>

      {/* R */}
      <text
        fontFamily="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif"
        fontSize="106"
        fontWeight="900"
        x="2"
        y="104"
        fill={textColor}
        letterSpacing="-3"
      >R</text>

      {/* A — tricolor segments, masked to letter glyph */}
      {/* Teal: top arch of the A */}
      <rect x="106" y="2"  width="92" height="48" fill={TEAL}  mask="url(#rald-a-mask)" />
      {/* Ember: bottom-left leg */}
      <rect x="106" y="50" width="46" height="60" fill={EMBER} mask="url(#rald-a-mask)" />
      {/* Amber: bottom-right leg */}
      <rect x="152" y="50" width="46" height="60" fill={AMBER} mask="url(#rald-a-mask)" />

      {/* LD */}
      <text
        fontFamily="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif"
        fontSize="106"
        fontWeight="900"
        x="204"
        y="104"
        fill={textColor}
        letterSpacing="-3"
      >LD</text>
    </svg>
  );
}

// ── Icon-only: just the tricolor A ───────────────────────────────────────────
function IconMark({ size = 48 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 92 108"
      role="img"
      aria-label="RALD"
      width={size}
      height={size}
      style={{ display: "block", overflow: "visible", background: "transparent" }}
    >
      <defs>
        <mask id="rald-icon-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="92" height="108">
          <text
            fontFamily="'Arial Black','Impact','Helvetica Neue',Arial,sans-serif"
            fontSize="106"
            fontWeight="900"
            x="0"
            y="104"
            fill="white"
          >A</text>
        </mask>
      </defs>
      <rect x="0"  y="0"  width="92" height="48" fill={TEAL}  mask="url(#rald-icon-mask)" />
      <rect x="0"  y="48" width="46" height="60" fill={EMBER} mask="url(#rald-icon-mask)" />
      <rect x="46" y="48" width="46" height="60" fill={AMBER} mask="url(#rald-icon-mask)" />
    </svg>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function RaldLogo({
  className = "",
  dark = false,
  size,
  variant = "full",
  style,
}: RaldLogoProps) {
  const textColor = dark ? NAVY_WHITE : NAVY_DARK;

  if (variant === "icon") {
    return (
      <span className={className} style={style}>
        <IconMark size={size ?? 48} />
      </span>
    );
  }

  return (
    <span
      className={`rald-logo-wordmark ${className}`}
      style={{ display: "inline-flex", alignItems: "center", lineHeight: 0, ...style }}
    >
      <WordMark textColor={textColor} />
    </span>
  );
}
