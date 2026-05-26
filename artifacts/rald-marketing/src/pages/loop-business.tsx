import { FadeIn } from "../components/layout";
import { ArrowRight, ShoppingBag, Box, CreditCard, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoopBusiness() {
  return (
    <div className="flex flex-col min-h-screen" style={{ '--primary': '243 75% 66%' } as React.CSSProperties}>
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-loop-business.png" 
            alt="Loop Business Hero" 
            className="w-full h-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-400 mb-6">
              Commerce Infrastructure
            </div>
          </FadeIn>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn delay={0.1}>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 text-white">
                  Loop <span className="text-indigo-500">Business</span>
                </h1>
              </FadeIn>
              
              <FadeIn delay={0.2}>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10">
                  The complete commerce engine for African merchants. Manage storefronts, orchestrate orders, and synchronize inventory in one unified platform.
                </p>
              </FadeIn>
              
              <FadeIn delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" className="h-12 px-8 text-base bg-indigo-500 hover:bg-indigo-600 text-white border-0">
                    Create Storefront <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/20 hover:bg-white/10">
                    Read the Docs
                  </Button>
                </div>
              </FadeIn>
            </div>
            
            <FadeIn delay={0.4}>
              <div className="relative rounded-2xl border border-indigo-500/20 bg-black/40 backdrop-blur-xl p-2 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                <div className="rounded-xl border border-white/5 bg-zinc-950/80 p-6">
                  <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
                    <div className="font-semibold">Merchant Dashboard</div>
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                      <div className="text-sm text-indigo-400 mb-1">Total Sales</div>
                      <div className="text-2xl font-bold">$124,500</div>
                    </div>
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-sm text-muted-foreground mb-1">Active Orders</div>
                      <div className="text-2xl font-bold">842</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded bg-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-white/10" />
                          <div>
                            <div className="text-sm font-medium">Order #{8900 + i}</div>
                            <div className="text-xs text-muted-foreground">Processing</div>
                          </div>
                        </div>
                        <div className="text-sm font-mono text-indigo-400">+$120.00</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-zinc-950">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to sell online</h2>
              <p className="text-xl text-muted-foreground">From headless commerce APIs to full-stack merchant interfaces, Loop Business provides the building blocks for modern retail.</p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: ShoppingBag, title: "Digital Storefronts", desc: "Deploy headless storefronts in minutes or use our pre-built, highly optimized templates designed for African consumers." },
              { icon: Box, title: "Inventory Sync", desc: "Real-time inventory management across multiple warehouses and channels. Never oversell again." },
              { icon: CreditCard, title: "Native Checkout", desc: "Frictionless checkout experiences with localized payment methods seamlessly integrated." },
              { icon: BarChart, title: "Merchant App", desc: "A powerful, intuitive dashboard for store managers to handle daily operations efficiently." }
            ].map((feature, i) => (
              <FadeIn key={i} delay={0.1 * i}>
                <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 transition-colors">
                  <feature.icon className="h-10 w-10 text-indigo-500 mb-6" />
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Banner */}
      <section className="py-20 border-t border-white/10 bg-indigo-950/20">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <FadeIn>
            <h2 className="text-3xl font-bold mb-6">Ready to launch your commerce platform?</h2>
            <Button size="lg" className="bg-indigo-500 hover:bg-indigo-600 text-white">
              Get Started with Loop Business
            </Button>
            <p className="mt-8 text-sm text-muted-foreground">Payments powered by <a href="/payrald" className="text-emerald-400 hover:underline">PayRald</a></p>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
