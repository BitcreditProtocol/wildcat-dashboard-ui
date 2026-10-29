import { getByRole, waitFor } from "@testing-library/dom";
import { act } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { FederationHealth } from "./FederationHealth";
import { federationStatusFixture } from "@/pages/directory/federation-status-test-fixture";
import { cleanup, json, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function healthyStatus() {
  const status = federationStatusFixture();
  const relays = [...status.descriptor.relays, ...status.peers.flatMap((p) => p.relays)];
  status.inbox = relays.map((relay) => ({ relay, reachable: true, eose: true, capped: false, error: null }));
  status.relays.relays = relays.map((relay) => ({
    relay,
    coverage: { relay, reachable: true, eose: true, capped: false, error: null },
    lastSuccessfulSync: 1,
    cursor: 1,
  }));
  return status;
}
it("retries one incomplete read quietly, showing checking, and recovers without announcing degradation", async () => {
  const fetch = vi.fn().mockResolvedValueOnce(json(federationStatusFixture())).mockResolvedValueOnce(json(healthyStatus()));
  vi.stubGlobal("fetch", fetch);
  const { page } = await renderWithProviders(<FederationHealth />);
  expect(getByRole(page, "link")).toHaveTextContent("Checking…");
  expect(page).not.toHaveTextContent("Some Mints not reachable");
  await waitFor(() => expect(getByRole(page, "link")).toHaveTextContent("Connected to other Mints"));
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("announces only persistent incomplete reads, keeps the last-good time, and recovers on a subsequent read", async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(json(healthyStatus())));
  vi.stubGlobal("fetch", fetch);
  const { page, client } = await renderWithProviders(<FederationHealth />);
  expect(getByRole(page, "link")).toHaveTextContent("Connected to other Mints");
  const goodAt = client.getQueryState(["ai-credit", "federation-display"])?.dataUpdatedAt;
  fetch.mockImplementation(() => Promise.resolve(json(federationStatusFixture())));
  act(() => {
    void client.refetchQueries({ queryKey: ["ai-credit", "federation-display"] });
  });
  await waitFor(() => expect(getByRole(page, "link")).toHaveTextContent("Checking…"));
  await waitFor(() => expect(getByRole(page, "link")).toHaveTextContent("Some Mints not reachable"));
  expect(getByRole(page, "link")).toHaveTextContent("Last good:");
  expect(client.getQueryState(["ai-credit", "federation-display"])?.dataUpdatedAt).toBe(goodAt);
  expect(fetch).toHaveBeenCalledTimes(3);
  fetch.mockImplementation(() => Promise.resolve(json(healthyStatus())));
  await act(async () => {
    await client.refetchQueries({ queryKey: ["ai-credit", "federation-display"] });
  });
  await waitFor(() => expect(getByRole(page, "link")).toHaveTextContent("Connected to other Mints"));
});
it("also retries transport failure once and never invents a last-good observation", async () => {
  const fetch = vi.fn().mockRejectedValue(new Error("timeout"));
  vi.stubGlobal("fetch", fetch);
  const { page } = await renderWithProviders(<FederationHealth />);
  await waitFor(() => expect(getByRole(page, "link")).toHaveTextContent("Some Mints not reachable"));
  expect(page).toHaveTextContent("No complete read yet");
  expect(fetch).toHaveBeenCalledTimes(2);
});
