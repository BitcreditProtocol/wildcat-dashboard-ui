import { fireEvent, screen } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, flush, json, renderWithProviders, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { mintKey } from "@/pages/credit/network-controls-test-fixtures";
import { FederationStatusPanel } from "./FederationStatusPanel";
import { parseFederationStatus, readFederationStatus } from "./federation-status";
import { federationStatusFixture } from "./federation-status-test-fixture";
import DirectoryPage from "./DirectoryPage";
import NetworkPage from "@/pages/network/NetworkPage";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("federation status through operator BFF", () => {
  it("reads only the authenticated GET route and renders public descriptor, followed Mints and separate inbox and sync health", async () => {
    const fetch = vi.fn().mockResolvedValue(json(federationStatusFixture()));
    vi.stubGlobal("fetch", fetch);
    await renderWithProviders(<FederationStatusPanel />);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith("/api/ai-credit/operator-federation-status", expect.anything());
    const panel = screen.getByRole("region", { name: "Federation status" });
    for (const text of [
      "This Mint’s federation descriptor",
      "Network: regtest",
      "a".repeat(64),
      "d".repeat(64),
      "bill_status",
      "Followed Mints",
      "Synthetic Mint B",
      mintKey,
      "ws://mint-b.test:8080",
      "Inbox relay health",
      "inbox_timeout",
      "unreachable",
      "query incomplete",
      "Inbox health not yet reported",
      "ws://mint-a.test:8080",
      "Directory relay and sync health",
      "Directory health not yet reported for configured relays",
      "last successful sync",
      "backfill window 3600 seconds",
      "capped",
      "Network coverage: unknown",
      "No network-wide clearance is implied",
    ])
      expect(panel).toHaveTextContent(text);
    expect(panel).not.toHaveTextContent("must-never-render");
  });

  it("reports unavailable status and retries without hiding independently available directory content", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json(federationStatusFixture()));
    vi.stubGlobal("fetch", fetch);
    await renderWithProviders(<FederationStatusPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("No healthy state is implied");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Refresh federation status" }));
    });
    await flush();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("region")).toHaveTextContent("Synthetic Mint B");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps federation status visible when the participant-directory request fails", async () => {
    vi.stubGlobal(
      "fetch",
      routeFetch({
        "/api/ai-credit/operator-federation-status": () => json(federationStatusFixture()),
        "/api/ai-credit/participant-directory": () => json({}, 503),
      })
    );
    await renderWithProviders(<DirectoryPage />, "/directory");
    expect(screen.getByRole("link", { name: "Federation degraded" })).toHaveAttribute("href", "/network");
    cleanup();
    await renderWithProviders(<NetworkPage />, "/network");
    expect(screen.getByRole("region", { name: "Federation status" })).toHaveTextContent("Synthetic Mint B");
    expect(screen.getByRole("button", { name: "Refresh federation status" })).toBeEnabled();
  });

  it("rejects malformed status and credential-bearing relay URLs and never substitutes empty health", async () => {
    expect(() => parseFederationStatus({})).toThrow();
    expect(() => parseFederationStatus({ ...federationStatusFixture(), privateKey: "must-never-render" })).toThrow();
    const status = federationStatusFixture();
    expect(() => parseFederationStatus({ ...status, inbox: [{ relay: "ws://bad.test" }] })).toThrow();
    expect(() =>
      parseFederationStatus({ ...status, descriptor: { ...status.descriptor, relays: ["ws://user:secret@bad.test"] } })
    ).toThrow();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ enabled: false })));
    await expect(readFederationStatus()).rejects.toThrow();
    await renderWithProviders(<FederationStatusPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("unavailable or invalid");
    expect(screen.getByRole("region")).not.toHaveTextContent("Synthetic Mint B");
  });

  it("shows an empty followed set and missing inbox coverage as unknown", async () => {
    const status = federationStatusFixture();
    status.peers = [];
    status.inbox = [];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(status)));
    await renderWithProviders(<FederationStatusPanel />);
    expect(screen.getByRole("region")).toHaveTextContent("No followed Mints configured");
    expect(screen.getByRole("region")).toHaveTextContent("Relay coverage unavailable");
    expect(screen.getByRole("region")).toHaveTextContent("Inbox health not yet reported");
  });
});
