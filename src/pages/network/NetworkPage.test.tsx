import { getByRole, waitFor } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import NetworkPage from "./NetworkPage";
import { federationHealthy } from "./network-copy";
import { federationStatusFixture } from "@/pages/directory/federation-status-test-fixture";
import { cleanup, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
vi.mock("@/pages/home/components/clowder-peers/ClowderPeersCard", () => ({ ClowderPeersCard: () => null }));
vi.mock("@/pages/home/components/PendingOutagesCard", () => ({ PendingOutagesCard: () => null }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("Network overview", () => {
  it("maps this Mint, followed peers and relays, and does not invent a lock count when summary is absent", async () => {
    vi.stubGlobal("fetch", routeFetch({ "/api/ai-credit/operator-federation-status": () => json(federationStatusFixture()) }));
    const { page } = await renderWithProviders(<NetworkPage />);
    // The relay a Mint is reached through stays available on hover, not as on-screen jargon.
    await waitFor(() => expect(page.querySelector('[title*="ws://mint-b.test:8080"]')).not.toBeNull());
    expect(page.querySelector('[title*="ws://mint-b.test:8080"]')?.textContent).toContain("Synthetic Mint B");
    expect(getByRole(page, "link", { name: /Some Mints not reachable/ }).getAttribute("href")).toBe("/network");
    expect(page.textContent).toContain("No lock count has been reported");
  });
  it("requires complete healthy observations for every configured relay", () => {
    const status = federationStatusFixture();
    expect(federationHealthy(status)).toBe(false);
    const relays = [...status.descriptor.relays, ...status.peers.flatMap((p) => p.relays)];
    status.inbox = relays.map((relay) => ({ relay, reachable: true, eose: true, capped: false, error: null }));
    status.relays.relays = relays.map((relay) => ({
      relay,
      coverage: { relay, reachable: true, eose: true, capped: false, error: null },
      lastSuccessfulSync: 0,
      cursor: 0,
    }));
    expect(federationHealthy(status)).toBe(true);
    status.inbox[0].capped = true;
    expect(federationHealthy(status)).toBe(false);
  });
});
