import type { Id, IdBytes, KeySetVersion } from "@/generated/client/types.gen";

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
    console.error("Invalid Id object:", id);
    return "";
  }

  let bytes: number[];

  if ("V1" in id.id) {
    bytes = id.id.V1;
  } else if ("V2" in id.id) {
    bytes = id.id.V2;
  } else {
    console.error("Invalid IdBytes structure:", id.id);
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
