import { queryOptions } from "@tanstack/react-query";
import type { AlphaStateResponse, ConnectedMintResponse, SimpleAlphaState } from "@/generated/client/types.gen";

export interface ClowderForeignStatusQueryOptions {
  mintBaseUrl: string;
  pk: string;
}

export interface ClowderForeignSubstituteQueryOptions {
  mintBaseUrl: string;
  pk: string;
}

export type ClowderForeignSubstituteErrorKind = "noSubstitute" | "unknownNode" | "requestFailed";

export class ClowderForeignSubstituteError extends Error {
  constructor(
    message: string,
    readonly kind: ClowderForeignSubstituteErrorKind,
    readonly status: number
  ) {
    super(message);
    this.name = "ClowderForeignSubstituteError";
  }
}

/**
 * Queries a mint's public, unauthenticated `/v1/clowder/foreign/status/{pk}` endpoint directly
 * (not the dashboard's own admin API), since we only have credentials for our own mint and need
 * to ask foreign mints what they think about a given node.
 */
export function getClowderForeignStatusQueryOptions({ mintBaseUrl, pk }: ClowderForeignStatusQueryOptions) {
  return queryOptions<SimpleAlphaState>({
    queryKey: ["clowder-foreign-status", mintBaseUrl, pk],
    queryFn: async ({ signal }) => {
      const url = `${mintBaseUrl.replace(/\/$/, "")}/v1/clowder/foreign/status/${encodeURIComponent(pk)}`;
      const response = await fetch(url, { signal });

      if (!response.ok) {
        throw new Error(`Foreign status request to ${url} failed with status ${response.status}`);
      }

      const data = (await response.json()) as AlphaStateResponse;
      return data.state;
    },
  });
}

/**
 * Queries a Beta clowder for the elected substitute Beta of a foreign Alpha node.
 * This uses the public clowder endpoint directly until the deployment proxy exists.
 */
export function getClowderForeignSubstituteQueryOptions({ mintBaseUrl, pk }: ClowderForeignSubstituteQueryOptions) {
  return queryOptions<ConnectedMintResponse>({
    queryKey: ["clowder-foreign-substitute", mintBaseUrl, pk],
    queryFn: async ({ signal }) => {
      const url = `${mintBaseUrl.replace(/\/$/, "")}/v1/clowder/foreign/substitute/${encodeURIComponent(pk)}`;
      const response = await fetch(url, { signal });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const kind = errorText.includes("NoSubstitute")
          ? "noSubstitute"
          : errorText.includes("UnknownNode")
            ? "unknownNode"
            : "requestFailed";
        throw new ClowderForeignSubstituteError(
          `Foreign substitute request to ${url} failed with status ${response.status}`,
          kind,
          response.status
        );
      }

      return (await response.json()) as ConnectedMintResponse;
    },
  });
}

/**
 * Our own mint's public host is served on a different subdomain (`mint.`) than the admin API
 * (`api.`), so it can't be read from a single config value and has to be derived.
 */
export function deriveOwnMintBaseUrl(apiBaseUrl: string): string {
  try {
    const url = new URL(apiBaseUrl);
    url.hostname = url.hostname.replace(/^api\./, "mint.");
    return url.origin;
  } catch {
    return apiBaseUrl;
  }
}
