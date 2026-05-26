import { FadeIn } from "../components/layout";
import { ArrowRight, Phone, MessageSquare, Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoopVoice() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '330 81% 60%' } as React.CSSProperties}>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-loop-voice.png" 
            alt="Loop Voice Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-pink-500/30 bg-pink-500/10 px-3 py-1 text-sm text-pink-400 mb-6">
              Communications
            </div>
          </FadeIn>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn delay={0.1}>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-white">
                  Loop <span className="text-pink-500">Voice</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10">
                  Connect with your customers anywhere. Scalable SIP calling, programmatic SMS, and seamless WhatsApp Business integration.
                </p>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                 <Button size="lg" className="h-12 px-8 text-base bg-pink-600 hover:bg-pink-700 text-white font-semibold border-0">
                    Get API Keys <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
              </FadeIn>
            </div>
            
            <FadeIn delay={0.4}>
              <div className="relative rounded-2xl border border-pink-500/20 bg-black/40 backdrop-blur-xl p-8 shadow-[0_0_50px_rgba(236,72,153,0.1)] flex flex-col gap-6">
                 <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                    <Phone className="text-pink-500 h-6 w-6" />
                    <div>
                       <div className="font-semibold">Inbound SIP Call</div>
                       <div className="text-xs text-muted-foreground">Connected • 00:45</div>
                    </div>
                    <div className="ml-auto flex gap-1">
                       <div className="w-1 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s'}} />
                       <div className="w-1 h-4 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s'}} />
                       <div className="w-1 h-2 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s'}} />
                    </div>
                 </div>
                 <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 opacity-70">
                    <MessageSquare className="text-green-500 h-6 w-6" />
                    <div>
                       <div className="font-semibold">WhatsApp Campaign</div>
                       <div className="text-xs text-muted-foreground">Delivered to 14,200 users</div>
                    </div>
                 </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
      
      <section className="py-24">
         <div className="container mx-auto px-4 md:px-6 text-center">
            <FadeIn>
               <h2 className="text-3xl md:text-5xl font-bold mb-16">Omnichannel Engagement</h2>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all">
                     <Mic2 className="h-10 w-10 text-pink-500 mb-6 mx-auto" />
                     <h3 className="text-xl font-bold mb-3">Programmable Voice</h3>
                     <p className="text-muted-foreground">Build IVRs, mask phone numbers for delivery drivers, and record calls securely.</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all">
                     <MessageSquare className="h-10 w-10 text-pink-500 mb-6 mx-auto" />
                     <h3 className="text-xl font-bold mb-3">Reliable SMS</h3>
                     <p className="text-muted-foreground">High-deliverability SMS routing across African telecom networks for OTPs and alerts.</p>
                  </div>
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all">
                     <Phone className="h-10 w-10 text-pink-500 mb-6 mx-auto" />
                     <h3 className="text-xl font-bold mb-3">WhatsApp Business</h3>
                     <p className="text-muted-foreground">Engage customers on their favorite platform with rich media and interactive messages.</p>
                  </div>
               </div>
            </FadeIn>
         </div>
      </section>
    </div>
  );
}
