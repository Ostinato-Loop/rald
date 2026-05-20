import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Shield, CheckCircle, XCircle, ChevronDown, Lock, Verified } from "lucide-react";

const MOCK_APP = {
  name: "Loop Workspace",
  developer: "Ostinato Loop Ltd.",
  logo: null,
  verified: true,
  permissions: [
    { icon: "👤", title: "View profile information", description: "Access your name and account details" },
    { icon: "📱", title: "Access verified phone number", description: "Read your verified mobile number" },
    { icon: "🔐", title: "Maintain secure login session", description: "Keep you signed in across sessions" },
    { icon: "💼", title: "Access wallet information", description: "Read your wallet balance and recent transactions" },
  ],
  clientId: "cli_loop_ws_prod_a1b2c3",
  redirectUri: "https://workspace.ostloop.ng/auth/callback",
  scopes: ["profile:read", "phone:read", "session:write", "wallet:read"],
  expiresIn: "7 days",
};

type ConsentStep = "entry" | "consent" | "success" | "denied";

export default function OAuthConsent() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<ConsentStep>("entry");
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const handleAllow = () => {
    setStep("success");
    let c = 3;
    const interval = setInterval(() => {
      c--;
      setCountdown(c);
      if (c === 0) {
        clearInterval(interval);
        setLocation("/dashboard");
      }
    }, 1000);
  };

  const handleDeny = () => setStep("denied");

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(217_91%_60%/0.06),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logos */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center text-xl font-bold text-muted-foreground">
            LW
          </div>
          <div className="flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
          </div>
          <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm overflow-hidden p-1.5">
            <img src="/rald-logo.png" alt="RALD" className="h-full w-auto object-contain" />
          </div>
        </div>

        {step === "entry" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-2">
                <h2 className="text-lg font-semibold text-foreground">{MOCK_APP.name}</h2>
                {MOCK_APP.verified && <Verified className="w-4 h-4 text-primary" />}
              </div>
              <p className="text-sm text-muted-foreground">wants access to your RALD account</p>
              <p className="text-xs text-muted-foreground mt-1">by {MOCK_APP.developer}</p>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 py-2 px-3 rounded-lg">
              <Lock className="w-3.5 h-3.5" />
              <span>Secure connection · Verified application</span>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setStep("consent")}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                data-testid="oauth-continue"
              >
                Continue
              </button>
              <button
                onClick={handleDeny}
                className="w-full py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                data-testid="oauth-cancel"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === "consent" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-foreground mb-0.5">{MOCK_APP.name} is requesting access</h2>
              <p className="text-xs text-muted-foreground">Review the permissions below before allowing access</p>
            </div>

            <div className="space-y-2">
              {MOCK_APP.permissions.map((p, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                  <span className="text-base">{p.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.title}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              <span>Technical details</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </button>

            {showDetails && (
              <div className="bg-muted rounded-lg p-3 text-xs font-mono text-muted-foreground space-y-1">
                <div><span className="text-foreground">client_id:</span> {MOCK_APP.clientId}</div>
                <div><span className="text-foreground">redirect_uri:</span> {MOCK_APP.redirectUri}</div>
                <div><span className="text-foreground">scopes:</span> {MOCK_APP.scopes.join(", ")}</div>
                <div><span className="text-foreground">expires:</span> {MOCK_APP.expiresIn}</div>
              </div>
            )}

            <div className="space-y-2">
              <button
                onClick={handleAllow}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                data-testid="oauth-allow"
              >
                Allow Access
              </button>
              <button
                onClick={handleDeny}
                className="w-full py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors"
                data-testid="oauth-deny"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {step === "success" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card border border-green-500/30 rounded-xl p-8 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto"
            >
              <CheckCircle className="w-8 h-8 text-green-500" />
            </motion.div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Successfully connected</h2>
              <p className="text-sm text-muted-foreground mt-1">{MOCK_APP.name} now has access to your RALD account</p>
            </div>
            <p className="text-xs text-muted-foreground">Redirecting in {countdown}s...</p>
          </motion.div>
        )}

        {step === "denied" && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <XCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Access denied</h2>
              <p className="text-sm text-muted-foreground mt-1">{MOCK_APP.name} will not have access to your account</p>
            </div>
            <button onClick={() => setStep("entry")} className="w-full py-2.5 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-muted transition-colors">
              Try again
            </button>
          </motion.div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" />
          <span>Powered by RALD</span>
        </div>
      </div>
    </div>
  );
}
