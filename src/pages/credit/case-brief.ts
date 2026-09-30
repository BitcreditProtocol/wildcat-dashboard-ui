import {
  applicantActivity,
  caseNextStep,
  caseNextStepOwner,
  partitionInformationNeeds,
  type CaseNextStep,
} from "@bitcredit/ai-credit-shared";
import type { DecisionCase, VerificationRequest } from "./decision-types";
import { selectableInvestigationProposals } from "./investigation-proposals";
import { clarificationItemText } from "./clarification-item-text";

/**
 * The single next step for a pending quote. The rule is shared with the operator assistant in
 * `@bitcredit/ai-credit-shared`, so the list, the brief and the agent never disagree on it.
 */
export type { CaseNextStep };

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

interface CaseBlocker {
  item: string;
  action:
    | "reply"
    | "review_reply"
    | "send_request"
    | "applicant_evidence"
    | "resolve_evidence"
    | "provide_risk"
    | "restore_source"
    | "review_capacity";
}

export interface CaseBrief {
  next: CaseNextStep;
  /** Exact recorded outstanding items. Display only; never used to grant approval. */
  outstanding?: CaseBlocker[];
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

/** True when the next step belongs to the Mint operator rather than an agent, the applicant or Mint risk. */
export const operatorOwnsNextStep = (next: CaseNextStep): boolean => caseNextStepOwner(next) === "operator";

function applicantWork(decisionCase: DecisionCase): Extract<CaseWorkItem, { kind: "applicant" }> | undefined {
  const activity = applicantActivity(decisionCase);
  if (activity === undefined) return undefined;
  const submissions = new Set(
    [...(decisionCase.interviewHistory ?? []), ...(decisionCase.interviewTranscript ? [decisionCase.interviewTranscript] : [])].map(
      (transcript) => transcript.preparedInputId
    )
  ).size;
  return { kind: "applicant", ...activity, submissions };
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
  const needs = decisionCase.informationNeeds ?? [];
  const preparation = decisionCase.casePreparation;
  const { unresolved, noReply, unavailable, toReview } = partitionInformationNeeds(decisionCase);
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

  const hasOwner = (...owners: VerificationRequest["owner"][]) => requests.some((request) => owners.includes(request.owner ?? "system"));
  // The shared rule is time-aware: expired terms are never an offer decision.
  const next = caseNextStep(decisionCase, options);
  // Agents own applicant requests on a prepared case, so the operator is never told to send one there.
  const applicantAction = preparation === undefined ? "send_request" : "applicant_evidence";

  const acceptor = decisionCase.snapshot.acceptor as DecisionCase["snapshot"]["acceptor"] | undefined;
  const duplicateCheck = decisionCase.snapshot.duplicateCheck as DecisionCase["snapshot"]["duplicateCheck"] | undefined;
  // `independently_verified` comes only from the synthetic assessor, which the evidence service says
  // proves nothing; `corroborated` is what the Mint paths produce (signature-verified acceptor record,
  // Mint-local duplicate index, deterministic invoice match). Only the Mint's own records count as
  // independent of the applicant.
  return {
    next,
    outstanding: [
      ...(isCurrent && next.kind !== "wait_agent" && next.kind !== "wait_applicant" ? requests : []).map(
        (request): CaseBlocker => ({
          item: request.requiredItem,
          action:
            request.owner === "applicant"
              ? applicantAction
              : request.owner === "mint_risk"
                ? "provide_risk"
                : request.axis === "mint_exposure_capacity"
                  ? "review_capacity"
                  : "restore_source",
        })
      ),
      // Only a request still awaiting its reply is owed; an answered one never becomes a new blocker.
      ...(next.kind === "wait_applicant" && decisionCase.automaticInformationRequest?.response === null
        ? decisionCase.automaticInformationRequest.request.requiredItems.map((item) => ({
            item: clarificationItemText(item),
            action: "reply" as const,
          }))
        : []),
      ...(isCurrent && preparation === undefined && next.kind !== "decide_offer" && next.kind !== "wait_agent"
        ? unresolved
            .filter((need) => next.kind !== "wait_applicant" || (noReply.includes(need) && need.origin?.requestId !== undefined))
            .map(
              (need): CaseBlocker => ({
                item: need.question,
                action: toReview.includes(need)
                  ? "review_reply"
                  : unavailable.includes(need)
                    ? "resolve_evidence"
                    : need.origin?.requestId !== undefined
                      ? "reply"
                      : "send_request",
              })
            )
        : []),
    ].filter((item, index, all) => all.findIndex((other) => other.item === item.item && other.action === item.action) === index),
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
