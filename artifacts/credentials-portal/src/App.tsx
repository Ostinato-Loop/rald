import { Router, Route, Switch } from "wouter";
import { AuthGuard } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import ApiKeys from "@/pages/api-keys";
import Usage from "@/pages/usage";
import Organization from "@/pages/organization";
import AuditLog from "@/pages/audit-log";

function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
      <div style={{ fontSize: "3rem" }}>404</div>
      <div>Page not found</div>
      <a href="/" style={{ color: "var(--teal)", fontSize: "0.82rem" }}>← Back to overview</a>
    </div>
  );
}

export default function App() {
  return (
    <AuthGuard>
      <Router>
        <Switch>
          <Route path="/"      component={Dashboard} />
          <Route path="/keys"  component={ApiKeys} />
          <Route path="/usage" component={Usage} />
          <Route path="/org"   component={Organization} />
          <Route path="/audit" component={AuditLog} />
          <Route component={NotFound} />
        </Switch>
      </Router>
    </AuthGuard>
  );
}
