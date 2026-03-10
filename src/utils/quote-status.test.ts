import { describe, expect, it } from "vitest";
import { getQuoteStatusVariant } from "./quote-status";

describe("getQuoteStatusVariant", () => {
  it("maps offered and pending statuses to default", () => {
    expect(getQuoteStatusVariant("Offered")).toBe("default");
    expect(getQuoteStatusVariant("OfferExpired")).toBe("default");
    expect(getQuoteStatusVariant("Pending")).toBe("default");
  });

  it("maps accepted and minting statuses to success", () => {
    expect(getQuoteStatusVariant("Accepted")).toBe("success");
    expect(getQuoteStatusVariant("Minting")).toBe("success");
  });

  it("maps denied-like statuses to destructive", () => {
    expect(getQuoteStatusVariant("Denied")).toBe("destructive");
    expect(getQuoteStatusVariant("Canceled")).toBe("destructive");
    expect(getQuoteStatusVariant("Rejected")).toBe("destructive");
  });

  it("falls back to outline for unknown values", () => {
    expect(getQuoteStatusVariant("UnknownStatus")).toBe("outline");
  });
});
