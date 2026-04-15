import { useQuery } from "@tanstack/react-query";

import type { Rates } from "@/lib/currency";

type CoinbaseResponse = {
  data?: {
    currency?: string;
    rates?: {
      USD?: string;
      EUR?: string;
    };
  };
};

async function fetchCoinbaseRates(
  signal?: AbortSignal,
): Promise<Rates | undefined> {
  const url = "https://api.coinbase.com/v2/exchange-rates?currency=BTC";
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const statusText = text || res.statusText || String(res.status);
    throw new Error(`Coinbase request failed: ${statusText}`);
  }

  const response = (await res.json()) as CoinbaseResponse;
  const usdRate = response.data?.rates?.USD;
  const eurRate = response.data?.rates?.EUR;

  if (typeof usdRate !== "string" || typeof eurRate !== "string") {
    throw new Error(
      "Unexpected Coinbase payload: missing rates.USD or rates.EUR",
    );
  }

  const usdPerBtc = parseFloat(usdRate);
  const eurPerBtc = parseFloat(eurRate);

  if (
    !isFinite(usdPerBtc) ||
    usdPerBtc <= 0 ||
    !isFinite(eurPerBtc) ||
    eurPerBtc <= 0
  ) {
    throw new Error("Invalid rates from Coinbase API");
  }

  const eurPerUsd = eurPerBtc / usdPerBtc;

  if (!isFinite(eurPerUsd) || eurPerUsd <= 0) {
    throw new Error("Invalid rate computed: eurPerUsd");
  }

  return { usdPerBtc, eurPerUsd };
}

export function useRates() {
  return useQuery<Rates | undefined>({
    queryKey: ["rates", "coinbase"],
    queryFn: async ({ signal }) => {
      try {
        return await fetchCoinbaseRates(signal);
      } catch (error) {
        console.error("[useRates] Failed to fetch rates", error);
        return undefined;
      }
    },
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchInterval: 300_000,
    retry: (failureCount, error) => {
      if (failureCount >= 3) {
        return false;
      }
      const message = (error as { message?: string }).message || "";
      return /429|5\d\d|network|fetch/i.test(message);
    },
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 10_000),
  });
}
