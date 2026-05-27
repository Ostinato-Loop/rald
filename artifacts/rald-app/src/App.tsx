import { Route, Switch } from "wouter";
import Home from "./pages/home";
import UserDashboard from "./pages/user-dashboard";
import MerchantDashboard from "./pages/merchant-dashboard";

export default function App() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={UserDashboard} />
      <Route path="/merchant" component={MerchantDashboard} />
      <Route>
        <Home />
      </Route>
    </Switch>
  );
}
