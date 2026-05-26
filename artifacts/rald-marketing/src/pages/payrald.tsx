import { FadeIn } from "../components/layout";
import { ArrowRight, ShieldCheck, RefreshCcw, Coins, ActivitySquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PayRald() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '152 69% 31%' } as React.CSSProperties}>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-payrald.png" 
            alt="PayRald Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400 mb-6">
              Financial Layer
            </div>
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 text-white max-w-4xl mx-auto">
              <span className="text-emerald-500">PayRald</span> Payments
            </h1>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              The unified API to accept payments, move money, and reconcile finances across Africa's fragmented financial landscape.
            </p>
          </FadeIn>
          
          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="h-12 px-8 text-base bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                Explore APIs <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 bg-zinc-950 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-bold mb-6">Money movement without the friction</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  We've built direct integrations with local banks, mobile money operators, and card networks so you don't have to. One API for the entire continent.
                </p>
                <ul className="space-y-4">
                  {["Accept Mobile Money (M-Pesa, MTN, Airtel)", "Process Visa & Mastercard seamlessly", "Automated reconciliation", "Multi-currency wallets"].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
            
            <FadeIn delay={0.2}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ShieldCheck, title: "Fraud Protection", desc: "AI-driven risk engine" },
                  { icon: RefreshCcw, title: "Auto-Reconciliation", desc: "Zero manual matching" },
                  { icon: Coins, title: "Multi-Currency", desc: "Settle in your preferred currency" },
                  { icon: ActivitySquare, title: "High Authorization", desc: "Smart routing for 99% success" }
                ].map((f, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-emerald-500/40 transition-all">
                    <f.icon className="h-8 w-8 text-emerald-500 mb-4" />
                    <h4 className="font-semibold mb-2">{f.title}</h4>
                    <p className="text-sm text-muted-foreground">{f.desc}</p>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
