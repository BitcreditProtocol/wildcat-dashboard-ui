import { describe, expect, it } from "vitest";
import { getNextKeysetPageOffset, getPageKeysets, type KeysetListPage } from "./keyset-pages";

function page(ids: string[], total: number): KeysetListPage {
  return {
    data: ids.map((id) => ({ id, unit: "Sat" as const, active: true, final_expiry: null })),
    total,
  };
}

describe("getPageKeysets", () => {
  it("returns an empty list for a missing page", () => {
    expect(getPageKeysets(undefined)).toEqual([]);
  });

  it("returns the keysets of a page", () => {
    expect(getPageKeysets(page(["a", "b"], 2)).map((keyset) => keyset.id)).toEqual(["a", "b"]);
  });
});

describe("getNextKeysetPageOffset", () => {
  it("offsets by the number of loaded keysets while some are missing", () => {
    const first = page(["a", "b"], 5);

    expect(getNextKeysetPageOffset(first, [first])).toBe(2);
  });

  it("stops once every keyset is loaded", () => {
    const first = page(["a", "b"], 4);
    const second = page(["c", "d"], 4);

    expect(getNextKeysetPageOffset(second, [first, second])).toBeUndefined();
  });

  it("stops on an empty page even when the total claims more keysets", () => {
    const first = page(["a"], 9);
    const second = page([], 9);

    expect(getNextKeysetPageOffset(second, [first, second])).toBeUndefined();
  });
});
