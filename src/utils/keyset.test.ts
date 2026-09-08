import { describe, expect, it, vi } from "vitest";
import { canQuoteHaveKeyset, doesQuoteBelongToKeyset, getQuoteKeysetId, serializeKeysetId } from "./keyset";

const keysetIdObject = { version: "Version00", id: { V1: [0xaa, 0xbb] } };

describe("canQuoteHaveKeyset", () => {
  it("accepts the statuses whose reply carries a keyset id", () => {
    expect(["Offered", "Accepted", "MintingEnabled", "FailedEbillValidation"].every((s) => canQuoteHaveKeyset(s as never))).toBe(true);
  });

  it("rejects statuses reached before or without an offer", () => {
    expect(["Pending", "Canceled", "OfferExpired", "Denied", "Rejected"].some((s) => canQuoteHaveKeyset(s as never))).toBe(false);
  });
});

describe("getQuoteKeysetId", () => {
  it("returns the serialized keyset id", () => {
    expect(getQuoteKeysetId({ keyset_id: keysetIdObject } as never)).toBe("00aabb");
  });

  it("returns null for a quote that has no keyset yet", () => {
    expect(getQuoteKeysetId({ status: "Pending" } as never)).toBeNull();
    expect(getQuoteKeysetId(undefined)).toBeNull();
  });
});

describe("doesQuoteBelongToKeyset", () => {
  it("matches on the keyset id", () => {
    expect(doesQuoteBelongToKeyset({ keyset_id: keysetIdObject } as never, "00aabb")).toBe(true);
  });

  it("ignores hex casing", () => {
    expect(doesQuoteBelongToKeyset({ keyset_id: keysetIdObject } as never, "00AABB")).toBe(true);
  });

  it("does not match a different keyset", () => {
    expect(doesQuoteBelongToKeyset({ keyset_id: keysetIdObject } as never, "00ccdd")).toBe(false);
  });

  it("does not match a quote without a keyset", () => {
    expect(doesQuoteBelongToKeyset({ status: "Pending" } as never, "00aabb")).toBe(false);
  });
});

describe("serializeKeysetId", () => {
  it("returns input as-is when id is already a string", () => {
    expect(serializeKeysetId("abc123")).toBe("abc123");
  });

  it("serializes Version00 with V1 bytes", () => {
    const id = { version: "Version00", id: { V1: [0, 1, 255] } };
    expect(serializeKeysetId(id as never)).toBe("000001ff");
  });

  it("serializes Version01 with V2 bytes", () => {
    const id = { version: "Version01", id: { V2: [10, 11, 12] } };
    expect(serializeKeysetId(id as never)).toBe("010a0b0c");
  });

  it("returns empty string for malformed id payload", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const id = { version: "Version00" };

    expect(serializeKeysetId(id as never)).toBe("");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("returns empty string when id bytes shape is invalid", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const id = { version: "Version00", id: { invalid: [1, 2, 3] } };

    expect(serializeKeysetId(id as never)).toBe("");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
