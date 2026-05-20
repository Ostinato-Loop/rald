import { motion, AnimatePresence } from "framer-motion";
import { ReactNode } from "react";

export type GlowState = "default" | "loading" | "error" | "success";

interface GlowBoxProps {
  state?: GlowState;
  children: ReactNode;
  className?: string;
}

const glowStyles: Record<GlowState, string> = {
  default: "border-border shadow-sm",
  loading: "border-yellow-400 shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_0_20px_rgba(251,191,36,0.2)]",
  error: "border-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.4),0_0_20px_rgba(239,68,68,0.2)]",
  success: "border-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.4),0_0_20px_rgba(34,197,94,0.2)]",
};

const shakeVariants = {
  shake: {
    x: [0, -8, 8, -6, 6, -4, 4, 0],
    transition: { duration: 0.5, ease: "easeInOut" },
  },
  idle: { x: 0 },
};

const pulseVariants = {
  pulse: {
    boxShadow: [
      "0 0 0 1px rgba(251,191,36,0.4), 0 0 20px rgba(251,191,36,0.2)",
      "0 0 0 2px rgba(251,191,36,0.6), 0 0 32px rgba(251,191,36,0.35)",
      "0 0 0 1px rgba(251,191,36,0.4), 0 0 20px rgba(251,191,36,0.2)",
    ],
    transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" },
  },
  idle: {},
};

const successPulse = {
  pulse: {
    boxShadow: [
      "0 0 0 1px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.2)",
      "0 0 0 3px rgba(34,197,94,0.5), 0 0 40px rgba(34,197,94,0.3)",
      "0 0 0 1px rgba(34,197,94,0.4), 0 0 20px rgba(34,197,94,0.2)",
    ],
    transition: { duration: 0.8, times: [0, 0.5, 1] },
  },
  idle: {},
};

export function GlowBox({ state = "default", children, className = "" }: GlowBoxProps) {
  return (
    <motion.div
      animate={
        state === "error"
          ? "shake"
          : state === "loading"
          ? "pulse"
          : state === "success"
          ? "pulse"
          : "idle"
      }
      variants={
        state === "error"
          ? shakeVariants
          : state === "loading"
          ? pulseVariants
          : state === "success"
          ? successPulse
          : {}
      }
      className={`
        relative rounded-xl border bg-card transition-all duration-300
        ${glowStyles[state]}
        ${className}
      `}
      data-testid="glow-box"
      data-state={state}
    >
      {state === "loading" && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/5 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
      {children}
    </motion.div>
  );
}
