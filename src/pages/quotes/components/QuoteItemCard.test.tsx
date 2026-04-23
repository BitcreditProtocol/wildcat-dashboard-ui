import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { LightInfo } from "@/generated/client/types.gen";
import { QuoteItemCard } from "./QuoteItemCard";

interface MockQuoteQuery {
  data:
    | {
        bill: {
          drawee: object;
          drawer: object;
          payee: object;
          endorsees: never[];
        };
      }
    | undefined;
  isLoading: boolean;
  error: unknown;
}

const mockUseQuery = vi.fn<() => MockQuoteQuery>();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      const key = options?.queryKey;
      if (Array.isArray(key) && key[0] === "rates" && key[1] === "coinbase") {
        return actual.useQuery(options);
      }
      return mockUseQuery();
    },
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

vi.mock("@/components/ui/highlight-text", () => ({
  HighlightText: ({ text }: { text: string }) => <span>{text}</span>,
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
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <IntlProvider locale="en-US">
        <PreferencesProvider>
          <MemoryRouter>{element}</MemoryRouter>
        </PreferencesProvider>
      </IntlProvider>
    </QueryClientProvider>
  );
}

async function flush() {
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
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
  it("renders sat primary and eur secondary amount when rates are available", async () => {
    storageData["user-preferences"] = JSON.stringify({ currency: "eur" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              rates: {
                USD: "100000",
                EUR: "90000",
              },
            },
          }),
      })
    );
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
        quote={
          {
            id: "quote-1",
            status: "Accepted",
            sum: 100_000_000,
          } satisfies LightInfo
        }
        effectiveStatus="Accepted"
        searchQuery=""
      />
    );

    await flush();

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("90,000.00");
    expect(page.textContent).toContain("eur");
  });

  it("renders sat-only amount when fiat rates are unavailable", async () => {
    storageData["user-preferences"] = JSON.stringify({ currency: "usd" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Bad Request"),
      })
    );
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    });

    const page = renderWithProviders(
      <QuoteItemCard
        quote={{ id: "quote-1", status: "Accepted", sum: 12_345 } satisfies LightInfo}
        effectiveStatus="Accepted"
        searchQuery=""
      />
    );

    await flush();

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("usd");
  });
});
