import {
  applicantMasterDataSchema,
  billSignerReviewSchema,
  coreReasonCodes,
  creditPolicyCatalogueSchema,
  facilityOnboardingChecksSchema,
  governedOperatorReasonCodes,
  mintIntelligenceResponseSchema,
  participantDirectoryResponseSchema,
  type BillSignerReview,
  type CreditPolicyCatalogue,
  type FacilityOnboardingChecks,
  type MintIntelligenceNote,
  type MintIntelligenceResponse,
  type ParticipantDirectoryResponse,
} from "@bitcredit/ai-credit-shared";

export const fixtureQuoteId = "97e45adf-fc86-4b30-9322-afae434c3287";
export const fixtureApplicationId = "11111111-1111-4111-8111-111111111111";
export const otherApplicationId = "22222222-2222-4222-8222-222222222222";
export const signerRef = `bitcrt02${"a".repeat(64)}`;
export const companyRef = `bitcrt03${"b".repeat(64)}`;

const match = {
  ref: "drawer-twin",
  kind: "company",
  name: "Finca Verde S.A.",
  signals: ["same_email", "similar_name"],
  nameSimilarity: 0.92,
  addressSimilarity: 0.4,
  sources: [
    { type: "bill_party", quoteId: "87e45adf-fc86-4b30-9322-afae434c3288", billId: "bill-2", quoteStatus: "Offered", roles: ["drawer"] },
  ],
};

export function signerReviewFixture(overrides: Partial<BillSignerReview> = {}): BillSignerReview {
  return billSignerReviewSchema.parse({
    schemaVersion: "bill-signer-review-v1",
    quoteId: fixtureQuoteId,
    billId: "bill-1",
    reviewedAt: "2026-10-27T10:00:00.000Z",
    historyAvailable: true,
    directoryComplete: true,
    parties: [
      {
        ref: "drawer-node",
        kind: "company",
        name: "Finca Verde",
        roles: ["drawer"],
        isApplicant: false,
        postalAddress: { country: "GT", city: "Antigua", zip: null, address: "Calle 1" },
        email: "finca@example.test",
        masterData: { status: "complete", missing: [] },
        signatures: [
          {
            blockId: 0,
            blockType: "Issue",
            signedAt: "2026-10-01T09:00:00.000Z",
            signingAddress: { country: "GT", city: "Escuintla", zip: null, address: "Ruta 9" },
            signatory: { ref: "person-node", name: "Ana López" },
            addressMatchesParty: false,
          },
        ],
        directoryMatches: [match],
      },
      {
        ref: "holder-node",
        kind: "person",
        name: "Carlos Ruiz",
        roles: ["payee", "holder"],
        isApplicant: true,
        postalAddress: null,
        email: null,
        masterData: { status: "incomplete", missing: ["postal_address", "email"] },
        signatures: [],
        directoryMatches: [],
      },
    ],
    signals: [
      { kind: "signed_in_quick_succession", parties: ["drawer-node", "holder-node"], blockIds: [0, 1], seconds: 12 },
      { kind: "signing_address_differs_from_party_address", parties: ["drawer-node"], blockIds: [0], seconds: null },
    ],
    fingerprint: {
      recorded: ["signing_time", "signing_address", "signer_key", "company_signatory"],
      notRecorded: ["device", "geolocation"],
    },
    ...overrides,
  });
}

export const masterDataFixture = applicantMasterDataSchema.parse({
  schemaVersion: "applicant-master-data-v1",
  source: "ebill_profile",
  capturedAt: "2026-10-20T10:00:00.000Z",
  signer: {
    ref: signerRef,
    name: "Ana López",
    email: "ana@example.test",
    postalAddress: { country: "GT", city: "Antigua", zip: "03001", address: "Calle 1" },
    dateOfBirth: "1980-02-03",
    countryOfBirth: "GT",
    cityOfBirth: "Antigua",
    identificationNumber: "DPI-1234-5678",
    identityDocumentProvided: true,
    emailProofs: [],
  },
  company: {
    ref: companyRef,
    name: "Finca Verde S.A.",
    email: null,
    postalAddress: { country: "GT", city: "Antigua", zip: null, address: "Calle 1" },
    countryOfRegistration: "GT",
    cityOfRegistration: "Antigua",
    registrationNumber: "FN-2020/17",
    registrationDate: null,
    proofOfRegistrationProvided: false,
    signatoryRefs: [signerRef],
    emailProofs: [],
  },
});

export function onboardingChecksFixture(overrides: Partial<FacilityOnboardingChecks> = {}): FacilityOnboardingChecks {
  return facilityOnboardingChecksSchema.parse({
    schemaVersion: "facility-onboarding-checks-v1",
    applicationId: fixtureApplicationId,
    checkedAt: "2026-10-27T10:00:00.000Z",
    masterData: {
      schemaVersion: "master-data-completeness-v2",
      signer: { status: "complete", missing: [], exceptions: [], emailVerification: "confirmed_by_this_mint" },
      company: {
        status: "incomplete",
        missing: ["email", "registration_date", "proof_of_registration"],
        exceptions: [
          { field: "proof_of_registration", kind: "unavailable", route: "reviewer", reason: "Registry office closed until January" },
        ],
        emailVerification: "unconfirmed",
      },
    },
    directory: { complete: true, size: 12, matches: [{ ref: companyRef, role: "company", matches: [match] }] },
    historyAtMint: [
      {
        ref: companyRef,
        role: "company",
        sources: [
          { type: "bill_party", quoteId: fixtureQuoteId, billId: "bill-1", quoteStatus: "Accepted", roles: ["drawer", "payee"] },
          { type: "facility_applicant", applicationId: otherApplicationId, role: "company", status: "declined" },
          { type: "facility_applicant", applicationId: fixtureApplicationId, role: "company", status: "operator_review" },
        ],
        truncated: false,
      },
    ],
    ...overrides,
  });
}

export function intelligenceNote(overrides: Partial<MintIntelligenceNote> = {}): MintIntelligenceNote {
  return {
    schemaVersion: "mint-intelligence-note-v1",
    id: "33333333-3333-4333-8333-333333333333",
    scope: "region",
    subject: "Guatemala",
    title: "Harvest season shifts",
    body: "Coffee harvest in the highlands now starts in November.",
    sources: [{ label: "Anacafé report", url: "https://example.test/report" }],
    reviewBy: null,
    supersedes: null,
    authoredBy: "operator-a",
    authoredAt: "2026-10-01T10:00:00.000Z",
    ...overrides,
  };
}

export function intelligenceFixture(): MintIntelligenceResponse {
  const older = intelligenceNote({
    id: "44444444-4444-4444-8444-444444444444",
    title: "Harvest season",
    authoredAt: "2026-06-01T10:00:00.000Z",
  });
  const current = intelligenceNote({ supersedes: older.id });
  const coffee = intelligenceNote({
    id: "55555555-5555-4555-8555-555555555555",
    scope: "industry",
    subject: "Coffee",
    title: "Prices fell this quarter",
    body: "Export prices dropped by a fifth since July.",
    sources: [],
    reviewBy: "2026-01-01",
  });
  const rates = intelligenceNote({
    id: "66666666-6666-4666-8666-666666666666",
    scope: "macro",
    subject: "Interest rates",
    title: "Policy rate unchanged",
    body: "The central bank kept its policy rate at 5 percent.",
    sources: [{ label: "Central bank", url: null }],
    reviewBy: "2999-01-01",
  });
  const elsewhere = intelligenceNote({
    id: "77777777-7777-4777-8777-777777777777",
    subject: "Honduras",
    title: "Port strike",
    body: "The main export port was closed for a week.",
  });
  return mintIntelligenceResponseSchema.parse({
    schemaVersion: "mint-intelligence-v1",
    notes: [current, coffee, rates, elsewhere, older],
    current: [current.id, coffee.id, rates.id, elsewhere.id],
  });
}

export function policyFixture(): CreditPolicyCatalogue {
  const packDigest = `sha256:${"d".repeat(64)}`;
  return creditPolicyCatalogueSchema.parse({
    schemaVersion: "mint-credit-policy-catalogue-v1",
    programs: [
      {
        schemaVersion: "credit-program-v1",
        creditProgramId: "gt_coffee_seasonal_accepted_bill",
        creditProgramVersion: "synthetic-guatemala-coffee-program-v2",
        creditProgramDigest: `sha256:${"9".repeat(64)}`,
        isSynthetic: true,
        country: "GT",
        industry: "coffee_production",
        product: "seasonal_coffee_accepted_ebill_discount",
        policyPackVersion: "synthetic-guatemala-coffee-v12",
        policyPackDigest: packDigest,
      },
    ],
    policyPacks: [
      {
        schemaVersion: "synthetic-credit-policy-pack-v12",
        policyPackVersion: "synthetic-guatemala-coffee-v12",
        policyPackDigest: packDigest,
        calculationVersion: "deterministic-credit-core-v10",
        isSynthetic: true,
        product: "seasonal_coffee_accepted_ebill_discount",
        country: "GT",
        industry: "coffee_production",
        currency: "SAT",
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
          invoice: { methodologyVersion: "synthetic-invoice-review-v1", allowedAssessors: ["synthetic_fixture_verifier"] },
          acceptorLossParameters: {
            methodologyVersion: "synthetic-acceptor-loss-parameters-v1",
            allowedAssessors: ["synthetic_fixture_risk_policy"],
          },
          duplicateCheck: { methodologyVersion: "synthetic-mint-duplicate-check-v1", allowedAssessors: ["synthetic_fixture_mint"] },
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
        reviewPermissions: { confirm: true, adjustPriceAndRequote: false, returnForInformation: true, waiveHardGate: false },
        localeCatalogVersion: "ai-credit-es-v2",
        questionGraphVersion: "coffee-v1",
        reasonCodes: [...coreReasonCodes],
        operatorReasonCodes: [...governedOperatorReasonCodes],
      },
    ],
  });
}

export function directoryFixture(query = ""): ParticipantDirectoryResponse {
  return participantDirectoryResponseSchema.parse({
    schemaVersion: "participant-directory-v1",
    query,
    size: 2,
    complete: false,
    results: [
      {
        participant: {
          ref: "drawer-node",
          kind: "company",
          names: ["Finca Verde", "Verde Finca S.A."],
          postalAddresses: [{ country: "GT", city: "Antigua", zip: null, address: "Calle 1" }],
          emails: ["finca@example.test"],
          registrationNumbers: ["FN-2020/17"],
          identificationDigests: [],
          sources: [{ type: "facility_applicant", applicationId: otherApplicationId, role: "company", status: "declined" }],
        },
        score: 0.9,
      },
    ],
    possibleDuplicates: [{ ref: "drawer-node", name: "Finca Verde", matches: [match] }],
    builtAt: "2026-10-27T10:00:00.000Z",
  });
}
