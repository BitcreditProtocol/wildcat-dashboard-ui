import { screen } from "@testing-library/dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { directoryNetworkFixture, publicNodeId } from "@/pages/credit/network-controls-test-fixtures";
import { directoryFixture } from "@/pages/mint-checks/mint-check-test-fixtures";
import { cleanup, json, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
import { DirectoryCoveragePanel, PublicDirectoryResults } from "./PublicDirectoryPanels";
import DirectoryPage from "./DirectoryPage";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("public directory and federation health", () => {
  it("keeps a similar name under a new identity visible alongside local records with separate provenance", async () => {
    const directory = { ...directoryFixture("Finca Verde"), ...directoryNetworkFixture() };
    const fetch = vi.fn((path: string) =>
      Promise.resolve(path === "/api/ai-credit/participant-directory" ? json(directory) : json({}, 503))
    );
    vi.stubGlobal("fetch", fetch);
    const { page } = await renderWithProviders(<DirectoryPage />, "/directory?q=Finca%20Verde");
    const listings = screen.getByRole("region", { name: "Observed public listings" });
    expect(page).toHaveTextContent("This Mint’s records");
    for (const text of [
      "Public listing · self-declared",
      "Finca Verde S.A.",
      publicNodeId,
      "BUYER-99",
      "Subject signature verified",
      "contents remain self-declared",
      "event",
      "90% similarity",
      "A match is a reason to ask, never a finding",
    ])
      expect(listings).toHaveTextContent(text);
    expect(fetch.mock.calls.map(([path]) => path)).toEqual(
      expect.arrayContaining(["/api/ai-credit/participant-directory", "/api/ai-credit/operator-federation-status"])
    );
    expect(page).not.toHaveTextContent("network clear");
  });

  it("does not turn an empty public search into clearance or an unavailable lookup into no listing", async () => {
    const directory = { ...directoryFixture(), publicListings: [] };
    await renderWithProviders(<PublicDirectoryResults directory={directory} />);
    expect(screen.getByRole("region", { name: "Observed public listings" })).toHaveTextContent(
      "No matching public listings observed in this local copy. No clearance is implied"
    );
    cleanup();
    await renderWithProviders(<PublicDirectoryResults directory={directoryFixture()} />);
    expect(screen.getByRole("region", { name: "Observed public listings" })).toHaveTextContent("Public listings unavailable");
  });

  it("reports missing coverage and sync rather than healthy", async () => {
    const { page } = await renderWithProviders(<DirectoryCoveragePanel />);
    expect(page).toHaveTextContent("Network coverage: unknown");
    expect(page).toHaveTextContent("Public directory relay coverage not reported");
    expect(page).toHaveTextContent("Directory sync status not reported");
  });
});
