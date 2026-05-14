import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import { AiChat } from "@/components/ai-chat";

import Dashboard from "@/pages/dashboard";
import ClientsList from "@/pages/clients-list";
import ClientDetail from "@/pages/client-detail";
import TasksList from "@/pages/tasks-list";
import TaxReturnsList from "@/pages/tax-returns-list";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsList} />
        <Route path="/clients/:id" component={ClientDetail} />
        <Route path="/tasks" component={TasksList} />
        <Route path="/tax-returns" component={TaxReturnsList} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
      <AiChat />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
