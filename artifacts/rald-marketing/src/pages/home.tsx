import { Link } from "wouter";
import { FadeIn } from "../components/layout";
import { ArrowRight, ChevronRight, Activity, Globe, Database, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function Home() {
  const products = [
    { name: "Loop Business", path: "/loop-business", color: "bg-indigo-500", desc: "Commerce infrastructure for African merchants.", img: "/images/hero-loop-business.png" },
    { name: "PayRald", path: "/payrald", color: "bg-emerald-500", desc: "Unified payments and finance layer.", img: "/images/hero-payrald.png" },
    { name: "Loop Dispatch", path: "/loop-dispatch", color: "bg-amber-500", desc: "Intelligent last-mile logistics.", img: "/images/hero-loop-dispatch.png" },
    { name: "Raldtics", path: "/raldtics", color: "bg-violet-500", desc: "Data intelligence and AI predictions.", img: "/images/hero-raldtics.png" },
    { name: "Loop Voice", path: "/loop-voice", color: "bg-pink-500", desc: "SIP calling and omnichannel comms.", img: "/images/hero-loop-voice.png" },
    { name: "GitRald", path: "/gitrald", color: "bg-red-500", desc: "Infrastructure CI/CD and governance.", img: "/images/hero-gitrald.png" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="/images/hero-home.png" 
            alt="RALD Infrastructure" 
            className="w-full h-full object-cover opacity-40 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        </div>
        
        <div className="container relative z-10 mx-auto px-4 md:px-6 flex flex-col items-center text-center">
          <FadeIn>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white backdrop-blur-sm mb-6">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
              The Operating System for African Tech
            </div>
          </FadeIn>
          
          <FadeIn delay={0.1}>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tighter max-w-4xl text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 mb-6">
              Unified Infrastructure for a Rising Continent
            </h1>
          </FadeIn>
          
          <FadeIn delay={0.2}>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-10">
              RALD powers the next generation of African founders, merchants, and developers with a cohesive suite of commerce, payments, logistics, and data tools.
            </p>
          </FadeIn>
          
          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://profiles.rald.cloud?redirect=https://rald.cloud">
                <Button size="lg" className="h-12 px-8 text-base bg-[#2ECFA3] text-black hover:bg-[#2ECFA3]/90 font-bold">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="https://profiles.rald.cloud?redirect=https://rald.cloud">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base border-white/20 hover:bg-white/10">
                  Sign In
                </Button>
              </a>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Ecosystem Section */}
      <section className="py-24 bg-black relative border-t border-white/5">
        <div className="container mx-auto px-4 md:px-6">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">One Platform. Endless Possibilities.</h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Stop stitching together fragmented APIs. RALD provides natively integrated primitives that work perfectly together from day one.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, i) => (
              <FadeIn key={product.name} delay={0.1 * i}>
                <Link href={product.path}>
                  <Card className="group relative overflow-hidden bg-white/5 border-white/10 hover:border-white/20 transition-all duration-500 h-full cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-10" />
                    <img 
                      src={product.img} 
                      alt={product.name} 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-50 group-hover:opacity-70"
                    />
                    <CardContent className="relative z-20 p-8 flex flex-col justify-end h-80">
                      <div className={`w-12 h-1 mb-6 rounded-full ${product.color}`} />
                      <h3 className="text-2xl font-bold mb-2 flex items-center justify-between">
                        {product.name}
                        <ChevronRight className="h-5 w-5 opacity-0 -translate-x-4 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                      </h3>
                      <p className="text-muted-foreground group-hover:text-white transition-colors">
                        {product.desc}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Why RALD */}
      <section className="py-24 relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <FadeIn>
                <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Designed for scale. Built for Africa.</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  We understand the unique challenges of building digital infrastructure on the continent. RALD abstracts away the complexity of cross-border payments, spotty logistics, and fragmented data.
                </p>
              </FadeIn>
              
              <div className="space-y-6">
                {[
                  { icon: Activity, title: "High Availability", desc: "99.99% uptime across all systems, engineered for resilience." },
                  { icon: Globe, title: "Pan-African Reach", desc: "Native integrations across multiple jurisdictions and currencies." },
                  { icon: Database, title: "Unified Data Layer", desc: "Single source of truth for your customers, orders, and operations." }
                ].map((feature, i) => (
                  <FadeIn key={i} delay={0.1 * i}>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold mb-1">{feature.title}</h4>
                        <p className="text-muted-foreground">{feature.desc}</p>
                      </div>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </div>
            <div className="relative">
              <FadeIn delay={0.4}>
                <div className="aspect-square rounded-full border border-white/10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] animate-[spin_60s_linear_infinite]" />
                <div className="aspect-square rounded-full border border-white/5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] animate-[spin_40s_linear_infinite_reverse]" />
                <div className="relative rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl p-8 overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-[100px]" />
                  <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px]" />
                  <div className="flex flex-col gap-4 relative z-10">
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      <div className="flex-1">
                        <div className="h-2 bg-white/20 rounded w-24 mb-2" />
                        <div className="h-2 bg-white/10 rounded w-16" />
                      </div>
                      <div className="text-emerald-500 text-sm font-mono">+ $4,200.00</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="flex-1">
                        <div className="h-2 bg-white/20 rounded w-32 mb-2" />
                        <div className="h-2 bg-white/10 rounded w-20" />
                      </div>
                      <div className="text-white text-sm font-mono">En Route</div>
                    </div>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-3 h-3 rounded-full bg-indigo-500" />
                      <div className="flex-1">
                        <div className="h-2 bg-white/20 rounded w-28 mb-2" />
                        <div className="h-2 bg-white/10 rounded w-12" />
                      </div>
                      <div className="text-white text-sm font-mono">14 Orders</div>
                    </div>
                  </div>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 relative overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent" />
        <div className="container mx-auto px-4 md:px-6 relative z-10 text-center">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Build the future of African commerce.</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Join thousands of forward-thinking companies running their infrastructure on RALD.
            </p>
            <Button size="lg" className="h-14 px-10 text-lg bg-white text-black hover:bg-white/90">
              Start Building Now
            </Button>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
