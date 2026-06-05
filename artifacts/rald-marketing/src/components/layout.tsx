import { Link } from "wouter";
import { motion } from "framer-motion";
import { ReactNode } from "react";

function RaldLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 440 110"
      role="img"
      aria-label="RALD"
      className={className}
    >
      <defs>
        <mask id="rald-mkt-a-mask" maskUnits="userSpaceOnUse">
          <text fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif" fontSize="104" fontWeight="900" x="102" y="100" fill="white" letterSpacing="-2">A</text>
        </mask>
      </defs>
      <text fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif" fontSize="104" fontWeight="900" x="2" y="100" fill="#FFFFFF" letterSpacing="-2">R</text>
      <rect x="102" y="0" width="42" height="110" fill="#E63946" mask="url(#rald-mkt-a-mask)" />
      <rect x="144" y="0" width="44" height="110" fill="#F4A261" mask="url(#rald-mkt-a-mask)" />
      <rect x="102" y="0" width="86" height="46" fill="#2ECFA3" mask="url(#rald-mkt-a-mask)" />
      <text fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif" fontSize="104" fontWeight="900" x="197" y="100" fill="#FFFFFF" letterSpacing="-2">LD</text>
    </svg>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <RaldLogo className="h-8 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/loop" className="text-muted-foreground hover:text-foreground transition-colors">Loop</Link>
            <Link href="/messenger" className="text-muted-foreground hover:text-foreground transition-colors">Messenger</Link>
            <Link href="/profiles" className="text-muted-foreground hover:text-foreground transition-colors">Profiles</Link>
            <Link href="/loop-business" className="text-muted-foreground hover:text-foreground transition-colors">Business</Link>
            <Link href="/payrald" className="text-muted-foreground hover:text-foreground transition-colors">PayRald</Link>
            <a
              href="https://profiles.rald.cloud?redirect=https://rald.cloud"
              className="ml-2 px-4 py-1.5 rounded-sm bg-[#2ECFA3] text-black text-sm font-bold tracking-wide hover:bg-[#2ECFA3]/90 transition-colors"
            >
              Sign In
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t border-white/10 py-12 bg-black">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <Link href="/">
                <RaldLogo className="h-8 w-auto mb-3" />
              </Link>
              <p className="text-muted-foreground max-w-xs text-sm">
                A fully unified AI-native African infrastructure and commerce operating system.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-12 text-sm">
              <div className="flex flex-col gap-2">
                <span className="font-semibold mb-2 text-white">Consumer</span>
                <Link href="/loop" className="text-muted-foreground hover:text-foreground">Loop</Link>
                <Link href="/messenger" className="text-muted-foreground hover:text-foreground">Messenger</Link>
                <Link href="/profiles" className="text-muted-foreground hover:text-foreground">Profiles</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold mb-2 text-white">Business</span>
                <Link href="/loop-business" className="text-muted-foreground hover:text-foreground">Loop Business</Link>
                <Link href="/payrald" className="text-muted-foreground hover:text-foreground">PayRald</Link>
                <Link href="/loop-dispatch" className="text-muted-foreground hover:text-foreground">Loop Dispatch</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold mb-2 text-white">Developer</span>
                <Link href="/raldtics" className="text-muted-foreground hover:text-foreground">Raldtics</Link>
                <Link href="/loop-voice" className="text-muted-foreground hover:text-foreground">Loop Voice</Link>
                <Link href="/gitrald" className="text-muted-foreground hover:text-foreground">GitRald</Link>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} RALD Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay }}
    >
      {children}
    </motion.div>
  );
}
