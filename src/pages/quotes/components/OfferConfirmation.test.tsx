import { PreferencesProvider } from "@/context/preferences/PreferencesContext";
import { fireEvent, screen } from "@testing-library/dom";
import Big from "big.js";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createIntl } from "react-intl";
import { fraudReason } from "@/pages/credit/fraud-controls-copy";
import { cleanup, renderWithProviders } from "@/pages/mint-checks/mint-check-test-render";
import type { OfferFormResult } from "./OfferFormDrawer";
import { OfferConfirmation } from "./OfferConfirmation";

vi.mock("@/components/Drawers", () => ({
  ConfirmDrawer: ({
    children,
    onSubmit,
    submitButtonDisabled,
  }: {
    children: React.ReactNode;
    onSubmit: () => void;
    submitButtonDisabled: boolean;
  }) => (
    <div>
      {children}
      <button disabled={submitButtonDisabled} onClick={onSubmit}>
        Confirm
      </button>
    </div>
  ),
}));
afterEach(cleanup);

const expiry = new Date("2099-01-01T23:59:59.999Z");
const offer: OfferFormResult = {
  governance: {
    billId: "bill-a",
    caseId: "case-a",
    decisionResultDigest: "digest",
    action: "confirm_proposed_quote",
    reasonCode: "operator_confirmed_governed_terms",
    writtenBasis: "Reviewed the case and current evidence",
  },
  discount: {
    days: 30,
    discountRate: new Big("0.1"),
    gross: { value: new Big(1000), currency: "sat" },
    net: { value: new Big(900), currency: "sat" },
  },
  ttl: { ttl: expiry },
  governedOfferExpiresAt: expiry,
};

describe("offer lock conflicts in the confirmation drawer", () => {
  it.each(["finance_lock_held_elsewhere", "finance_lock_check_incomplete"])(
    "keeps %s visible and prevents an unchanged retry",
    async (code) => {
      const onSubmit = vi.fn();
      const lockError = fraudReason(code, createIntl({ locale: "en" }));
      await renderWithProviders(
        <PreferencesProvider>
          <OfferConfirmation open onOpenChange={() => undefined} onSubmit={onSubmit} offerFormData={offer} lockError={lockError} />
        </PreferencesProvider>
      );
      expect(screen.getByRole("alert")).toHaveTextContent(
        code.endsWith("elsewhere") ? "operators cannot override it" : "verification required"
      );
      expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
      act(() => {
        fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      });
      expect(onSubmit).not.toHaveBeenCalled();
    }
  );
});
