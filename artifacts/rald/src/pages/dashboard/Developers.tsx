import { Link } from "wouter";
import {
  Code2,
  Key,
  Webhook,
  BarChart3,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const QUICK_LINKS = [
  {
    icon: Code2,
    label: "My Applications",
    desc: "Manage OAuth apps and client credentials",
    href: "/developers/apps",
  },
  {
    icon: Key,
    label: "API Keys",
    desc: "Create and rotate developer API keys",
    href: "/developers/api-keys",
  },
  {
    icon: Webhook,
    label: "Webhooks",
    desc: "Configure event delivery endpoints",
    href: "/developers/webhooks",
  },
  {
    icon: BarChart3,
    label: "Usage & Analytics",
    desc: "Monitor API consumption and errors",
    href: "/developers/usage",
  },
  {
    icon: BookOpen,
    label: "SDK Downloads",
    desc: "Get client libraries for your platform",
    href: "/developers/sdks",
  },
];

export default function Developers() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Developer Tools</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Build with RALD — APIs, SDKs, webhooks, and more
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {QUICK_LINKS.map(({ icon: Icon, label, desc, href }) => (
          <Link key={href} href={href}>
            <div
              className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:bg-primary/5 transition-all cursor-pointer group"
              data-testid={`dev-link-${label.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div className="p-2.5 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-2">
        <p className="text-sm font-semibold text-foreground">Quick Start</p>
        <p className="text-xs text-muted-foreground">
          Integrate RALD authentication in minutes
        </p>
        <pre className="mt-3 text-xs font-mono text-foreground bg-card border border-border rounded-lg p-3 overflow-x-auto">
          {`npm install @rald/node

const rald = new RALD({
  clientId: 'cli_your_client_id',
  secret: 'your_api_key'
});

// Verify a RALD session token
const session = await rald.verify(token);`}
        </pre>
      </div>
    </div>
  );
}
