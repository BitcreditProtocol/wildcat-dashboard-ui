import { fraudControlsSchema, type BuyerConfirmation, type FraudControls } from "@bitcredit/ai-credit-shared";
import type { DecisionCase } from "./decision-types";

export const operator = { ready: true, operatorId: "operator-a", operatorRole: "reviewer" } as const;
export const documentId = "A1000000-0000-4000-8000-000008000000";
const digest = `sha256:${"a".repeat(64)}`;
const field = <T>(value: T) => ({ value, source: "tax_authority_register", state: "independently_verified" });

export function confirmationFixture(outcome: BuyerConfirmation["outcome"] = "confirmed_obligation"): BuyerConfirmation {
  return {
    billId: "bill-a",
    draweeNodeId: "buyer-node",
    method: "phone",
    contactSource: "public_registry",
    contactReference: "Public register entry 42",
    outcome,
    note: "Reached the purchasing manager independently.",
    performedAt: "2026-10-27T12:00:00.000Z",
    operatorId: "operator-a",
    operatorRole: "reviewer",
    recordedAt: "2026-10-27T12:01:00.000Z",
  };
}

export function fraudFixture(): FraudControls {
  return fraudControlsSchema.parse({
    schemaVersion: "mint-fraud-controls-v1",
    taxAuthority: {
      status: "valid",
      documentId,
      authorityStamp: null,
      signedDocument: {
        keyId: "synthetic-register",
        signatureAlgorithm: "Ed25519",
        signature: `${"a".repeat(86)}==`,
        document: {
          schema: "tax-authority-document-v1",
          country: "GT",
          register: "sat-gt-synthetic",
          documentId,
          authorityStamp: null,
          status: "valid",
          issuer: { taxId: "ISSUER-42", name: "Synthetic coffee farm" },
          receiver: { taxId: "BUYER-99", name: "Synthetic buyer" },
          issueDate: "2026-10-28",
          currency: "GTQ",
          minorUnitScale: 2,
          totalMinor: "6160000",
          taxMinor: "660000",
          lines: [{ description: "Coffee beans", totalMinor: "6160000" }],
          checkedAt: "2026-10-28T10:00:00.000Z",
          synthetic: true,
        },
      },
      record: {
        schemaVersion: "invoice-record-v2",
        documentId: field(documentId),
        issueDate: field("2026-10-28"),
        sellerName: field("Synthetic coffee farm"),
        sellerTaxId: field("ISSUER-42"),
        buyerName: field("Synthetic buyer"),
        buyerTaxId: field("BUYER-99"),
        currency: field("GTQ"),
        minorUnitScale: field(2),
        totalWithTaxMinor: field("6160000"),
        taxTotalMinor: field("660000"),
        lines: { value: [{ description: "Coffee beans", totalMinor: "6160000" }], source: "model_extraction", state: "unconfirmed" },
      },
      pdfConsistency: "match",
      amountConsistency: "match",
      fxSnapshotDigest: digest,
    },
    exposure: {
      schemaVersion: "mint-counterparty-exposure-v1",
      drawee: { nodeId: "buyer-node", exposureSat: "14000000" },
      drawer: { nodeId: "drawer-node", exposureSat: "17000000" },
      coverage: { complete: true, scannedQuotes: 3, listedQuotes: 3, limit: 128, failures: 0 },
      asOfDate: "2026-10-28",
      includesBillUnderReview: true,
    },
    buyerConfirmations: [],
  });
}

export function fraudCaseFixture(): DecisionCase {
  return {
    assessmentCurrency: "current",
    mintQuoteId: "quote-a",
    policyFileName: "synthetic-guatemala-v13.json",
    resultDigest: digest,
    snapshot: {
      schemaVersion: "decision-input-snapshot-v10",
      snapshotDigest: digest,
      caseId: "case-a",
      applicantRef: "applicant-a",
      mintId: "mint-a",
      asOfDate: "2026-10-28",
      product: "accepted_bill_discount",
      country: "GT",
      industry: "coffee_production",
      isSynthetic: true,
      confirmedClaims: {
        useOfFunds: "Coffee purchase",
        acceptorRef: "buyer-node",
        repaymentSource: "Buyer payment",
        wholeFaceRecourseAcknowledged: true,
        evidenceState: "applicant_confirmed",
      },
      contradictions: [],
      bill: {
        billId: "bill-a",
        billStateDigest: digest,
        acceptanceState: "accepted",
        holderRef: "holder-node",
        acceptorRef: "buyer-node",
        faceValueSat: "8000000",
        acceptedDate: "2026-10-28",
        maturityDate: "2027-02-06",
        alreadyFinanced: false,
      },
      invoice: {
        reference: "invoice-a",
        invoiceNumber: documentId,
        goodsDescription: "Coffee beans",
        sellerRef: "drawer-node",
        buyerRef: "buyer-node",
        issueDate: "2026-10-28",
        currency: "GTQ",
        totalSat: null,
        plausibility: "plausible",
        billAndClaimsConsistency: "match",
        evidenceState: "independently_verified",
        methodologyVersion: "invoice-v2",
        assessedBy: "fixture-verifier",
        validThrough: "2026-10-29",
      },
      acceptor: {
        probabilityOfDefaultBps: 600,
        lossGivenDefaultBps: 4000,
        evidenceState: "independently_verified",
        validThrough: "2026-11-08",
      },
      duplicateCheck: { result: "clear", evidenceState: "independently_verified", validThrough: "2026-11-08" },
      mintCapacity: {
        existingExposureSat: "20000000",
        exposureLimitSat: "100000000",
        evidenceState: "independently_verified",
        validThrough: "2026-11-08",
      },
      fraudControls: fraudFixture(),
    },
    policyPack: {
      policyPackVersion: "synthetic-guatemala-v13",
      policyPackDigest: digest,
      isSynthetic: true,
      calculationVersion: "deterministic-credit-core-v11",
      product: "accepted_bill_discount",
      country: "GT",
      industry: "coffee_production",
      maximumEffectiveAnnualBps: 1500,
      maximumFeeRatioBps: 3000,
      maximumDraweeExposureSat: "30000000",
      maximumDrawerExposureSat: "30000000",
      buyerConfirmationRequiredAboveSat: "5000000",
      invoiceToBillToleranceBps: 100,
      maximumBillSumWithoutTaxDocumentSat: "2000000",
    },
    result: {
      assessmentStatus: "blocked_pending_verification",
      recommendation: null,
      axes: [],
      terms: null,
      verificationRequests: [
        {
          code: "buyer_confirmation_missing",
          axis: "acceptor_repayment_risk",
          requiredItem: "Record independently sourced buyer confirmation",
          reasonCode: "buyer_confirmation_missing",
          owner: "mint_operations",
          resolutionAction: "record_buyer_confirmation",
        },
      ],
      reasonCodes: ["buyer_confirmation_missing"],
      assessmentTrace: [],
      calculationTrace: [],
    },
  };
}
