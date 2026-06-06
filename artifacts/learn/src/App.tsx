// learn.rald.cloud — RALD Knowledge & Documentation Platform
// Meta + Stripe + Notion quality. Trust-first. African-first. Audio-first.
// LILCKY STUDIO LIMITED

import { useState, useEffect } from "react";
import { useLocation, Route, Switch, Link } from "wouter";
import {
  BookOpen, Shield, Lock, CheckCircle2, Sparkles, Briefcase, Code2,
  ChevronRight, Menu, X, ExternalLink, ArrowRight, Search,
  Mic2, Radio, MessageSquare, Music2, Mail, ShoppingBag,
  Globe, Users, Zap, Eye, Database, Server, AlertTriangle,
} from "lucide-react";

// ── Type definitions ──────────────────────────────────────────────────────────
type NavSection = { label: string; icon: React.ReactNode; href: string; children?: { label: string; href: string }[] };
type ProductKey = "profiles" | "app" | "loop" | "messenger" | "manilla" | "voice" | "mail" | "dunarald";

// ── Navigation structure ──────────────────────────────────────────────────────
const NAV: NavSection[] = [
  {
    label: "Products", icon: <BookOpen className="h-4 w-4" />, href: "/products",
    children: [
      { label: "Profiles",       href: "/products/profiles"  },
      { label: "App",            href: "/products/app"       },
      { label: "Loop",           href: "/products/loop"      },
      { label: "Messenger",      href: "/products/messenger" },
      { label: "Manilla",        href: "/products/manilla"   },
      { label: "RALD Voice",     href: "/products/voice"     },
      { label: "RALD Mail",      href: "/products/mail"      },
      { label: "DunaRald",       href: "/products/dunarald"  },
    ],
  },
  { label: "Security",     icon: <Shield className="h-4 w-4" />,       href: "/security"      },
  { label: "Privacy",      icon: <Lock className="h-4 w-4" />,         href: "/privacy"       },
  { label: "Verification", icon: <CheckCircle2 className="h-4 w-4" />, href: "/verification"  },
  { label: "AI",           icon: <Sparkles className="h-4 w-4" />,     href: "/ai"            },
  { label: "Business",     icon: <Briefcase className="h-4 w-4" />,    href: "/business"      },
  { label: "Developers",   icon: <Code2 className="h-4 w-4" />,        href: "/developers"    },
];

// ── Product definitions ───────────────────────────────────────────────────────
const PRODUCTS: Record<ProductKey, {
  name: string; tagline: string; icon: React.ReactNode; color: string; url: string;
  what: string; why: string; how: string[];
  privacy: string[]; security: string[];
  roadmap: { label: string; status: "live" | "soon" | "planned" }[];
}> = {
  profiles: {
    name: "Profiles", tagline: "Your identity across the RALD universe.",
    icon: <Users className="h-6 w-6" />, color: "from-blue-500 to-emerald-500", url: "https://profiles.rald.cloud",
    what: "Profiles is the identity backbone of the RALD ecosystem. It is your single account — one login, every RALD product. Think of it as Google Account or Apple ID, but built for Nigeria and Africa's digital generation.",
    why: "Africa doesn't have a trusted, locally-built digital identity layer. Every app makes you register separately. Profiles fixes this — one identity, full trust, zero friction across every RALD product you use.",
    how: [
      "Register once with your email or phone number.",
      "Verify your identity — email link or SMS OTP.",
      "Your RALD ID is assigned (e.g. RALD-A3F9KL) — portable across all products.",
      "Access Loop, Messenger, Manilla, and every other RALD app with one click.",
      "Manage your sessions, devices, and connected apps from profiles.rald.cloud.",
    ],
    privacy: [
      "We store your email and phone number for authentication only.",
      "You can download all your data at any time from the Privacy Center.",
      "Account deletion is permanent and processed within 30 days.",
      "We never sell your personal data to third parties.",
      "Data is stored in Nigeria-region infrastructure.",
    ],
    security: [
      "Passwords are hashed using bcrypt with minimum 12 rounds.",
      "JWT tokens expire after 7 days and are rotated on every login.",
      "Rate limiting: 5 login attempts per 15 minutes per IP.",
      "All authentication events are written to an immutable audit log.",
      "HSTS and CSP headers are enforced on all auth endpoints.",
    ],
    roadmap: [
      { label: "Email & phone verification", status: "live" },
      { label: "Session management", status: "live" },
      { label: "Audit logs", status: "live" },
      { label: "Organizations", status: "live" },
      { label: "Privacy center & data export", status: "soon" },
      { label: "Verification engine (Artist, Label, Radio)", status: "soon" },
      { label: "Two-factor authentication (TOTP)", status: "planned" },
      { label: "Passkey support", status: "planned" },
      { label: "Ecosystem events & webhooks", status: "planned" },
    ],
  },
  app: {
    name: "App (RALD App)", tagline: "Your account center for everything RALD.",
    icon: <Globe className="h-6 w-6" />, color: "from-emerald-400 to-blue-500", url: "https://app.rald.cloud",
    what: "RALD App is the command center for your RALD identity. Like Google's My Account page — but for the entire RALD ecosystem. See all your connected products, manage privacy settings, and launch any RALD app with one tap.",
    why: "Users of the RALD ecosystem need one place to understand what they have access to, what data is stored about them, and how to control their digital presence. RALD App is that single pane of glass.",
    how: [
      "Sign in at app.rald.cloud with your RALD credentials.",
      "See all 8+ RALD products you have access to in one App Launcher grid.",
      "Launch any product with SSO — no second login required.",
      "Manage active sessions across all your devices.",
      "Review your full audit trail of security events.",
      "Control privacy permissions and download your data.",
    ],
    privacy: [
      "App.rald.cloud only reads your identity — it does not store additional data.",
      "All data shown comes directly from your Profiles account.",
      "Sessions listed are read from encrypted KV storage, not a central log.",
    ],
    security: [
      "SSO token exchange uses short-lived signed JWTs (15-minute expiry).",
      "Every session is device-fingerprinted and IP-logged.",
      "You can revoke any session or all sessions with one action.",
    ],
    roadmap: [
      { label: "App launcher dashboard", status: "live" },
      { label: "Session management", status: "live" },
      { label: "Security tab", status: "live" },
      { label: "Organizations tab", status: "live" },
      { label: "Audit log view", status: "live" },
      { label: "Privacy center tab", status: "soon" },
      { label: "Notification preferences", status: "planned" },
      { label: "Trusted devices management", status: "planned" },
    ],
  },
  loop: {
    name: "Loop", tagline: "Audio social. Made for Africa.",
    icon: <Mic2 className="h-6 w-6" />, color: "from-violet-500 to-pink-500", url: "https://loop.rald.cloud",
    what: "Loop is a live social audio platform — think Clubhouse, but built for Nigeria. Join live rooms for Community talk, News commentary, Radio broadcasts, DJ sets, Education, or Business networking. Real voices. Real time.",
    why: "Africa's internet culture is audio-first. More people consume voice content than text. Loop gives Africa a place to broadcast, debate, learn, and entertain — in their languages, from their cities, about things that matter to them.",
    how: [
      "Join with your RALD account — no separate registration.",
      "Discover rooms by category: Community, News, Commentary, Radio, DJ Session, Education, Business.",
      "Tap any room to listen. Request to speak to join the conversation.",
      "Host creates a room in 5 seconds — go live immediately.",
      "Room recordings are available for replay (when host enables it).",
      "Business rooms support up to 500 concurrent speakers.",
    ],
    privacy: [
      "Public rooms are discoverable to all Loop users.",
      "Private rooms require an invite link.",
      "Audio is not recorded by default — hosts must opt in.",
      "User profiles show only what you've chosen to share publicly.",
    ],
    security: [
      "Room permissions are enforced server-side via Supabase RLS.",
      "Speaker requests are host-controlled — no one can unmute without permission.",
      "Abusive content can be reported in-room and reviewed within 24 hours.",
    ],
    roadmap: [
      { label: "Live audio rooms (7 categories)", status: "live" },
      { label: "Room discovery & search", status: "live" },
      { label: "Host & moderator controls", status: "live" },
      { label: "Room reactions & messaging", status: "live" },
      { label: "Room recordings & replay", status: "soon" },
      { label: "Scheduled rooms & events", status: "soon" },
      { label: "Loop Spaces (larger events)", status: "planned" },
      { label: "Creator monetization", status: "planned" },
    ],
  },
  messenger: {
    name: "Messenger", tagline: "Messaging that actually delivers.",
    icon: <MessageSquare className="h-6 w-6" />, color: "from-blue-400 to-cyan-500", url: "https://messenger.rald.cloud",
    what: "RALD Messenger is a realtime messaging platform built for both consumers and businesses. For individuals: group chats, voice notes, and media sharing. For businesses: customer conversations, team channels, and automated responses — all in one inbox.",
    why: "Nigerian businesses lose customers because their communication is scattered across WhatsApp, Instagram DMs, email, and SMS. Messenger unifies it. And for consumers, a messaging app tied to your RALD identity means you never lose your conversation history when you change phones.",
    how: [
      "Log in with your RALD account.",
      "Start a conversation with any RALD user by their RALD ID.",
      "Create group chats for up to 500 participants.",
      "Businesses get a unified inbox with AI-assisted responses.",
      "Loop Business teams get multi-agent support queues.",
    ],
    privacy: [
      "Direct messages are encrypted in transit using TLS 1.3.",
      "End-to-end encryption for DMs is on our roadmap.",
      "You can delete messages for both parties within 48 hours.",
      "Group message history is retained for 1 year by default.",
    ],
    security: [
      "All WebSocket connections require a valid RALD session token.",
      "Messages are stored in Supabase with row-level security.",
      "Rate limiting on message send: 60 messages/minute per user.",
      "Spam and abuse detection runs on all messages.",
    ],
    roadmap: [
      { label: "1:1 messaging", status: "live" },
      { label: "Group chats", status: "live" },
      { label: "Business unified inbox", status: "live" },
      { label: "Voice notes", status: "soon" },
      { label: "End-to-end encryption (DMs)", status: "planned" },
      { label: "Message scheduling", status: "planned" },
      { label: "Disappearing messages", status: "planned" },
    ],
  },
  manilla: {
    name: "Manilla", tagline: "Stream, discover, and support African music.",
    icon: <Music2 className="h-6 w-6" />, color: "from-amber-500 to-orange-500", url: "https://manilla.rald.cloud",
    what: "Manilla is a music streaming and discovery platform purpose-built for African artists and listeners. Artists distribute, monetize, and grow. Listeners discover the best of Afrobeats, Highlife, Amapiano, Jùjú, and more — without borders.",
    why: "African music is global, but the economics have never been African-first. Manilla gives Nigerian and African artists fair royalties, direct fan connections, and powerful analytics — without a middleman extracting value.",
    how: [
      "Listeners: stream unlimited music with a RALD account.",
      "Artists: upload music, set pricing (stream/download/exclusive), and earn directly.",
      "Labels: manage your roster, distribute catalog, and access earnings dashboards.",
      "DJ Sessions on Loop integrate with Manilla for seamless music source.",
      "Radio stations can license and broadcast from the Manilla catalog.",
    ],
    privacy: [
      "Your listening history powers recommendations and is never sold.",
      "You can delete your listening history at any time.",
      "Artist earnings data is private and visible only to the artist and their manager.",
    ],
    security: [
      "Music files are served via signed CDN URLs with 4-hour expiry.",
      "Stream counts are verified against abuse patterns before royalty calculation.",
      "Artist account changes require re-authentication.",
    ],
    roadmap: [
      { label: "Music streaming", status: "live" },
      { label: "Artist uploads & catalog", status: "live" },
      { label: "Verified artist profiles", status: "soon" },
      { label: "Label management dashboard", status: "soon" },
      { label: "Fan subscription tiers", status: "planned" },
      { label: "Lyrics & liner notes", status: "planned" },
      { label: "Collaborative playlists", status: "planned" },
    ],
  },
  voice: {
    name: "RALD Voice", tagline: "The voice layer of the RALD ecosystem.",
    icon: <Radio className="h-6 w-6" />, color: "from-red-500 to-rose-500", url: "https://voice.rald.cloud",
    what: "RALD Voice is the communications infrastructure layer — SIP gateways, phone number provisioning, call routing, and voice API. It powers call features across all RALD products and lets developers build voice applications on Nigerian telecom infrastructure.",
    why: "Reliable voice infrastructure in Nigeria is expensive and fragmented. RALD Voice provides a single, developer-friendly abstraction over Nigerian carrier networks — built for high reliability at African price points.",
    how: [
      "Businesses provision virtual phone numbers via the API.",
      "Calls are routed through our SIP gateway with <200ms TTFB.",
      "Voice recordings are stored with user consent only.",
      "Developers access voice via the RALD SDK with simple API calls.",
      "Works with WhatsApp Business, USSD, and standard PSTN.",
    ],
    privacy: [
      "Call recordings require explicit user consent before each call.",
      "Call metadata (duration, number) is retained for 90 days.",
      "You can request deletion of all call records.",
    ],
    security: [
      "SRTP encryption on all voice calls.",
      "API keys for voice use are scoped per environment.",
      "DDoS protection on all SIP endpoints.",
    ],
    roadmap: [
      { label: "SIP gateway", status: "live" },
      { label: "Virtual number provisioning", status: "live" },
      { label: "Voice API (SDK)", status: "soon" },
      { label: "Conference calling", status: "soon" },
      { label: "AI call transcription", status: "planned" },
      { label: "USSD session management", status: "planned" },
    ],
  },
  mail: {
    name: "RALD Mail", tagline: "Email infrastructure for African businesses.",
    icon: <Mail className="h-6 w-6" />, color: "from-sky-500 to-indigo-500", url: "https://mail.rald.cloud",
    what: "RALD Mail is a transactional and marketing email platform built for Nigerian and African businesses. Send verification emails, order confirmations, newsletters, and campaigns — with full deliverability analytics and local support.",
    why: "Nigerian businesses using global email providers face higher spam rates and lack local support. RALD Mail is optimized for African deliverability, supports Naira billing, and provides compliance with Nigerian data laws.",
    how: [
      "Connect your domain and verify DNS records.",
      "Use the RALD Mail API or drag-and-drop campaign builder.",
      "Transactional emails integrate directly with RALD Auth (welcome emails, OTPs).",
      "Marketing campaigns support segmentation by RALD product usage.",
      "Deliverability reports show inbox vs. spam rates per provider.",
    ],
    privacy: [
      "Email addresses are processed only to deliver your emails.",
      "Unsubscribe links are mandatory and processed within 24 hours.",
      "No email content is stored beyond the delivery window.",
    ],
    security: [
      "DKIM, SPF, and DMARC automatically configured for custom domains.",
      "API keys are environment-scoped with rotation support.",
      "TLS 1.3 on all SMTP connections.",
    ],
    roadmap: [
      { label: "Transactional email (API)", status: "live" },
      { label: "RALD Auth integration", status: "live" },
      { label: "Campaign builder", status: "soon" },
      { label: "Email analytics dashboard", status: "soon" },
      { label: "A/B testing", status: "planned" },
      { label: "AI-generated email copy", status: "planned" },
    ],
  },
  dunarald: {
    name: "DunaRald", tagline: "Commerce, discovery, and delivery — African-first.",
    icon: <ShoppingBag className="h-6 w-6" />, color: "from-teal-500 to-emerald-500", url: "https://duna.rald.cloud",
    what: "DunaRald is a discovery-first commerce platform. Buyers discover products from Nigerian and African sellers through curated collections, Loop live shopping, and social recommendations. Sellers get powerful storefronts, order management, and Loop Business integration.",
    why: "Nigerian e-commerce is fragmented — Jumia, WhatsApp, Instagram, and local markets all disconnected. DunaRald creates a unified, trust-first commerce layer where discovery, purchase, payment (via PayRald), and delivery (via Raldtics) all connect seamlessly.",
    how: [
      "Buyers browse products via curated feeds and social discovery.",
      "Purchase with PayRald — no additional payment registration required.",
      "Sellers create storefronts, list products, and manage orders from Loop Business.",
      "Delivery is handled by Raldtics with real-time tracking.",
      "Loop live shopping lets sellers demo products in live audio rooms.",
    ],
    privacy: [
      "Purchase history is used only to improve recommendations — never shared.",
      "Seller business data is private and not visible to other sellers.",
      "Delivery addresses are encrypted at rest and deleted after 90 days.",
    ],
    security: [
      "All payments processed via PayRald with PCI-compliant tokenization.",
      "Seller payouts require verified bank account and identity.",
      "Fraud detection on all orders over ₦50,000.",
    ],
    roadmap: [
      { label: "Product discovery feed", status: "live" },
      { label: "Seller storefronts", status: "live" },
      { label: "Loop Business integration", status: "live" },
      { label: "Live shopping (Loop rooms)", status: "soon" },
      { label: "AI product recommendations", status: "planned" },
      { label: "Group buying", status: "planned" },
      { label: "Seller analytics", status: "planned" },
    ],
  },
};

// ── Shared UI components ──────────────────────────────────────────────────────
function Pill({ children, color = "green" }: { children: React.ReactNode; color?: "green" | "blue" | "amber" | "gray" }) {
  const cls = {
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    blue:  "bg-blue-500/10 text-blue-400 border-blue-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    gray:  "bg-gray-700/50 text-gray-400 border-gray-600/30",
  }[color];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: "live" | "soon" | "planned" }) {
  const config = {
    live:    { label: "Live",    cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    soon:    { label: "Soon",    cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    planned: { label: "Planned", cls: "bg-gray-700 text-gray-400 border-gray-600" },
  }[status];
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.cls}`}>
      {config.label}
    </span>
  );
}

function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-emerald-400">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Sidebar navigation ────────────────────────────────────────────────────────
function Sidebar({ mobile = false, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [location] = useLocation();
  const [openSection, setOpenSection] = useState<string | null>("Products");

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  return (
    <nav className={`${mobile ? "w-full" : "w-64"} flex flex-col gap-1`}>
      <div className="mb-6 px-2">
        <Link href="/" onClick={onClose}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 text-sm font-black text-white">R</div>
            <div>
              <div className="text-sm font-bold text-white">RALD Learn</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Documentation</div>
            </div>
          </div>
        </Link>
      </div>

      {NAV.map((section) => (
        <div key={section.href}>
          {section.children ? (
            <button
              onClick={() => setOpenSection(openSection === section.label ? null : section.label)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive(section.href) ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}
            >
              <span className="text-gray-500">{section.icon}</span>
              <span className="flex-1 text-left">{section.label}</span>
              <ChevronRight className={`h-3.5 w-3.5 text-gray-600 transition-transform ${openSection === section.label ? "rotate-90" : ""}`} />
            </button>
          ) : (
            <Link href={section.href} onClick={onClose}>
              <div className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive(section.href) ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800/50 hover:text-white"
              }`}>
                <span className="text-gray-500">{section.icon}</span>
                {section.label}
              </div>
            </Link>
          )}

          {section.children && openSection === section.label && (
            <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-gray-800 pl-3">
              {section.children.map((child) => (
                <Link key={child.href} href={child.href} onClick={onClose}>
                  <div className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    location === child.href ? "text-emerald-400 font-medium" : "text-gray-500 hover:text-gray-300"
                  }`}>
                    {child.label}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="mt-auto pt-6">
        <a href="https://profiles.rald.cloud" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">
          <ExternalLink className="h-3.5 w-3.5" /> Sign in to RALD
        </a>
        <a href="https://rald.cloud" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">
          <Globe className="h-3.5 w-3.5" /> rald.cloud
        </a>
      </div>
    </nav>
  );
}

// ── Page wrapper ──────────────────────────────────────────────────────────────
function PageWrapper({ title, subtitle, badge, children }: {
  title: string; subtitle: string; badge?: string; children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-4xl space-y-12 px-6 py-12">
      <header className="space-y-4">
        {badge && <Pill color="green">{badge}</Pill>}
        <h1 className="text-4xl font-black tracking-tight text-white lg:text-5xl">{title}</h1>
        <p className="max-w-2xl text-lg text-gray-400 leading-relaxed">{subtitle}</p>
        <div className="h-px bg-gradient-to-r from-emerald-500/20 to-transparent" />
      </header>
      <div className="prose-rald">{children}</div>
    </article>
  );
}

// ── Product page ──────────────────────────────────────────────────────────────
function ProductPage({ productKey }: { productKey: ProductKey }) {
  const p = PRODUCTS[productKey];
  return (
    <PageWrapper title={p.name} subtitle={p.tagline} badge="Product">
      <div className="space-y-12">
        {/* What is it */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">What is {p.name}?</h2>
          <p className="text-gray-300 text-lg leading-relaxed">{p.what}</p>
          <div className="mt-6">
            <a href={p.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
              Open {p.name} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </section>

        {/* Why does it exist */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">Why does it exist?</h2>
          <p className="text-gray-300 leading-relaxed">{p.why}</p>
        </section>

        {/* How does it work */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-4">How does it work?</h2>
          <ol className="space-y-3">
            {p.how.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm font-bold text-emerald-400">
                  {i + 1}
                </span>
                <span className="text-gray-300 leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Privacy & Security */}
        <div className="grid gap-6 md:grid-cols-2">
          <InfoCard icon={<Lock className="h-5 w-5" />} title="Privacy">
            <ul className="space-y-2">
              {p.privacy.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>

          <InfoCard icon={<Shield className="h-5 w-5" />} title="Security">
            <ul className="space-y-2">
              {p.security.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <Shield className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        {/* Roadmap */}
        <section>
          <h2 className="text-2xl font-bold text-white mb-6">Roadmap</h2>
          <div className="rounded-2xl border border-gray-800 overflow-hidden">
            {p.roadmap.map((item, i) => (
              <div key={i} className={`flex items-center justify-between px-5 py-3.5 ${i !== p.roadmap.length - 1 ? "border-b border-gray-800" : ""}`}>
                <span className={`text-sm ${item.status === "live" ? "text-white font-medium" : "text-gray-400"}`}>
                  {item.status === "live" && <span className="mr-2">✓</span>}
                  {item.label}
                </span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

// ── /products index ───────────────────────────────────────────────────────────
function ProductsIndex() {
  return (
    <PageWrapper title="Products" subtitle="Every product in the RALD ecosystem. One account. Full trust." badge="Ecosystem">
      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.entries(PRODUCTS) as [ProductKey, typeof PRODUCTS[ProductKey]][]).map(([key, p]) => (
          <Link key={key} href={`/products/${key}`}>
            <div className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-5 hover:border-emerald-500/30 hover:bg-gray-900 transition-all cursor-pointer">
              <div className="mb-3 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-white`}>
                  {p.icon}
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.url.replace("https://", "")}</div>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">{p.tagline}</p>
              <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-500 group-hover:text-emerald-400">
                Learn more <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </PageWrapper>
  );
}

// ── /security ─────────────────────────────────────────────────────────────────
function SecurityPage() {
  const items = [
    { icon: <Shield className="h-5 w-5" />, title: "Authentication Security", items: [
      "bcrypt password hashing with minimum 12 rounds",
      "HS256 JWT tokens with 7-day expiry and per-login rotation",
      "Rate limiting: 5 failed logins per 15 minutes per IP and email",
      "Account lockout after 10 consecutive failures",
      "Brute-force detection with progressive delays",
    ]},
    { icon: <Server className="h-5 w-5" />, title: "Infrastructure", items: [
      "Cloudflare Workers edge runtime — zero cold starts",
      "Supabase PostgreSQL with row-level security (RLS) on all tables",
      "Cloudflare KV for session storage — encrypted at rest",
      "All services deploy behind Cloudflare WAF",
      "DDoS protection at network and application layer",
    ]},
    { icon: <Eye className="h-5 w-5" />, title: "Transport Security", items: [
      "TLS 1.3 enforced on all endpoints",
      "HSTS with 1-year max-age and preload",
      "Content Security Policy (CSP) on all web properties",
      "Strict X-Frame-Options and X-Content-Type-Options",
      "CORS restricted to known RALD domains only",
    ]},
    { icon: <Database className="h-5 w-5" />, title: "Data Security", items: [
      "Passwords never stored — only bcrypt hashes",
      "Phone numbers stored with encryption at rest",
      "OTP codes expire after 10 minutes and are single-use",
      "Audit logs are append-only — immutable by design",
      "Supabase service role key never exposed to client",
    ]},
    { icon: <AlertTriangle className="h-5 w-5" />, title: "Incident Response", items: [
      "Security incidents are investigated within 24 hours",
      "Critical vulnerabilities patched within 72 hours",
      "Users notified of breaches affecting their data within 7 days",
      "Bug bounty program launching Q3 2026",
      "Report security issues: security@rald.cloud",
    ]},
    { icon: <Zap className="h-5 w-5" />, title: "Operational Security", items: [
      "All secrets managed via Cloudflare Workers secrets — never in code",
      "Production deployments require two-factor internal approval",
      "Automated secret rotation on 90-day cycle",
      "Separate development, staging, and production environments",
      "No production access for contractors — only full-time staff",
    ]},
  ];

  return (
    <PageWrapper title="Security" subtitle="How RALD protects you, your data, and your identity." badge="Trust & Safety">
      <div className="space-y-8">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <div className="flex items-start gap-4">
            <Shield className="h-6 w-6 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-white mb-2">Security-first by design</h3>
              <p className="text-sm text-gray-300 leading-relaxed">
                RALD is built on the principle that security cannot be added later — it must be woven into every architectural decision from day one. Every endpoint, every token, every byte of data is handled with explicit security intent.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {items.map((section) => (
            <InfoCard key={section.title} icon={section.icon} title={section.title}>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 mt-2" />
                    {item}
                  </li>
                ))}
              </ul>
            </InfoCard>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Responsible Disclosure</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            If you discover a security vulnerability in any RALD product, please report it privately. We take all reports seriously and commit to responding within 48 hours.
          </p>
          <a href="mailto:security@rald.cloud"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            <Mail className="h-4 w-4 text-emerald-400" /> security@rald.cloud
          </a>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── /privacy ──────────────────────────────────────────────────────────────────
function PrivacyPage() {
  return (
    <PageWrapper title="Privacy" subtitle="Your data belongs to you. We're just the custodians." badge="Privacy">
      <div className="space-y-8">
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <p className="text-blue-300 font-medium">Last updated: June 6, 2026 · Effective: June 6, 2026</p>
          <p className="text-sm text-gray-400 mt-2">This policy applies to all RALD products: Profiles, App, Loop, Messenger, Manilla, Voice, Mail, and DunaRald.</p>
        </div>

        {[
          { title: "What data we collect", content: [
            "Identity: Email address, phone number, full name — required for account creation.",
            "Authentication: Login timestamps, IP addresses, device fingerprints — for security.",
            "Activity: Products accessed, rooms joined, messages sent (metadata only, not content).",
            "Preferences: App settings, notification preferences, privacy controls.",
            "Verification: Documents submitted for Artist/Label/Radio verification.",
          ]},
          { title: "How we use it", content: [
            "Authentication: To verify you are who you say you are.",
            "Personalisation: To recommend content, people, and products relevant to you.",
            "Security: To detect suspicious activity and protect your account.",
            "Communication: To send you service emails (never marketing without consent).",
            "Improvement: Aggregate analytics to improve product experience.",
          ]},
          { title: "What we never do", content: [
            "We never sell your personal data to third parties.",
            "We never show your phone number to other users without your explicit consent.",
            "We never use your message content for advertising targeting.",
            "We never share your data with governments without a valid legal order.",
            "We never use your data to profile you for insurance, credit, or employment.",
          ]},
          { title: "Your rights", content: [
            "Access: Download a full copy of all your data at profiles.rald.cloud/privacy.",
            "Correction: Update your profile information at any time.",
            "Deletion: Request account deletion — processed within 30 days.",
            "Portability: Export your data in machine-readable JSON format.",
            "Restriction: Opt out of activity tracking and marketing communications.",
          ]},
          { title: "Data retention", content: [
            "Account data: Retained while your account is active.",
            "Audit logs: 12 months, then anonymised.",
            "Session data: Deleted when session expires or is revoked.",
            "Deleted accounts: All personal data removed within 30 days of deletion request.",
            "Legal holds: If required by Nigerian law, data may be retained longer.",
          ]},
        ].map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>
            <ul className="space-y-3">
              {section.content.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-gray-300">
                  <ChevronRight className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <div className="rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-3">Contact us</h2>
          <p className="text-gray-400 mb-4">Questions about how we handle your data? Our privacy team responds within 72 hours.</p>
          <div className="flex gap-3 flex-wrap">
            <a href="mailto:privacy@rald.cloud"
              className="inline-flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
              <Mail className="h-4 w-4 text-blue-400" /> privacy@rald.cloud
            </a>
            <a href="https://profiles.rald.cloud/privacy" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
              Manage my data <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── /verification ─────────────────────────────────────────────────────────────
function VerificationPage() {
  const types = [
    { type: "Artist", icon: "🎵", desc: "Verified music artist. Unlocks Manilla artist tools, Loop artist rooms, and a blue checkmark on your profile.", requires: ["Artist name and stage name", "Links to 2+ streaming profiles (Spotify, Apple Music, etc.)", "Social media accounts with 500+ followers", "Short bio"] },
    { type: "Label",  icon: "🏷️", desc: "Record label. Manage artists, distribute catalog, and access label analytics.", requires: ["Company registration (CAC certificate)", "Label name and roster of at least 1 artist", "Contact email on label domain", "Label website"] },
    { type: "Radio",  icon: "📻", desc: "Radio station operator. Broadcast live streams and manage station profiles.", requires: ["NBC broadcast licence or online radio registration", "Station name and frequency/stream URL", "Station logo and contact details", "24-month broadcast history"] },
    { type: "Advertiser", icon: "📢", desc: "Brand or agency running campaigns across RALD. Access audience targeting and campaign analytics.", requires: ["CAC-registered business", "Business website", "Contact name and email", "Campaign brief or portfolio"] },
    { type: "Media House", icon: "📡", desc: "News outlet, TV station, or digital media. Access verified journalism badge.", requires: ["NUJ or APCON registration (recommended)", "Editorial contact email on media domain", "Publication history (min. 6 months)", "At least 3 published articles online"] },
    { type: "Community", icon: "🏘️", desc: "Community organisation, NGO, or cooperative.", requires: ["Organisation name and handle", "Description and stated purpose", "State of operation", "Contact email"] },
  ];

  return (
    <PageWrapper title="Verification" subtitle="Verified accounts build trust. We review every application carefully." badge="Identity Trust">
      <div className="space-y-8">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6">
          <h3 className="font-semibold text-white mb-2">How verification works</h3>
          <ol className="space-y-2">
            {["Apply at profiles.rald.cloud with the required information.", "Our team reviews your application within 5–10 business days.", "We may contact you for additional documentation.", "Approved accounts receive a verified badge visible across all RALD products.", "Verification can be revoked if you violate RALD community standards."].map((s, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {types.map((t) => (
            <div key={t.type} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="text-3xl mb-3">{t.icon}</div>
              <h3 className="font-semibold text-white mb-2">{t.type}</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">{t.desc}</p>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Required</p>
                <ul className="space-y-1">
                  {t.requires.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="h-1 w-1 rounded-full bg-gray-600 mt-1.5 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-3">Verification statuses</h2>
          <div className="space-y-3">
            {[
              { status: "Pending",      desc: "Your application has been received and is in the queue.", color: "text-amber-400" },
              { status: "Under Review", desc: "Our team is actively reviewing your application.", color: "text-blue-400" },
              { status: "Approved",     desc: "Verification granted. Badge visible on your profile.", color: "text-emerald-400" },
              { status: "Rejected",     desc: "Application rejected. You will receive a reason and can reapply in 30 days.", color: "text-red-400" },
            ].map((s) => (
              <div key={s.status} className="flex items-start gap-3">
                <span className={`font-semibold text-sm w-28 shrink-0 ${s.color}`}>{s.status}</span>
                <span className="text-sm text-gray-400">{s.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <a href="https://profiles.rald.cloud" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
            Apply for verification <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── /ai ───────────────────────────────────────────────────────────────────────
function AIPage() {
  return (
    <PageWrapper title="RALD AI" subtitle="Responsible AI, built for Africa." badge="Intelligence">
      <div className="space-y-8">
        <p className="text-lg text-gray-300 leading-relaxed">
          RALD AI powers intelligent features across every product — from content moderation on Loop, smart replies in Messenger, music recommendations in Manilla, to business insights in Loop Business. All AI at RALD is designed with transparency, fairness, and African context at its core.
        </p>

        {[
          { title: "Where AI is used", items: [
            "Loop: Room topic suggestions, content moderation, speaker prioritisation",
            "Messenger: Smart reply suggestions, spam detection, sentiment analysis",
            "Manilla: Music recommendations, genre classification, similar artist discovery",
            "Loop Business: AI inbox responses, customer intent detection, churn prediction",
            "Profiles: Suspicious login detection, anomaly alerts",
            "DunaRald: Product recommendations, price trend analysis",
          ]},
          { title: "Our AI principles", items: [
            "Transparency: We tell you when AI made a decision that affects you.",
            "Fairness: Models are tested for bias against Nigerian and African language patterns.",
            "Human oversight: All high-stakes AI decisions have a human review path.",
            "Privacy by design: AI models are trained on anonymised aggregate data only.",
            "Contestability: You can challenge any AI decision through our appeals process.",
          ]},
          { title: "What AI does NOT do", items: [
            "AI does not make final decisions on account suspension — humans do.",
            "AI does not read your private message content without your consent.",
            "AI does not profile you for credit, insurance, or employment decisions.",
            "AI does not generate content that impersonates real people.",
            "AI does not operate without human oversight on sensitive decisions.",
          ]},
        ].map((section) => (
          <InfoCard key={section.title} icon={<Sparkles className="h-5 w-5" />} title={section.title}>
            <ul className="space-y-2">
              {section.items.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-400 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </InfoCard>
        ))}
      </div>
    </PageWrapper>
  );
}

// ── /business ─────────────────────────────────────────────────────────────────
function BusinessPage() {
  return (
    <PageWrapper title="Business" subtitle="Everything RALD builds for businesses." badge="Loop Business">
      <div className="space-y-8">
        <p className="text-lg text-gray-300 leading-relaxed">
          Loop Business is RALD's all-in-one platform for Nigerian businesses — from small shops to enterprise. Unified inbox, customer management, campaigns, bookings, and e-commerce integrations. Powered by RALD's identity layer for seamless customer verification.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { icon: "💬", title: "Unified Inbox", desc: "All customer conversations from WhatsApp, Instagram, email, and Loop in one place." },
            { icon: "👥", title: "Customer Management", desc: "360° customer view. VIP segments, lifetime value, churn risk, and re-engagement tools." },
            { icon: "📢", title: "Campaigns", desc: "Send marketing campaigns across all channels. Target by segment, location, or purchase history." },
            { icon: "⚙️", title: "Automations", desc: "Auto-reply, order confirmations, abandoned cart recovery, and custom workflow triggers." },
            { icon: "📅", title: "Bookings", desc: "Service business scheduling — appointments, deposits, and reminders built in." },
            { icon: "📻", title: "Radio Stations", desc: "Manage station profile, schedule shows, track listener analytics." },
            { icon: "🏘️", title: "Community Orgs", desc: "Register community organisations, NGOs, and cooperatives on Loop." },
            { icon: "💼", title: "Businesses", desc: "CAC-verified business profiles with ratings, reviews, and direct booking." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Pricing (coming soon)</h2>
          <p className="text-gray-400 leading-relaxed">
            Loop Business will launch with a Starter tier (free), Growth tier (₦15,000/month), and Pro tier (₦35,000/month). All prices in Naira. No hidden fees. Cancel anytime.
          </p>
        </div>

        <div className="text-center">
          <a href="https://business.rald.cloud" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors">
            Launch Loop Business <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── /developers ───────────────────────────────────────────────────────────────
function DevelopersPage() {
  return (
    <PageWrapper title="Developers" subtitle="Build on RALD's identity, messaging, and payment infrastructure." badge="Platform">
      <div className="space-y-8">
        <p className="text-lg text-gray-300 leading-relaxed">
          RALD provides developer APIs for authentication (SSO), messaging, payments, voice, and logistics. Build apps that inherit RALD's identity layer — your users never need to register separately.
        </p>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">API Overview</h2>
          <div className="rounded-2xl border border-gray-800 overflow-hidden font-mono text-sm">
            {[
              { method: "GET",  path: "/auth/me",            desc: "Get authenticated user profile" },
              { method: "POST", path: "/auth/login",         desc: "Password authentication" },
              { method: "POST", path: "/auth/send-otp",      desc: "Send SMS OTP (Termii)" },
              { method: "POST", path: "/auth/verify-otp",    desc: "Verify SMS OTP" },
              { method: "POST", path: "/sso/exchange",       desc: "Exchange token for product SSO" },
              { method: "GET",  path: "/profiles/me",        desc: "Full profile card" },
              { method: "GET",  path: "/profiles/apps",      desc: "Ecosystem app launcher" },
              { method: "GET",  path: "/profiles/audit-logs",desc: "Security audit trail" },
              { method: "GET",  path: "/verify/status",      desc: "Verification status" },
              { method: "POST", path: "/verify/apply",       desc: "Submit verification application" },
              { method: "GET",  path: "/roles/me",           desc: "Current user role + capabilities" },
              { method: "GET",  path: "/privacy/export",     desc: "Export all user data (GDPR)" },
            ].map((endpoint, i, arr) => (
              <div key={i} className={`flex items-center gap-4 px-5 py-3 ${i !== arr.length - 1 ? "border-b border-gray-800" : ""}`}>
                <span className={`w-14 shrink-0 text-xs font-bold ${endpoint.method === "GET" ? "text-blue-400" : "text-emerald-400"}`}>
                  {endpoint.method}
                </span>
                <span className="text-gray-200 flex-1">{endpoint.path}</span>
                <span className="text-gray-600 text-xs hidden sm:block">{endpoint.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {[
            { title: "Base URL", content: "https://auth.rald.cloud", type: "code" },
            { title: "Authentication", content: "Bearer token in Authorization header. Get a token via POST /auth/login or POST /sso/exchange.", type: "text" },
          ].map((item) => (
            <InfoCard key={item.title} icon={<Code2 className="h-5 w-5" />} title={item.title}>
              {item.type === "code"
                ? <code className="block bg-gray-800 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">{item.content}</code>
                : <p className="text-sm text-gray-400 leading-relaxed">{item.content}</p>
              }
            </InfoCard>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white">SDKs</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { name: "@rald/sdk-react",         status: "live",  desc: "React hooks + components" },
              { name: "@rald/sdk-nextjs",         status: "live",  desc: "Next.js middleware + server" },
              { name: "@rald/sdk-react-native",   status: "soon",  desc: "Expo + React Native" },
              { name: "@rald/sdk-auth",            status: "live",  desc: "Core auth utilities" },
              { name: "@rald/sdk-payments",        status: "soon",  desc: "PayRald integration" },
              { name: "@rald/sdk-messaging",       status: "soon",  desc: "Messenger integration" },
            ].map((sdk) => (
              <div key={sdk.name} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <code className="text-xs text-emerald-400 font-mono">{sdk.name}</code>
                  <StatusBadge status={sdk.status as "live" | "soon" | "planned"} />
                </div>
                <p className="text-xs text-gray-500">{sdk.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-bold text-white mb-3">Developer access</h2>
          <p className="text-gray-400 leading-relaxed mb-4">
            API access is in private beta. Join the waitlist to get early access to the RALD Developer Platform, API keys, and sandbox environment.
          </p>
          <a href="mailto:developers@rald.cloud"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-800 border border-gray-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
            <Mail className="h-4 w-4 text-blue-400" /> developers@rald.cloud
          </a>
        </div>
      </div>
    </PageWrapper>
  );
}

// ── Home page ─────────────────────────────────────────────────────────────────
function HomePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16 space-y-16">
      <header className="space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Trust-first. African-first. Audio-first.
        </div>
        <h1 className="text-5xl font-black tracking-tight text-white lg:text-6xl">
          RALD<br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">Knowledge</span>
        </h1>
        <p className="max-w-2xl text-xl text-gray-400 leading-relaxed">
          Understand every product in the RALD ecosystem. What it is, why it exists, how it works, how your data is handled, and what's coming next.
        </p>
        <div className="flex gap-3 flex-wrap">
          <Link href="/products">
            <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 transition-colors cursor-pointer">
              Browse products <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
          <Link href="/security">
            <div className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors cursor-pointer">
              <Shield className="h-4 w-4 text-emerald-400" /> Security
            </div>
          </Link>
        </div>
      </header>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Products</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.entries(PRODUCTS) as [ProductKey, typeof PRODUCTS[ProductKey]][]).map(([key, p]) => (
            <Link key={key} href={`/products/${key}`}>
              <div className="group rounded-2xl border border-gray-800 bg-gray-900/50 p-4 hover:border-emerald-500/30 transition-all cursor-pointer">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${p.color} text-white`}>
                  {p.icon}
                </div>
                <div className="font-semibold text-sm text-white group-hover:text-emerald-400 transition-colors">{p.name}</div>
                <div className="mt-1 text-xs text-gray-500 leading-snug">{p.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6">Learn more</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { href: "/security",     label: "Security",     desc: "How we protect your data",      icon: <Shield className="h-5 w-5 text-emerald-400" /> },
            { href: "/privacy",      label: "Privacy",      desc: "What we collect and why",       icon: <Lock className="h-5 w-5 text-blue-400" /> },
            { href: "/verification", label: "Verification", desc: "Getting verified on RALD",      icon: <CheckCircle2 className="h-5 w-5 text-amber-400" /> },
            { href: "/ai",           label: "AI",           desc: "How AI works across RALD",      icon: <Sparkles className="h-5 w-5 text-violet-400" /> },
            { href: "/business",     label: "Business",     desc: "Tools for Nigerian businesses", icon: <Briefcase className="h-5 w-5 text-teal-400" /> },
            { href: "/developers",   label: "Developers",   desc: "Build on RALD's APIs",          icon: <Code2 className="h-5 w-5 text-cyan-400" /> },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="group flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-900/50 p-4 hover:border-gray-700 transition-all cursor-pointer">
                {item.icon}
                <div>
                  <div className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.desc}</div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-gray-700 group-hover:text-gray-400 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── App shell ─────────────────────────────────────────────────────────────────
export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  const [search, setSearch] = useState("");

  useEffect(() => { setSidebarOpen(false); }, [location]);
  useEffect(() => { window.scrollTo(0, 0); }, [location]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex h-14 items-center border-b border-gray-800 bg-gray-950/95 px-4 backdrop-blur-xl lg:hidden">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 rounded-lg p-1.5 text-gray-400 hover:text-white">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        <Link href="/"><span className="font-bold text-white">RALD Learn</span></Link>
        <div className="ml-auto">
          <a href="https://profiles.rald.cloud" target="_blank" rel="noopener noreferrer"
            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black">
            Sign in
          </a>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-gray-800 bg-gray-950 p-5 lg:flex overflow-y-auto">
          <Sidebar />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
            <aside className="absolute left-0 top-0 bottom-0 w-72 border-r border-gray-800 bg-gray-950 p-5 overflow-y-auto">
              <Sidebar mobile onClose={() => setSidebarOpen(false)} />
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Search bar (desktop) */}
          <div className="hidden lg:flex border-b border-gray-800 px-8 py-3 items-center gap-3">
            <Search className="h-4 w-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documentation…"
              className="flex-1 bg-transparent text-sm text-gray-300 placeholder:text-gray-600 outline-none"
            />
            <kbd className="rounded border border-gray-700 bg-gray-800 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">⌘K</kbd>
          </div>

          <Switch>
            <Route path="/"                       component={HomePage}           />
            <Route path="/products"               component={ProductsIndex}      />
            <Route path="/products/profiles"      component={() => <ProductPage productKey="profiles"  />} />
            <Route path="/products/app"           component={() => <ProductPage productKey="app"       />} />
            <Route path="/products/loop"          component={() => <ProductPage productKey="loop"      />} />
            <Route path="/products/messenger"     component={() => <ProductPage productKey="messenger" />} />
            <Route path="/products/manilla"       component={() => <ProductPage productKey="manilla"   />} />
            <Route path="/products/voice"         component={() => <ProductPage productKey="voice"     />} />
            <Route path="/products/mail"          component={() => <ProductPage productKey="mail"      />} />
            <Route path="/products/dunarald"      component={() => <ProductPage productKey="dunarald"  />} />
            <Route path="/security"               component={SecurityPage}       />
            <Route path="/privacy"                component={PrivacyPage}        />
            <Route path="/verification"           component={VerificationPage}   />
            <Route path="/ai"                     component={AIPage}             />
            <Route path="/business"               component={BusinessPage}       />
            <Route path="/developers"             component={DevelopersPage}     />
            <Route>
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
                <div className="text-6xl mb-6">📚</div>
                <h1 className="text-2xl font-bold text-white mb-3">Page not found</h1>
                <p className="text-gray-400 mb-6">This page doesn't exist yet.</p>
                <Link href="/"><div className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black cursor-pointer">Go home</div></Link>
              </div>
            </Route>
          </Switch>
        </main>
      </div>
    </div>
  );
}
