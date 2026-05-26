import { FadeIn } from "../components/layout";
import { ArrowRight, Terminal, Server, Shield, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GitRald() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '0 84% 60%' } as React.CSSProperties}>
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-gitrald.png" 
            alt="GitRald Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-500 mb-6">
              Infrastructure & DevOps
            </div>
          </FadeIn>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn delay={0.1}>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-white">
                  <span className="text-red-500">Git</span>Rald
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10">
                  Governance, CI/CD, and observability for the modern African engineering team. Deploy confidently.
                </p>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                 <Button size="lg" className="h-12 px-8 text-base bg-red-600 hover:bg-red-700 text-white font-semibold border-0">
                    Deploy Service <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
              </FadeIn>
            </div>
            
            <FadeIn delay={0.4}>
               <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 font-mono text-sm text-muted-foreground shadow-2xl">
                  <div className="flex gap-2 mb-4 border-b border-white/10 pb-4">
                     <div className="w-3 h-3 rounded-full bg-red-500" />
                     <div className="w-3 h-3 rounded-full bg-yellow-500" />
                     <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="space-y-2">
                     <div className="text-white">$ gitrald deploy production</div>
                     <div><span className="text-blue-400">INFO</span> Initiating zero-downtime deployment...</div>
                     <div><span className="text-blue-400">INFO</span> Building container image [sha256:8a9b...]</div>
                     <div><span className="text-yellow-400">WARN</span> Routing traffic 10% to canary</div>
                     <div><span className="text-blue-400">INFO</span> Health checks passed.</div>
                     <div className="text-green-400">SUCCESS: Service live at rald-api.internal</div>
                  </div>
               </div>
            </FadeIn>
          </div>
        </div>
      </section>
      
      <section className="py-24 bg-black">
         <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
               {[
                  { icon: Server, title: "Zero-Downtime Deploys", desc: "Automated blue-green deployments out of the box." },
                  { icon: Shield, title: "Secret Governance", desc: "Enterprise-grade secrets management and RBAC." },
                  { icon: Activity, title: "Deep Observability", desc: "Distributed tracing and metrics tailored for the RALD ecosystem." },
                  { icon: Terminal, title: "Developer Experience", desc: "CLI-first approach, built by engineers for engineers." }
               ].map((feature, i) => (
                  <FadeIn key={i} delay={0.1 * i}>
                     <div className="flex gap-6 p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                        <feature.icon className="h-8 w-8 text-red-500 flex-shrink-0" />
                        <div>
                           <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                           <p className="text-muted-foreground">{feature.desc}</p>
                        </div>
                     </div>
                  </FadeIn>
               ))}
            </div>
         </div>
      </section>
    </div>
  );
}
