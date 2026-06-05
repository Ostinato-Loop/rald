import { FadeIn } from "../components/layout";
import { ArrowRight, Shield, Eye, Database, Key, UserCheck, Lock, Globe, RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProfilesPage() {
  const whatIsStored = [
    { icon: UserCheck, label: "Profile information", desc: "Display name, username, bio, avatar — only what you choose to share." },
    { icon: Globe, label: "RALD Address", desc: "Your unique RALD ID (e.g. RALD-A1B2C3). Your portable identity across all RALD products." },
    { icon: Key, label: "Authentication credentials", desc: "Encrypted password or OTP binding. We cannot read your password. No one can." },
    { icon: Database, label: "Session tokens", desc: "Short-lived JWTs that expire automatically. Stored only for your active sessions." },
    { icon: Shield, label: "Security events", desc: "Login timestamps and device fingerprints. Used to detect account compromise — not for ads." },
    { icon: Eye, label: "Privacy settings", desc: "Who can find you in search. Whether you're discoverable across the ecosystem." },
  ];

  const whatIsNOTStored = [
    "Content of your Loop conversations or DMs",
    "Third-party tracking or advertising identifiers",
    "Browsing history or cross-site tracking",
    "Biometric data of any kind",
    "Data sold or shared with advertisers",
  ];

  const howPrivacyWorks = [
    {
      title: "Search visibility",
      desc: "You control whether other RALD users can find you by name or username. Set search_discoverable=false to go invisible in search results.",
      status: "Controlled by you",
    },
    {
      title: "Profile information",
      desc: "Only your display name and avatar are visible to others by default. Email and phone are never exposed to other users.",
      status: "Private by default",
    },
    {
      title: "Connection graph",
      desc: "Your connections are visible to mutual connections only. Strangers cannot browse your connection list.",
      status: "Guarded",
    },
    {
      title: "Message content",
      desc: "Messenger content is stored separately (in the Messenger worker, not in Profiles). Profiles holds identity — not messages.",
      status: "Separate system",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero */}
      <section className="relative pt-36 pb-28 md:pt-52 md:pb-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2ECFA3]/8 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#2ECFA3]/6 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-900/20 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-[#2ECFA3]/20 bg-[#2ECFA3]/10 px-4 py-1.5 text-sm text-[#2ECFA3] backdrop-blur-sm mb-8">
              <Shield className="h-3.5 w-3.5 mr-2" />
              RALD Identity — The Truth
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl mb-6 leading-[0.9]">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                One identity.
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ECFA3] to-teal-400">
                Everywhere you go.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Profiles is where your RALD identity lives. One account. One verification. Works across Loop, Messenger, and every future RALD product — without logging in again.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://profiles.rald.cloud">
                <Button size="lg" className="h-13 px-10 text-base bg-[#2ECFA3] text-black hover:bg-[#2ECFA3]/90 font-black tracking-wide">
                  Create your profile <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="https://profiles.rald.cloud/login">
                <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/20 hover:bg-white/10">
                  Sign In
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Identity proof card */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="max-w-sm mx-auto">
              <div className="relative rounded-2xl border border-[#2ECFA3]/20 bg-black/70 backdrop-blur-xl p-7 overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#2ECFA3]/8 rounded-full blur-[60px]" />
                <div className="relative z-10">
                  {/* Profile card */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2ECFA3] to-teal-600 flex items-center justify-center font-black text-xl text-black">AO</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-lg">Amaka Okonkwo</span>
                        <div className="w-5 h-5 rounded-full bg-[#2ECFA3] flex items-center justify-center">
                          <UserCheck className="h-3 w-3 text-black" />
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">@amaka · Lagos, NG</div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-[#2ECFA3]" />
                        <span className="text-sm text-white">RALD Address</span>
                      </div>
                      <span className="text-sm font-mono text-[#2ECFA3]">RALD-A1B2C3</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-white">Discoverable</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-sm text-green-400">Yes</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-white">Identity status</span>
                      </div>
                      <span className="text-xs bg-[#2ECFA3]/20 text-[#2ECFA3] px-2 py-0.5 rounded-full font-medium">Verified</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Works across</div>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <span className="text-xs px-2 py-1 rounded bg-[#00FF88]/10 text-[#00FF88] font-medium">Loop</span>
                      <span className="text-xs px-2 py-1 rounded bg-[#7C3AED]/10 text-violet-400 font-medium">Messenger</span>
                      <span className="text-xs px-2 py-1 rounded bg-[#2ECFA3]/10 text-[#2ECFA3] font-medium">Profiles</span>
                      <span className="text-xs px-2 py-1 rounded bg-white/10 text-muted-foreground font-medium">+ more</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What is Profiles */}
      <section className="py-28">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                What is <span className="text-[#2ECFA3]">Profiles?</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Profiles is the single source of truth for who you are on RALD. Log in once. Be yourself everywhere — without re-registering or re-authenticating across apps.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-4xl mx-auto">
            <FadeIn delay={0.1}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {[
                  { icon: "01", title: "Create once", desc: "Register your name, username, and secure credentials in one place." },
                  { icon: "02", title: "Verified everywhere", desc: "Loop, Messenger, and future RALD products all share your Profiles identity." },
                  { icon: "03", title: "You stay in control", desc: "Update, restrict, or delete your profile at any time from one dashboard." },
                ].map((s, i) => (
                  <div key={i} className="text-center p-6 rounded-xl border border-white/10 bg-white/5">
                    <div className="text-4xl font-black text-[#2ECFA3]/30 mb-3">{s.icon}</div>
                    <h3 className="font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* What is stored */}
      <section className="py-24 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">What information is stored</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                We believe you should know exactly what lives in your Profiles account. Here it is — no vague terms.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {whatIsStored.map((item, i) => (
              <FadeIn key={item.label} delay={0.07 * i}>
                <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                  <div className="w-10 h-10 rounded-lg bg-[#2ECFA3]/10 border border-[#2ECFA3]/20 flex items-center justify-center mb-4">
                    <item.icon className="h-5 w-5 text-[#2ECFA3]" />
                  </div>
                  <h3 className="font-bold text-white mb-2 text-sm">{item.label}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2}>
            <div className="max-w-2xl mx-auto rounded-xl border border-red-500/20 bg-red-500/5 p-8">
              <div className="flex items-center gap-3 mb-5">
                <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <h3 className="font-bold text-white">What we do NOT store or share</h3>
              </div>
              <ul className="space-y-3">
                {whatIsNOTStored.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* How privacy works */}
      <section className="py-28">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">How privacy works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Your information is private unless you choose to make it visible. Here's how each piece is handled.
              </p>
            </div>
          </FadeIn>

          <div className="max-w-3xl mx-auto space-y-4">
            {howPrivacyWorks.map((item, i) => (
              <FadeIn key={item.title} delay={0.08 * i}>
                <div className="flex flex-col md:flex-row md:items-start gap-4 p-6 rounded-xl border border-white/10 bg-white/5 hover:border-[#2ECFA3]/20 hover:bg-[#2ECFA3]/3 transition-all duration-300">
                  <div className="flex-1">
                    <h3 className="font-bold text-white mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className="text-xs bg-[#2ECFA3]/15 text-[#2ECFA3] px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                      {item.status}
                    </span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-24 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <div className="inline-flex items-center rounded-full border border-[#2ECFA3]/20 bg-[#2ECFA3]/10 px-3 py-1 text-xs text-[#2ECFA3] mb-6">
                  Security architecture
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight">
                  How your account<br />stays secure
                </h2>
                <div className="space-y-5">
                  {[
                    { icon: Lock, title: "Passwords are hashed (bcrypt)", desc: "We cannot read your password. Not our team. Not anyone." },
                    { icon: RefreshCcw, title: "Sessions expire automatically", desc: "JWT tokens are short-lived. After expiry, you re-authenticate silently." },
                    { icon: Shield, title: "Rate-limited authentication", desc: "Too many failed login attempts blocks the IP for 15 minutes. Brute-force attacks are blocked at the auth layer." },
                    { icon: Key, title: "Audit logging on all auth events", desc: "Every login, logout, and password change is logged with timestamp and IP. You can review this history." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#2ECFA3]/10 border border-[#2ECFA3]/20 flex items-center justify-center">
                        <item.icon className="h-4 w-4 text-[#2ECFA3]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1 text-sm">{item.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={0.2}>
              <div className="rounded-2xl border border-white/10 bg-black/50 p-8 space-y-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4 font-semibold">Security log</div>
                {[
                  { action: "Logged in", device: "Chrome · Lagos, NG", time: "2 hours ago", status: "success" },
                  { action: "Profile updated", device: "Chrome · Lagos, NG", time: "1 day ago", status: "success" },
                  { action: "Password changed", device: "Mobile · Lagos, NG", time: "14 days ago", status: "success" },
                  { action: "Login attempt", device: "Unknown · —", time: "21 days ago", status: "blocked" },
                ].map((event, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${event.status === "success" ? "bg-green-400" : "bg-red-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white font-medium">{event.action}</div>
                      <div className="text-xs text-muted-foreground truncate">{event.device}</div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{event.time}</div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#2ECFA3]/5 via-transparent to-teal-900/10" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
              Your identity.<br />
              <span className="text-[#2ECFA3]">Your terms.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Create your RALD profile today. One account unlocks Loop, Messenger, and everything that comes next.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://profiles.rald.cloud">
                <Button size="lg" className="h-14 px-12 text-lg bg-[#2ECFA3] text-black hover:bg-[#2ECFA3]/90 font-black">
                  Create your profile <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
