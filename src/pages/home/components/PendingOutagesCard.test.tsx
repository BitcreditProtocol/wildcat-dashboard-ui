import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { IntlProvider } from "react-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import type { ConnectedMintsResponse, PerceivedState } from "@/generated/client/types.gen";
import { PendingOutagesCard } from "./PendingOutagesCard";

const mockMyStatusQuery = vi.fn<() => { data?: PerceivedState }>();
const mockBetasQuery = vi.fn<() => { data?: ConnectedMintsResponse }>();

vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");
  return {
    ...actual,
    useQuery: (options: Parameters<typeof actual.useQuery>[0]) => {
      const key = options?.queryKey;
      const queryId =
        Array.isArray(key) && typeof key[0] === "object" && key[0] !== null && "_id" in key[0] ? (key[0] as { _id?: unknown })._id : null;
      if (queryId === "mystatus") {
        return mockMyStatusQuery();
      }
      if (queryId === "betas") {
        return mockBetasQuery();
      }
      return actual.useQuery(options);
    },
  };
});

vi.mock("@/generated/client/@tanstack/react-query.gen", () => ({
  getClowderMystatusOptions: () => ({ queryKey: [{ _id: "mystatus" }] }),
  getClowderBetasOptions: () => ({ queryKey: [{ _id: "betas" }] }),
}));

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function renderWithProviders(element: ReactElement): HTMLDivElement {
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  const mountRoot = createRoot(mount);
  act(() => {
    mountRoot.render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <IntlProvider locale="en-US">
          <PreferencesProvider>{element}</PreferencesProvider>
        </IntlProvider>
      </QueryClientProvider>
    );
  });
  root = mountRoot;
  container = mount;
  return mount;
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
  window.localStorage.setItem("user-preferences", JSON.stringify({ currency: "sat", decimalFormat: "comma" }));
  mockBetasQuery.mockReturnValue({
    data: {
      mints: [
        { mint: "https://beta-one.example.com", clowder: "https://clowder.beta-one.example.com", node_id: "02ab" },
        { mint: "https://beta-two.example.com", clowder: "https://clowder.beta-two.example.com", node_id: "02cd" },
        { mint: "https://beta-three.example.com", clowder: "https://clowder.beta-three.example.com", node_id: "02ef" },
      ],
    },
  });
});

describe("PendingOutagesCard", () => {
  it("shows the substitute and the pending swap count and amount while an outage is held", async () => {
    mockMyStatusQuery.mockReturnValue({
      data: {
        alpha_state: "Offline",
        substitute_beta: "02ab",
        pending_outages: [
          {
            evidence_digest: [12, 34],
            substitute: "02ab",
            betas_holding: 2,
            pending_exchanges: 3,
            pending_amount: 15_000,
          },
        ],
      },
    });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toContain("Pending Offline Swaps");
    expect(page.textContent).toContain("beta-one.example.com");
    expect(page.textContent).toContain("Pending swaps");
    expect(page.textContent).toContain("3");
    expect(page.textContent).toContain("15,000");
    expect(page.textContent).toContain("sat");
    expect(page.textContent).toContain("Betas waiting");
    expect(page.textContent).toContain("2 of 3");
  });

  it("falls back to a bare count when the Betas list is shorter than the count or unavailable", async () => {
    mockBetasQuery.mockReturnValue({ data: undefined });
    mockMyStatusQuery.mockReturnValue({
      data: {
        alpha_state: "Offline",
        pending_outages: [
          {
            evidence_digest: [12, 34],
            substitute: "02ab",
            betas_holding: 2,
            pending_exchanges: 3,
            pending_amount: 15_000,
          },
        ],
      },
    });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toContain("Betas waiting");
    expect(page.textContent).not.toContain("2 of");
  });

  it("falls back to the substitute public key when it is not one of the known Betas", async () => {
    mockMyStatusQuery.mockReturnValue({
      data: {
        alpha_state: "Offline",
        pending_outages: [
          {
            evidence_digest: [12, 34],
            substitute: "02ffffff",
            betas_holding: 1,
            pending_exchanges: 1,
            pending_amount: 500,
          },
        ],
      },
    });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toContain("02ffffff");
  });

  it("totals the swaps across outages, most widely held first", async () => {
    mockMyStatusQuery.mockReturnValue({
      data: {
        alpha_state: "Offline",
        substitute_beta: "02ab",
        pending_outages: [
          {
            evidence_digest: [1],
            substitute: "02cd",
            betas_holding: 1,
            pending_exchanges: 2,
            pending_amount: 500,
          },
          {
            evidence_digest: [2],
            substitute: "02ab",
            betas_holding: 2,
            pending_exchanges: 3,
            pending_amount: 15_000,
          },
        ],
      },
    });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toContain("Total pending swaps");
    expect(page.textContent).toContain("5");
    expect(page.textContent).toContain("15,500");
    const substitutes = page.textContent ?? "";
    expect(substitutes.indexOf("beta-one.example.com")).toBeLessThan(substitutes.indexOf("beta-two.example.com"));
  });

  it("renders nothing once the Betas hold no outage", async () => {
    mockMyStatusQuery.mockReturnValue({
      data: {
        alpha_state: "Online",
        substitute_beta: null,
        pending_outages: [],
      },
    });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toBe("");
  });

  it("renders nothing when the mint does not report pending outages at all", async () => {
    mockMyStatusQuery.mockReturnValue({ data: undefined });

    const page = renderWithProviders(<PendingOutagesCard />);
    await flush();

    expect(page.textContent).toBe("");
  });
});
