import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import BalancesPage from "./BalancesPage";

interface MockCoverage {
  data?: {
    onchain_collateral: number;
    ebill_collateral: number;
    eiou_collateral: number;
    credit_circulating_supply: number;
    debit_circulating_supply: number;
  };
  isError: boolean;
  refetch: ReturnType<typeof vi.fn>;
}

interface MockFeesToken {
  data?: {
    amount: number;
    token: string;
  };
  error: unknown;
  isFetching: boolean;
  refetch: ReturnType<typeof vi.fn>;
}

interface MockHistory {
  data?: unknown;
  isPending: boolean;
  error: unknown;
}

const mockUseCoverageQuery = vi.fn<() => MockCoverage>();
const mockUseCollectFeesQuery = vi.fn<() => MockFeesToken>();
const mockUseHistoryQuery = vi.fn<(queryId: string) => MockHistory>();

const HISTORY_QUERY_IDS = new Set(["onchainHistory", "billsBalanceHistory", "keysetsBalance"]);

const SECONDS_PER_DAY = 24 * 60 * 60;

/** A keyset balance as the aggregator reports it: a byte-array id and no unit of its own. */
function keysetBalance(hexId: string, expiry: number, value: number) {
  return {
    keyset_id: { version: "Version00", id: { V1: hexId.match(/../g)?.map((pair) => Number.parseInt(pair, 16)) ?? [] } },
    expiry,
    balance: { value, unit: null },
  };
}

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      const key = options?.queryKey;
      if (Array.isArray(key) && key[0] === "rates" && key[1] === "coinbase") {
        return actual.useQuery(options);
      }
      const queryId =
        Array.isArray(key) && typeof key[0] === "object" && key[0] !== null && "_id" in key[0] ? (key[0] as { _id?: unknown })._id : null;
      if (queryId === "collectFeesToken") {
        return mockUseCollectFeesQuery();
      }
      if (queryId === "addReserveStatus") {
        return { data: undefined, error: null, isError: false, refetch: vi.fn() };
      }
      if (typeof queryId === "string" && HISTORY_QUERY_IDS.has(queryId)) {
        return mockUseHistoryQuery(queryId);
      }
      return mockUseCoverageQuery();
    },
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  collectFeesTokenOptions: () => ({
    queryKey: [{ _id: "collectFeesToken" }],
  }),
  getClowderLocalCoverageOptions: () => ({
    queryKey: [{ _id: "coverage" }],
  }),
  postAddReserveMutation: () => ({
    mutationFn: () => Promise.resolve(undefined),
  }),
  getAddReserveStatusOptions: () => ({
    queryKey: [{ _id: "addReserveStatus" }],
  }),
  getOnchainHistoryOptions: () => ({
    queryKey: [{ _id: "onchainHistory" }],
  }),
  getBillsBalanceHistoryOptions: () => ({
    queryKey: [{ _id: "billsBalanceHistory" }],
  }),
  getKeysetsBalanceOptions: () => ({
    queryKey: [{ _id: "keysetsBalance" }],
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
  ChartTooltip: () => null,
  ChartTooltipContent: () => null,
}));

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => null,
  ReferenceLine: () => null,
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

/** What each history endpoint returns when the mint has nothing to plot yet. */
function emptyHistory(queryId: string) {
  switch (queryId) {
    case "onchainHistory":
      return { operations: [] };
    case "billsBalanceHistory":
      return { bills: [] };
    default:
      return { balances: [] };
  }
}

function zeroCoverage(): MockCoverage {
  return {
    data: {
      onchain_collateral: 0,
      ebill_collateral: 0,
      eiou_collateral: 0,
      credit_circulating_supply: 0,
      debit_circulating_supply: 0,
    },
    isError: false,
    refetch: vi.fn(),
  };
}

/** Clicks the balance card carrying `title`, which opens the drawer holding its chart. */
async function openBalanceCard(title: string) {
  const trigger = [...document.querySelectorAll("button")].find((button) => button.textContent?.includes(title));

  if (!trigger) {
    throw new Error(`No balance card opens a chart for "${title}"`);
  }

  act(() => {
    trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flush();
}

async function closeDrawer() {
  const close = document.querySelector<HTMLButtonElement>('[role="dialog"] button[aria-label]');

  if (!close) {
    throw new Error("The open drawer has no close button");
  }

  act(() => {
    close.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  });
  await flush();
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

afterEach(() => {
  // React keeps timers running until the tree unmounts, and vitest tears the jsdom
  // environment down right after the last test — unmount here so nothing fires after it.
  if (root && container) {
    act(() => {
      root?.unmount();
    });
    container.remove();
    root = null;
    container = null;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCollectFeesQuery.mockReturnValue({
    data: {
      amount: 123,
      token: "bitcr-test-token",
    },
    error: null,
    isFetching: false,
    refetch: vi.fn(),
  });
  mockUseHistoryQuery.mockImplementation((queryId) => ({ data: emptyHistory(queryId), isPending: false, error: null }));
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
});

describe("BalancesPage", () => {
  it("shows secondary fiat display for sat, crsat and e-IOU balances", async () => {
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
    mockUseCoverageQuery.mockReturnValue({
      data: {
        onchain_collateral: 100_000_000,
        ebill_collateral: 42_000,
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
    expect(page.textContent).toContain("42,000");
    // 555 e-IOU at the fixed 0.067 euro-cent peg.
    expect(page.textContent).toContain("555e-IOU0.37eur");
    // A crsat is worth exactly one sat, so it converts at the sat rate.
    expect(page.textContent).toContain("777crsat0.70eur");
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
    mockUseCoverageQuery.mockReturnValue({
      data: {
        onchain_collateral: 12_345,
        ebill_collateral: 0,
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

  it("keeps every chart shut until its balance card is clicked", async () => {
    mockUseCoverageQuery.mockReturnValue(zeroCoverage());

    const page = renderWithProviders(<BalancesPage />);
    await flush();

    expect(page.textContent).not.toContain("No on-chain operations have settled yet.");

    await openBalanceCard("Bitcoin balance");

    expect(document.body.textContent).toContain("No on-chain operations have settled yet.");
    // The card the drawer belongs to is the only history it shows.
    expect(document.body.textContent).not.toContain("The mint holds no e-bills yet.");
  });

  it("gives each balance card the chart that belongs to it", async () => {
    mockUseCoverageQuery.mockReturnValue(zeroCoverage());

    renderWithProviders(<BalancesPage />);
    await flush();

    await openBalanceCard("eBill collateral balance");
    expect(document.body.textContent).toContain("The mint holds no e-bills yet.");
    // The maturity ladder straddles today, so it narrows to either side of it.
    expect(document.body.textContent).toContain("Last 30d");
    expect(document.body.textContent).toContain("Next 30d");
    await closeDrawer();

    await openBalanceCard("Credit token balance");
    expect(document.body.textContent).toContain("No keyset carries an outstanding balance.");
    // Credit looks ahead of today, so its range toggle offers future windows.
    expect(document.body.textContent).toContain("Next 30d");
    await closeDrawer();

    await openBalanceCard("Debit token balance");
    // Debit looks back from today, so the same chart offers past windows instead.
    expect(document.body.textContent).toContain("Last 30d");
    expect(document.body.textContent).not.toContain("Next 30d");
  });

  it("splits the keyset balances between the credit and the debit chart by expiry", async () => {
    mockUseCoverageQuery.mockReturnValue(zeroCoverage());
    // Only a keyset still running carries a balance, so credit has one to plot and debit does not.
    const nowSeconds = Math.floor(Date.now() / 1000);
    mockUseHistoryQuery.mockImplementation((queryId) => ({
      data: queryId === "keysetsBalance" ? { balances: [keysetBalance("aa", nowSeconds + SECONDS_PER_DAY, 5)] } : emptyHistory(queryId),
      isPending: false,
      error: null,
    }));

    renderWithProviders(<BalancesPage />);
    await flush();

    await openBalanceCard("Credit token balance");
    expect(document.body.textContent).not.toContain("No keyset carries an outstanding balance.");
    await closeDrawer();

    // The expired side is empty rather than borrowing the running keyset from credit.
    await openBalanceCard("Debit token balance");
    expect(document.body.textContent).toContain("No keyset carries an outstanding balance.");
  });

  it("keeps a failing history endpoint inside its own chart", async () => {
    mockUseCoverageQuery.mockReturnValue(zeroCoverage());
    mockUseHistoryQuery.mockImplementation((queryId) =>
      queryId === "onchainHistory"
        ? { data: undefined, isPending: false, error: new Error("aggregator unreachable") }
        : { data: emptyHistory(queryId), isPending: false, error: null }
    );

    renderWithProviders(<BalancesPage />);
    await flush();

    await openBalanceCard("Bitcoin balance");
    expect(document.body.textContent).toContain("Failed to load history: aggregator unreachable");
    await closeDrawer();

    // The neighbouring chart is unaffected by that failure.
    await openBalanceCard("eBill collateral balance");
    expect(document.body.textContent).toContain("The mint holds no e-bills yet.");
    expect(document.body.textContent).not.toContain("Failed to load history");
  });
});
