import type { Id, IdBytes, InfoReply, InfoReplyDiscriminants, KeySetVersion } from "@/generated/client/types.gen";
import { createLogger } from "@/lib/logger";

const logger = createLogger("keyset");

/**
 * Quote statuses whose `InfoReply` carries a `keyset_id`. A quote only gets a keyset
 * once it has been offered, so quotes in any other status belong to no keyset at all
 * and never need their details fetched when resolving a keyset's quotes.
 */
const KEYSET_BEARING_QUOTE_STATUSES = new Set<InfoReplyDiscriminants>(["Offered", "Accepted", "MintingEnabled", "FailedEbillValidation"]);

export function canQuoteHaveKeyset(status: InfoReplyDiscriminants): boolean {
  return KEYSET_BEARING_QUOTE_STATUSES.has(status);
}

/**
 * Serialized id of the keyset a quote was offered under, or null when it has none yet.
 */
export function getQuoteKeysetId(quoteDetails: InfoReply | undefined): string | null {
  if (!quoteDetails || !("keyset_id" in quoteDetails)) {
    return null;
  }

  const serializedId = serializeKeysetId(quoteDetails.keyset_id);

  return serializedId === "" ? null : serializedId;
}

/**
 * Whether a quote was offered under the given keyset. This is the authoritative link
 * between the two — never infer it from the bill maturity date, which only coincides
 * with the keyset expiry and is not a join key.
 */
export function doesQuoteBelongToKeyset(quoteDetails: InfoReply | undefined, keysetId: string): boolean {
  const quoteKeysetId = getQuoteKeysetId(quoteDetails);

  return quoteKeysetId !== null && quoteKeysetId.toLowerCase() === keysetId.toLowerCase();
}

/**
 * Serializes an Id object to a string format suitable for URLs.
 * Converts the byte array to a hex string.
 * If the id is already a string, returns it as-is.
 */
export function serializeKeysetId(id: Id | string): string {
  // If it's already a string, return it directly
  if (typeof id === "string") {
    return id;
  }

  // Handle the case where the id might be malformed
  if (!id.id) {
    logger.error("Invalid Id object", id);
    return "";
  }

  let bytes: number[];

  if ("V1" in id.id) {
    bytes = id.id.V1;
  } else if ("V2" in id.id) {
    bytes = id.id.V2;
  } else {
    logger.error("Invalid IdBytes structure", id.id);
    return "";
  }

  // Convert bytes to hex string
  const hexString = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Prepend version info (00 for Version00, 01 for Version01)
  const versionPrefix = id.version === "Version00" ? "00" : "01";

  return `${versionPrefix}${hexString}`;
}

export function deserializeKeysetId(serializedId: string): Id | null {
  if (serializedId.length < 4 || serializedId.length % 2 !== 0) {
    return null;
  }

  const versionByPrefix: Record<string, KeySetVersion> = {
    "00": "Version00",
    "01": "Version01",
  };
  const version = versionByPrefix[serializedId.slice(0, 2)];

  if (!version) {
    return null;
  }

  const hexBytes = serializedId.slice(2);
  const bytes: number[] = [];

  const validHexByte = /^[0-9a-fA-F]{2}$/;

  for (let index = 0; index < hexBytes.length; index += 2) {
    const chunk = hexBytes.slice(index, index + 2);

    if (!validHexByte.test(chunk)) {
      return null;
    }

    bytes.push(Number.parseInt(chunk, 16));
  }

  const id: IdBytes = version === "Version00" ? { V1: bytes } : { V2: bytes };

  return { version, id };
}
