// RALD Ecosystem — Comprehensive Email Service
// Powered by Resend. Enterprise-branded for all RALD products.
// Owner: LILCKY STUDIO LIMITED

const RESEND_API = "https://api.resend.com/emails";
const FROM_RALD = "RALD <noreply@rald.cloud>";
const FROM_PAYRALD = "PayRald <payments@rald.cloud>";
const FROM_LOOP = "Loop <hello@rald.cloud>";
const FROM_IDENTITY = "RALD Identity <auth@rald.cloud>";

const COLORS: Record<string, string> = {
  rald: "#2ECFA3", payrald: "#0066FF", loop: "#22C55E", "loop-business": "#FF6A00",
  raldtics: "#FFD400", dispatch: "#3B82F6", voice: "#FF4FAD", dunarald: "#A855F7",
  messenger: "#FF7A00", identity: "#00E5FF", gitrald: "#EF4444", sdk: "#FBBF24",
};

function raldLogo(productColor: string, productLabel: string): string {
  // Inline SVG logo — works in all email clients without image blocking
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
      <tr>
        <td valign="middle">
          <!-- RALD wordmark SVG inline -->
          <svg width="72" height="28" viewBox="0 0 72 28" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
            <text x="0" y="22" font-family="-apple-system,BlinkMacSystemFont,Arial,sans-serif" font-weight="900" font-size="24" fill="#FFFFFF" letter-spacing="-1">RALD</text>
          </svg>
        </td>
        <td valign="middle" style="padding-left:10px;">
          <span style="display:inline-block;background:${productColor}22;border:1px solid ${productColor}44;color:${productColor};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 8px;border-radius:20px;font-family:-apple-system,Arial,sans-serif;">${productLabel}</span>
        </td>
      </tr>
    </table>
  `;
}

function wrap(productColor: string, productLabel: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RALD</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:#040C18;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#040C18;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#070E1A;border-radius:16px;overflow:hidden;border:1px solid #1E3A5F;">
      
      <!-- HEADER with logo -->
      <tr>
        <td style="background:linear-gradient(135deg,#070E1A 0%,#0D1929 100%);padding:28px 40px 24px;border-bottom:1px solid #1E3A5F;">
          ${raldLogo(productColor, productLabel)}
        </td>
      </tr>
      
      <!-- BODY -->
      <tr>
        <td style="padding:32px 40px;color:#F0F4F8;font-size:15px;line-height:1.7;">
          ${body}
        </td>
      </tr>
      
      <!-- FOOTER -->
      <tr>
        <td style="padding:20px 40px 28px;border-top:1px solid #1E3A5F;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="text-align:center;">
                <p style="color:#374151;font-size:11px;line-height:1.7;margin:0 0 8px;">
                  This email was sent by <strong style="color:#475569;">LILCKY STUDIO LIMITED</strong>, operators of RALD.cloud.<br>
                  RALD never asks for your password or financial details via email.
                </p>
                <p style="color:#374151;font-size:11px;margin:0;">
                  <a href="https://rald.cloud/privacy" style="color:#2ECFA3;text-decoration:none;">Privacy Policy</a>
                  &nbsp;·&nbsp;
                  <a href="https://rald.cloud/terms" style="color:#2ECFA3;text-decoration:none;">Terms of Service</a>
                  &nbsp;·&nbsp;
                  <a href="mailto:support@rald.cloud" style="color:#2ECFA3;text-decoration:none;">support@rald.cloud</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      
    </table>
  </td></tr>
</table>
</body></html>`;
}

function card(content: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0D1929;border:1px solid #1E3A5F;border-radius:12px;margin:16px 0;"><tr><td style="padding:24px;">${content}</td></tr></table>`;
}

function btn(text: string, url: string, color = "#2ECFA3"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0;"><tr><td style="border-radius:8px;background:${color};"><a href="${url}" style="display:inline-block;background:${color};color:#070E1A;font-weight:700;font-size:14px;padding:14px 28px;border-radius:8px;text-decoration:none;letter-spacing:0.02em;">${text}</a></td></tr></table>`;
}

function h1(text: string, color = "#F0F4F8"): string {
  return `<h2 style="font-size:22px;font-weight:800;margin:0 0 12px;color:${color};font-family:-apple-system,Arial,sans-serif;">${text}</h2>`;
}

function p(text: string, style = "color:#94A3B8;"): string {
  return `<p style="margin:0 0 16px;${style}">${text}</p>`;
}

function stat(value: string, label: string, color: string): string {
  return `<div style="text-align:center;"><div style="font-size:36px;font-weight:900;color:#F0F4F8;">${value}</div><div style="color:${color};font-size:13px;margin-top:4px;">${label}</div></div>`;
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

// ── Welcome email ──────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, name: string, apiKey: string): Promise<void> {
  const color = COLORS.rald;
  const html = wrap(color, "RALD.cloud", `
    ${h1(`Welcome to RALD, ${name}! 🎉`)}
    ${p("You now have full access to Africa's complete digital commerce ecosystem.")}
    ${card(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${[
          ["💚", "Loop", "Social commerce for African buyers &amp; sellers"],
          ["💰", "PayRald", "Digital payments, wallets &amp; settlements"],
          ["📊", "Raldtics", "Real-time analytics &amp; business intelligence"],
          ["🎬", "DunaRald", "Entertainment, streaming &amp; digital content"],
          ["🚚", "Loop Dispatch", "Last-mile delivery &amp; logistics"],
          ["💬", "Loop Messenger", "Business communications platform"],
        ].map(([icon, prod, desc]) =>
          `<tr><td style="padding:8px 0;vertical-align:top;width:32px;font-size:20px;">${icon}</td>
          <td style="padding:8px 0;"><strong style="color:#F0F4F8;font-size:14px;">${prod}</strong><br><span style="color:#64748B;font-size:12px;">${desc}</span></td></tr>`
        ).join("")}
      </table>
    `)}
    <div style="text-align:center;margin:24px 0;">
      ${btn("Explore RALD", "https://rald.cloud", color)}
    </div>
    ${p(`<a href="mailto:support@rald.cloud" style="color:${color};">support@rald.cloud</a> · We're here if you need us.`, "color:#475569;font-size:13px;")}
  `);
  await send(apiKey, FROM_RALD, to, `Welcome to RALD, ${name}!`, html);
}

// ── Waitlist confirmation ──────────────────────────────────────────────────
export async function sendWaitlistConfirmation(to: string, name: string, product: string, apiKey: string): Promise<void> {
  const color = COLORS[product] ?? COLORS.rald;
  const html = wrap(color, product.toUpperCase(), `
    ${h1(`You're on the list, ${name}! ✨`, color)}
    ${p(`We've added you to the <strong style="color:#F0F4F8;">${product}</strong> early access waitlist. You'll be among the first to know when we launch.`)}
    ${card(`<div style="text-align:center;"><div style="font-size:32px;margin-bottom:12px;">🚀</div><p style="color:#64748B;font-size:14px;margin:0;">Your spot is secured. We'll email you the moment access is ready.</p></div>`)}
    ${p("Share RALD with friends to move up the list faster.", "color:#475569;font-size:13px;")}
    <div style="text-align:center;margin:16px 0;">
      ${btn("Share RALD", "https://rald.cloud/referral", color)}
    </div>
  `);
  await send(apiKey, FROM_RALD, to, `You're on the ${product} waitlist!`, html);
}

// ── Waitlist approved → account created ───────────────────────────────────
export async function sendWaitlistApprovedEmail(to: string, name: string, tempPassword: string, apiKey: string): Promise<void> {
  const color = COLORS.rald;
  const html = wrap(color, "RALD.cloud", `
    ${h1("Your RALD account is ready! 🎯")}
    ${p(`Great news, ${name}! We've upgraded your waitlist spot to a full RALD account.`)}
    ${card(`
      <p style="color:#64748B;font-size:13px;margin:0 0 12px;">Your login credentials:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td style="color:#94A3B8;font-size:14px;width:180px;">Email:</td><td style="color:#F0F4F8;font-size:14px;">${to}</td></tr>
        <tr><td style="color:#94A3B8;font-size:14px;padding-top:6px;">Temporary Password:</td><td style="padding-top:6px;"><code style="color:${color};background:#0D1929;padding:2px 8px;border-radius:4px;font-family:monospace;font-size:13px;">${tempPassword}</code></td></tr>
      </table>
      <p style="color:#EF4444;font-size:12px;margin:12px 0 0;">⚠️ Change your password immediately after your first login.</p>
    `)}
    <div style="text-align:center;margin:24px 0;">
      ${btn("Sign In to RALD", "https://app.rald.cloud", color)}
    </div>
  `);
  await send(apiKey, FROM_RALD, to, "Your RALD account is ready!", html);
}

// ── PayRald: payment received ─────────────────────────────────────────────
export async function sendPaymentReceivedEmail(to: string, name: string, amount: string, currency: string, from: string, ref: string, apiKey: string): Promise<void> {
  const color = COLORS.payrald;
  const html = wrap(color, "PayRald", `
    ${h1("Payment received ✅", "#22C55E")}
    ${p(`Hi ${name}, you've received a payment.`)}
    ${card(`
      ${stat(`${currency}${amount}`, `from ${from}`, color)}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;border-top:1px solid #1E3A5F;padding-top:12px;">
        <tr><td style="color:#64748B;font-size:13px;">Reference</td><td style="color:#94A3B8;font-size:13px;font-family:monospace;text-align:right;">${ref}</td></tr>
        <tr><td style="color:#64748B;font-size:13px;padding-top:4px;">Status</td><td style="color:#22C55E;font-size:13px;text-align:right;padding-top:4px;">Delivered ✓</td></tr>
      </table>
    `)}
    <div style="text-align:center;margin:16px 0;">${btn("View in PayRald", "https://payrald.rald.cloud", color)}</div>
  `);
  await send(apiKey, FROM_PAYRALD, to, `You received ${currency}${amount}`, html);
}

// ── PayRald: payment sent ─────────────────────────────────────────────────
export async function sendPaymentSentEmail(to: string, name: string, amount: string, currency: string, toName: string, ref: string, apiKey: string): Promise<void> {
  const color = COLORS.payrald;
  const html = wrap(color, "PayRald", `
    ${h1("Payment sent ↗")}
    ${p(`Hi ${name}, your payment to <strong style="color:#F0F4F8;">${toName}</strong> has been processed.`)}
    ${card(`
      ${stat(`${currency}${amount}`, `to ${toName}`, "#64748B")}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:16px;border-top:1px solid #1E3A5F;padding-top:12px;">
        <tr><td style="color:#64748B;font-size:13px;">Reference</td><td style="color:#94A3B8;font-size:13px;font-family:monospace;text-align:right;">${ref}</td></tr>
        <tr><td style="color:#64748B;font-size:13px;padding-top:4px;">Status</td><td style="color:#22C55E;font-size:13px;text-align:right;padding-top:4px;">Confirmed ✓</td></tr>
      </table>
    `)}
    <div style="text-align:center;margin:16px 0;">${btn("View Transaction", "https://payrald.rald.cloud", color)}</div>
  `);
  await send(apiKey, FROM_PAYRALD, to, `Payment of ${currency}${amount} sent to ${toName}`, html);
}

// ── Loop: order confirmed ─────────────────────────────────────────────────
export async function sendOrderConfirmedEmail(to: string, name: string, orderId: string, items: string[], total: string, apiKey: string): Promise<void> {
  const color = COLORS.loop;
  const html = wrap(color, "Loop", `
    ${h1("Order confirmed! 📦", color)}
    ${p(`Hi ${name}, your Loop order is confirmed and being processed by the merchant.`)}
    ${card(`
      <p style="font-size:13px;color:#64748B;margin:0 0 12px;">Order <code style="color:${color};font-family:monospace;">#${orderId}</code></p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        ${items.map(i => `<tr><td style="color:#94A3B8;font-size:14px;padding:5px 0;border-bottom:1px solid #1E3A5F;">• ${i}</td></tr>`).join("")}
        <tr><td style="padding-top:12px;"><strong style="color:#F0F4F8;font-size:15px;">Total: <span style="color:${color};">${total}</span></strong></td></tr>
      </table>
    `)}
    <div style="text-align:center;margin:16px 0;">${btn("Track Order", "https://loop.rald.cloud", color)}</div>
  `);
  await send(apiKey, FROM_LOOP, to, `Order #${orderId} confirmed!`, html);
}

// ── Security alert ────────────────────────────────────────────────────────
export async function sendSecurityAlertEmail(to: string, name: string, event: string, ip: string, userAgent: string, apiKey: string): Promise<void> {
  const color = "#EF4444";
  const html = wrap(color, "Security Alert", `
    ${h1("Security alert on your account ⚠️", color)}
    ${p(`Hi ${name}, we detected a security event that requires your attention.`)}
    ${card(`
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="color:#64748B;font-size:13px;padding:6px 0;width:140px;border-bottom:1px solid #1E3A5F;">Event</td><td style="color:#F0F4F8;font-size:13px;padding:6px 0;border-bottom:1px solid #1E3A5F;">${event}</td></tr>
        <tr><td style="color:#64748B;font-size:13px;padding:6px 0;border-bottom:1px solid #1E3A5F;">IP Address</td><td style="color:#F0F4F8;font-size:13px;padding:6px 0;border-bottom:1px solid #1E3A5F;font-family:monospace;">${ip}</td></tr>
        <tr><td style="color:#64748B;font-size:13px;padding:6px 0;">Device</td><td style="color:#94A3B8;font-size:12px;padding:6px 0;">${userAgent.slice(0,50)}</td></tr>
      </table>
    `)}
    ${p(`If this wasn't you, <a href="https://app.rald.cloud" style="color:${color};font-weight:700;">secure your account immediately</a> by changing your password.`, `color:#F0F4F8;`)}
  `);
  await send(apiKey, FROM_IDENTITY, to, "Security alert on your RALD account", html);
}

// ── DunaRald: subscription activated ─────────────────────────────────────
export async function sendSubscriptionEmail(to: string, name: string, plan: string, validUntil: string, apiKey: string): Promise<void> {
  const color = COLORS.dunarald;
  const html = wrap(color, "DunaRald", `
    ${h1("Subscription activated 🎬", color)}
    ${p(`Hi ${name}, your DunaRald subscription is now active and ready to use.`)}
    ${card(`<div style="text-align:center;"><div style="font-size:36px;margin-bottom:12px;">🎉</div><div style="font-size:20px;font-weight:700;color:${color};">${plan} Plan</div><div style="color:#64748B;font-size:13px;margin-top:8px;">Valid until ${validUntil}</div></div>`)}
    <div style="text-align:center;margin:20px 0;">${btn("Start Watching", "https://dunarald.rald.cloud", color)}</div>
  `);
  await send(apiKey, FROM_RALD, to, `Your DunaRald ${plan} subscription is active!`, html);
}

// ── OTP / Verification code ───────────────────────────────────────────────
export async function sendOtpEmail(to: string, name: string, code: string, expiresInMins: number, apiKey: string): Promise<void> {
  const color = COLORS.identity;
  const html = wrap(color, "RALD Identity", `
    ${h1("Verification code", color)}
    ${p(`Hi ${name}, here is your one-time verification code:`)}
    ${card(`<div style="text-align:center;"><div style="font-size:42px;font-weight:900;letter-spacing:12px;color:${color};font-family:monospace;">${code}</div><p style="color:#64748B;font-size:12px;margin:12px 0 0;">Expires in ${expiresInMins} minutes · Do not share this code</p></div>`)}
    ${p("If you didn't request this code, ignore this email — your account is safe.", "color:#475569;font-size:13px;")}
  `);
  await send(apiKey, FROM_IDENTITY, to, "Your RALD verification code", html);
}