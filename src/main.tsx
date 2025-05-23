import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import "./index.css"
import Layout from "./layout"
import HomePage from "./pages/home/HomePage"
import BalancesPage from "./pages/balances/BalancesPage"
import QuotesPage from "./pages/quotes/QuotesPage"
import SettingsPage from "./pages/settings/SettingsPage"
import meta from "./constants/meta"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import InfoPage from "./pages/info/InfoPage"
import QuotePage from "./pages/quotes/QuotePage"
import PendingQuotesPage from "./pages/quotes/PendingQuotesPage"
import AcceptedQuotesPage from "./pages/quotes/AcceptedQuotesPage"
import { Toaster } from "./components/ui/sonner"
import EarningsPage from "./pages/balances/EarningsPage"
import CashFlowPage from "./pages/balances/CashFlowPage"
import OfferedQuotesPage from "./pages/quotes/OfferedQuotesPage"
import DeniedQuotesPage from "./pages/quotes/DeniedQuotesPage"
// import ExpiredQuotesPage from "./pages/quotes/ExpiredQuotesPage"
import RejectedQuotesPage from "./pages/quotes/RejectedQuotesPage"
import { initKeycloak } from "./keycloak"
import "./lib/api-client"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      enabled: (query) => query.queryKey[0] !== "balances",
    },
  },
})

const prepare = async () => {
  await initKeycloak()
  if (meta.apiMocksEnabled) {
    const { worker } = await import("./mocks/browser")
    await worker.start()
  }
}

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
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="quotes/pending" element={<PendingQuotesPage />} />
            <Route path="quotes/accepted" element={<AcceptedQuotesPage />} />
            <Route path="quotes/offered" element={<OfferedQuotesPage />} />
            <Route path="quotes/denied" element={<DeniedQuotesPage />} />
            <Route path="quotes/rejected" element={<RejectedQuotesPage />} />
            {/* <Route path="quotes/expired" element={<ExpiredQuotesPage />} /> */}
            <Route path="quotes/:id" element={<QuotePage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="info" element={<InfoPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

void prepare().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
      <Toaster />
    </StrictMode>,
  )
})
