import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "@bitcredit/ui-library/style.css";
import "./index.css";
import Layout from "./layout";
import HomePage from "./pages/home/HomePage";
import BalancesPage from "./pages/balances/BalancesPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import InfoPage from "./pages/info/InfoPage";
import QuotePage from "./pages/quotes/QuotePage";
import StatusQuotePage from "./pages/quotes/StatusQuotePage";
import { QUOTE_STATUS_ROUTES } from "./pages/quotes/quote-status-routes";
import EarningsPage from "./pages/balances/EarningsPage";
import CashFlowPage from "./pages/balances/CashFlowPage";
import { env } from "@/lib/env";
import { initKeycloak } from "./keycloak";
import { client as apiClient } from "./lib/api-client";
import BillsPage from "@/pages/bills/BillsPage";
import BillDetailPage from "@/pages/bills/BillDetailPage";
import KeysetsPage from "@/pages/keysets/KeysetsPage";
import KeysetDetailPage from "@/pages/keysets/KeysetDetailPage";
import MeltRequestsPage from "@/pages/melts/MeltRequestsPage";
import { LanguageProvider } from "@/context/language/LanguageProvider";
import { PreferencesProvider, Toaster } from "@bitcredit/ui-library";
import NotFoundPage from "@/pages/NotFoundPage";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

const queryClient = new QueryClient();

const prepare = async () => {
  apiClient.getConfig();
  // Local-only (VITE_API_MOCKING_ENABLED=true): skip the login-required redirect entirely. Auth in
  // this stack is an Envoy concern — the admin aggregator behind it has no auth code — so talking
  // to the aggregator directly needs no session, and initKeycloak would otherwise bounce the whole
  // app to a login page before the first request. Off by default, never true in a deployed build.
  if (env.apiMocksEnabled) return;
  await initKeycloak();
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="balances" element={<BalancesPage />} />
            <Route path="earnings" element={<EarningsPage />} />
            <Route path="earnings/cashflow" element={<CashFlowPage />} />
            <Route path="melt-requests" element={<MeltRequestsPage />} />
            <Route path="quotes" element={<StatusQuotePage />} />
            {QUOTE_STATUS_ROUTES.map((route) => (
              <Route key={route.status} path={route.path} element={<StatusQuotePage status={route.status} />} />
            ))}
            <Route path="quotes/:id" element={<QuotePage />} />
            <Route path="bills" element={<BillsPage />} />
            <Route path="bills/:billId" element={<BillDetailPage />} />
            <Route path="keysets" element={<KeysetsPage />} />
            <Route path="keysets/:keysetId" element={<KeysetDetailPage />} />
            <Route path="info" element={<InfoPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

void prepare().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <LanguageProvider>
        <GlobalErrorBoundary>
          <PreferencesProvider>
            <App />
            <Toaster />
          </PreferencesProvider>
        </GlobalErrorBoundary>
      </LanguageProvider>
    </StrictMode>
  );
});

export { App };
