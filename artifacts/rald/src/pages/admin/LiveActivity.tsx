import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Filter } from "lucide-react";

const EVENT_TYPES = ["all", "login", "otp", "failure", "security", "admin"];

const generateEvent = (i: number) => ({
  id: `evt_${Date.now()}_${i}`,
  type: ["login", "otp", "login", "failure", "security", "login", "admin", "otp"][i % 8],
  msg: [
    "+2348012345678 logged in via OTP",
    "OTP sent to +2348055566677 via Termii",
    "+2348033344455 password login successful",
    "Failed OTP attempt from +2348099988877 (3/5)",
    "Brute force detected from 185.220.x.x",
    "+2348022233344 logged in via OTP",
    "Admin access granted to user rald_usr_04",
    "OTP sent to +2348011122233 via Twilio",
  ][i % 8],
  ip: `197.210.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  location: ["Lagos, NG", "Abuja, NG", "Port Harcourt, NG", "London, UK"][i % 4],
  severity: ["info", "info", "info", "warn", "critical", "info", "warn", "info"][i % 8],
  time: new Date().toISOString(),
});

const typeColors: Record<string, string> = {
  login: "bg-blue-500/10 text-blue-500",
  otp: "bg-purple-500/10 text-purple-500",
  failure: "bg-yellow-500/10 text-yellow-500",
  security: "bg-red-500/10 text-red-500",
  admin: "bg-orange-500/10 text-orange-500",
};

const severityDot: Record<string, string> = {
  info: "bg-blue-500",
  warn: "bg-yellow-500",
  critical: "bg-red-500",
};

export default function LiveActivity() {
  const [events, setEvents] = useState(() => Array.from({ length: 15 }, (_, i) => generateEvent(i)));
  const [filter, setFilter] = useState("all");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setEvents(evts => [generateEvent(Math.floor(Math.random() * 8)), ...evts.slice(0, 49)]);
    }, 2500);
    return () => clearInterval(interval);
  }, [paused]);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Activity</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time event stream across the platform</p>
        </div>
        <button onClick={() => setPaused(!paused)} className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${paused ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`} data-testid="pause-stream">
          {paused ? "Resume" : "Pause"} stream
        </button>
      </div>

      <div className="flex items-center gap-3">
        <motion.div className="w-2 h-2 rounded-full bg-red-500" animate={paused ? {} : { opacity: [1, 0.2, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <span className="text-xs text-muted-foreground">{paused ? "Stream paused" : "Live — events streaming in real-time"}</span>
        <div className="flex-1" />
        <div className="flex bg-muted rounded-lg p-0.5">
          {EVENT_TYPES.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${filter === t ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {filtered.map(evt => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: -8, backgroundColor: "hsl(var(--primary)/0.05)" }}
                animate={{ opacity: 1, y: 0, backgroundColor: "transparent" }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 px-5 py-3"
                data-testid={`activity-event-${evt.id}`}
              >
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot[evt.severity]}`} />
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize shrink-0 ${typeColors[evt.type] || "bg-muted text-muted-foreground"}`}>{evt.type}</span>
                <span className="text-sm text-foreground flex-1">{evt.msg}</span>
                <span className="text-xs text-muted-foreground font-mono shrink-0">{evt.ip}</span>
                <span className="text-xs text-muted-foreground shrink-0">{evt.location}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
