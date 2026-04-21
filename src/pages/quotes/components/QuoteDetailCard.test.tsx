import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { BillIdentParticipant, BillParticipant, Id, InfoReply } from "@/generated/client/types.gen";
import type { Rates } from "@/lib/currency";
import { QuoteDetailCard } from "./QuoteDetailCard";

const mockUseRates = vi.fn<() => { data: Rates | undefined }>();

const participant: BillIdentParticipant = {
  type: "Company",
  node_id: "node-1",
  name: "ACME Corp",
  country: "AT",
  city: "Vienna",
  address: "Street 1",
  nostr_relays: [],
};

const payee: BillParticipant = {
  Ident: participant,
};

const keysetId: Id = {
  version: "Version00",
  id: {
    V1: [1, 2, 3, 4],
  },
};

vi.mock("@/hooks/useRates", () => ({
  useRates: () => mockUseRates(),
}));

vi.mock("@/components/ParticipantsOverview", () => ({
  ParticipantsOverviewCard: () => <div>ParticipantsOverviewMock</div>,
  ParticipantDetail: () => <div>ParticipantDetailMock</div>,
}));

vi.mock("@bitcredit/ui-library", () => ({
  TruncatedTextPopover: ({ text }: { text: React.ReactNode }) => <span>{text}</span>,
}));

vi.mock("@/components/QRCodeWithErrorBoundary", () => ({
  FeeTokenQRCodeModal: () => <div>FeeTokenQRCodeModalMock</div>,
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let storageData: Record<string, string> = {};

function renderIntoDom(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(element);
  });
  root = mountRoot;
  container = mount;
  return mount;
}

function renderWithProviders(element: ReactElement): HTMLDivElement {
  return renderIntoDom(
    <QueryClientProvider client={new QueryClient()}>
      <IntlProvider locale="en-US">
        <PreferencesProvider>{element}</PreferencesProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

const baseQuote: InfoReply = {
  id: "quote-1",
  status: "Accepted",
  discounted: 80_000_000,
  bill: {
    id: "bill-1",
    sum: 100_000_000,
    maturity_date: "2026-03-01",
    drawee: participant,
    drawer: participant,
    payee,
    endorsees: [],
    file_urls: [],
  },
  keyset_id: keysetId,
};

beforeEach(() => {
  vi.clearAllMocks();
  storageData = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storageData[key] ?? null,
      setItem: (key: string, value: string) => {
        storageData[key] = value;
      },
      removeItem: (key: string) => {
        delete storageData[key];
      },
    },
  });
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

describe("QuoteDetailCard", () => {
  it("renders primary sat values with secondary eur conversions when rates are available", () => {
    storageData["display-currency"] = JSON.stringify("eur");
    mockUseRates.mockReturnValue({
      data: {
        usdPerBtc: 100_000,
        eurPerUsd: 0.9,
      },
    });

    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={true}
        isMintComplete={true}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        feeToken={null}
        isFeeTokenStatusPending={false}
        feeTokenStatusData={undefined}
        isFeeTokenStatusError={false}
      />
    );

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("90,000.00");
    expect(page.textContent).toContain("eur");
    expect(page.textContent).toContain("72,000.00");
    expect(page.textContent).toContain("18,000.00");
  });

  it("falls back to sat-only values when fiat rates are unavailable", () => {
    storageData["display-currency"] = JSON.stringify("eur");
    mockUseRates.mockReturnValue({
      data: undefined,
    });

    const page = renderWithProviders(
      <QuoteDetailCard
        quote={baseQuote}
        effectiveQuoteStatus="Accepted"
        ebillPaid={true}
        isMintComplete={true}
        isMintCompleteLoading={false}
        showPayment={false}
        rejectedToPay={false}
        isInMempool={false}
        requestedToPay={false}
        feeToken={null}
        isFeeTokenStatusPending={false}
        feeTokenStatusData={undefined}
        isFeeTokenStatusError={false}
      />
    );

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("eur");
  });
});
