import { Id } from "@/generated/client/types.gen";

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
