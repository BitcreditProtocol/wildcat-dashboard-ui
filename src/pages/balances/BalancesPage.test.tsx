import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import BalancesPage from "./BalancesPage";

interface MockCoverage {
  data?: {
    onchain_collateral: number;
    eiou_collateral: number;
    credit_circulating_supply: number;
    debit_circulating_supply: number;
  };
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}

const mockUseQuery = vi.fn<() => MockCoverage>();

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
  getClowderLocalCoverageOptions: () => ({
    queryKey: [{ _id: "coverage" }],
  }),
}));

vi.mock("@/components/Breadcrumbs", () => ({
  Breadcrumbs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/PageTitle", () => ({
  PageTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/chart", () => ({
  ChartContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ChartLegend: () => null,
  ChartLegendContent: () => null,
}));

vi.mock("recharts", () => ({
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  XAxis: () => null,
  YAxis: () => null,
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
      <MemoryRouter>
        <IntlProvider locale="en-US">
          <PreferencesProvider>{element}</PreferencesProvider>
        </IntlProvider>
      </MemoryRouter>
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

describe("BalancesPage", () => {
  it("shows secondary fiat display for sat balances and leaves custom units unchanged", async () => {
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
        onchain_collateral: 100_000_000,
        eiou_collateral: 555,
        credit_circulating_supply: 777,
        debit_circulating_supply: 50_000_000,
      },
      isError: false,
      refetch: vi.fn(),
    });

    const page = renderWithProviders(<BalancesPage />);
    await flush();

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("90,000.00");
    expect(page.textContent).toContain("50,000,000");
    expect(page.textContent).toContain("45,000.00");
    expect(page.textContent).toContain("555 e-IOU");
    expect(page.textContent).toContain("777 crsat");
  });

  it("shows only original sat amounts when fiat rates are unavailable", async () => {
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
      data: {
        onchain_collateral: 12_345,
        eiou_collateral: 0,
        credit_circulating_supply: 0,
        debit_circulating_supply: 67_890,
      },
      isError: false,
      refetch: vi.fn(),
    });

    const page = renderWithProviders(<BalancesPage />);
    await flush();

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("67,890");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("$");
    expect(page.textContent).not.toContain("usd");
  });
});
