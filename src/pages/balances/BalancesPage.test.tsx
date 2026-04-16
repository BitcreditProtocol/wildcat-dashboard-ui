import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { Rates } from "@/lib/currency";
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

const mockUseRates = vi.fn<() => { data: Rates | undefined }>();
const mockUseQuery = vi.fn<() => MockCoverage>();

vi.mock("@/hooks/useRates", () => ({
  useRates: () => mockUseRates(),
}));

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: () => mockUseQuery(),
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
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <IntlProvider locale="en-US">
          <PreferencesProvider>{element}</PreferencesProvider>
        </IntlProvider>
      </MemoryRouter>
    </QueryClientProvider>
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

describe("BalancesPage", () => {
  it("shows secondary fiat display for sat balances and leaves custom units unchanged", () => {
    storageData["display-currency"] = JSON.stringify("eur");
    mockUseRates.mockReturnValue({
      data: {
        usdPerBtc: 100_000,
        eurPerUsd: 0.9,
      },
    });
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

    expect(page.textContent).toContain("100,000,000");
    expect(page.textContent).toContain("90,000.00");
    expect(page.textContent).toContain("50,000,000");
    expect(page.textContent).toContain("45,000.00");
    expect(page.textContent).toContain("555 e-IOU");
    expect(page.textContent).toContain("777 crsat");
  });

  it("shows only original sat amounts when fiat rates are unavailable", () => {
    storageData["display-currency"] = JSON.stringify("usd");
    mockUseRates.mockReturnValue({
      data: undefined,
    });
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

    expect(page.textContent).toContain("12,345");
    expect(page.textContent).toContain("67,890");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).not.toContain("$");
    expect(page.textContent).not.toContain("usd");
  });
});
