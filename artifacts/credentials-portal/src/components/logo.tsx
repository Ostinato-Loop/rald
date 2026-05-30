// RALD Wordmark — credentials portal version
const TEAL  = "#2ECFA3";
const EMBER = "#E63946";
const AMBER = "#F4A261";

export function RaldLogo({ size = 80 }: { size?: number }) {
  const h = size;
  const w = size * (460 / 112);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 112" width={w} height={h}
      role="img" aria-label="RALD" style={{ display: "block", overflow: "visible" }}>
      <defs>
        <mask id="cp-a" maskUnits="userSpaceOnUse" x="106" y="2" width="92" height="108">
          <text fontFamily="'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif"
            fontSize="106" fontWeight="900" x="106" y="104" fill="white" letterSpacing="-3">A</text>
        </mask>
      </defs>
      <text fontFamily="'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif"
        fontSize="106" fontWeight="900" x="2" y="104" fill="#FFFFFF" letterSpacing="-3">R</text>
      <rect x="106" y="2"  width="92" height="48" fill={TEAL}  mask="url(#cp-a)" />
      <rect x="106" y="50" width="46" height="60" fill={EMBER} mask="url(#cp-a)" />
      <rect x="152" y="50" width="46" height="60" fill={AMBER} mask="url(#cp-a)" />
      <text fontFamily="'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif"
        fontSize="106" fontWeight="900" x="204" y="104" fill="#FFFFFF" letterSpacing="-3">LD</text>
    </svg>
  );
}

export function RaldIcon({ size = 28 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 92 108" width={size} height={size}
      role="img" aria-label="RALD" style={{ display: "block" }}>
      <defs>
        <mask id="cp-i" maskUnits="userSpaceOnUse" x="0" y="0" width="92" height="108">
          <text fontFamily="'Arial Black',Impact,Arial,sans-serif" fontSize="106" fontWeight="900"
            x="0" y="104" fill="white">A</text>
        </mask>
      </defs>
      <rect x="0"  y="0"  width="92" height="48" fill={TEAL}  mask="url(#cp-i)" />
      <rect x="0"  y="48" width="46" height="60" fill={EMBER} mask="url(#cp-i)" />
      <rect x="46" y="48" width="46" height="60" fill={AMBER} mask="url(#cp-i)" />
    </svg>
  );
}
