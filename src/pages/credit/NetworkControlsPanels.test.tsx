import { fireEvent, screen, within } from "@testing-library/dom";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createIntl } from "react-intl";
import { fraudCaseFixture, operator } from "./fraud-controls-test-fixtures";
import { crossMintFixture, mintKey, relayCoverage } from "./network-controls-test-fixtures";
import { BuyerRegistrationPanel, CrossMintEvidencePanel, FinanceLocksPanel } from "./NetworkControlsPanels";
import { cleanup, flush, json, renderWithProviders, requestBody } from "@/pages/mint-checks/mint-check-test-render";
import { requestReason } from "./verification-reasons";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function withLocks(status: "clear" | "held-elsewhere" | "incomplete" = "held-elsewhere") {
  const one = fraudCaseFixture();
  if (!one.snapshot.fraudControls) throw new Error("fixture missing fraud controls");
  one.snapshot.fraudControls.financeLocks = {
    status,
    instruments: [
      { scope: "bill", lockKey: "bill-lock-digest", state: "reserved", holder: "us", coverage: [relayCoverage] },
      {
        scope: "invoice",
        lockKey: "invoice-lock-digest",
        state: "financed",
        holder: "other_mint",
        coverage: [{ ...relayCoverage, relay: "ws://mint-c.test", reachable: false, eose: false, capped: true, error: "timeout" }],
      },
    ],
  };
  return one;
}

describe("finance locks", () => {
  it("separates bill and invoice holders and shows coverage without an override", async () => {
    await renderWithProviders(<FinanceLocksPanel decisionCase={withLocks()} capability={operator} />);
    const bill = screen.getByRole("region", { name: "Bill lock" });
    const invoice = screen.getByRole("region", { name: "Invoice lock" });
    expect(bill).toHaveTextContent("Reserved · offer open · Held by this Mint");
    expect(bill).toHaveTextContent("end of stored events received · not capped");
    expect(invoice).toHaveTextContent("Financed lock · Mint statement · Held by another Mint");
    expect(invoice).toHaveTextContent("unreachable · query incomplete · capped · timeout");
    expect(invoice).toHaveTextContent("hard gate; operators cannot override it");
    expect(invoice).toHaveTextContent("release the lock or it must expire");
    expect(screen.getByRole("button", { name: "Retry current lock checks" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /override|waive/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Mints outside this set are not covered/)).toBeInTheDocument();
  });

  it.each(["bill", "invoice"] as const)("retains the non-waivable gate for another Mint's %s lock", async (scope) => {
    const one = withLocks();
    if (one.snapshot.fraudControls?.financeLocks)
      one.snapshot.fraudControls.financeLocks.instruments = [
        { scope, lockKey: "other-lock", state: "reserved", holder: "other_mint", coverage: [relayCoverage] },
      ];
    await renderWithProviders(<FinanceLocksPanel decisionCase={one} capability={operator} />);
    const panel = screen.getByRole("region", { name: scope === "bill" ? "Bill lock" : "Invoice lock" });
    expect(panel).toHaveTextContent("Held by another Mint");
    expect(panel).toHaveTextContent("hard gate; operators cannot override it");
  });

  it("treats incomplete coverage as verification and retries with the exact snapshot binding", async () => {
    const fetch = vi.fn().mockResolvedValue(json({}));
    vi.stubGlobal("fetch", fetch);
    const one = withLocks("incomplete");
    await renderWithProviders(<FinanceLocksPanel decisionCase={one} capability={operator} />);
    expect(screen.getByRole("region", { name: "Instrument finance locks" })).toHaveTextContent("verification required");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Retry current lock checks" }));
    });
    await flush();
    expect(fetch).toHaveBeenCalledWith("/api/ai-credit/operator-verifications", expect.anything());
    expect(requestBody(fetch.mock.calls[0]?.[1] as RequestInit)).toEqual({
      action: "retry_current_sources",
      billId: "bill-a",
      caseId: one.snapshot.caseId,
      decisionResultDigest: one.resultDigest,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Review the refreshed case snapshot");
  });

  it("keeps retry errors visible and requires an authenticated capability", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    await renderWithProviders(<FinanceLocksPanel decisionCase={withLocks("incomplete")} capability={operator} />);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Retry current lock checks" }));
    });
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("could not be refreshed");
    cleanup();
    await renderWithProviders(<FinanceLocksPanel decisionCase={withLocks("incomplete")} />);
    expect(screen.getByRole("button", { name: "Retry current lock checks" })).toBeDisabled();
  });

  it("does not imply clearance for missing invoice or legacy lock observations", async () => {
    const one = withLocks("clear");
    if (one.snapshot.fraudControls?.financeLocks)
      one.snapshot.fraudControls.financeLocks.instruments = [
        { scope: "bill", lockKey: "digest", state: "clear", holder: "none", coverage: [] },
      ];
    await renderWithProviders(<FinanceLocksPanel decisionCase={one} />);
    expect(screen.getByRole("region", { name: "Bill lock" })).toHaveTextContent("No holder observed");
    expect(screen.getByRole("region", { name: "Bill lock" })).toHaveTextContent("Relay coverage unavailable");
    expect(screen.getByRole("region", { name: "Invoice lock" })).toHaveTextContent("no clearance is implied");
    cleanup();
    await renderWithProviders(<FinanceLocksPanel decisionCase={fraudCaseFixture()} />);
    expect(screen.getByRole("region", { name: "Instrument finance locks" })).toHaveTextContent("Not recorded in this snapshot");
  });

  it.each(["finance_lock_held_elsewhere", "finance_lock_check_incomplete"])("labels governed reason %s", (reasonCode) => {
    const text = requestReason({ reasonCode, axis: "transaction_integrity" }, createIntl({ locale: "en" }));
    expect(text).not.toBe(reasonCode);
    expect(text).toContain(reasonCode.endsWith("elsewhere") ? "hard gate" : "verification required");
  });
});

describe("buyer registration comparison", () => {
  it.each([
    ["match", "Registration matches"],
    ["mismatch", "Registration differs · ask for clarification"],
    ["no_listing", "No public registration listing observed"],
    ["no_register", "No valid register buyer record available"],
  ] as const)("shows %s without an adverse finding", async (status, label) => {
    const one = fraudCaseFixture();
    if (one.snapshot.fraudControls) one.snapshot.fraudControls.buyerRegistration = status;
    await renderWithProviders(<BuyerRegistrationPanel decisionCase={one} />);
    const panel = screen.getByRole("region", { name: "Buyer registration comparison" });
    expect(panel).toHaveTextContent(label);
    expect(panel).toHaveTextContent("buyer-node");
    expect(panel).toHaveTextContent("A reason to ask, never a finding; no listing is required");
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("cross Mint evidence", () => {
  it("attributes scoped observations and signature to the issuer without upgrading evidence or issued value", async () => {
    const one = fraudCaseFixture();
    const evidence = crossMintFixture();
    if (one.snapshot.fraudControls) one.snapshot.fraudControls.crossMint = [evidence];
    await renderWithProviders(<CrossMintEvidencePanel decisionCase={one} />);
    const panel = screen.getByRole("region", { name: "Cross-Mint evidence" });
    for (const text of [
      `Mint ${mintKey} states: bill seen in its quote book`,
      "Scope: bill bill-a",
      "1 records",
      "Partial coverage",
      "As of",
      "valid until",
      "Within its stated validity period",
      "Signature verified by the service",
      "Revocation status is not exposed",
      "Acquisition recorded: no",
      "Issuance: unknown",
      "Repayment: unknown",
      "Quoted state: Offered",
      "Never a gate by themselves",
      "creates no adverse inference",
      "An offer elsewhere is not financed exposure",
    ])
      expect(panel).toHaveTextContent(text);
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("marks expired retained snapshots and keeps a scoped no match distinct from clearance", async () => {
    const one = fraudCaseFixture();
    const evidence = crossMintFixture();
    evidence.attestation.validUntil = Math.floor(Date.now() / 1000) - 1;
    evidence.attestation.observations.seen = "not_found_in_scope";
    evidence.attestation.coverage = "complete_for_scope";
    if (one.snapshot.fraudControls) one.snapshot.fraudControls.crossMint = [evidence];
    await renderWithProviders(<CrossMintEvidencePanel decisionCase={one} />);
    expect(screen.getByRole("article")).toHaveTextContent("Expired · do not rely on this assertion");
    expect(screen.getByRole("article")).toHaveTextContent("bill not found in its stated scope");
    expect(screen.getByRole("article")).toHaveTextContent("Complete for the stated scope");
  });

  it("updates expiry while a saved snapshot stays open", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const one = fraudCaseFixture();
    const evidence = crossMintFixture();
    evidence.attestation.validUntil = Math.floor(Date.now() / 1000) + 2;
    if (one.snapshot.fraudControls) one.snapshot.fraudControls.crossMint = [evidence];
    await renderWithProviders(<CrossMintEvidencePanel decisionCase={one} />);
    expect(screen.getByRole("article")).toHaveTextContent("Within its stated validity period");
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("article")).toHaveTextContent("Expired · do not rely on this assertion");
  });

  it("makes no adverse inference when optional evidence is absent", async () => {
    await renderWithProviders(<CrossMintEvidencePanel decisionCase={fraudCaseFixture()} />);
    expect(screen.getByRole("region", { name: "Cross-Mint evidence" })).toHaveTextContent("No usable cross-Mint attestation");
    expect(screen.getByRole("region", { name: "Cross-Mint evidence" })).toHaveTextContent(
      "Refusal, revocation, silence, no match or unavailable history creates no adverse inference"
    );
  });
});
