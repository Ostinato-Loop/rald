export function RaldLogo({ className = "", dark = false }: { className?: string; dark?: boolean }) {
  const navyColor = dark ? "#FFFFFF" : "#0D2137";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 440 110"
      role="img"
      aria-label="RALD"
      className={className}
    >
      <defs>
        <mask id="rald-app-a-mask" maskUnits="userSpaceOnUse">
          <text
            fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
            fontSize="104"
            fontWeight="900"
            x="102"
            y="100"
            fill="white"
            letterSpacing="-2"
          >A</text>
        </mask>
      </defs>
      <text fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif" fontSize="104" fontWeight="900" x="2" y="100" fill={navyColor} letterSpacing="-2">R</text>
      <rect x="102" y="0" width="42" height="110" fill="#E63946" mask="url(#rald-app-a-mask)" />
      <rect x="144" y="0" width="44" height="110" fill="#F4A261" mask="url(#rald-app-a-mask)" />
      <rect x="102" y="0" width="86" height="46" fill="#2ECFA3" mask="url(#rald-app-a-mask)" />
      <text fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif" fontSize="104" fontWeight="900" x="197" y="100" fill={navyColor} letterSpacing="-2">LD</text>
    </svg>
  );
}
