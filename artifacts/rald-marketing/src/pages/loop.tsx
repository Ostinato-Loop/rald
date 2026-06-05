import { FadeIn } from "../components/layout";
import { ArrowRight, Mic, Users, Radio, Zap, Globe, Shield, Volume2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoopPage() {
  const features = [
    {
      icon: Mic,
      title: "Live Voice Rooms",
      desc: "Start a room in seconds. Speak to an audience or invite specific people to the stage. No scheduling, no setup — just voices.",
    },
    {
      icon: Users,
      title: "Relationship-First Design",
      desc: "Rooms are built around people you trust, not algorithms. Your connections shape what you discover.",
    },
    {
      icon: Radio,
      title: "Real-Time Communities",
      desc: "Civic, sports, music, entertainment, news — find your community and a room that's always on when you need it.",
    },
    {
      icon: Shield,
      title: "Verified Identities",
      desc: "Every voice in Loop is attached to a real RALD identity. No bots. No ghost accounts. You know who you're listening to.",
    },
    {
      icon: Globe,
      title: "Pan-African Context",
      desc: "Built for Africa — with languages, topics, and communities that reflect your world, not someone else's.",
    },
    {
      icon: Zap,
      title: "Instant Discovery",
      desc: "Find live rooms by category or by what your connections are joining right now.",
    },
  ];

  const howItWorks = [
    { step: "01", title: "Create your RALD profile", desc: "One identity. Works across every RALD product." },
    { step: "02", title: "Find or start a room", desc: "Browse live rooms by topic or start your own in under 10 seconds." },
    { step: "03", title: "Connect with real people", desc: "Build relationships, follow speakers you trust, and return to the conversations that matter." },
  ];

  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero */}
      <section className="relative pt-36 pb-28 md:pt-52 md:pb-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00FF88]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#00FF88]/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/30 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-[#00FF88]/20 bg-[#00FF88]/10 px-4 py-1.5 text-sm text-[#00FF88] backdrop-blur-sm mb-8">
              <span className="flex h-2 w-2 rounded-full bg-[#00FF88] mr-2 animate-pulse" />
              Audio rooms. Real relationships.
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl mb-6 leading-[0.9]">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                Real-time voice communities
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00FF88] to-emerald-400">
                built around relationships.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Loop is where African conversations happen live. Discover rooms, join stages, and build real connections — all anchored to your verified RALD identity.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://loop.rald.cloud">
                <Button size="lg" className="h-13 px-10 text-base bg-[#00FF88] text-black hover:bg-[#00FF88]/90 font-black tracking-wide">
                  Open Loop <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="https://profiles.rald.cloud">
                <Button size="lg" variant="outline" className="h-13 px-10 text-base border-white/20 hover:bg-white/10">
                  Create Profile
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Live Room Visualizer */}
      <section className="py-8 overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="relative rounded-2xl border border-[#00FF88]/20 bg-black/60 backdrop-blur-xl p-8 md:p-12 overflow-hidden max-w-3xl mx-auto">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#00FF88]/10 rounded-full blur-[80px]" />
              <div className="relative z-10">
                {/* Room header */}
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-widest">Live Now</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Lagos Tech Circle — AI & Africa</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#00FF88]">1,240</div>
                    <div className="text-xs text-muted-foreground">listening</div>
                  </div>
                </div>

                {/* Speaker row */}
                <div className="flex flex-wrap gap-6 mb-8">
                  {[
                    { initials: "TF", name: "Tunde F.", role: "Host", speaking: true },
                    { initials: "AO", name: "Amaka O.", role: "Speaker", speaking: false },
                    { initials: "KM", name: "Kwame M.", role: "Speaker", speaking: false },
                    { initials: "+", name: "3 more", role: "", speaking: false },
                  ].map((speaker, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className={`relative w-14 h-14 rounded-full flex items-center justify-center font-bold text-sm ${
                        speaker.speaking
                          ? "bg-[#00FF88] text-black ring-4 ring-[#00FF88]/40"
                          : "bg-white/10 text-white"
                      }`}>
                        {speaker.initials}
                        {speaker.speaking && (
                          <Volume2 className="absolute -bottom-1 -right-1 h-4 w-4 text-[#00FF88] bg-black rounded-full p-0.5" />
                        )}
                      </div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-white">{speaker.name}</div>
                        {speaker.role && <div className="text-[10px] text-muted-foreground">{speaker.role}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Audio waveform visualization */}
                <div className="flex items-end gap-1 h-8 mb-6">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-[#00FF88]/60"
                      style={{ height: `${20 + Math.sin(i * 0.7) * 15 + Math.random() * 10}px` }}
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button className="flex-1 bg-[#00FF88] text-black font-bold hover:bg-[#00FF88]/90 h-11">
                    Join Room
                  </Button>
                  <Button variant="outline" className="border-white/20 h-11 px-4">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What is Loop */}
      <section className="py-28 relative">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                What is <span className="text-[#00FF88]">Loop?</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Loop is a live audio platform built around trust and identity. Unlike social media feeds, Loop centres your experience around real people in real conversations — happening right now.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={0.08 * i}>
                <div className="group relative rounded-xl border border-white/10 bg-white/5 p-7 hover:border-[#00FF88]/30 hover:bg-[#00FF88]/5 transition-all duration-300">
                  <div className="w-11 h-11 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/20 flex items-center justify-center mb-5">
                    <feature.icon className="h-5 w-5 text-[#00FF88]" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why identity matters */}
      <section className="py-24 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn>
              <div>
                <div className="inline-flex items-center rounded-full border border-[#00FF88]/20 bg-[#00FF88]/10 px-3 py-1 text-xs text-[#00FF88] mb-6">
                  Identity Axiom
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight">
                  Why identity matters<br />in a voice room
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  On most platforms, you don't know who's speaking. A voice is just a voice. On Loop, every speaker is backed by their verified RALD identity — the same profile they use across every RALD product.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  When a doctor speaks in a health room, you know they're a doctor. When a Lagos founder shares lessons, you can follow their journey across the ecosystem. Trust is built in — not bolted on.
                </p>
                <a href="https://profiles.rald.cloud">
                  <Button variant="outline" className="border-[#00FF88]/30 text-[#00FF88] hover:bg-[#00FF88]/10 hover:border-[#00FF88]/50">
                    How Profiles work <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="space-y-4">
                {[
                  { label: "Civic & Politics", color: "bg-blue-500", count: "42 live" },
                  { label: "Lagos Tech Circle", color: "bg-[#00FF88]", count: "1,240 listening" },
                  { label: "Afrobeats Tonight", color: "bg-orange-500", count: "883 listening" },
                  { label: "Nairobi Founders", color: "bg-purple-500", count: "320 listening" },
                  { label: "Health & Wellness", color: "bg-pink-500", count: "174 listening" },
                ].map((room, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${room.color} ${i === 0 ? "animate-pulse" : ""}`} />
                    <div className="flex-1 font-medium text-white">{room.label}</div>
                    <div className="text-sm text-muted-foreground">{room.count}</div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-28">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">How Loop works</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                From signup to speaking on stage — in under 60 seconds.
              </p>
            </div>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((step, i) => (
              <FadeIn key={step.step} delay={0.1 * i}>
                <div className="relative">
                  {i < howItWorks.length - 1 && (
                    <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/20 to-transparent z-10" />
                  )}
                  <div className="text-5xl font-black text-[#00FF88]/20 mb-4">{step.step}</div>
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00FF88]/5 via-transparent to-emerald-900/10" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
              The room is live.<br />
              <span className="text-[#00FF88]">Are you in it?</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Thousands of conversations are happening on Loop right now. Your community is waiting.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://loop.rald.cloud">
                <Button size="lg" className="h-14 px-12 text-lg bg-[#00FF88] text-black hover:bg-[#00FF88]/90 font-black">
                  Enter Loop <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
