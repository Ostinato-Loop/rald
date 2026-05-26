import { FadeIn } from "../components/layout";
import { ArrowRight, BrainCircuit, LineChart, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Raldtics() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '258 90% 66%' } as React.CSSProperties}>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-raldtics.png" 
            alt="Raldtics Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-sm text-violet-400 mb-6">
              Intelligence Layer
            </div>
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter mb-6 text-white max-w-4xl mx-auto">
              <span className="text-violet-500">Rald</span>tics
            </h1>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              See the future of your business. AI-driven insights, customer behavior modeling, and predictive analytics for African enterprises.
            </p>
          </FadeIn>
          
          <FadeIn delay={0.3}>
             <Button size="lg" className="h-12 px-8 text-base bg-violet-600 hover:bg-violet-700 text-white border-0">
                Unlock Insights <ArrowRight className="ml-2 h-4 w-4" />
             </Button>
          </FadeIn>
        </div>
      </section>

      <section className="py-24 bg-zinc-950">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <FadeIn>
              <div className="h-full bg-white/5 border border-white/10 rounded-3xl p-10 flex flex-col justify-between hover:border-violet-500/30 transition-all">
                <div>
                  <BrainCircuit className="h-12 w-12 text-violet-500 mb-6" />
                  <h3 className="text-3xl font-bold mb-4">Predictive Analytics</h3>
                  <p className="text-muted-foreground text-lg mb-8">Anticipate inventory needs, forecast cash flow, and identify churn risk before it happens using models trained on regional data.</p>
                </div>
                <div className="h-40 rounded-xl bg-violet-500/5 border border-violet-500/20 flex items-center justify-center">
                   <div className="text-violet-400 font-mono text-sm opacity-80">[ Prediction Model Active ]</div>
                </div>
              </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <div className="grid grid-rows-2 gap-6 h-full">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-violet-500/30 transition-all flex items-center gap-6">
                    <LineChart className="h-10 w-10 text-violet-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold mb-2">Merchant Dashboards</h4>
                      <p className="text-muted-foreground">Beautiful, real-time visualisations of GMV, AOV, and customer metrics.</p>
                    </div>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-violet-500/30 transition-all flex items-center gap-6">
                    <Target className="h-10 w-10 text-violet-400 flex-shrink-0" />
                    <div>
                      <h4 className="text-xl font-bold mb-2">Customer Segmentation</h4>
                      <p className="text-muted-foreground">Automatically group users by LTV and buying patterns to target campaigns.</p>
                    </div>
                 </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </div>
  );
}
