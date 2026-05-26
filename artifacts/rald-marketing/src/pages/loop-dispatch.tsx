import { FadeIn } from "../components/layout";
import { ArrowRight, Map, Truck, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoopDispatch() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '38 92% 50%' } as React.CSSProperties}>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-loop-dispatch.png" 
            alt="Loop Dispatch Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-500 mb-6">
              Last-Mile Logistics
            </div>
          </FadeIn>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn delay={0.1}>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-white">
                  Loop <span className="text-amber-500">Dispatch</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10">
                  Intelligent delivery infrastructure. Optimize routes, track fleets in real-time, and guarantee reliable last-mile execution.
                </p>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                <Button size="lg" className="h-12 px-8 text-base bg-amber-500 hover:bg-amber-600 text-black font-semibold border-0">
                  Start Optimizing Routes <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </FadeIn>
            </div>
            
            <FadeIn delay={0.4}>
              <div className="relative rounded-2xl border border-amber-500/20 bg-black/40 backdrop-blur-xl p-4 shadow-[0_0_50px_rgba(245,158,11,0.1)]">
                <div className="aspect-[4/3] rounded-xl border border-white/10 bg-zinc-900 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#F59E0B 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                  <div className="relative z-10 text-center">
                    <Map className="h-16 w-16 text-amber-500 mx-auto mb-4 opacity-50" />
                    <div className="text-amber-500 font-mono text-sm border border-amber-500/30 bg-amber-500/10 px-4 py-2 rounded-full backdrop-blur-md">
                      Live Fleet Tracking Active
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Map, title: "Dynamic Routing", desc: "AI-powered algorithms that adapt to traffic and local constraints." },
              { icon: Clock, title: "Live ETAs", desc: "Accurate predictive timing for customers." },
              { icon: Truck, title: "Fleet Management", desc: "Complete oversight over vehicles and capacity." },
              { icon: Users, title: "Driver App", desc: "Intuitive mobile experience for delivery personnel." }
            ].map((feature, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="p-6 rounded-2xl bg-white/5 border border-white/10 h-full hover:border-amber-500/50 transition-colors">
                  <feature.icon className="h-8 w-8 text-amber-500 mb-4" />
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
      
      <section className="py-12 border-t border-white/10 bg-zinc-950 text-center">
         <FadeIn>
            <p className="text-sm text-muted-foreground">Commerce powered by <a href="/loop-business" className="text-indigo-400 hover:underline">Loop Business</a></p>
         </FadeIn>
      </section>
    </div>
  );
}
