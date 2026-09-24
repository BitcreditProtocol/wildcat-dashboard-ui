import { CircleAlert, CircleCheck, CircleDashed, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl, type IntlShape } from "react-intl";
import { operatorOwnsNextStep, type CaseBrief, type CaseNextStep, type CaseWorkItem } from "./case-brief";
import { words } from "./decision-types";
import { requestReason } from "./verification-reasons";

const messages = defineMessages({
  nextStep: { id: "quotes.brief.nextStep", defaultMessage: "Next step", description: "Heading for the single next step on a case" },
  ownerYou: { id: "quotes.brief.owner.you", defaultMessage: "You", description: "The signed-in Mint operator owns the next step" },
  ownerAgent: {
    id: "quotes.brief.owner.agent",
    defaultMessage: "Answer-review agent",
    description: "A bounded model reviewer owns the next step; it cannot decide or authorize",
  },
  ownerAgentShort: {
    id: "quotes.brief.owner.agentShort",
    defaultMessage: "Agent",
    description: "Automatic bounded model work; proposal-only, no decision or authorization",
  },
  ownerApplicant: { id: "quotes.brief.owner.applicant", defaultMessage: "Applicant", description: "The applicant owns the next step" },
  ownerMintRisk: {
    id: "quotes.brief.owner.mintRisk",
    defaultMessage: "Mint risk",
    description: "The Mint's risk function owns the next step",
  },
  ownerMint: { id: "quotes.brief.owner.mint", defaultMessage: "Mint", description: "The Mint owns the next step" },
  noActionFromYou: {
    id: "quotes.brief.noActionFromYou",
    defaultMessage: "No action needed from you",
    description: "The operator does not need to intervene",
  },
  decideOffer: {
    id: "quotes.brief.step.decideOffer",
    defaultMessage: "Offer the proposed terms or decline.",
    description: "Operator decision on a ready case",
  },
  confirmNoFit: {
    id: "quotes.brief.step.confirmNoFit",
    defaultMessage: "Confirm the no-fit result with Deny, or leave the quote pending.",
    description: "Operator confirmation of a non-binding no-fit recommendation",
  },
  manualReview: {
    id: "quotes.brief.step.manualReview",
    defaultMessage: "Check the calculation and decide how to proceed.",
    description: "Operator review of an assessment without a recommendation",
  },
  preparationAttention: {
    id: "quotes.brief.step.preparationAttention",
    defaultMessage: "Check why preparation stopped. You can ask an additional question under More actions.",
    description: "Preparation exception, with optional manual information gathering rather than a financial decision",
  },
  reviewEvidence: {
    id: "quotes.brief.step.reviewEvidence",
    defaultMessage: "Check each reply against the submitted documents and record whether it is supported.",
    description: "Human evidence review; there is no automatic evidence resolution",
  },
  decideUnresolved: {
    id: "quotes.brief.step.decideUnresolved",
    defaultMessage: "Ask the applicant again, or close the case as unable to assess.",
    description: "Operator choice after evidence questions ended without support",
  },
  sendRequest: {
    id: "quotes.brief.step.sendRequest",
    defaultMessage: "Send the information request to the applicant. Requests after submission are not sent automatically.",
    description: "Manual governed applicant request; states that automatic post-submission requests are not enabled",
  },
  retrySources: {
    id: "quotes.brief.step.retrySources",
    defaultMessage: "Retry the Mint source checks.",
    description: "Manual retry of Mint-owned or system source reads",
  },
  respondReview: {
    id: "quotes.brief.step.respondReview",
    defaultMessage: "Respond to the applicant's review request below.",
    description: "Operator handles an applicant-requested human review",
  },
  waitAgent: {
    id: "quotes.brief.step.agentPreparation",
    defaultMessage: "Agents assess the case and request missing information automatically. You decide on the prepared terms.",
    description: "Agent-led preparation followed by the human financial decision",
  },
  waitApplicant: {
    id: "quotes.brief.step.waitApplicant",
    defaultMessage: "The case is reassessed automatically when the applicant submits.",
    description: "Submission triggers reassessment without operator action",
  },
  waitMintRisk: {
    id: "quotes.brief.step.waitMintRisk",
    defaultMessage:
      "A signed risk record for this payer must come from Mint risk; it cannot be entered here. If none will be provided, close the case as unable to assess under More actions.",
    description: "Mint-owned acceptor risk evidence has no dashboard input; closure is the exception path",
  },
  waitReassessment: {
    id: "quotes.brief.step.waitReassessment",
    defaultMessage: "Decisions stay disabled until a current assessment is available.",
    description: "Retained assessments are read-only",
  },
  notActionable: {
    id: "quotes.brief.step.notActionable",
    defaultMessage: "Decisions stay disabled until the Mint assigns a credit program to this quote.",
    description: "Legacy assessment without program binding",
  },
  termsExpired: {
    id: "quotes.brief.step.termsExpired",
    defaultMessage: "New terms need a new request from the applicant.",
    description: "Expired terms are renewed only by the applicant",
  },
  openEvidenceReview: {
    id: "quotes.brief.link.evidenceReview",
    defaultMessage: "Open evidence review",
    description: "Link to the evidence questions in the Review tab",
  },
  openCalculation: { id: "quotes.brief.link.calculation", defaultMessage: "Open calculation", description: "Link to the Calculation tab" },
  openConversation: {
    id: "quotes.brief.link.conversation",
    defaultMessage: "Open conversation",
    description: "Link to the applicant conversation in Case history",
  },
  factsEbill: {
    id: "quotes.brief.facts.signedEbill",
    defaultMessage: "Signed eBill record",
    description: "Signed protocol facts: authentic, not proof of the facts behind them or of the payer's ability to pay",
  },
  factsClaims: {
    id: "quotes.brief.facts.claims",
    defaultMessage: "Applicant's claims",
    description: "What the applicant says; not evidence by itself",
  },
  factsDocuments: {
    id: "quotes.brief.facts.applicantDocuments",
    defaultMessage: "Checked against applicant documents",
    description: "Checks whose only evidence is material the applicant provided; consistency, not independent proof",
  },
  factsIndependent: {
    id: "quotes.brief.facts.independent",
    defaultMessage: "Independent of the applicant",
    description: "Records the Mint holds itself, not supplied by the applicant",
  },
  acceptance: {
    id: "quotes.brief.facts.acceptance",
    defaultMessage: "{state} by the payer",
    description: "Protocol acceptance state of the eBill, e.g. Accepted by the payer",
  },
  acceptanceUnknown: {
    id: "quotes.brief.facts.acceptanceUnknown",
    defaultMessage: "Acceptance state not in this assessment",
    description: "No bill acceptance state is available; do not infer one",
  },
  payer: { id: "quotes.brief.facts.payer", defaultMessage: "Payer at maturity", description: "eBill drawee" },
  drawer: { id: "quotes.brief.facts.drawer", defaultMessage: "Drawer", description: "eBill drawer" },
  useOfFunds: { id: "quotes.summary.purpose", defaultMessage: "Use of proceeds" },
  repayment: { id: "quotes.summary.repayment", defaultMessage: "Repayment source" },
  answerMissing: {
    id: "quotes.summary.answerMissing",
    defaultMessage: "No answer recorded",
    description: "Missing applicant answer is not fabricated",
  },
  invoiceConsistent: {
    id: "quotes.brief.documents.invoiceMatch",
    defaultMessage: "Invoice fields match the eBill",
    description: "Deterministic match of the applicant's own invoice to the eBill; consistency, not proof of the trade",
  },
  invoiceConflict: {
    id: "quotes.brief.support.invoiceConflict",
    defaultMessage: "Invoice does not match the eBill",
    description: "Deterministic invoice to eBill mismatch",
  },
  invoiceUnchecked: {
    id: "quotes.brief.support.invoiceUnchecked",
    defaultMessage: "Invoice not yet checked against the eBill",
    description: "Invoice consistency is unknown",
  },
  invoiceAbsent: {
    id: "quotes.brief.support.invoiceAbsent",
    defaultMessage: "No invoice submitted",
    description: "No invoice in the case",
  },
  acceptorRisk: {
    id: "quotes.brief.independent.acceptorRisk",
    defaultMessage: "Mint-signed risk record for the payer",
    description: "Current acceptor default and loss record whose Mint risk signature was verified",
  },
  duplicateClear: {
    id: "quotes.brief.independent.duplicateClear",
    defaultMessage: "No other financing of this bill in Mint records",
    description: "The Mint's own duplicate-financing index found no reuse of this bill or invoice",
  },
  independentNone: {
    id: "quotes.brief.independent.none",
    defaultMessage: "None recorded",
    description: "No record independent of the applicant exists for this case; do not imply verification",
  },
  repaymentUnresolved: {
    id: "quotes.brief.claims.repaymentUnresolved",
    defaultMessage: "Unresolved · not independently confirmed",
    description: "The repayment claim rests only on the applicant's statement",
  },
  progress: {
    id: "quotes.brief.progress",
    defaultMessage: "Case progress",
    description: "Heading for work done and still open on the case",
  },
  fullHistory: {
    id: "quotes.brief.progress.fullHistory",
    defaultMessage: "Full case history",
    description: "Link to the read-only Case history tab",
  },
  details: { id: "quotes.brief.progress.details", defaultMessage: "Details", description: "Link to the drill-down for one progress row" },
  answerReview: {
    id: "quotes.brief.work.answerReview",
    defaultMessage: "Answer review",
    description: "Automatic model review of applicant answers",
  },
  answerQueued: { id: "quotes.brief.work.answerQueued", defaultMessage: "Queued", description: "Answer review has not started" },
  answerRunning: {
    id: "quotes.brief.work.answerRunning",
    defaultMessage: "Reviewing the applicant's answers",
    description: "Answer review is running",
  },
  answerCompleted: {
    id: "quotes.brief.work.answerCompleted",
    defaultMessage:
      "{count, plural, =0 {Done · no further questions proposed} one {Done · # follow-up question proposed} other {Done · # follow-up questions proposed}}",
    description: "Completed answer review for the current submission; proposals are not verified findings",
  },
  answerFailed: {
    id: "quotes.brief.work.answerFailed",
    defaultMessage: "Failed on the latest submission · not retried automatically",
    description: "Failed or interrupted run; the server does not retry automatically",
  },
  answerNotRun: {
    id: "quotes.brief.work.answerNotRun",
    defaultMessage: "Latest submission not reviewed · automatic reviews for this case have stopped",
    description: "No answer review exists for the latest submission, for example because the per-case limit was reached",
  },
  research: { id: "quotes.brief.work.research", defaultMessage: "Public research", description: "Automatic public-context research" },
  researchAvailable: {
    id: "quotes.brief.work.researchAvailable",
    defaultMessage:
      "{findings, plural, one {# finding} other {# findings}} · {sources, plural, one {# source} other {# sources}} · {searches, plural, one {# search} other {# searches}} · context only, not verification",
    description: "Completed public research counts; model-cited context never verifies an applicant claim",
  },
  researchRunning: { id: "quotes.brief.work.researchRunning", defaultMessage: "Researching", description: "Public research running" },
  researchIdle: { id: "quotes.brief.work.researchIdle", defaultMessage: "Not started", description: "Public research not started" },
  researchUnavailable: {
    id: "quotes.brief.work.researchUnavailable",
    defaultMessage: "Unavailable",
    description: "Public research could not be completed",
  },
  proposals: {
    id: "quotes.brief.work.proposals",
    defaultMessage: "Proposed follow-ups",
    description: "Model-proposed applicant questions",
  },
  proposalsDetail: {
    id: "quotes.brief.work.proposalsDetail",
    defaultMessage:
      "{count, plural, one {# question not sent} other {# questions not sent}} · optional · an approver chooses whether to send them",
    description: "Unadmitted answer-review proposals do not block the offer and are not sent automatically after submission",
  },
  ownerApprover: {
    id: "quotes.summary.ownerApprover",
    defaultMessage: "Approver",
    description: "Role that may admit proposed follow-ups into the applicant request",
  },
  applicant: { id: "quotes.brief.work.applicant", defaultMessage: "Applicant follow-up", description: "Applicant clarification exchange" },
  applicantAnswering: {
    id: "quotes.brief.work.applicantAnswering",
    defaultMessage: "Answering the Mint's request{time, select, none {} other { · last activity {time}}}",
    description: "Active applicant conversation, not yet submitted",
  },
  applicantAwaiting: {
    id: "quotes.brief.work.requestAwaiting",
    defaultMessage: "Question sent {time} · no reply yet",
    description: "Agent or operator request awaiting an applicant reply",
  },
  applicantReplied: {
    id: "quotes.brief.work.applicantReplied",
    defaultMessage: "Replied {time} · {count, plural, one {# submission} other {# submissions}}",
    description: "Latest applicant reply time and number of retained submissions",
  },
  evidenceReview: {
    id: "quotes.brief.work.evidenceReview",
    defaultMessage: "Evidence review",
    description: "Human review of evidence questions",
  },
  evidenceToReview: {
    id: "quotes.brief.work.evidenceToReview",
    defaultMessage: "{count, plural, one {# reply to check} other {# replies to check}}",
    description: "Applicant replies not yet reviewed",
  },
  evidenceNoReply: {
    id: "quotes.brief.work.evidenceNoReply",
    defaultMessage: "{count, plural, one {# without an answer} other {# without an answer}}",
    description: "Evidence questions without an applicant answer",
  },
  evidenceUnavailable: {
    id: "quotes.brief.work.evidenceUnavailable",
    defaultMessage: "{count} evidence unavailable",
    description: "Evidence questions whose review ended unresolved",
  },
  evidenceReviewed: {
    id: "quotes.brief.work.evidenceReviewed",
    defaultMessage: "{count} supported",
    description: "Evidence questions with current reviewed support",
  },
});

type Tone = "done" | "active" | "attention" | "idle";

function ToneIcon({ tone }: { tone: Tone }) {
  const Icon = tone === "done" ? CircleCheck : tone === "active" ? Clock3 : tone === "attention" ? CircleAlert : CircleDashed;
  const color =
    tone === "done"
      ? "text-signal-success"
      : tone === "active"
        ? "text-brand-200"
        : tone === "attention"
          ? "text-signal-alert"
          : "text-muted-foreground";
  return <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />;
}

function ownerLabel(intl: IntlShape, next: CaseNextStep): string {
  if (operatorOwnsNextStep(next)) return intl.formatMessage(messages.ownerYou);
  if (next.kind === "wait_agent") return intl.formatMessage(messages.ownerAgent);
  if (next.kind === "wait_mint_risk") return intl.formatMessage(messages.ownerMintRisk);
  if (next.kind === "wait_applicant" || next.kind === "terms_expired") return intl.formatMessage(messages.ownerApplicant);
  return intl.formatMessage(messages.ownerMint);
}

const stepCopy = {
  decide_offer: messages.decideOffer,
  confirm_no_fit: messages.confirmNoFit,
  manual_review: messages.manualReview,
  preparation_attention: messages.preparationAttention,
  review_evidence: messages.reviewEvidence,
  decide_unresolved: messages.decideUnresolved,
  send_applicant_request: messages.sendRequest,
  retry_sources: messages.retrySources,
  respond_applicant_review: messages.respondReview,
  wait_agent: messages.waitAgent,
  wait_applicant: messages.waitApplicant,
  wait_mint_risk: messages.waitMintRisk,
  wait_reassessment: messages.waitReassessment,
  not_actionable: messages.notActionable,
  terms_expired: messages.termsExpired,
} satisfies Record<Exclude<CaseNextStep["kind"], "closed">, (typeof messages)[keyof typeof messages]>;

const stepLink: Partial<Record<CaseNextStep["kind"], { href: string; label: (typeof messages)[keyof typeof messages] }>> = {
  review_evidence: { href: "#evidence-questions", label: messages.openEvidenceReview },
  decide_unresolved: { href: "#evidence-questions", label: messages.openEvidenceReview },
  manual_review: { href: "#full-governed-assessment", label: messages.openCalculation },
  preparation_attention: { href: "#case-preparation", label: messages.details },
  wait_agent: { href: "#case-preparation", label: messages.details },
  wait_applicant: { href: "#case-conversation", label: messages.openConversation },
};

/** Who acts next and whether the operator must intervene; governed controls follow as `actions`. */
export function CaseNextStepPanel({ next, actions }: { next: CaseNextStep; actions?: ReactNode }) {
  const intl = useIntl();
  if (next.kind === "closed") return actions ? <div className="mt-4 print:hidden">{actions}</div> : null;
  const operator = operatorOwnsNextStep(next);
  const link = stepLink[next.kind];
  return (
    <section
      aria-labelledby="case-next-step"
      className={`mt-5 rounded-lg border px-4 py-3 ${operator ? "border-signal-alert/50" : "border-border"}`}
    >
      <h2 id="case-next-step" className="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span className="font-semibold">
          {intl.formatMessage(messages.nextStep)} · {ownerLabel(intl, next)}
        </span>
        {!operator && <span className="text-xs text-muted-foreground">{intl.formatMessage(messages.noActionFromYou)}</span>}
      </h2>
      <p className="mt-1 text-sm">
        {intl.formatMessage(stepCopy[next.kind])}
        {link !== undefined && (
          <a className="ml-2 text-sm font-medium text-primary hover:underline print:hidden" href={link.href}>
            {intl.formatMessage(link.label)}
          </a>
        )}
      </p>
      {actions && <div className="mt-3 print:hidden">{actions}</div>}
    </section>
  );
}

function FactGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 bg-card px-6 py-4">
      <h2 className="text-xs font-semibold text-muted-foreground">{title}</h2>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Fact({ label, value, unresolved }: { label: string; value: string; unresolved?: string }) {
  return (
    <p className="break-words">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="whitespace-pre-wrap">{value}</span>
      {unresolved !== undefined && (
        <span className="mt-1 flex gap-1.5 text-xs font-medium text-signal-alert">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          {unresolved}
        </span>
      )}
    </p>
  );
}

function Finding({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <ToneIcon tone={tone} />
      {children}
    </li>
  );
}

/**
 * Evidence by provenance: signed eBill facts, the applicant's claims (with any unresolved status on
 * the claim itself), checks that rest only on applicant-provided material, and the Mint's own
 * records. Only the last column is independent of the applicant.
 */
export function CaseFacts({
  brief,
  billAcceptanceState,
  payerName,
  drawerName,
  useOfFunds,
  repaymentSource,
}: {
  brief: CaseBrief;
  billAcceptanceState?: string;
  payerName: string;
  drawerName: string;
  useOfFunds?: string;
  repaymentSource?: string;
}) {
  const intl = useIntl();
  const answer = (value: string | undefined) => (value?.trim() ? value : intl.formatMessage(messages.answerMissing));
  const { support } = brief;
  const invoice = {
    consistent: { tone: "done" as const, message: messages.invoiceConsistent },
    conflict: { tone: "attention" as const, message: messages.invoiceConflict },
    unchecked: { tone: "idle" as const, message: messages.invoiceUnchecked },
    absent: { tone: "idle" as const, message: messages.invoiceAbsent },
  }[support.invoice];
  const hasIndependent = support.acceptorRiskRecord || support.duplicateCheckClear;
  return (
    <div className="grid gap-px border-b border-border bg-border md:grid-cols-2 xl:grid-cols-4">
      <FactGroup title={intl.formatMessage(messages.factsEbill)}>
        <p className="font-medium">
          {billAcceptanceState
            ? intl.formatMessage(messages.acceptance, { state: words(billAcceptanceState) })
            : intl.formatMessage(messages.acceptanceUnknown)}
        </p>
        <Fact label={intl.formatMessage(messages.payer)} value={payerName} />
        <Fact label={intl.formatMessage(messages.drawer)} value={drawerName} />
      </FactGroup>
      <FactGroup title={intl.formatMessage(messages.factsClaims)}>
        <Fact label={intl.formatMessage(messages.useOfFunds)} value={answer(useOfFunds)} />
        <Fact
          label={intl.formatMessage(messages.repayment)}
          value={answer(repaymentSource)}
          unresolved={brief.repaymentUnverified ? intl.formatMessage(messages.repaymentUnresolved) : undefined}
        />
      </FactGroup>
      <FactGroup title={intl.formatMessage(messages.factsDocuments)}>
        <ul className="space-y-2">
          <Finding tone={invoice.tone}>{intl.formatMessage(invoice.message)}</Finding>
        </ul>
      </FactGroup>
      <FactGroup title={intl.formatMessage(messages.factsIndependent)}>
        <ul className="space-y-2">
          {support.acceptorRiskRecord && <Finding tone="done">{intl.formatMessage(messages.acceptorRisk)}</Finding>}
          {support.duplicateCheckClear && <Finding tone="done">{intl.formatMessage(messages.duplicateClear)}</Finding>}
          {!hasIndependent && <Finding tone="idle">{intl.formatMessage(messages.independentNone)}</Finding>}
        </ul>
      </FactGroup>
    </div>
  );
}

function workRow(intl: IntlShape, item: CaseWorkItem): { title: string; owner: string; detail: string; tone: Tone; href?: string } {
  const formatTime = (value: string) => intl.formatDate(value, { dateStyle: "medium", timeStyle: "short" });
  switch (item.kind) {
    case "answer_review":
      return {
        title: intl.formatMessage(messages.answerReview),
        owner: intl.formatMessage(messages.ownerAgentShort),
        detail:
          item.state === "queued"
            ? intl.formatMessage(messages.answerQueued)
            : item.state === "running"
              ? intl.formatMessage(messages.answerRunning)
              : item.state === "completed"
                ? intl.formatMessage(messages.answerCompleted, { count: item.proposed })
                : intl.formatMessage(item.state === "failed" ? messages.answerFailed : messages.answerNotRun),
        tone: item.state === "completed" ? "done" : item.state === "queued" || item.state === "running" ? "active" : "idle",
        href: "#case-investigation",
      };
    case "public_research":
      return {
        title: intl.formatMessage(messages.research),
        owner: intl.formatMessage(messages.ownerAgentShort),
        detail:
          item.state === "available"
            ? intl.formatMessage(messages.researchAvailable, { findings: item.findings, sources: item.sources, searches: item.searches })
            : intl.formatMessage(
                item.state === "running"
                  ? messages.researchRunning
                  : item.state === "idle"
                    ? messages.researchIdle
                    : messages.researchUnavailable
              ),
        tone: item.state === "available" ? "done" : item.state === "running" ? "active" : "idle",
        href: "#public-research",
      };
    case "proposals":
      return {
        title: intl.formatMessage(messages.proposals),
        owner: intl.formatMessage(messages.ownerApprover),
        detail: intl.formatMessage(messages.proposalsDetail, { count: item.count }),
        tone: "idle",
        href: "#proposed-follow-ups",
      };
    case "applicant":
      return {
        title: intl.formatMessage(messages.applicant),
        owner: intl.formatMessage(messages.ownerApplicant),
        detail:
          item.state === "answering"
            ? intl.formatMessage(messages.applicantAnswering, { time: item.at === undefined ? "none" : formatTime(item.at) })
            : item.state === "awaiting_reply"
              ? intl.formatMessage(messages.applicantAwaiting, { time: item.at === undefined ? "" : formatTime(item.at) })
              : intl.formatMessage(messages.applicantReplied, {
                  time: item.at === undefined ? "" : formatTime(item.at),
                  count: item.submissions,
                }),
        tone: item.state === "replied" ? "done" : "active",
        href: "#case-conversation",
      };
    case "evidence_review": {
      const parts = [
        item.toReview > 0 ? intl.formatMessage(messages.evidenceToReview, { count: item.toReview }) : null,
        item.noReply > 0 ? intl.formatMessage(messages.evidenceNoReply, { count: item.noReply }) : null,
        item.unavailable > 0 ? intl.formatMessage(messages.evidenceUnavailable, { count: item.unavailable }) : null,
        item.reviewed > 0 ? intl.formatMessage(messages.evidenceReviewed, { count: item.reviewed }) : null,
      ].filter((part) => part !== null);
      return {
        title: intl.formatMessage(messages.evidenceReview),
        owner: intl.formatMessage(messages.ownerYou),
        detail: parts.join(" · "),
        tone: item.toReview > 0 || item.unavailable > 0 ? "attention" : item.noReply > 0 ? "active" : "done",
        href: "#evidence-questions",
      };
    }
    case "verification":
      return {
        title: requestReason(item, intl),
        owner: intl.formatMessage(
          item.owner === "applicant" ? messages.ownerApplicant : item.owner === "mint_risk" ? messages.ownerMintRisk : messages.ownerMint
        ),
        // The exact governed wording of what is needed.
        detail: item.requiredItem,
        tone: "attention",
        href: "#documents-and-evidence",
      };
  }
}

/** What agents, the applicant and reviewers have done and what is still open, each linked to its record. */
export function CaseProgress({ work }: { work: readonly CaseWorkItem[] }) {
  const intl = useIntl();
  if (work.length === 0) return null;
  return (
    <section aria-labelledby="case-progress" className="border-b border-border px-6 py-4 print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="case-progress" className="text-xs font-semibold text-muted-foreground">
          {intl.formatMessage(messages.progress)}
        </h2>
        <a className="text-xs font-medium text-primary hover:underline" href="#case-history">
          {intl.formatMessage(messages.fullHistory)}
        </a>
      </div>
      <ul className="mt-2 divide-y divide-border">
        {work.map((item, index) => {
          const row = workRow(intl, item);
          return (
            <li key={`${item.kind}:${String(index)}`} className="flex gap-3 py-2 text-sm">
              <ToneIcon tone={row.tone} />
              <span className="grid min-w-0 flex-1 gap-x-4 sm:grid-cols-[17rem_minmax(0,1fr)_auto]">
                <span className="font-medium">
                  {row.title}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{row.owner}</span>
                </span>
                <span className="min-w-0 break-words text-muted-foreground">{row.detail}</span>
                {row.href !== undefined && (
                  <a className="text-xs font-medium text-primary hover:underline" href={row.href}>
                    {intl.formatMessage(messages.details)}
                  </a>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
