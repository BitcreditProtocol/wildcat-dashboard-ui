import { describe, expect, it } from "vitest";
import { parseDecisionCasesResponse as parseVersionedDecisionCasesResponse } from "./parse-decision-cases";

const SNAPSHOT_DIGEST = `sha256:${"a".repeat(64)}`;
const POLICY_DIGEST = `sha256:${"b".repeat(64)}`;
const RESULT_DIGEST = `sha256:${"c".repeat(64)}`;
const PROGRAM_DIGEST = `sha256:${"e".repeat(64)}`;
const ASSIGNMENT_DIGEST = `sha256:${"f".repeat(64)}`;
const DENIAL_OPERATION_ID = `sha256:${"1".repeat(64)}`;

function parseDecisionCasesResponse(value: unknown) {
  return parseVersionedDecisionCasesResponse(
    typeof value === "object" && value !== null && "cases" in value
      ? { schemaVersion: "ai-credit-workbench-decisions-v1", ...value }
      : value
  );
}

function validCase() {
  const axes = [
    "instrument_eligibility",
    "acceptor_repayment_risk",
    "transaction_integrity",
    "applicant_recourse_risk",
    "evidence_sufficiency",
    "mint_exposure_capacity",
  ];
  const assessedAxes = axes.filter((axis) => axis !== "mint_exposure_capacity");
  return {
    assessmentCurrency: "current",
    mintQuoteId: "quote-a",
    policyFileName: "synthetic-guatemala-v12.json",
    snapshot: {
      schemaVersion: "decision-input-snapshot-v9",
      snapshotDigest: SNAPSHOT_DIGEST,
      caseId: "case-a",
      applicantRef: "applicant-a",
      mintId: "mint-a",
      asOfDate: "2026-08-10",
      policyPackDigest: POLICY_DIGEST,
      calculationVersion: "deterministic-credit-core-v10",
      isSynthetic: true,
      product: "accepted_bill_discount",
      country: "GT",
      industry: "coffee_production",
      confirmedClaims: {
        useOfFunds: "Harvest inputs",
        acceptorRef: "acceptor-a",
        repaymentSource: "Invoice payment",
        wholeFaceRecourseAcknowledged: true,
        evidenceState: "applicant_confirmed",
      },
      contradictions: [],
      bill: {
        billId: "bill-a",
        billStateDigest: `sha256:${"d".repeat(64)}`,
        acceptanceState: "accepted",
        holderRef: "holder-a",
        acceptorRef: "acceptor-a",
        faceValueSat: "8000000",
        acceptedDate: "2026-08-10",
        maturityDate: "2027-02-06",
        alreadyFinanced: false,
      },
      invoice: null,
      acceptor: {
        probabilityOfDefaultBps: 600,
        lossGivenDefaultBps: 4000,
        evidenceState: "independently_verified",
        methodologyVersion: "acceptor-risk-v1",
        assessedBy: "fixture-verifier",
        assessedAt: "2026-08-10",
        validThrough: "2026-11-08",
        evidenceRefs: ["acceptor-evidence-a"],
      },
      duplicateCheck: {
        result: "clear",
        evidenceState: "independently_verified",
        methodologyVersion: "duplicate-check-v1",
        assessedBy: "fixture-verifier",
        assessedAt: "2026-08-10",
        validThrough: "2026-11-08",
        evidenceRefs: ["duplicate-evidence-a"],
      },
      mintCapacity: {
        existingExposureSat: null,
        exposureLimitSat: null,
        evidenceState: "source_unavailable",
        methodologyVersion: "mint-capacity-not-assessed-v1",
        assessedBy: "ai_credit_case_product",
        assessedAt: "2026-08-10",
        validThrough: "2026-11-08",
        evidenceRefs: ["mint-a-capacity-not-assessed"],
      },
    },
    policyPack: {
      schemaVersion: "synthetic-credit-policy-pack-v12",
      isSynthetic: true,
      currency: "SAT",
      policyPackVersion: "synthetic-guatemala-v12",
      policyPackDigest: POLICY_DIGEST,
      calculationVersion: "deterministic-credit-core-v10",
      product: "accepted_bill_discount",
      country: "GT",
      industry: "coffee_production",
      eligibleBillStates: ["accepted"],
      hardGatePrecedence: [
        "bill_already_financed",
        "bill_not_accepted",
        "tenor_outside_policy",
        "bill_sum_above_policy_cap",
        "invoice_commercially_implausible",
      ],
      minimumTenorDays: 30,
      maximumTenorDays: 240,
      maximumBillSumSat: "20000000",
      minimumUsefulDiscountedSat: "500000",
      evidenceRules: {
        invoice: { methodologyVersion: "synthetic-invoice-review-v1", allowedAssessors: ["fixture-verifier"] },
        acceptorLossParameters: { methodologyVersion: "synthetic-acceptor-loss-parameters-v1", allowedAssessors: ["fixture-verifier"] },
        duplicateCheck: { methodologyVersion: "synthetic-mint-duplicate-check-v1", allowedAssessors: ["fixture-verifier"] },
      },
      applicantRecourseRequirement: "whole_face_recourse_by_endorsement",
      pricingComponents: {
        costOfFundsBps: 100,
        uncertaintyMarginBpsByEvidenceState: { corroborated: 200, independently_verified: 100 },
        returnObjectiveBps: 100,
        subsidyBps: 0,
      },
      operatingCostSat: "50000",
      maximumEffectiveAnnualBps: 1500,
      maximumFeeRatioBps: 3000,
      offerValidityDays: 2,
      dayCountDenominator: 360,
      requiredEvidenceStates: ["corroborated", "independently_verified"],
      reviewPermissions: { confirm: true, adjustPriceAndRequote: true, returnForInformation: true, waiveHardGate: false },
      localeCatalogVersion: "ai-credit-es-v2",
      questionGraphVersion: "coffee-v1",
      reasonCodes: [
        "accepted_bill_eligible",
        "acceptor_loss_parameters_verified",
        "bill_already_financed",
        "bill_and_invoice_consistent",
        "bill_not_accepted",
        "bill_sum_above_policy_cap",
        "cost_above_policy_ceiling",
        "duplicate_check_clear",
        "evidence_admissible",
        "fee_ratio_above_policy_ceiling",
        "governed_terms_available",
        "invoice_commercially_implausible",
        "no_useful_compliant_terms",
        "pricing_components_applied",
        "tenor_outside_policy",
        "verification_acceptor_loss_parameters_required",
        "verification_bill_required",
        "verification_contradiction_required",
        "verification_duplicate_check_required",
        "verification_invoice_consistency_required",
        "verification_invoice_evidence_required",
        "verification_invoice_required",
        "verification_recourse_acknowledgment_required",
        "whole_face_recourse_acknowledged",
      ],
      operatorReasonCodes: [
        "operator_confirmed_governed_terms",
        "operator_confirmed_no_current_product_fit",
        "operator_declined_governed_offer",
        "operator_adjusted_price_within_bounds",
        "operator_returned_for_information",
      ],
    },
    result: {
      schemaVersion: "decision-result-v10",
      snapshotDigest: SNAPSHOT_DIGEST,
      mintId: "mint-a",
      policyPackDigest: POLICY_DIGEST,
      policyPackVersion: "synthetic-guatemala-v12",
      calculationVersion: "deterministic-credit-core-v10",
      assessmentStatus: "ready_for_decision",
      recommendation: "offer_available",
      axes: axes.map((axis) =>
        axis === "mint_exposure_capacity"
          ? { axis, status: "not_assessed", reasonCodes: [] }
          : { axis, status: "pass", reasonCodes: [`${axis}_passed`] }
      ),
      terms: {
        billSumSat: "8000000",
        discountedSat: "7734000",
        appliedDiscountSat: "216000",
        operatingCostSat: "50000",
        effectiveFeeSat: "266000",
        endorsementExposureSat: "8000000",
        maturityDate: "2027-02-06",
        offerExpiresOn: "2026-08-12",
        tenorDays: 180,
        annualDiscountBps: 540,
        effectiveAnnualBps: 688,
        feeRatioBps: 333,
      },
      verificationRequests: [],
      reasonCodes: ["governed_terms_available"],
      assessmentTrace: [
        ...assessedAxes.map((axis) => ({
          ruleId: `${axis}_rule`,
          subject: axis,
          outcome: "pass",
          reasonCode: `${axis}_passed`,
          observed: { present: true },
          policy: { required: true },
          effect: { findingStatus: "pass" },
        })),
        {
          ruleId: "whole_bill_offer",
          subject: "product_fit",
          outcome: "pass",
          reasonCode: "governed_terms_available",
          observed: { billSumSat: "8000000" },
          policy: { wholeBillOnly: true },
          effect: { recommendation: "offer_available" },
        },
      ],
      calculationTrace: [
        {
          step: "discounted_sat",
          formula: "billSumSat - effectiveFeeSat",
          inputs: { billSumSat: "8000000", effectiveFeeSat: "266000" },
          result: "7734000",
        },
      ],
    },
    resultDigest: RESULT_DIGEST,
    creditProgram: {
      schemaVersion: "credit-program-v1",
      creditProgramId: "gt_coffee_accepted_bill",
      creditProgramVersion: "gt-coffee-program-v1",
      creditProgramDigest: PROGRAM_DIGEST,
      isSynthetic: true,
      country: "GT",
      industry: "coffee_production",
      product: "accepted_bill_discount",
      policyPackVersion: "synthetic-guatemala-v12",
      policyPackDigest: POLICY_DIGEST,
    },
    creditProgramAssignment: {
      schemaVersion: "mint-credit-program-selection-v1",
      mintId: "mint-a",
      mintQuoteId: "quote-a",
      billId: "bill-a",
      creditProgramVersion: "gt-coffee-program-v1",
      creditProgramDigest: PROGRAM_DIGEST,
      assignmentAuthority: "wildcat_mint_admin",
      assignmentDigest: ASSIGNMENT_DIGEST,
    },
    submittedEvidence: [],
    evidencePackets: [],
    claimInvestigation: { status: "disabled", reason: "not_configured" },
    availableMaterialEvidence: [
      { kind: "bill_state", reference: `sha256:${"d".repeat(64)}` },
      { kind: "submitted_document", reference: "invoice-a", label: "commercial-invoice.pdf" },
    ],
  };
}

function completedMintDenial() {
  return {
    state: "completed",
    operationId: DENIAL_OPERATION_ID,
    receipt: {
      receiptVersion: "credit-authorization-receipt-v1",
      operationId: DENIAL_OPERATION_ID,
      authorizationDigest: `sha256:${"2".repeat(64)}`,
      caseId: "case-a",
      status: "completed",
      mintId: "mint-a",
      billId: "bill-a",
      action: "deny_governed_quote",
      effectId: "quote-a",
      resultDigest: `sha256:${"3".repeat(64)}`,
      completedAt: "2026-08-25T12:00:00.000Z",
      synthetic: true,
    },
  } as const;
}

describe("parseDecisionCasesResponse", () => {
  it("accepts an empty response and a fully bound governed offer", () => {
    expect(parseDecisionCasesResponse({ schemaVersion: "ai-credit-workbench-decisions-v1", cases: [] })).toEqual({ cases: [] });
    const decisionCase = validCase();
    expect(parseDecisionCasesResponse({ schemaVersion: "ai-credit-workbench-decisions-v1", cases: [decisionCase] })).toEqual({
      cases: [decisionCase],
    });
    expect(() => parseDecisionCasesResponse({ schemaVersion: "ai-credit-workbench-decisions-v2", cases: [] })).toThrow(
      "invalid governed decision response"
    );
    expect(() => parseVersionedDecisionCasesResponse({ cases: [] })).toThrow("invalid governed decision response");
  });

  it("requires an explicit assessment currency and accepts the historical applicant-response state", () => {
    const decisionCase = validCase();
    const { assessmentCurrency: _omitted, ...missingCurrency } = decisionCase;
    void _omitted;
    expect(() => parseDecisionCasesResponse({ cases: [missingCurrency] })).toThrow("invalid governed decision response");
    expect(
      parseDecisionCasesResponse({
        cases: [{ ...decisionCase, assessmentCurrency: "historical_pending_applicant_response" }],
      }).cases[0]?.assessmentCurrency
    ).toBe("historical_pending_applicant_response");
    expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, assessmentCurrency: "stale" }] })).toThrow(
      "invalid governed decision response"
    );
  });

  it("accepts only bounded assessment history whose last revision is current", () => {
    const decisionCase = validCase();
    const current = {
      snapshot: decisionCase.snapshot,
      result: decisionCase.result,
      resultDigest: decisionCase.resultDigest,
      submittedEvidence: decisionCase.submittedEvidence,
    };
    expect(parseDecisionCasesResponse({ cases: [{ ...decisionCase, assessmentHistory: [current] }] })).toEqual({
      cases: [{ ...decisionCase, assessmentHistory: [current] }],
    });

    const foreignPriors = [
      { ...current, snapshot: { ...current.snapshot, caseId: "case-b" } },
      {
        ...current,
        snapshot: { ...current.snapshot, mintId: "mint-b" },
        result: { ...current.result, mintId: "mint-b" },
      },
      {
        ...current,
        snapshot: {
          ...current.snapshot,
          bill: current.snapshot.bill === null ? null : { ...current.snapshot.bill, billId: "bill-b" },
        },
      },
    ];
    for (const foreignPrior of foreignPriors) {
      expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, assessmentHistory: [foreignPrior, current] }] })).toThrow(
        "invalid governed decision response"
      );
    }

    for (const mismatchedPrior of [
      { ...current, result: { ...current.result, policyPackDigest: `sha256:${"8".repeat(64)}` } },
      { ...current, result: { ...current.result, calculationVersion: "deterministic-credit-core-v8" } },
    ]) {
      expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, assessmentHistory: [mismatchedPrior, current] }] })).toThrow(
        "invalid governed decision response"
      );
    }

    for (const assessmentHistory of [
      [],
      [{ ...current, extra: true }],
      [{ ...current, resultDigest: `sha256:${"9".repeat(64)}` }],
      [{ ...current, submittedEvidence: [{ reference: "missing-fields" }] }],
      Array.from({ length: 33 }, () => current),
    ]) {
      expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, assessmentHistory }] })).toThrow(
        "invalid governed decision response"
      );
    }
  });

  it("accepts only exact Mint denial states bound to the displayed case, quote, bill and operation", () => {
    const decisionCase = validCase();
    const syncing = { state: "syncing", operationId: DENIAL_OPERATION_ID } as const;
    const completed = completedMintDenial();

    expect(parseDecisionCasesResponse({ cases: [{ ...decisionCase, mintDenial: syncing }] })).toEqual({
      cases: [{ ...decisionCase, mintDenial: syncing }],
    });
    expect(parseDecisionCasesResponse({ cases: [{ ...decisionCase, mintDenial: completed }] })).toEqual({
      cases: [{ ...decisionCase, mintDenial: completed }],
    });

    for (const mintDenial of [
      { ...syncing, extra: true },
      { ...completed, receipt: { ...completed.receipt, caseId: "case-b" } },
      { ...completed, receipt: { ...completed.receipt, effectId: "quote-b" } },
      { ...completed, receipt: { ...completed.receipt, billId: "bill-b" } },
      { ...completed, receipt: { ...completed.receipt, action: "request_to_mint" } },
      { ...completed, receipt: { ...completed.receipt, operationId: `sha256:${"4".repeat(64)}` } },
    ]) {
      expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, mintDenial }] })).toThrow("invalid governed decision response");
    }
  });

  it("accepts only a second-review request bound to the displayed decision", () => {
    const decisionCase = validCase();
    const applicantHumanReview = {
      request: {
        schemaVersion: "applicant-human-review-request-v1",
        requestId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
        caseId: decisionCase.snapshot.caseId,
        applicantRef: decisionCase.snapshot.applicantRef,
        contestedDecisionResultDigest: decisionCase.resultDigest,
        statement: "Please have another operator review the invoice evidence.",
        requestedAt: "2026-08-24T12:00:00.000Z",
        synthetic: true,
      },
      status: "requested",
      reviewer: null,
      resolution: null,
      writtenBasis: null,
      statusChangedAt: "2026-08-24T12:00:00.000Z",
    } as const;
    expect(parseDecisionCasesResponse({ cases: [{ ...decisionCase, applicantHumanReview }] })).toEqual({
      cases: [{ ...decisionCase, applicantHumanReview }],
    });
    expect(() =>
      parseDecisionCasesResponse({
        cases: [
          {
            ...decisionCase,
            applicantHumanReview: {
              ...applicantHumanReview,
              request: { ...applicantHumanReview.request, contestedDecisionResultDigest: `sha256:${"f".repeat(64)}` },
            },
          },
        ],
      })
    ).toThrow("invalid governed decision response");
  });

  it("accepts owner-bound v10 verification requests and rejects incomplete ownership", () => {
    const oneCase = validCase();
    const blocked = {
      ...oneCase,
      result: {
        ...oneCase.result,
        schemaVersion: "decision-result-v10",
        assessmentStatus: "blocked_pending_verification",
        recommendation: null,
        terms: null,
        axes: oneCase.result.axes.map((axis, index) =>
          index === 1
            ? { ...axis, status: "blocked", reasonCodes: ["verification_acceptor_loss_parameters_required"] }
            : { ...axis, status: "not_assessed", reasonCodes: [] }
        ),
        verificationRequests: [
          {
            code: "acceptor",
            axis: "acceptor_repayment_risk",
            requiredItem: "Current governed acceptor risk assessment",
            reasonCode: "verification_acceptor_loss_parameters_required",
            owner: "mint_risk",
            resolutionAction: "record_acceptor_risk_assessment",
          },
        ],
        reasonCodes: ["verification_acceptor_loss_parameters_required"],
        assessmentTrace: [
          {
            ruleId: "acceptor",
            subject: "acceptor_repayment_risk",
            outcome: "blocked",
            reasonCode: "verification_acceptor_loss_parameters_required",
            observed: { present: false },
            policy: { required: true },
            effect: { assessmentStatus: "blocked_pending_verification" },
          },
        ],
        calculationTrace: [],
      },
    };
    expect(parseDecisionCasesResponse({ cases: [blocked] }).cases).toHaveLength(1);
    expect(() =>
      parseDecisionCasesResponse({
        cases: [
          {
            ...blocked,
            result: { ...blocked.result, verificationRequests: [{ ...blocked.result.verificationRequests[0], owner: undefined }] },
          },
        ],
      })
    ).toThrow();

    for (const requiredItem of ["x".repeat(501), "Upload proof\nthen continue", "Upload proof\u202Efdp.exe"]) {
      expect(() =>
        parseDecisionCasesResponse({
          cases: [
            {
              ...blocked,
              result: {
                ...blocked.result,
                verificationRequests: [{ ...blocked.result.verificationRequests[0], requiredItem }],
              },
            },
          ],
        })
      ).toThrow("invalid governed decision response");
    }
  });

  it("accepts the Mint exposure axis only as explicitly not assessed", () => {
    const decisionCase = validCase();

    expect(decisionCase.snapshot.mintCapacity).toMatchObject({ existingExposureSat: null, exposureLimitSat: null });
    expect(decisionCase.result.axes.find((axis) => axis.axis === "mint_exposure_capacity")).toEqual({
      axis: "mint_exposure_capacity",
      status: "not_assessed",
      reasonCodes: [],
    });
    expect(parseDecisionCasesResponse({ cases: [decisionCase] })).toEqual({ cases: [decisionCase] });
  });

  it("keeps v8 Mint capacity non-null", () => {
    const decisionCase = validCase();
    const invalidLegacy = {
      ...decisionCase,
      snapshot: {
        ...decisionCase.snapshot,
        schemaVersion: "decision-input-snapshot-v8",
        mintCapacity: { ...decisionCase.snapshot.mintCapacity, existingExposureSat: null },
      },
    };

    expect(() => parseDecisionCasesResponse({ cases: [invalidLegacy] })).toThrow("invalid governed decision response");
  });

  it("accepts the governed no-fit and verification-blocked result shapes", () => {
    const offer = validCase();
    const noFit = { ...offer, result: { ...offer.result, recommendation: "no_current_product_fit", terms: null } };
    const blocked = {
      ...offer,
      result: {
        ...offer.result,
        assessmentStatus: "blocked_pending_verification",
        recommendation: null,
        terms: null,
        calculationTrace: [],
        axes: offer.result.axes.map((axis, index) =>
          index === 1
            ? {
                axis: "acceptor_repayment_risk",
                status: "blocked",
                reasonCodes: ["verification_acceptor_required"],
              }
            : axis
        ),
        assessmentTrace: offer.result.assessmentTrace.map((step, index) =>
          index === 1
            ? {
                ruleId: "verification_acceptor_required",
                subject: "acceptor_repayment_risk",
                outcome: "blocked",
                reasonCode: "verification_acceptor_required",
                observed: { present: false },
                policy: { required: true },
                effect: { findingStatus: "blocked" },
              }
            : step
        ),
        reasonCodes: ["verification_acceptor_required"],
        verificationRequests: [
          {
            code: "acceptor_parameters",
            axis: "acceptor_repayment_risk",
            requiredItem: "Current acceptor loss parameters",
            reasonCode: "verification_acceptor_required",
            owner: "mint_risk",
            resolutionAction: "record_acceptor_risk_assessment",
          },
        ],
      },
    };

    expect(parseDecisionCasesResponse({ cases: [noFit, blocked] })).toEqual({ cases: [noFit, blocked] });
  });

  it.each([
    ["quote id", () => ({ ...validCase(), mintQuoteId: 7 })],
    ["case id", () => ({ ...validCase(), snapshot: { ...validCase().snapshot, caseId: null } })],
    ["result digest", () => ({ ...validCase(), resultDigest: "sha256:not-a-digest" })],
    ["recommendation", () => ({ ...validCase(), result: { ...validCase().result, recommendation: "manual_offer" } })],
    ["missing offer terms", () => ({ ...validCase(), result: { ...validCase().result, terms: null } })],
    [
      "inconsistent governed terms",
      () => {
        const decisionCase = validCase();
        return {
          ...decisionCase,
          result: { ...decisionCase.result, terms: { ...decisionCase.result.terms, discountedSat: "7733999" } },
        };
      },
    ],
    ["axes array", () => ({ ...validCase(), result: { ...validCase().result, axes: [] } })],
    ["reason-code array", () => ({ ...validCase(), result: { ...validCase().result, reasonCodes: [false] } })],
    ["verification-request array", () => ({ ...validCase(), result: { ...validCase().result, verificationRequests: null } })],
    ["submitted-evidence array", () => ({ ...validCase(), submittedEvidence: [{ reference: "missing-fields" }] })],
    [
      "material-evidence array",
      () => ({
        ...validCase(),
        availableMaterialEvidence: [{ kind: "bill_state", reference: `sha256:${"d".repeat(64)}`, label: "internal label" }],
      }),
    ],
    ["partial credit-program binding", () => ({ ...validCase(), creditProgramAssignment: undefined })],
    [
      "wrong credit-program quote binding",
      () => ({ ...validCase(), creditProgramAssignment: { ...validCase().creditProgramAssignment, mintQuoteId: "quote-b" } }),
    ],
    [
      "wrong credit-program policy binding",
      () => ({ ...validCase(), creditProgram: { ...validCase().creditProgram, policyPackDigest: `sha256:${"9".repeat(64)}` } }),
    ],
    [
      "wrong credit-program release digest",
      () => ({
        ...validCase(),
        creditProgramAssignment: { ...validCase().creditProgramAssignment, creditProgramDigest: `sha256:${"8".repeat(64)}` },
      }),
    ],
    ["top-level cases array", () => ({ notCases: [] })],
  ])("rejects a malformed %s", (_label, makeCase) => {
    const candidate = makeCase();
    const response = "notCases" in candidate ? candidate : { cases: [candidate] };
    expect(() => parseDecisionCasesResponse(response)).toThrow("invalid governed decision response");
  });

  it("accepts a source-bound generic evidence analysis and rejects a mismatched one", () => {
    const evidence = {
      reference: `sha256:${"a".repeat(64)}`,
      label: "contract.pdf",
      contentDigest: `sha256:${"a".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const analysis = {
      schemaVersion: "evidence-document-analysis-v1" as const,
      evidence,
      derivativeDigest: `sha256:${"b".repeat(64)}`,
      parserVersion: "poppler-text-v1",
      promptVersion: "evidence-document-analysis-v1" as const,
      modelId: "gpt-5.6-luna",
      extractedAt: "2026-08-22T12:00:00.000Z",
      analysis: {
        documentType: { value: "Purchase agreement", citation: { page: 1, exactSnippet: "Purchase agreement" } },
        claims: [
          {
            kind: "obligation",
            label: "Delivery obligation",
            value: "Deliver 400 bags",
            citation: { page: 2, exactSnippet: "Supplier shall Deliver 400 bags" },
          },
        ],
      },
    };
    const decisionCase = validCase();
    const withAnalysis = {
      ...decisionCase,
      submittedEvidence: [evidence],
      evidencePackets: [{ evidence, status: "quarantined", byteLength: 1024, analysisStatus: "available", analysis }],
    };
    expect(parseDecisionCasesResponse({ cases: [withAnalysis] })).toEqual({ cases: [withAnalysis] });
    expect(() =>
      parseDecisionCasesResponse({
        cases: [
          {
            ...withAnalysis,
            evidencePackets: [
              {
                ...withAnalysis.evidencePackets[0],
                analysis: { ...analysis, evidence: { ...evidence, reference: `sha256:${"c".repeat(64)}` } },
              },
            ],
          },
        ],
      })
    ).toThrow("invalid governed decision response");
  });

  it("accepts only exact, case-bound public-source investigation states", () => {
    const evidence = {
      reference: `sha256:${"4".repeat(64)}`,
      label: "business-record.pdf",
      contentDigest: `sha256:${"4".repeat(64)}`,
      origin: "applicant_upload" as const,
    };
    const applicantConfirmation = {
      schemaVersion: "applicant-confirmation-summary-v1" as const,
      preparedInputId: "2798c386-935b-4f5e-a2ea-a5323454de0a",
      useOfFunds: "Buy fertilizer for the coffee harvest",
      acceptor: "Buyer Cooperative",
      repaymentSource: "Payment from Buyer Cooperative",
      answersAffirmed: true as const,
      recourseAcknowledged: true,
    };
    const decisionCase = {
      ...validCase(),
      submittedEvidence: [evidence],
      applicantConfirmation,
      claimInvestigation: {
        status: "available",
        proposal: {
          schemaVersion: "claim-investigation-proposal-v1",
          caseId: "case-a",
          snapshotDigest: SNAPSHOT_DIGEST,
          resultDigest: RESULT_DIGEST,
          inputDigest: `sha256:${"5".repeat(64)}`,
          promptVersion: "public-claim-investigation-v1",
          modelId: "codex:gpt-5.6-luna",
          assessedAt: "2026-08-28T09:00:00.000Z",
          authority: "display_only_model_proposal",
          evidenceAnchors: [evidence],
          searchQueries: ["Buyer Cooperative Guatemala"],
          findings: [
            {
              track: "operational_plausibility",
              status: "public_context",
              claim: {
                source: "applicant_confirmed",
                preparedInputId: applicantConfirmation.preparedInputId,
                field: "acceptor",
                value: applicantConfirmation.acceptor,
              },
              summary: "The public listing describes common cooperative purchasing structures.",
              sources: [
                {
                  title: "Public cooperative directory",
                  url: "https://example.com/cooperatives/buyer",
                  excerpt: "The directory lists Buyer Cooperative Holdings.",
                },
              ],
            },
          ],
        },
      },
    };

    expect(parseDecisionCasesResponse({ cases: [decisionCase] })).toEqual({ cases: [decisionCase] });
    const withoutInvestigation = structuredClone(decisionCase);
    Reflect.deleteProperty(withoutInvestigation, "claimInvestigation");
    expect(parseDecisionCasesResponse({ cases: [withoutInvestigation] })).toEqual({ cases: [withoutInvestigation] });

    for (const claimInvestigation of [
      { ...decisionCase.claimInvestigation, extra: true },
      {
        ...decisionCase.claimInvestigation,
        proposal: { ...decisionCase.claimInvestigation.proposal, caseId: "case-b" },
      },
      {
        ...decisionCase.claimInvestigation,
        proposal: {
          ...decisionCase.claimInvestigation.proposal,
          findings: [
            {
              ...decisionCase.claimInvestigation.proposal.findings[0],
              sources: [
                {
                  title: "Unsafe source",
                  url: "http://example.com/cooperatives/buyer",
                  excerpt: "Not transported over HTTPS.",
                },
              ],
            },
          ],
        },
      },
      ...["https://localhost./internal", "https://foo.local./internal"].map((url) => ({
        ...decisionCase.claimInvestigation,
        proposal: {
          ...decisionCase.claimInvestigation.proposal,
          findings: [
            {
              ...decisionCase.claimInvestigation.proposal.findings[0],
              sources: [
                {
                  title: "Private target",
                  url,
                  excerpt: "A trailing dot must not bypass the local-host restriction.",
                },
              ],
            },
          ],
        },
      })),
      {
        ...decisionCase.claimInvestigation,
        proposal: {
          ...decisionCase.claimInvestigation.proposal,
          findings: [
            {
              ...decisionCase.claimInvestigation.proposal.findings[0],
              sources: [
                {
                  title: "Private target",
                  url: "https://127.0.0.1/internal",
                  excerpt: "A model-controlled URL must not target the operator's local network.",
                },
              ],
            },
          ],
        },
      },
      {
        ...decisionCase.claimInvestigation,
        proposal: {
          ...decisionCase.claimInvestigation.proposal,
          findings: [{ ...decisionCase.claimInvestigation.proposal.findings[0], sources: [] }],
        },
      },
      {
        ...decisionCase.claimInvestigation,
        proposal: {
          ...decisionCase.claimInvestigation.proposal,
          findings: [
            {
              ...decisionCase.claimInvestigation.proposal.findings[0],
              claim: { ...decisionCase.claimInvestigation.proposal.findings[0].claim, value: "Another organization" },
            },
          ],
        },
      },
    ]) {
      expect(() => parseDecisionCasesResponse({ cases: [{ ...decisionCase, claimInvestigation }] })).toThrow(
        "invalid governed decision response"
      );
    }
  });

  it("accepts a retry only when the server supplies the exact current investigation request", () => {
    const decisionCase = validCase();
    const request = {
      schemaVersion: "claim-investigation-start-v1",
      caseId: decisionCase.snapshot.caseId,
      snapshotDigest: decisionCase.snapshot.snapshotDigest,
      resultDigest: decisionCase.resultDigest,
      inputDigest: `sha256:${"6".repeat(64)}`,
    };
    const unavailable = { status: "unavailable", modelId: "codex:gpt-5.6-luna", request };

    expect(parseDecisionCasesResponse({ cases: [{ ...decisionCase, claimInvestigation: unavailable }] }).cases).toHaveLength(1);
    expect(() =>
      parseDecisionCasesResponse({
        cases: [
          {
            ...decisionCase,
            claimInvestigation: { ...unavailable, request: { ...request, resultDigest: `sha256:${"7".repeat(64)}` } },
          },
        ],
      })
    ).toThrow("invalid governed decision response");
  });

  it("rejects valid-looking digests when result, snapshot and policy bindings disagree", () => {
    const decisionCase = validCase();
    const mismatched = {
      ...decisionCase,
      result: { ...decisionCase.result, snapshotDigest: `sha256:${"e".repeat(64)}` },
    };
    expect(() => parseDecisionCasesResponse({ cases: [mismatched] })).toThrow("invalid governed decision response");
  });

  it("keeps a legacy case readable only when both program provenance fields are absent", () => {
    const { creditProgram: _program, creditProgramAssignment: _assignment, ...legacy } = validCase();
    void _program;
    void _assignment;
    expect(parseDecisionCasesResponse({ cases: [legacy] })).toEqual({ cases: [legacy] });
  });
});
