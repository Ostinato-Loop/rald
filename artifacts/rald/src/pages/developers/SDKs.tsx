import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SDKS = [
  {
    lang: "TypeScript / Node.js",
    badge: "TS",
    color: "bg-blue-500",
    install: "npm install @rald/node",
    snippet: `import { RALD } from '@rald/node';

const rald = new RALD({
  clientId: process.env.RALD_CLIENT_ID,
  secret: process.env.RALD_SECRET,
});

// Verify a session token
const session = await rald.sessions.verify(token);

// Send OTP
await rald.otp.send({ phone: '+2348012345678' });

// Verify OTP
const result = await rald.otp.verify({ phone, otp });`,
  },
  {
    lang: "Python",
    badge: "PY",
    color: "bg-yellow-500",
    install: "pip install rald-python",
    snippet: `from rald import RALD

client = RALD(
    client_id=os.getenv("RALD_CLIENT_ID"),
    secret=os.getenv("RALD_SECRET")
)

# Verify session
session = client.sessions.verify(token)

# Send OTP
client.otp.send(phone="+2348012345678")`,
  },
  {
    lang: "Go",
    badge: "GO",
    color: "bg-cyan-500",
    install: "go get github.com/ostinato-loop/rald-go",
    snippet: `import "github.com/ostinato-loop/rald-go"

client := rald.New(rald.Config{
    ClientID: os.Getenv("RALD_CLIENT_ID"),
    Secret:   os.Getenv("RALD_SECRET"),
})

session, err := client.Sessions.Verify(token)`,
  },
  {
    lang: "Dart / Flutter",
    badge: "DA",
    color: "bg-indigo-500",
    install: "flutter pub add rald_dart",
    snippet: `import 'package:rald_dart/rald_dart.dart';

final rald = RALD(
  clientId: const String.fromEnvironment('RALD_CLIENT_ID'),
  secret: const String.fromEnvironment('RALD_SECRET'),
);

final session = await rald.sessions.verify(token);`,
  },
];

export default function SDKs() {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">SDKs & Libraries</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Official client libraries for the RALD API</p>
      </div>

      <div className="space-y-6">
        {SDKS.map(sdk => (
          <div key={sdk.lang} className="bg-card border border-border rounded-xl overflow-hidden" data-testid={`sdk-${sdk.lang.toLowerCase().split(/\s/)[0]}`}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 ${sdk.color} rounded-lg flex items-center justify-center text-white text-xs font-bold`}>{sdk.badge}</div>
                <span className="font-semibold text-foreground">{sdk.lang}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{sdk.install}</code>
                <button
                  onClick={() => copy(sdk.install, `install-${sdk.lang}`)}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded transition-colors"
                  data-testid={`copy-install-${sdk.lang.toLowerCase().split(/\s/)[0]}`}
                >
                  {copied === `install-${sdk.lang}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="relative">
              <pre className="text-xs font-mono text-foreground p-5 overflow-x-auto leading-relaxed bg-muted/30">
                <code>{sdk.snippet}</code>
              </pre>
              <button
                onClick={() => copy(sdk.snippet, `snippet-${sdk.lang}`)}
                className="absolute top-3 right-3 p-1.5 bg-card border border-border rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                {copied === `snippet-${sdk.lang}` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
