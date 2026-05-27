export async function sendSmsOtp(
  phone: string,
  apiKey: string
): Promise<{ pinId: string }> {
  const res = await fetch("https://api.ng.termii.com/api/sms/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      message_type: "NUMERIC",
      to: phone,
      from: "RALD",
      channel: "dnd",
      pin_attempts: 3,
      pin_time_to_live: 10,
      pin_length: 6,
      pin_placeholder: "< 1234 >",
      message_text:
        "Your RALD verification code is < 1234 >. Valid for 10 minutes. Do not share. RALD by LILCKY STUDIO LIMITED.",
      pin_type: "NUMERIC",
    }),
  });
  const data = (await res.json()) as { pinId?: string; message?: string; smsStatus?: string };
  if (!data.pinId) {
    throw new Error(data.message ?? "Failed to send SMS OTP");
  }
  return { pinId: data.pinId };
}

export async function verifySmsOtp(
  pinId: string,
  pin: string,
  apiKey: string
): Promise<boolean> {
  const res = await fetch("https://api.ng.termii.com/api/sms/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, pin_id: pinId, pin }),
  });
  const data = (await res.json()) as { verified?: string | boolean };
  return data.verified === "True" || data.verified === true;
}

export function generateNumericOtp(length = 6): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b % 10)
    .join("");
}

export async function sendEmailOtp(
  to: string,
  code: string,
  apiKey: string
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "RALD Identity <auth@rald.cloud>",
      to: [to],
      subject: `RALD: Your verification code is ${code}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;background:#070E1A;color:#F0F4F8;padding:40px;border-radius:12px;">
          <div style="margin-bottom:28px;">
            <span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;">R</span><span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#2ECFA3;">A</span><span style="font-size:28px;font-weight:900;letter-spacing:-1px;color:#fff;">LD</span>
          </div>
          <h2 style="font-size:18px;font-weight:700;margin:0 0 8px;color:#F0F4F8;">Verify your email address</h2>
          <p style="color:#64748B;font-size:14px;margin:0 0 28px;line-height:1.6;">Enter the code below to verify your email and complete your RALD Identity setup. This code expires in 10 minutes.</p>
          <div style="background:#0D1929;border:1px solid #1E3A5F;border-radius:10px;padding:28px;text-align:center;margin:0 0 28px;">
            <span style="font-size:40px;font-weight:900;letter-spacing:0.2em;color:#F0F4F8;font-variant-numeric:tabular-nums;">${code}</span>
          </div>
          <p style="color:#374151;font-size:11px;line-height:1.6;margin:0;border-top:1px solid #1E3A5F;padding-top:20px;">
            RALD is owned and operated by <strong style="color:#475569;">LILCKY STUDIO LIMITED</strong>. Your data is never shared with third parties.
          </p>
        </div>
      `,
    }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? "Failed to send email OTP");
  }
}

export async function hashOtpCode(code: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(code)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyOtpCode(code: string, hash: string): Promise<boolean> {
  const computed = await hashOtpCode(code);
  return computed === hash;
}
