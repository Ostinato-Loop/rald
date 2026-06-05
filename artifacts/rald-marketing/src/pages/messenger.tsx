import { FadeIn } from "../components/layout";
import { ArrowRight, Lock, User, MessageSquare, Bell, Repeat2, EyeOff, Heart, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MessengerPage() {
  const features = [
    {
      icon: User,
      title: "One identity, everywhere",
      desc: "Your Messenger conversations are tied to your verified RALD profile. The same person you see in a Loop room is the same person in your DMs.",
    },
    {
      icon: MessageSquare,
      title: "Direct messaging",
      desc: "Text, share, and stay connected with individuals and groups. Clean, fast, reliable conversations.",
    },
    {
      icon: Lock,
      title: "Relationship-first privacy",
      desc: "Messages stay between the people in the conversation. No ad targeting. No content scanning for marketing.",
    },
    {
      icon: CheckCheck,
      title: "Read receipts & presence",
      desc: "Know when your messages are seen. See who's online. Real connection, not message uncertainty.",
    },
    {
      icon: Repeat2,
      title: "Persistent conversations",
      desc: "Your history never disappears. Return after days or weeks — the conversation picks up exactly where you left off.",
    },
    {
      icon: Bell,
      title: "Relevant notifications only",
      desc: "Messenger only notifies you for direct messages and connection events. No algorithm-driven noise.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">

      {/* Hero */}
      <section className="relative pt-36 pb-28 md:pt-52 md:pb-40 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#7C3AED]/10 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#7C3AED]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[100px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/0 via-background/60 to-background" />
        </div>

        <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-[#7C3AED]/30 bg-[#7C3AED]/10 px-4 py-1.5 text-sm text-violet-400 backdrop-blur-sm mb-8">
              <Lock className="h-3.5 w-3.5 mr-2" />
              Private. Persistent. Relationship-first.
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter max-w-5xl mb-6 leading-[0.9]">
              <span className="text-transparent bg-clip-text bg-gradient-to-br from-white to-white/60">
                Your private
              </span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-violet-400">
                relationship network.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
              Messenger connects people who already know each other — with verified identities, persistent history, and no noise. Your conversations live here, not in an ad platform.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://chat.rald.cloud">
                <Button size="lg" className="h-13 px-10 text-base bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90 font-black tracking-wide">
                  Open Messenger <ArrowRight className="ml-2 h-5 w-5" />
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

      {/* Chat Visualizer */}
      <section className="py-8">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="relative rounded-2xl border border-[#7C3AED]/20 bg-black/60 backdrop-blur-xl overflow-hidden max-w-sm mx-auto">
              {/* Chat header */}
              <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-white/5">
                <div className="w-9 h-9 rounded-full bg-[#7C3AED]/30 flex items-center justify-center font-bold text-sm text-violet-300">AO</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-white">Amaka Okonkwo</div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    <span className="text-xs text-muted-foreground">Online</span>
                  </div>
                </div>
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Messages */}
              <div className="p-4 space-y-3 min-h-[280px]">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-2.5">
                    <p className="text-sm text-white">Hey, did you catch the Lagos Tech room earlier?</p>
                    <div className="text-[10px] text-muted-foreground mt-1">10:23</div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-[#7C3AED] px-4 py-2.5">
                    <p className="text-sm text-white">Yes! Tunde's session on AI infrastructure was 🔥</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[10px] text-violet-300">10:24</span>
                      <CheckCheck className="h-3 w-3 text-violet-300" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white/10 px-4 py-2.5">
                    <p className="text-sm text-white">We should connect with him. I'll send a request 👌</p>
                    <div className="text-[10px] text-muted-foreground mt-1">10:25</div>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#7C3AED]/30 flex items-center justify-center text-xs text-violet-300">AO</div>
                    <div className="flex gap-1 items-center text-muted-foreground text-xs px-3 py-2 bg-white/5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Input bar */}
              <div className="p-3 border-t border-white/10 bg-white/3">
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2.5">
                  <span className="text-sm text-muted-foreground flex-1">Type a message...</span>
                  <div className="w-7 h-7 rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                    <ArrowRight className="h-3.5 w-3.5 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* What is Messenger */}
      <section className="py-28 relative">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">
                What is <span className="text-[#7C3AED]">Messenger?</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Messenger is the private layer of the RALD ecosystem. Where Loop is public voice, Messenger is your private text — with the same verified identities you trust everywhere on RALD.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <FadeIn key={feature.title} delay={0.08 * i}>
                <div className="group relative rounded-xl border border-white/10 bg-white/5 p-7 hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/5 transition-all duration-300">
                  <div className="w-11 h-11 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center mb-5">
                    <feature.icon className="h-5 w-5 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-bold mb-3 text-white">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Relationship-first section */}
      <section className="py-24 bg-black/40 border-y border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <FadeIn delay={0.1}>
              <div className="space-y-6">
                <div className="flex items-center gap-4 p-5 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7C3AED] to-violet-500 flex-shrink-0 flex items-center justify-center font-bold text-white">TF</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-white text-sm">Tunde F.</span>
                      <span className="text-[10px] bg-[#7C3AED]/20 text-violet-400 px-2 py-0.5 rounded-full font-medium">Verified</span>
                    </div>
                    <div className="text-xs text-muted-foreground">Lagos · Founder · Loop speaker</div>
                  </div>
                  <Heart className="h-5 w-5 text-muted-foreground hover:text-violet-400 cursor-pointer transition-colors" />
                </div>

                <div className="p-5 rounded-xl bg-white/5 border border-[#7C3AED]/20">
                  <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">Your conversation</div>
                  <div className="space-y-2">
                    <div className="text-sm text-white">Started after the Lagos Tech room. 3 days ago.</div>
                    <div className="text-sm text-muted-foreground">14 messages · Still active</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl font-black text-[#7C3AED]">0</div>
                    <div className="text-xs text-muted-foreground mt-1">ads in your DMs</div>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                    <div className="text-2xl font-black text-[#2ECFA3]">∞</div>
                    <div className="text-xs text-muted-foreground mt-1">message history</div>
                  </div>
                </div>
              </div>
            </FadeIn>

            <FadeIn>
              <div>
                <div className="inline-flex items-center rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-400 mb-6">
                  Relationship-first design
                </div>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-6 leading-tight">
                  Not another inbox.<br />A relationship layer.
                </h2>
                <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                  Most messaging apps are built for volume — more messages, more notifications, more engagement. Messenger is built for depth — real conversations with real people you actually know.
                </p>
                <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                  When you message someone on RALD, you know who they are. Their verified profile, their history in Loop rooms, their RALD identity — it's all visible, honest, and persistent.
                </p>
                <a href="https://chat.rald.cloud">
                  <Button variant="outline" className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500/50">
                    Start a conversation <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Cross-app */}
      <section className="py-28">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6">Seamless across<br />the RALD ecosystem</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed">
              Find someone in a Loop room → connect → message them in Messenger. One identity. One relationship. Works everywhere.
            </p>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 max-w-3xl mx-auto">
              {[
                { name: "Loop", color: "bg-[#00FF88]", textColor: "text-black", desc: "Find them in a room" },
                { name: "→", color: "", textColor: "text-muted-foreground", desc: "" },
                { name: "Profiles", color: "bg-[#2ECFA3]", textColor: "text-black", desc: "See their identity" },
                { name: "→", color: "", textColor: "text-muted-foreground", desc: "" },
                { name: "Messenger", color: "bg-[#7C3AED]", textColor: "text-white", desc: "Start the conversation" },
              ].map((item, i) =>
                item.name === "→" ? (
                  <div key={i} className="text-2xl text-muted-foreground font-black hidden md:block">→</div>
                ) : (
                  <div key={i} className="flex flex-col items-center gap-3">
                    <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center font-black text-sm ${item.textColor}`}>
                      {item.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                )
              )}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-[#7C3AED]/5 via-transparent to-violet-900/10" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
              Real relationships<br />
              <span className="text-[#7C3AED]">start here.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
              Create your RALD profile and start the conversations that matter.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://chat.rald.cloud">
                <Button size="lg" className="h-14 px-12 text-lg bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90 font-black">
                  Open Messenger <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="https://profiles.rald.cloud">
                <Button size="lg" variant="outline" className="h-14 px-12 text-lg border-white/20 hover:bg-white/10">
                  Create Profile
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
