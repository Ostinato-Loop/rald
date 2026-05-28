// RALD API — re-exports RALD Auth SDK for backward compat
// auth-context.tsx now uses the SDK directly; this file remains for any
// legacy imports across the rald-app.
export { raldAuth } from "./rald-auth-sdk";
export type {
  RaldUser as User,
  RaldSession as AuthToken,
  RaldUserRole as UserRole,
  RaldAuthError,
} from "./rald-auth-sdk";
