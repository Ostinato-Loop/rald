import { motion } from "framer-motion";

interface RaldLoaderProps {
  size?: "sm" | "md" | "lg";
  fullscreen?: boolean;
  className?: string;
  label?: string;
}

const ORBIT_COLORS = ["#1abc9c", "#e74c3c", "#f39c12"] as const;

export function RaldLoader({
  size = "md",
  fullscreen = false,
  className = "",
  label,
}: RaldLoaderProps) {
  const logoSize = { sm: 36, md: 52, lg: 76 }[size];
  const containerSize = logoSize * 2.4;
  const orbitRadius = (containerSize / 2) * 0.78;
  const dotSize = { sm: 6, md: 8, lg: 11 }[size];

  const wrapperClass = fullscreen
    ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background gap-6"
    : `flex flex-col items-center justify-center gap-4 ${className}`;

  return (
    <div className={wrapperClass}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {/* Ambient glow beneath the logo */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: logoSize * 1.4,
            height: logoSize * 1.4,
            background:
              "radial-gradient(circle, rgba(26,188,156,0.18) 0%, rgba(231,76,60,0.08) 50%, transparent 75%)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Outer ring — subtle */}
        <motion.div
          className="absolute rounded-full border border-white/5"
          style={{ width: containerSize * 0.88, height: containerSize * 0.88 }}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />

        {/* Orbiting dots */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
        >
          {ORBIT_COLORS.map((color, i) => {
            const angle = (i / ORBIT_COLORS.length) * 2 * Math.PI;
            const cx = 50 + ((orbitRadius / containerSize) * 100) * Math.sin(angle);
            const cy = 50 - ((orbitRadius / containerSize) * 100) * Math.cos(angle);
            return (
              <motion.div
                key={color}
                className="absolute rounded-full"
                style={{
                  left: `${cx}%`,
                  top: `${cy}%`,
                  width: dotSize,
                  height: dotSize,
                  transform: "translate(-50%, -50%)",
                  backgroundColor: color,
                  boxShadow: `0 0 ${dotSize * 1.5}px ${color}cc`,
                }}
                animate={{ scale: [1, 1.35, 1] }}
                transition={{
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: -(i / ORBIT_COLORS.length) * 2.2,
                }}
              />
            );
          })}
        </motion.div>

        {/* RALD logo — breathes gently */}
        <motion.img
          src="/rald-logo.png"
          alt="RALD"
          className="relative z-10 select-none"
          style={{ width: logoSize, height: "auto" }}
          animate={{ scale: [0.96, 1.03, 0.96] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          draggable={false}
        />
      </div>

      {label && (
        <motion.p
          className="text-xs text-muted-foreground tracking-widest uppercase font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
