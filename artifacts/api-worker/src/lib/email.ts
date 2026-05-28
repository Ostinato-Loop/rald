// RALD Ecosystem — Comprehensive Email Service
// Powered by Resend. Branded for all RALD products.
// Owner: LILCKY STUDIO LIMITED

const RESEND_API = "https://api.resend.com/emails";
const FROM_RALD = "RALD <noreply@rald.cloud>";
const FROM_PAYRALD = "PayRald <payments@rald.cloud>";
const FROM_LOOP = "Loop <hello@rald.cloud>";
const FROM_IDENTITY = "RALD Identity <auth@rald.cloud>";

const COLORS = {
  rald: "#2ECFA3",
  payrald: "#1A3A8F",
  loop: "#22C55E",
  raldtics: "#EAB308",
  dispatch: "#3B82F6",
  voice: "#8B5CF6",
  dunarald: "#A855F7",
  messenger: "#F97316",
};

function card(content: string): string {
  return `<div style="background:#0D1929;border:1px solid #1E3A5F;border-radius:12px;padding:28px;margin:24px 0;">${content}</div>`;
}

function btn(text: string, url: string, color = "#2ECFA3"): string {
  return `<a href="${url}" style="display:inline-block;background:${color};color:#070E1A;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">${text}</a>`;
}

function wrap(productColor: string, productLabel: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>RALD</title></head>
<body style="margin:0;padding:0;background:#040C18;">
<div style="max-width:600px;margin:0 auto;background:#070E1A;border-radius:16px;overflow:hidden;border:1px solid #1E3A5F;">
  <div style="background:linear-gradient(135deg,#070E1A 0%,#0D1929 100%);padding:32px 40px 24px;border-bottom:1px solid #1E3A5F;">
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:26px;font-weight:900;letter-spacing:-1px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;">RALD</span>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;color:${productColor};text-transform:uppercase;background:${productColor}22;padding:4px 10px;border-radius:20px;border:1px solid ${productColor}44;">${productLabel}</span>
    </div>
  </div>
  <div style="padding:32px 40px;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:#F0F4F8;font-size:15px;line-height:1.7;">
    ${body}
  </div>
  <div style="padding:20px 40px 28px;border-top:1px solid #1E3A5F;">
    <p style="color:#374151;font-size:11px;line-height:1.7;margin:0;text-align:center;">
      This email was sent by <strong style="color:#475569;">LILCKY STUDIO LIMITED</strong>, operators of RALD.cloud.<br>
      RALD does not ask for passwords or financial details via email. <a href="https://rald.cloud/privacy" style="color:#64748B;">Privacy Policy</a> · <a href="https://rald.cloud/terms" style="color:#64748B;">Terms</a>
    </p>
  </div>
</div>
</body></html>`;
}

async function send(apiKey: string, from: string, to: string, subject: string, html: string): Promise<void> {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const err = await res.json() as { message?: string };
    throw new Error(err.message ?? `Resend error ${res.status}`);
  }
}

// ── Welcome email ─────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.rald, "RALD.cloud", `
    <h2 style="font-size:22px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Welcome to RALD, ${name} 🎉</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">You now have access to the complete African digital commerce ecosystem. Here's what's waiting for you:</p>
    ${card(`
      <div style="display:grid;gap:12px;">
        ${[
          ["💚 Loop", "Social commerce for African buyers & sellers"],
          ["💰 PayRald", "Digital payments, wallets & settlements"],
          ["📊 Raldtics", "Real-time analytics & business intelligence"],
          ["🎬 DunaRald", "Entertainment, streaming & digital content"],
          ["🚚 Loop Dispatch", "Last-mile delivery & logistics"],
          ["💬 Loop Messenger", "Business communications platform"],
        ].map(([p, d]) => `<div style="display:flex;gap:12px;align-items:flex-start;"><span style="font-size:18px;">${p.split(" ")[0]}</span><div><div style="font-weight:600;color:#F0F4F8;font-size:14px;">${p.slice(3)}</div><div style="color:#64748B;font-size:13px;">${d}</div></div></div>`).join("")}
      </div>
    `)}
    <p style="text-align:center;margin:28px 0 8px;">${btn("Explore RALD", "https://rald.cloud", COLORS.rald)}</p>
    <p style="color:#475569;font-size:13px;margin-top:24px;">Need help? Email us at <a href="mailto:support@rald.cloud" style="color:#2ECFA3;">support@rald.cloud</a></p>
  `);
  await send(apiKey, FROM_RALD, to, `Welcome to RALD, ${name}!`, html);
}

// ── Waitlist confirmation ──────────────────────────────────────────────────────
export async function sendWaitlistConfirmation(to: string, name: string, product: string, apiKey: string): Promise<void> {
  const productColor = COLORS[product as keyof typeof COLORS] ?? COLORS.rald;
  const html = wrap(productColor, product.toUpperCase(), `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">You're on the list, ${name}! ✨</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">We've added you to the <strong style="color:#F0F4F8;">${product}</strong> early access list. You'll be among the first to get access.</p>
    ${card(`<p style="margin:0;text-align:center;color:#64748B;font-size:14px;">Your spot is secured. We'll email you as soon as access is ready.<br><span style="font-size:28px;display:block;margin-top:12px;">🚀</span></p>`)}
    <p style="color:#475569;font-size:13px;margin-top:24px;">Know someone who should join? Share RALD with your network.</p>
  `);
  await send(apiKey, FROM_RALD, to, `You're on the ${product} waitlist!`, html);
}

// ── Account created from waitlist ─────────────────────────────────────────────
export async function sendWaitlistApprovedEmail(to: string, name: string, tempPassword: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.rald, "RALD.cloud", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Your RALD account is ready! 🎯</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Great news, ${name}! We've upgraded your waitlist spot to a full RALD account.</p>
    ${card(`
      <p style="color:#64748B;font-size:13px;margin:0 0 12px;">Your login credentials:</p>
      <p style="margin:0 0 6px;font-size:14px;"><strong style="color:#94A3B8;">Email:</strong> <span style="color:#F0F4F8;">${to}</span></p>
      <p style="margin:0;font-size:14px;"><strong style="color:#94A3B8;">Temporary Password:</strong> <code style="color:#2ECFA3;background:#0D1929;padding:2px 8px;border-radius:4px;font-family:monospace;">${tempPassword}</code></p>
      <p style="color:#EF4444;font-size:12px;margin:12px 0 0;">⚠️ Change your password immediately after first login.</p>
    `)}
    <p style="text-align:center;margin:28px 0 8px;">${btn("Sign In to RALD", "https://app.rald.cloud", COLORS.rald)}</p>
  `);
  await send(apiKey, FROM_RALD, to, "Your RALD account is ready!", html);
}

// ── PayRald: payment received ─────────────────────────────────────────────────
export async function sendPaymentReceivedEmail(to: string, name: string, amount: string, currency: string, from: string, ref: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.payrald, "PayRald", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Payment received ✅</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Hi ${name}, you've received a payment.</p>
    ${card(`
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:36px;font-weight:900;color:#F0F4F8;">${currency}${amount}</div>
        <div style="color:#64748B;font-size:13px;margin-top:4px;">from ${from}</div>
      </div>
      <div style="border-top:1px solid #1E3A5F;padding-top:16px;font-size:13px;color:#64748B;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Reference</span><span style="color:#94A3B8;font-family:monospace;">${ref}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Time</span><span style="color:#94A3B8;">${new Date().toUTCString()}</span></div>
      </div>
    `)}
    <p style="text-align:center;margin:20px 0 8px;">${btn("View in PayRald", "https://payrald.rald.cloud", COLORS.payrald)}</p>
  `);
  await send(apiKey, FROM_PAYRALD, to, `You received ${currency}${amount}`, html);
}

// ── PayRald: payment sent ─────────────────────────────────────────────────────
export async function sendPaymentSentEmail(to: string, name: string, amount: string, currency: string, toName: string, ref: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.payrald, "PayRald", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Payment sent ↗</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Hi ${name}, your payment has been processed.</p>
    ${card(`
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:36px;font-weight:900;color:#F0F4F8;">${currency}${amount}</div>
        <div style="color:#64748B;font-size:13px;margin-top:4px;">to ${toName}</div>
      </div>
      <div style="border-top:1px solid #1E3A5F;padding-top:16px;font-size:13px;color:#64748B;">
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Reference</span><span style="color:#94A3B8;font-family:monospace;">${ref}</span></div>
        <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Status</span><span style="color:#22C55E;">Delivered</span></div>
      </div>
    `)}
    <p style="text-align:center;margin:20px 0 8px;">${btn("View Transaction", "https://payrald.rald.cloud", COLORS.payrald)}</p>
  `);
  await send(apiKey, FROM_PAYRALD, to, `Payment of ${currency}${amount} sent`, html);
}

// ── Loop: order confirmed ─────────────────────────────────────────────────────
export async function sendOrderConfirmedEmail(to: string, name: string, orderId: string, items: string[], total: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.loop, "Loop", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Order confirmed! 📦</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Hi ${name}, your Loop order is confirmed and being processed.</p>
    ${card(`
      <p style="font-size:13px;color:#64748B;margin:0 0 12px;">Order <code style="color:#22C55E;font-family:monospace;">#${orderId}</code></p>
      ${items.map(i => `<div style="padding:6px 0;border-bottom:1px solid #1E3A5F;color:#94A3B8;font-size:14px;">• ${i}</div>`).join("")}
      <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-weight:700;font-size:15px;"><span style="color:#F0F4F8;">Total</span><span style="color:#22C55E;">${total}</span></div>
    `)}
    <p style="text-align:center;margin:20px 0 8px;">${btn("Track Order", "https://loop.rald.cloud", COLORS.loop)}</p>
  `);
  await send(apiKey, FROM_LOOP, to, `Order #${orderId} confirmed!`, html);
}

// ── Security alert ────────────────────────────────────────────────────────────
export async function sendSecurityAlertEmail(to: string, name: string, event: string, ip: string, userAgent: string, apiKey: string): Promise<void> {
  const html = wrap("#EF4444", "Security", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#EF4444;">Security alert ⚠️</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Hi ${name}, we detected a security event on your account.</p>
    ${card(`
      <div style="font-size:14px;">
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1E3A5F;"><span style="color:#64748B;">Event</span><span style="color:#F0F4F8;">${event}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #1E3A5F;"><span style="color:#64748B;">IP Address</span><span style="color:#F0F4F8;font-family:monospace;">${ip}</span></div>
        <div style="display:flex;justify-content:space-between;padding:6px 0;"><span style="color:#64748B;">Device</span><span style="color:#F0F4F8;">${userAgent.slice(0,40)}</span></div>
      </div>
    `)}
    <p style="color:#EF4444;font-size:14px;margin:16px 0;">If this wasn't you, <a href="https://app.rald.cloud" style="color:#EF4444;font-weight:700;">secure your account immediately</a>.</p>
  `);
  await send(apiKey, FROM_IDENTITY, to, "Security alert on your RALD account", html);
}

// ── DunaRald: subscription activated ─────────────────────────────────────────
export async function sendSubscriptionEmail(to: string, name: string, plan: string, validUntil: string, apiKey: string): Promise<void> {
  const html = wrap(COLORS.dunarald, "DunaRald", `
    <h2 style="font-size:20px;font-weight:800;margin:0 0 8px;color:#F0F4F8;">Subscription activated 🎬</h2>
    <p style="color:#94A3B8;margin:0 0 24px;">Hi ${name}, your DunaRald subscription is active.</p>
    ${card(`
      <div style="text-align:center;">
        <div style="font-size:28px;margin-bottom:8px;">🎉</div>
        <div style="font-size:18px;font-weight:700;color:#A855F7;">${plan} Plan</div>
        <div style="color:#64748B;font-size:13px;margin-top:8px;">Valid until ${validUntil}</div>
      </div>
    `)}
    <p style="text-align:center;margin:20px 0 8px;">${btn("Start Watching", "https://dunarald.rald.cloud", COLORS.dunarald)}</p>
  `);
  await send(apiKey, FROM_RALD, to, `Your DunaRald ${plan} subscription is active!`, html);
}