/** Termii SMS OTP client — https://developers.termii.com */

const TERMII_BASE = "https://api.ng.termii.com/api";

export async function sendSMS(
  to: string,
  message: string,
  apiKey: string,
  senderId = "N-Alert",
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${TERMII_BASE}/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to,
        from: senderId,
        sms: message,
        type: "plain",
        api_key: apiKey,
        channel: "dnd",
      }),
    });
    const data = (await res.json()) as {
      message_id?: string;
      message?: string;
      code?: string;
    };
    if (!res.ok) {
      return { success: false, error: data.message ?? "termii_error" };
    }
    return { success: true, messageId: data.message_id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "network_error";
    return { success: false, error: msg };
  }
}

export async function sendOTPSMS(
  phone: string,
  otp: string,
  apiKey: string,
  senderId = "N-Alert",
): Promise<{ success: boolean; error?: string }> {
  const message = `Your RALD verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return sendSMS(phone, message, apiKey, senderId);
}
