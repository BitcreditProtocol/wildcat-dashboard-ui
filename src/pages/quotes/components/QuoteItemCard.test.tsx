import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { QuoteItemCard } from "./QuoteItemCard";

const mockUseRates = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@/hooks/useRates", () => ({
  useRates: () => mockUseRates(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
    "@tanstack/react-query",
  );
  return {
    ...actual,
    useQuery: (options: unknown) => mockUseQuery(options),
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getQuoteOptions: ({ path }: { path: { qid: string } }) => ({
    queryKey: [{ _id: "getQuote", path }],
  }),
}));

vi.mock("@/components/ParticipantsOverview", () => ({
  ParticipantsOverviewCard: () => <div>ParticipantsOverviewMock</div>,
}));

vi.mock("@/components/ui/search", () => ({
  HighlightText: ({
    text,
  }: {
    text: string;
  }) => <span>{text}</span>,
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
        <PreferencesProvider>
          <MemoryRouter>{element}</MemoryRouter>
        </PreferencesProvider>
      </IntlProvider>
    </QueryClientProvider>,
  );
}

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

describe("QuoteItemCard", () => {
  it("renders sat primary and eur secondary amount when rates are available", () => {
    storageData["display-currency"] = JSON.stringify("eur");
    mockUseRates.mockReturnValue({
      data: {
        usdPerBtc: 100_000,
        eurPerUsd: 0.9,
      },
    });
    mockUseQuery.mockReturnValue({
      data: {
        bill: {
          drawee: {},
          drawer: {},
          payee: {},
          endorsees: [],
        },
      },
      isLoading: false,
      error: null,
    });

    const page = renderWithProviders(
      <QuoteItemCard
        quote={{ id: "quote-1", sum: 100_000_000 } as never}
        effectiveStatus="Accepted"
        searchQuery=""
      />,
    );

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("€90,000.00");
    expect(page.textContent).toContain("eur");
  });

  it("renders sat-only amount when fiat rates are unavailable", () => {
    storageData["display-currency"] = JSON.stringify("usd");
    mockUseRates.mockReturnValue({
      data: undefined,
    });
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const page = renderWithProviders(
      <QuoteItemCard
        quote={{ id: "quote-1", sum: 12_345 } as never}
        effectiveStatus="Accepted"
        searchQuery=""
      />,
    );

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("$");
    expect(page.textContent).not.toContain("usd");
  });
});
