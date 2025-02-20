import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from "react-router";
import './index.css'
import Layout from './layout';
import HomePage from './pages/home/HomePage'
import BalancesPage from './pages/balances/BalancesPage'
import QuotesPage from './pages/quotes/QuotesPage';
import SettingsPage from './pages/settings/SettingsPage';
import meta from './constants/meta';


const prepare = async () => {
  if (meta.apiMocksEnabled) {
    const { worker } = await import("./mocks/browser")
    await worker.start()
  }
}

void prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route  element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="balances" element={<BalancesPage />} />
            <Route path="quotes" element={<QuotesPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StrictMode>,
  )
})
