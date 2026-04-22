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
import { Toaster } from "./components/ui/sonner";
import EarningsPage from "./pages/balances/EarningsPage";
import CashFlowPage from "./pages/balances/CashFlowPage";
import { initKeycloak } from "./keycloak";
import "./lib/api-client";
import KeysetsPage from "@/pages/keysets/KeysetsPage";
import KeysetDetailPage from "@/pages/keysets/KeysetDetailPage";
import { LanguageProvider } from "@/context/language/LanguageProvider";
import { PreferencesProvider } from "@bitcredit/ui-library";

const queryClient = new QueryClient();

const prepare = async () => {
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
            <Route path="quotes" element={<StatusQuotePage />} />
            <Route path="quotes/pending" element={<StatusQuotePage status="Pending" />} />
            <Route path="quotes/accepted" element={<StatusQuotePage status="Accepted" />} />
            <Route path="quotes/canceled" element={<StatusQuotePage status="Canceled" />} />
            <Route path="quotes/offered" element={<StatusQuotePage status="Offered" />} />
            <Route path="quotes/offerexpired" element={<StatusQuotePage status="OfferExpired" />} />
            <Route path="quotes/denied" element={<StatusQuotePage status="Denied" />} />
            <Route path="quotes/rejected" element={<StatusQuotePage status="Rejected" />} />
            <Route path="quotes/:id" element={<QuotePage />} />
            <Route path="keysets" element={<KeysetsPage />} />
            <Route path="keysets/:keysetId" element={<KeysetDetailPage />} />
            <Route path="info" element={<InfoPage />} />
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
        <PreferencesProvider>
          <App />
          <Toaster />
        </PreferencesProvider>
      </LanguageProvider>
    </StrictMode>
  );
});

export { App };
