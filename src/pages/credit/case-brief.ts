import { unresolvedInformationNeeds } from "@bitcredit/ai-credit-shared";
import { isEvidenceInsufficientClosure, type DecisionCase, type VerificationRequest } from "./decision-types";
import { pendingCaseInvestigation } from "./evidence-review-readiness";
import { selectableInvestigationProposals } from "./investigation-proposals";

/**
 * The single next step for a pending quote. Each kind names one owner: the operator for the
 * `decide_*`, `review_evidence`, `send_applicant_request`, `retry_sources` and
 * `respond_applicant_review` kinds; an agent, the applicant or Mint risk for the `wait_*` kinds.
 */
export type CaseNextStep =
  | { kind: "decide_offer"; offerExpiresOn: string }
  | { kind: "confirm_no_fit" }
  | { kind: "manual_review" }
  | { kind: "preparation_attention"; reasons: NonNullable<DecisionCase["casePreparation"]>["reasons"] }
  | { kind: "review_evidence"; count: number }
  | { kind: "decide_unresolved"; count: number }
  | { kind: "send_applicant_request"; count: number }
  | { kind: "retry_sources" }
  | { kind: "respond_applicant_review" }
  | { kind: "wait_agent" }
  | { kind: "wait_applicant"; since?: string }
  | { kind: "wait_mint_risk" }
  | { kind: "wait_reassessment" }
  | { kind: "not_actionable"; noFit: boolean }
  | { kind: "terms_expired"; offerExpiresOn: string }
  | { kind: "closed" };

export type CaseWorkItem =
  | { kind: "answer_review"; state: "queued" | "running" | "completed" | "failed" | "not_run"; proposed: number }
  | {
      kind: "public_research";
      state: "idle" | "running" | "available" | "unavailable";
      findings: number;
      sources: number;
      searches: number;
    }
  | { kind: "proposals"; count: number }
  | { kind: "applicant"; state: "answering" | "awaiting_reply" | "replied"; at?: string; submissions: number }
  | { kind: "evidence_review"; toReview: number; noReply: number; unavailable: number; reviewed: number }
  | {
      kind: "verification";
      owner: NonNullable<VerificationRequest["owner"]>;
      reasonCode: string;
      requiredItem: string;
      axis: string;
    };

export interface CaseBrief {
  next: CaseNextStep;
  /** Ordered: agent work, applicant exchange, evidence review, outstanding checks. */
  work: CaseWorkItem[];
  support: {
    /** Deterministic check of the applicant-provided invoice against the eBill; never independent evidence. */
    invoice: "consistent" | "conflict" | "unchecked" | "absent";
    /** Mint-owned records, independent of the applicant. */
    acceptorRiskRecord: boolean;
    duplicateCheckClear: boolean;
    /** Replies a human reviewer judged supported by the applicant's own documents. */
  };
  /** Repayment rests only on the applicant's confirmed statement while an offer is still possible. */
  repaymentUnverified: boolean;
  preparation?: DecisionCase["casePreparation"];
}

const OPERATOR_STEPS = new Set<CaseNextStep["kind"]>([
  "decide_offer",
  "confirm_no_fit",
  "manual_review",
  "preparation_attention",
  "review_evidence",
  "decide_unresolved",
  "send_applicant_request",
  "retry_sources",
  "respond_applicant_review",
]);

/** True when the next step belongs to the Mint operator rather than an agent, the applicant or Mint risk. */
export const operatorOwnsNextStep = (next: CaseNextStep): boolean => OPERATOR_STEPS.has(next.kind);

const isActiveDialogue = (status: string) => status !== "submitted" && status !== "superseded";

function applicantWork(decisionCase: DecisionCase): Extract<CaseWorkItem, { kind: "applicant" }> | undefined {
  const submissions = new Set(
    [...(decisionCase.interviewHistory ?? []), ...(decisionCase.interviewTranscript ? [decisionCase.interviewTranscript] : [])].map(
      (transcript) => transcript.preparedInputId
    )
  ).size;
  const dialogues = decisionCase.serverClarificationDialogues ?? [];
  const active = dialogues.find((dialogue) => isActiveDialogue(dialogue.status));
  if (active?.status === "processing") return undefined;
  if (active !== undefined) return { kind: "applicant", state: "answering", at: active.updatedAt, submissions };
  if (decisionCase.liveInterview !== undefined) return { kind: "applicant", state: "answering", submissions };
  const automatic = decisionCase.automaticInformationRequest;
  if (automatic?.response === null) {
    return { kind: "applicant", state: "awaiting_reply", at: automatic.request.requestedAt, submissions };
  }
  const submitted = dialogues
    .filter((dialogue) => dialogue.status === "submitted")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  if (submitted !== undefined) return { kind: "applicant", state: "replied", at: submitted.updatedAt, submissions };
  if (automatic?.response?.respondedAt) return { kind: "applicant", state: "replied", at: automatic.response.respondedAt, submissions };
  return undefined;
}

function answerReviewWork(decisionCase: DecisionCase): Extract<CaseWorkItem, { kind: "answer_review" }> | undefined {
  const investigation = decisionCase.caseInvestigation;
  if (investigation === undefined) return undefined;
  const current = [...investigation.runs]
    .reverse()
    .find((run) => run.submissionDigest === decisionCase.submissionDigest && run.resultDigest === decisionCase.resultDigest);
  const proposed = current?.status === "completed" ? current.needs.length : 0;
  if (investigation.status === "queued") return { kind: "answer_review", state: "queued", proposed };
  if (investigation.status === "running") return { kind: "answer_review", state: "running", proposed };
  if (investigation.status === "completed") return { kind: "answer_review", state: "completed", proposed };
  // Stopped: the server never retries a failed run automatically and caps runs per case.
  return {
    kind: "answer_review",
    state: current?.status === "failed" || current?.status === "interrupted" ? "failed" : "not_run",
    proposed,
  };
}

function researchWork(decisionCase: DecisionCase): Extract<CaseWorkItem, { kind: "public_research" }> | undefined {
  const state = decisionCase.claimInvestigation;
  if (state === undefined || state.status === "disabled") return undefined;
  if (state.status !== "available") return { kind: "public_research", state: state.status, findings: 0, sources: 0, searches: 0 };
  const { proposal } = state;
  return {
    kind: "public_research",
    state: "available",
    findings: proposal.findings.length,
    // Counted as the Case history research panel counts them, so both views show the same number.
    sources: proposal.findings.reduce((count, finding) => count + finding.sources.length, 0),
    searches: proposal.searchQueries.length,
  };
}

/**
 * Display model for the quote overview. It restates recorded state only: it grants no authority,
 * re-derives no credit rule and never treats an applicant reply as resolved evidence.
 */
export function buildCaseBrief(decisionCase: DecisionCase, options: { quoteId: string; now: number }): CaseBrief {
  const binding = {
    caseId: decisionCase.snapshot.caseId,
    resultDigest: decisionCase.resultDigest,
    submissionDigest: decisionCase.submissionDigest,
  };
  const needs = decisionCase.informationNeeds ?? [];
  const preparation = decisionCase.casePreparation;
  const unresolved = unresolvedInformationNeeds(needs, binding);
  const noReply = unresolved.filter((need) => !need.reviewIsStale && need.status === "open" && need.response === undefined);
  const unavailable = unresolved.filter((need) => !need.reviewIsStale && need.status === "exhausted");
  // Replies awaiting review, stale reviews and reviews bound to an older assessment all need a reviewer.
  const toReview = unresolved.filter((need) => !noReply.includes(need) && !unavailable.includes(need));
  const isCurrent = decisionCase.assessmentCurrency === "current";
  const proposals = isCurrent ? selectableInvestigationProposals(decisionCase).length : 0;
  // Tolerate the partial projections older callers and fixtures already pass to QuoteActions.
  const requests = decisionCase.result.verificationRequests ?? [];
  const applicant = applicantWork(decisionCase);
  const invoice = decisionCase.snapshot.invoice ?? null;

  const work: CaseWorkItem[] = [];
  const answerReview = answerReviewWork(decisionCase);
  if (answerReview !== undefined) work.push(answerReview);
  const research = researchWork(decisionCase);
  if (research !== undefined) work.push(research);
  if (proposals > 0 && preparation === undefined) work.push({ kind: "proposals", count: proposals });
  if (applicant !== undefined) work.push(applicant);
  if (needs.length > 0 && preparation === undefined) {
    work.push({
      kind: "evidence_review",
      toReview: toReview.length,
      noReply: noReply.length,
      unavailable: unavailable.length,
      reviewed: needs.length - unresolved.length,
    });
  }
  for (const request of requests) {
    work.push({
      kind: "verification",
      owner: request.owner ?? "system",
      reasonCode: request.reasonCode,
      requiredItem: request.requiredItem,
      axis: request.axis,
    });
  }

  const terms = decisionCase.result.terms ?? null;
  const offerExpired =
    terms !== null &&
    !(Date.parse(`${terms.offerExpiresOn}T23:59:59.999Z`) > options.now) &&
    decisionCase.result.recommendation === "offer_available";
  const quoteBound =
    decisionCase.mintQuoteId === options.quoteId &&
    decisionCase.creditProgram !== undefined &&
    decisionCase.creditProgramAssignment !== undefined;
  const hasOwner = (...owners: VerificationRequest["owner"][]) => requests.some((request) => owners.includes(request.owner ?? "system"));
  const applicantAsked = noReply.filter((need) => need.origin?.requestId !== undefined).length;

  const next = ((): CaseNextStep => {
    if (isEvidenceInsufficientClosure(decisionCase)) return { kind: "closed" };
    if (decisionCase.applicantHumanReview !== undefined) return { kind: "respond_applicant_review" };
    // A dispatched question deliberately makes the prior assessment historical.
    // Explain the recorded next actor without making those prior terms actionable.
    if (preparation?.status === "awaiting_applicant") return { kind: "wait_applicant", since: applicant?.at };
    if (!isCurrent) return { kind: "wait_reassessment" };
    if (preparation?.status === "preparing") return { kind: "wait_agent" };
    if (preparation === undefined && decisionCase.serverClarificationDialogues?.some((dialogue) => dialogue.status === "processing"))
      return { kind: "wait_agent" };
    if (preparation === undefined && pendingCaseInvestigation(decisionCase)) return { kind: "wait_agent" };
    if (applicant?.state === "answering") return { kind: "wait_applicant", since: applicant.at };
    // Same retry scope as QuoteActions: capacity is not an operator-facing case check.
    if (
      requests.some(
        (request) => request.owner === "system" || (request.owner === "mint_operations" && request.axis !== "mint_exposure_capacity")
      )
    )
      return { kind: "retry_sources" };
    if (preparation === undefined && toReview.length > 0) return { kind: "review_evidence", count: toReview.length };
    const applicantRequests = requests.filter((request) => request.owner === "applicant").length + noReply.length - applicantAsked;
    if (preparation === undefined && applicantRequests > 0) return { kind: "send_applicant_request", count: applicantRequests };
    if (preparation === undefined && applicantAsked > 0) return { kind: "wait_applicant", since: applicant?.at };
    if (hasOwner("mint_risk")) return { kind: "wait_mint_risk" };
    if (preparation !== undefined && !preparation.approvable) return { kind: "preparation_attention", reasons: preparation.reasons };
    if (preparation === undefined && unavailable.length > 0) return { kind: "decide_unresolved", count: unavailable.length };
    if (decisionCase.result.assessmentStatus !== "ready_for_decision") return { kind: "manual_review" };
    if (decisionCase.result.recommendation === "no_current_product_fit")
      return quoteBound ? { kind: "confirm_no_fit" } : { kind: "not_actionable", noFit: true };
    if (decisionCase.result.recommendation !== "offer_available" || terms === null) return { kind: "manual_review" };
    if (offerExpired) return { kind: "terms_expired", offerExpiresOn: terms.offerExpiresOn };
    return quoteBound ? { kind: "decide_offer", offerExpiresOn: terms.offerExpiresOn } : { kind: "not_actionable", noFit: false };
  })();

  const acceptor = decisionCase.snapshot.acceptor as DecisionCase["snapshot"]["acceptor"] | undefined;
  const duplicateCheck = decisionCase.snapshot.duplicateCheck as DecisionCase["snapshot"]["duplicateCheck"] | undefined;
  // `independently_verified` comes only from the synthetic assessor, which the evidence service says
  // proves nothing; `corroborated` is what the Mint paths produce (signature-verified acceptor record,
  // Mint-local duplicate index, deterministic invoice match). Only the Mint's own records count as
  // independent of the applicant.
  return {
    next,
    work,
    preparation,
    support: {
      invoice:
        invoice === null
          ? "absent"
          : invoice.plausibility === "implausible" || invoice.billAndClaimsConsistency === "mismatch"
            ? "conflict"
            : invoice.plausibility === "plausible" &&
                invoice.billAndClaimsConsistency === "match" &&
                (invoice.evidenceState === "corroborated" || invoice.evidenceState === "independently_verified")
              ? "consistent"
              : "unchecked",
      acceptorRiskRecord:
        !hasOwner("mint_risk") &&
        acceptor?.evidenceState === "corroborated" &&
        acceptor.probabilityOfDefaultBps !== null &&
        acceptor.lossGivenDefaultBps !== null,
      duplicateCheckClear: duplicateCheck?.result === "clear" && duplicateCheck.evidenceState === "corroborated",
    },
    // Only material while terms could be offered; a no-fit case has no repayment to rely on.
    repaymentUnverified:
      decisionCase.snapshot.confirmedClaims?.evidenceState === "applicant_confirmed" &&
      decisionCase.result.recommendation !== "no_current_product_fit",
  };
}
