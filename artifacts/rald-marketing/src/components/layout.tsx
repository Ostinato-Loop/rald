import { Link } from "wouter";
import { motion } from "framer-motion";
import { ReactNode } from "react";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground dark">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-2xl tracking-tighter">
            RALD
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/loop-business" className="text-muted-foreground hover:text-foreground transition-colors">Loop Business</Link>
            <Link href="/payrald" className="text-muted-foreground hover:text-foreground transition-colors">PayRald</Link>
            <Link href="/loop-dispatch" className="text-muted-foreground hover:text-foreground transition-colors">Loop Dispatch</Link>
            <Link href="/raldtics" className="text-muted-foreground hover:text-foreground transition-colors">Raldtics</Link>
            <Link href="/loop-voice" className="text-muted-foreground hover:text-foreground transition-colors">Loop Voice</Link>
            <Link href="/gitrald" className="text-muted-foreground hover:text-foreground transition-colors">GitRald</Link>
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
              <Link href="/" className="font-bold text-2xl tracking-tighter block mb-2">
                RALD
              </Link>
              <p className="text-muted-foreground max-w-xs text-sm">
                A fully unified AI-native African infrastructure and commerce operating system.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12 text-sm">
              <div className="flex flex-col gap-2">
                <span className="font-semibold mb-2">Products</span>
                <Link href="/loop-business" className="text-muted-foreground hover:text-foreground">Loop Business</Link>
                <Link href="/payrald" className="text-muted-foreground hover:text-foreground">PayRald</Link>
                <Link href="/loop-dispatch" className="text-muted-foreground hover:text-foreground">Loop Dispatch</Link>
              </div>
              <div className="flex flex-col gap-2">
                <span className="font-semibold mb-2 opacity-0 select-none">Products</span>
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

export function FadeIn({ children, delay = 0 }: { children: ReactNode, delay?: number }) {
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
