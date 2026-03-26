import { env } from "@/lib/env";

const NETWORK_PATHS: Record<string, string> = {
  bitcoin: "",
  mainnet: "",
  testnet: "/testnet",
  signet: "/signet",
  regtest: "/regtest",
};

interface BuildMempoolTransactionUrlParams {
  txId?: string | null;
  network?: string | null;
}

export function buildMempoolTransactionUrl({
  txId,
  network,
}: BuildMempoolTransactionUrlParams): string | undefined {
  if (!txId) {
    return undefined;
  }

  const networkPath = NETWORK_PATHS[network?.trim().toLowerCase() ?? ""];

  if (networkPath === undefined) {
    return undefined;
  }

  return `${env.esploraBaseUrl.replace(/\/+$/, "")}${networkPath}/tx/${txId}`;
}
