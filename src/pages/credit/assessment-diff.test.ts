import { describe, expect, it } from "vitest";
import type { AssessmentRevision, AxisStatus } from "./decision-types";
import { assessmentChanges } from "./assessment-diff";

const axes = [
  "instrument_eligibility",
  "acceptor_repayment_risk",
  "transaction_integrity",
  "applicant_recourse_risk",
  "evidence_sufficiency",
  "mint_exposure_capacity",
];

function revision(status: AxisStatus, blocked: boolean): AssessmentRevision {
  const snapshotDigest = `sha256:${(blocked ? "a" : "b").repeat(64)}`;
  return {
    snapshot: {
      schemaVersion: "decision-input-snapshot-v9",
      snapshotDigest,
      caseId: "case-1",
      applicantRef: "applicant-1",
      mintId: "mint-1",
      asOfDate: "2026-08-29",
      product: "product-1",
      country: "GT",
      industry: "coffee",
      isSynthetic: true,
      confirmedClaims: {
        useOfFunds: "Harvest",
        acceptorRef: "acceptor-1",
        repaymentSource: "Coffee sale",
        wholeFaceRecourseAcknowledged: !blocked,
        evidenceState: "applicant_confirmed",
      },
      contradictions: [],
      bill: null,
      invoice: null,
      acceptor: { probabilityOfDefaultBps: null, lossGivenDefaultBps: null, evidenceState: "unavailable", validThrough: "2026-08-29" },
      duplicateCheck: { result: "clear", evidenceState: "independently_verified", validThrough: "2026-08-29" },
      mintCapacity: { existingExposureSat: null, exposureLimitSat: null, evidenceState: "unavailable", validThrough: "2026-08-29" },
    },
    result: {
      assessmentStatus: blocked ? "blocked_pending_verification" : "ready_for_decision",
      recommendation: blocked ? null : "offer_available",
      axes: axes.map((axis) => ({ axis, status, reasonCodes: [] })),
      terms: blocked
        ? null
        : {
            billSumSat: "8000000",
            discountedSat: "7700000",
            appliedDiscountSat: "250000",
            operatingCostSat: "50000",
            effectiveFeeSat: "300000",
            endorsementExposureSat: "8000000",
            maturityDate: "2027-02-28",
            offerExpiresOn: "2026-09-01",
            tenorDays: 183,
            annualDiscountBps: 620,
            effectiveAnnualBps: 780,
            feeRatioBps: 375,
          },
      verificationRequests: blocked
        ? [
            {
              code: "applicant_recourse",
              axis: "applicant_recourse_risk",
              requiredItem: "Acknowledge whole-face recourse",
              reasonCode: "verification_recourse_required",
              owner: "applicant",
              resolutionAction: "request_applicant_information",
            },
          ]
        : [],
      reasonCodes: [],
      assessmentTrace: [],
      calculationTrace: [],
    },
    resultDigest: `sha256:${(blocked ? "c" : "d").repeat(64)}`,
  };
}

describe("assessmentChanges", () => {
  it("returns only allowlisted semantic changes", () => {
    const changes = assessmentChanges(revision("blocked", true), revision("pass", false));

    expect(changes).toContainEqual({
      field: "required_information",
      before: "Acknowledge whole-face recourse",
      after: "",
    });
    expect(changes).toContainEqual({ field: "amount_available", before: "", after: "7700000" });
    expect(changes.filter(({ field }) => field === "axis")).toHaveLength(5);
    expect(changes.map(({ field }) => field)).not.toContain("snapshotDigest");
  });

  it("shows changed applicant claims and exact document lineage", () => {
    const previous = revision("pass", false);
    const current = structuredClone(previous);
    current.snapshot.confirmedClaims.useOfFunds = "Harvest and transport";
    current.snapshot.confirmedClaims.acceptorRef = "acceptor-2";
    current.snapshot.confirmedClaims.repaymentSource = "Export proceeds";
    current.snapshot.confirmedClaims.evidenceState = "applicant_uploaded";
    current.submittedEvidence = [
      {
        reference: "corrected-invoice.pdf",
        label: "corrected-invoice.pdf",
        contentDigest: `sha256:${"e".repeat(64)}`,
        origin: "applicant_upload",
      },
    ];

    expect(assessmentChanges(previous, current)).toEqual([
      { field: "use_of_funds", before: "Harvest", after: "Harvest and transport" },
      { field: "acceptor", before: "acceptor-1", after: "acceptor-2" },
      { field: "repayment_source", before: "Coffee sale", after: "Export proceeds" },
      { field: "claim_evidence", before: "applicant_confirmed", after: "applicant_uploaded" },
      { field: "document_count", before: "0", after: "1" },
      {
        field: "documents",
        before: "",
        after: `corrected-invoice.pdf [corrected-invoice.pdf] sha256:${"e".repeat(64)}`,
      },
    ]);
  });

  it("shows an invoice correction without upgrading unconfirmed evidence", () => {
    const previous = revision("blocked", true);
    const current = structuredClone(previous);
    previous.snapshot.bill = {
      billId: "bill-1",
      billStateDigest: `sha256:${"1".repeat(64)}`,
      acceptanceState: "accepted",
      holderRef: "holder-1",
      acceptorRef: "acceptor-1",
      faceValueSat: "8600000",
      acceptedDate: "2026-08-29",
      maturityDate: "2027-02-25",
      alreadyFinanced: false,
    };
    current.snapshot.bill = structuredClone(previous.snapshot.bill);
    previous.snapshot.invoice = {
      reference: "invoice-before",
      invoiceNumber: "before",
      goodsDescription: "Coffee inputs",
      sellerRef: "seller",
      buyerRef: "buyer",
      issueDate: "2026-08-29",
      totalSat: "8000000",
      plausibility: "unknown",
      billAndClaimsConsistency: "mismatch",
      evidenceState: "unconfirmed",
      methodologyVersion: "invoice-v1",
      assessedBy: "extractor",
      validThrough: "2026-09-29",
    };
    current.snapshot.invoice = { ...previous.snapshot.invoice, reference: "invoice-after", totalSat: "8600000" };

    expect(assessmentChanges(previous, current)).toEqual(
      expect.arrayContaining([
        { field: "invoice_amount", before: "8000000", after: "8600000" },
        { field: "invoice_amount_vs_bill", before: "mismatch", after: "match" },
      ])
    );
    expect(current.snapshot.invoice.evidenceState).toBe("unconfirmed");
  });
});
