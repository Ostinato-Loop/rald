// RALD API Client — wraps the RALD Auth SDK for React components
// Use raldAuth (from rald-auth-sdk) directly in most cases.
// This file remains for backward compatibility with auth-context.tsx
export { raldAuth } from "./rald-auth-sdk";
export type { RaldUser as User, RaldSession as AuthToken, RaldUserRole as UserRole } from "./rald-auth-sdk";

// Legacy api.auth.* shim (used by auth-context.tsx)
import { raldAuth } from "./rald-auth-sdk";

export const api = {
  auth: {
    login: (email: string, password: string) => raldAuth.login(email, password),
    register: (input: { name: string; email: string; password: string; phone?: string; role: "user" | "merchant"; businessName?: string }) => raldAuth.register(input),
    me: (token: string) => {
      raldAuth.setSession({ token, user: { id: "", email: "", name: null, role: "user", createdAt: "" } });
      return raldAuth.me();
    },
    sendOtp: (phone: string) => raldAuth.sendSmsOtp(phone),
    verifyOtp: (pinId: string, pin: string, phone: string) => raldAuth.verifySmsOtp(pinId, pin, phone),
    registerFromOtp: (input: { otpToken: string; name: string; email: string; role: "user" | "merchant"; businessName?: string }) => raldAuth.registerFromSmsOtp(input),
    sendLoginEmailOtp: (email: string) => raldAuth.sendEmailLoginOtp(email),
    verifyLoginEmailOtp: (sessionToken: string, code: string) => raldAuth.verifyEmailLoginOtp(sessionToken, code),
    registerFromEmailOtp: (input: { emailToken: string; name: string; role: "user" | "merchant"; businessName?: string }) => raldAuth.registerFromEmailOtp(input),
    sendEmailOtp: (email: string, token: string) => { void token; return raldAuth.sendAccountEmailOtp(email); },
    verifyEmailOtp: (code: string, token: string) => { void token; return raldAuth.verifyAccountEmailOtp(code); },
    requestPasswordReset: (email: string) => raldAuth.requestPasswordReset(email),
    resetPassword: (email: string, code: string, newPassword: string) => raldAuth.resetPassword(email, code, newPassword),
    sessions: (token: string) => { void token; return raldAuth.getSessions(); },
    revokeSession: (sessionId: string, token: string) => { void token; return raldAuth.revokeSession(sessionId); },
  },
};
