import { describe, expect, it } from "vitest";
import { getEffectiveQuoteStatus, getQuoteStatusVariant, isQuotePollingCompleteStatus } from "./quote-status";

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
    expect(getQuoteStatusVariant("FailedEbillValidation")).toBe("destructive");
  });

  it("falls back to outline for unknown values", () => {
    expect(getQuoteStatusVariant("UnknownStatus")).toBe("outline");
  });
});

describe("getEffectiveQuoteStatus", () => {
  it("keeps terminal quote statuses unchanged", () => {
    expect(getEffectiveQuoteStatus("Accepted")).toBe("Accepted");
    expect(getEffectiveQuoteStatus("MintingEnabled")).toBe("MintingEnabled");
    expect(getEffectiveQuoteStatus("Denied")).toBe("Denied");
    expect(
      getEffectiveQuoteStatus("FailedEbillValidation", {
        status: { acceptance: { accepted: true } },
      } as never)
    ).toBe("FailedEbillValidation");
  });

  it("promotes non-terminal quotes to accepted when the ebill was accepted", () => {
    expect(
      getEffectiveQuoteStatus("Pending", {
        status: {
          acceptance: {
            accepted: true,
          },
        },
      } as never)
    ).toBe("Accepted");
  });

  it("leaves non-terminal quotes unchanged when the ebill was not accepted", () => {
    expect(
      getEffectiveQuoteStatus("Pending", {
        status: {
          acceptance: {
            accepted: false,
          },
        },
      } as never)
    ).toBe("Pending");
  });
});

describe("quote polling", () => {
  it("continues through accepted and stops on final or mint-enabled states", () => {
    expect(isQuotePollingCompleteStatus("Accepted")).toBe(false);
    expect(isQuotePollingCompleteStatus("MintingEnabled")).toBe(true);
    expect(isQuotePollingCompleteStatus("FailedEbillValidation")).toBe(true);
  });
});
