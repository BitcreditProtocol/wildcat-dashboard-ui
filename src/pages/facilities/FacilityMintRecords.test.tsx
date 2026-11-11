import { fireEvent, getByRole } from "@testing-library/dom";
import { act } from "react";
import { foldMintRecordEntries, type MintRecordEntry, type PriorMintRecords } from "@bitcredit/ai-credit-shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, flush, json, renderWithProviders, requestBody, routeFetch } from "@/pages/mint-checks/mint-check-test-render";
import { MintRecordStatusSection, PriorMintRecordsSection } from "./FacilityMintRecords";
import { facilityFixture } from "./facility-test-fixture";

vi.mock("@/lib/api-client", () => ({ authenticatedFetch: (path: string, init?: RequestInit) => fetch(path, init) }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const subject = `bitcrr02${"c".repeat(64)}`;
const at = "2026-10-30T12:00:00.000Z";
const later = "2026-11-05T09:00:00.000Z";
function entry(
  record: MintRecordEntry["record"],
  {
    reason = "applicant_request",
    sequence = 1,
    name = "Mint A",
    key = "a",
  }: Partial<Pick<MintRecordEntry, "reason" | "sequence">> & {
    name?: string;
    key?: string;
  } = {}
): MintRecordEntry {
  return {
    schema: "mint-record-entry-v1",
    network: "regtest",
    issuer: { signingKey: key.repeat(64), mintNodeId: `bitcrr03${"1".repeat(64)}`, name },
    subject: { chain: "identity", nodeId: subject, companyNodeId: null },
    sequence,
    previousEntryDigest: sequence === 1 ? null : `sha256:${String(sequence - 1).repeat(64)}`,
    createdAt: sequence === 1 ? at : later,
    reason,
    record,
    omissions: [{ section: "documents", reason: "File contents are not carried." }],
  };
}
function signed(value: MintRecordEntry) {
  return {
    entry: JSON.stringify(value),
    signature: "f".repeat(128),
    digest: `sha256:${String(value.sequence).repeat(64)}`,
    sequence: value.sequence,
  };
}
type Issuer = PriorMintRecords["issuers"][number];
/** An issuer as AI-Credit hands it over: its exact signed history and the current record folded from it alone. */
function issuer(entries: MintRecordEntry[], rest: Partial<Issuer> = {}): Issuer {
  return {
    signingKey: entries[0].issuer.signingKey,
    recognition: "followed",
    attribution: "statement_by_issuing_mint",
    current: foldMintRecordEntries(entries),
    history: entries.map(signed),
    disputes: [],
    sourceChecks: [],
    identityReuse: { policyVersion: "portable-identity-review-v1", eligibleForReview: false, accountability: "receiving_mint" },
    ...rest,
  };
}
const proofSignature = "3yZe7d".repeat(10);
const mintA = issuer(
  [
    entry({
      identityProofs: [{ id: "proof:1", signature: proofSignature, issuedAt: at }],
      identityCheck: [
        {
          id: "check:phone",
          check: "Phone number not available, as the applicant stated",
          method: "Applicant profile exception; not independent identity verification",
          checkedAt: at,
          outcome: "not_applicable",
        },
      ],
      claims: [{ id: "claim:business", claim: "Coffee farm", topic: "business", evidenceState: "applicant_statement", sources: [] }],
      instruments: [{ id: "instrument:1", billId: "bill-internal-1", outcome: "unknown", recordedAt: null }],
    }),
    entry(
      {
        claims: [
          { id: "claim:business", claim: "Coffee and cacao farm", topic: "business", evidenceState: "applicant_confirmed", sources: [] },
        ],
        instruments: [{ id: "instrument:1", billId: "bill-internal-1", outcome: "paid_late", daysLate: 3, recordedAt: later }],
      },
      { reason: "instrument_outcome", sequence: 2 }
    ),
  ],
  {
    disputes: [{ entryBlockId: 4, entryDigest: `sha256:${"2".repeat(64)}`, statement: "Paid on the due date.", createdAt: 1 }],
    sourceChecks: [
      { itemId: "proof:1", check: "Email identity proof", result: "valid", email: "ana@finca.example" },
      { itemId: "verification:1", check: "Tax registration", result: "unsupported" },
    ],
    identityReuse: { policyVersion: "portable-identity-review-v1", eligibleForReview: true, accountability: "receiving_mint" },
  }
);
const mintB = issuer(
  [
    entry(
      { claims: [{ id: "claim:business", claim: "Cattle ranch", topic: "business", evidenceState: "applicant_statement", sources: [] }] },
      { name: "Mint B", key: "b" }
    ),
  ],
  { recognition: "directory" }
);
const shared: PriorMintRecords = {
  choice: "shared",
  chosenAt: at,
  confirmation: { reply: { decision: "confirmed" }, confirmedAt: at },
  issuers: [mintA],
  problems: [],
};

describe("records shared from earlier Mints", () => {
  it("shows a Mint's current record, attributed and dated, with its email proof, bill outcomes, disputes and the reply", async () => {
    const { page } = await renderWithProviders(<PriorMintRecordsSection application={facilityFixture({ priorMintRecords: shared })} />);
    const text = page.textContent;
    expect(text).toContain("Shared from earlier Mints");
    expect(text).toContain("Mint A");
    expect(text).toContain("Mint you follow · as of Nov 5, 2026 · 2 entries");
    expect(text).toContain("ana@finca.example confirmed by Mint A · Oct 30, 2026 · proof valid");
    expect(text).toContain("Phone number not available, as the applicant stated · Oct 30, 2026");
    expect(text).toContain("You may review Mint A's recent identity checks under your policy; accountability stays with this Mint.");
    // The folded record: the corrected claim replaces the first, the recorded outcome replaces "unknown".
    expect(text).toContain("Coffee and cacao farm · confirmed by the applicant");
    expect(text).not.toContain("Coffee farm ·");
    expect(text).toContain("Bill: Paid 3 days late · Nov 5, 2026");
    expect(text).not.toContain("Not recorded");
    expect(text).toContain("Re-checked here: Tax registration — cannot be checked here");
    expect(text).not.toContain("Re-checked here: Email identity proof");
    expect(text).toContain("The applicant disputes this record: Paid on the due date.");
    expect(text).toContain("The applicant confirmed this record is still correct.");
    expect(page.querySelector("[aria-label='Shared records by Mint']")).toBeNull();
  });

  it("never shows internal ids, keys, digests or proof signatures", async () => {
    const { page } = await renderWithProviders(<PriorMintRecordsSection application={facilityFixture({ priorMintRecords: shared })} />);
    const text = page.textContent;
    for (const hidden of ["bill-internal-1", "instrument:1", "claim:business", "proof:1", proofSignature, "a".repeat(64), "sha256:"])
      expect(text).not.toContain(hidden);
  });

  it("shows one issuing Mint at a time, never two records together", async () => {
    const { page } = await renderWithProviders(
      <PriorMintRecordsSection application={facilityFixture({ priorMintRecords: { ...shared, issuers: [mintA, mintB] } })} />
    );
    const selector = page.querySelector("[aria-label='Shared records by Mint']")!;
    expect(getByRole(selector as HTMLElement, "button", { name: "Mint A" }).getAttribute("aria-pressed")).toBe("true");
    expect(page.textContent).toContain("Coffee and cacao farm");
    expect(page.textContent).not.toContain("Cattle ranch");
    act(() => {
      fireEvent.click(getByRole(selector as HTMLElement, "button", { name: "Mint B" }));
    });
    expect(page.textContent).toContain("Cattle ranch");
    expect(page.textContent).toContain("Listed in the public directory · as of Oct 30, 2026 · 1 entry");
    expect(page.textContent).not.toContain("Coffee and cacao farm");
    expect(page.textContent).not.toContain("confirmed by Mint A");
  });

  it("does not attach a recheck result to an email proof when no result names it", async () => {
    const unmatched = { ...mintA, sourceChecks: [{ itemId: "proof:other", check: "Email identity proof", result: "valid" as const }] };
    const { page } = await renderWithProviders(
      <PriorMintRecordsSection application={facilityFixture({ priorMintRecords: { ...shared, issuers: [unmatched] } })} />
    );
    expect(page.textContent).toContain("Email confirmed by Mint A · Oct 30, 2026");
    expect(page.textContent).not.toContain("proof valid");
  });

  it("shows nothing when the applicant started from scratch", async () => {
    const { page } = await renderWithProviders(
      <PriorMintRecordsSection
        application={facilityFixture({ priorMintRecords: { choice: "fresh", chosenAt: at, issuers: [], problems: [] } })}
      />
    );
    expect(page.querySelector("section")).toBeNull();
  });
});

describe("this Mint's own record", () => {
  it("lists disputes it received and records how a bill was repaid as a new entry", async () => {
    // The second entry carries only what is new; bill-1 comes from the first.
    const first = signed(entry({ instruments: [{ id: "instrument:1", billId: "bill-1", outcome: "unknown", recordedAt: null }] }));
    const issued = signed(
      entry({ instruments: [{ id: "instrument:2", billId: "bill-2", outcome: "unknown", recordedAt: null }] }, { sequence: 2 })
    );
    const status = {
      subjectNodeId: subject,
      entries: [first, issued],
      disputes: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          entryDigest: issued.digest,
          statement: "Wrong buyer.",
          createdAt: at,
          status: "received",
        },
      ],
      outcomes: [],
      woundDown: false,
    };
    const request = vi.fn(routeFetch({ "/api/ai-credit/mint-record-operator-command": () => json(status) }));
    vi.stubGlobal("fetch", request);
    const { page } = await renderWithProviders(<MintRecordStatusSection application={facilityFixture({ applicantRef: subject })} />);
    expect(requestBody(request.mock.calls[0]?.[1])).toEqual({ action: "read", subjectNodeId: subject });
    expect(page.textContent).toContain("2 entries · latest Nov 5, 2026");
    const bills = [...page.querySelectorAll("option")].map((option) => option.getAttribute("value"));
    expect(bills).toEqual(expect.arrayContaining(["bill-1", "bill-2"]));
    expect(page.textContent).toContain("Disputed on Oct 30, 2026: Wrong buyer.");
    const outcome = page.querySelector("select[aria-label='Repayment']")!;
    act(() => {
      fireEvent.change(outcome, { target: { value: "paid_late" } });
    });
    act(() => {
      fireEvent.change(page.querySelector("input[aria-label='Days late']")!, { target: { value: "5" } });
    });
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Record" }));
    });
    await flush();
    expect(requestBody(request.mock.calls[1]?.[1])).toMatchObject({
      action: "record_outcome",
      subjectNodeId: subject,
      outcome: { billId: "bill-1", outcome: "paid_late", daysLate: 5 },
    });
  });
});

describe("details and failures", () => {
  it("shows a shared figure exactly, with its period and evidence state", async () => {
    const withFigure: PriorMintRecords = {
      ...shared,
      issuers: [
        issuer([
          entry({
            financialInformation: [
              {
                id: "figure:revenue",
                kind: "statement",
                field: "revenue",
                value: "100000000000000001",
                currency: "GTQ",
                minorUnitScale: 2,
                evidenceState: "applicant_confirmed",
                suppliedAt: at,
                period: { startDate: "2025-01-01", endDate: "2025-12-31" },
              },
            ],
          }),
        ]),
      ],
    };
    const { page } = await renderWithProviders(<PriorMintRecordsSection application={facilityFixture({ priorMintRecords: withFigure })} />);
    expect(page.textContent).toContain("1,000,000,000,000,000.01 GTQ");
    expect(page.textContent).toContain("2025-01-01 – 2025-12-31 · confirmed by the applicant");
  });

  it("says when this Mint's record status cannot be read, with a retry", async () => {
    const request = vi.fn(routeFetch({ "/api/ai-credit/mint-record-operator-command": () => json({ error: "Unavailable" }, 503) }));
    vi.stubGlobal("fetch", request);
    const { page } = await renderWithProviders(<MintRecordStatusSection application={facilityFixture({ applicantRef: subject })} />);
    expect(page.textContent).toContain("This Mint's record status could not be read.");
    act(() => {
      fireEvent.click(getByRole(page, "button", { name: "Try again" }));
    });
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
