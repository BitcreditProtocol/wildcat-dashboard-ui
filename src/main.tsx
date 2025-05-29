import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router"
import "./index.css"
import Layout from "./layout"
import HomePage from "./pages/home/HomePage"
import BalancesPage from "./pages/balances/BalancesPage"
import SettingsPage from "./pages/settings/SettingsPage"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import InfoPage from "./pages/info/InfoPage"
import QuotePage from "./pages/quotes/QuotePage"
import StatusQuotePage from "./pages/quotes/StatusQuotePage"
import { Toaster } from "./components/ui/sonner"
import EarningsPage from "./pages/balances/EarningsPage"
import CashFlowPage from "./pages/balances/CashFlowPage"
import { initKeycloak } from "./keycloak"
import "./lib/api-client"

const queryClient = new QueryClient()

const prepare = async () => {
  await initKeycloak()
  // if (meta.apiMocksEnabled) {
  //   const { worker } = await import("./mocks/browser")
  //   await worker.start()
  // }
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
            <Route path="quotes" element={<StatusQuotePage />} />
            <Route path="quotes/pending" element={<StatusQuotePage status="Pending" />} />
            <Route path="quotes/accepted" element={<StatusQuotePage status="Accepted" />} />
            <Route path="quotes/offered" element={<StatusQuotePage status="Offered" />} />
            <Route path="quotes/denied" element={<StatusQuotePage status="Denied" />} />
            <Route path="quotes/rejected" element={<StatusQuotePage status="Rejected" />} />
            {/* <Route path="quotes/expired" element={<StatusQuotePage status="Rejected" />} /> */}
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
