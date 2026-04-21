import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe("buildMempoolTransactionUrl", () => {
  it("builds a mainnet transaction URL", async () => {
    vi.stubEnv("VITE_ESPLORA_BASE_URL", "https://esplora.example.com/");
    const { buildMempoolTransactionUrl } = await import("./mempool");

    expect(
      buildMempoolTransactionUrl({
        txId: "abc123",
        network: "mainnet",
      })
    ).toBe("https://esplora.example.com/tx/abc123");
  });

  it("builds a testnet transaction URL", async () => {
    vi.stubEnv("VITE_ESPLORA_BASE_URL", "https://esplora.example.com");
    const { buildMempoolTransactionUrl } = await import("./mempool");

    expect(
      buildMempoolTransactionUrl({
        txId: "abc123",
        network: "testnet",
      })
    ).toBe("https://esplora.example.com/testnet/tx/abc123");
  });

  it("returns undefined when tx id is missing", async () => {
    const { buildMempoolTransactionUrl } = await import("./mempool");

    expect(
      buildMempoolTransactionUrl({
        txId: null,
        network: "testnet",
      })
    ).toBeUndefined();
  });

  it("returns undefined for unsupported networks", async () => {
    const { buildMempoolTransactionUrl } = await import("./mempool");

    expect(
      buildMempoolTransactionUrl({
        txId: "abc123",
        network: "customnet",
      })
    ).toBeUndefined();
  });
});
