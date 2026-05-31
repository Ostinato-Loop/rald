import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./lib/auth-context";

// ── Domain migration: app.rald.cloud → profiles.rald.cloud ───────────────────
// Both domains point to the same Cloudflare Pages bundle during cutover.
// Requests landing on the legacy domain are hard-redirected to the new one.
// Remove this block once app.rald.cloud DNS is retired.
if (typeof window !== "undefined" && window.location.hostname === "app.rald.cloud") {
  const next = window.location.href.replace("app.rald.cloud", "profiles.rald.cloud");
  window.location.replace(next);
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
