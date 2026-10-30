import { fireEvent, getByRole } from "@testing-library/dom";
import { act } from "react";
import type { MintRecordEntry, PriorMintRecords } from "@bitcredit/ai-credit-shared";
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
function entry(record: MintRecordEntry["record"], reason: MintRecordEntry["reason"] = "applicant_request"): MintRecordEntry {
  return {
    schema: "mint-record-entry-v1",
    network: "regtest",
    issuer: { signingKey: "a".repeat(64), mintNodeId: `bitcrr03${"1".repeat(64)}`, name: "Mint A" },
    subject: { chain: "identity", nodeId: subject, companyNodeId: null },
    sequence: 1,
    previousEntryDigest: null,
    createdAt: at,
    reason,
    record,
    omissions: [{ section: "documents", reason: "File contents are not carried." }],
  };
}
const shared: PriorMintRecords = {
  choice: "shared",
  chosenAt: at,
  confirmation: { reply: { decision: "confirmed" }, confirmedAt: at },
  issuers: [
    {
      signingKey: "a".repeat(64),
      recognition: "followed",
      attribution: "statement_by_issuing_mint",
      latest: entry({
        claims: [{ claim: "Coffee farm", topic: "business", evidenceState: "applicant_statement", sources: [] }],
        identityCheck: [{ check: "Key control", method: "Core-signed admission", checkedAt: at, outcome: "signature_valid" }],
        instruments: [
          { billId: "bill-1", financedAt: null, maturityDate: null, outcome: "paid_late", daysLate: 3, recordedAt: at, billReferences: [] },
        ],
      }),
      history: [],
      disputes: [{ entryBlockId: 4, entryDigest: `sha256:${"0".repeat(64)}`, statement: "Paid on the due date.", createdAt: 1 }],
      sourceChecks: [{ check: "Applicant email control", result: "valid" }],
      identityReuse: { policyVersion: "portable-identity-review-v1", eligibleForReview: true, accountability: "receiving_mint" },
    },
  ],
  problems: [],
};

describe("records shared from earlier Mints", () => {
  it("shows each Mint's dated statements with their evidence state, the applicant's dispute and its reply", async () => {
    const { page } = await renderWithProviders(<PriorMintRecordsSection application={facilityFixture({ priorMintRecords: shared })} />);
    const text = page.textContent;
    expect(text).toContain("Shared from earlier Mints");
    expect(text).toContain("Mint you follow · as of Oct 30, 2026 · 0 entries");
    expect(text).toContain("Coffee farm · applicant statement");
    expect(text).toContain("Paid 3 days late");
    expect(text).toContain("Mint A checked “Key control” (Core-signed admission, signature valid) on Oct 30, 2026.");
    expect(text).toContain("accountability stays with this Mint");
    expect(text).toContain("Re-checked here: Applicant email control — signature valid");
    expect(text).toContain("The applicant disputes this record: Paid on the due date.");
    expect(text).toContain("The applicant confirmed this record is still correct.");
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
    const issued = {
      entry: JSON.stringify(entry({ chainReferences: { bills: [{ billId: "bill-1", blocks: [] }], identityProofs: [] } })),
      signature: "f".repeat(128),
      digest: `sha256:${"1".repeat(64)}`,
      sequence: 1,
    };
    const status = {
      subjectNodeId: subject,
      entries: [issued],
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
    expect(page.textContent).toContain("1 entry · latest Oct 30, 2026");
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
      issuers: shared.issuers.map((issuer) => ({
        ...issuer,
        latest: entry({
          financialInformation: [
            {
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
      })),
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
