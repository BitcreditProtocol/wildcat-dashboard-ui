import { cn } from "@bitcredit/ui-library";
import { caseNextStepOwner, type CaseNextOwner } from "@bitcredit/ai-credit-shared";
import { ChevronDown, CircleAlert, CircleCheck, CircleDashed, Clock3 } from "lucide-react";
import { useId, type ReactNode } from "react";
import { defineMessages, useIntl, type IntlShape } from "react-intl";
import { operatorOwnsNextStep, type CaseBrief, type CaseNextStep, type CaseWorkItem } from "./case-brief";
import { requestReason } from "./verification-reasons";

const messages = defineMessages({
  facilityReview: {
    id: "quotes.brief.step.facility",
    defaultMessage: "Review the agreement coverage and resolve its blockers. No offer can be authorized while they remain.",
    description: "Operator-owned agreement review",
  },
  nextStep: { id: "quotes.brief.nextStep", defaultMessage: "Next step", description: "Heading for the single next step on a case" },
  ready: {
    id: "quotes.brief.offerReady",
    defaultMessage: "Approval available · offer not sent",
    description: "Valid proposed terms still require a human decision",
  },
  notReady: {
    id: "quotes.brief.offerNotReady",
    defaultMessage: "Approval unavailable",
    description: "This case cannot currently be approved",
  },
  noFit: {
    id: "quotes.brief.noFit",
    defaultMessage: "No compliant offer · not a denial",
    description: "No-fit recommendation is not an operator denial",
  },
  blockers: {
    id: "quotes.brief.blockers",
    defaultMessage: "What is holding this up",
    description: "Exact recorded items preventing completion",
  },
  applicantAction: {
    id: "quotes.brief.blocker.applicant",
    defaultMessage: "Applicant · reply in eBill; then reassessment",
    description: "Owner and next step of a required applicant item",
  },
  riskAction: {
    id: "quotes.brief.blocker.risk",
    defaultMessage: "Mint risk · provide the signed risk record",
    description: "Owner and next step of a required risk record",
  },
  sourceAction: {
    id: "quotes.brief.blocker.source",
    defaultMessage: "Mint operations · restore the source, then retry checks",
    description: "Owner and next step for a failed required source",
  },
  requestAction: {
    id: "quotes.brief.blocker.request",
    defaultMessage: "You · send the request to the applicant",
    description: "Information has not yet been requested from the applicant",
  },
  applicantEvidenceAction: {
    id: "quotes.brief.blocker.applicantEvidence",
    defaultMessage: "Applicant · not yet provided",
    description: "Required applicant item on an agent-prepared case; agents request it, the operator is not asked to send it",
  },
  reviewAction: {
    id: "quotes.brief.blocker.review",
    defaultMessage: "You · check the reply against the documents",
    description: "The applicant has replied; the reviewer must check support",
  },
  resolveAction: {
    id: "quotes.brief.blocker.resolve",
    defaultMessage: "You · request more evidence or close as unable to assess",
    description: "Operator choice when supporting evidence remains unavailable",
  },
  capacityAction: {
    id: "quotes.brief.blocker.capacity",
    defaultMessage: "Mint operations · review exposure capacity",
    description: "Mint capacity is not an applicant information request or a retryable source check",
  },
  missingNotDenial: {
    id: "quotes.brief.missingNotDenial",
    defaultMessage: "Missing information is not grounds for denial.",
    description: "Evidence gaps do not establish adverse risk",
  },
  residual: {
    id: "quotes.brief.residual",
    defaultMessage: "Uncertainty you would accept",
    description: "Material limitation visible before sign-off",
  },
  residualRepayment: {
    id: "quotes.brief.residualRepayment",
    defaultMessage:
      "Repayment timing and source are the applicant’s statements, not independently confirmed. The current assessment permits an offer with this limitation.",
    description: "Residual uncertainty only when governed terms are currently actionable",
  },
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
    defaultMessage: "Agents are assessing the case. You decide once current terms are ready.",
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
    defaultMessage: "Decisions stay disabled until the Mint assigns a minting program to this quote.",
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
  openPoints: {
    id: "quotes.brief.openPoints",
    defaultMessage:
      "{count, plural, one {# open point from case preparation} other {# open points from case preparation}} · review before deciding",
    description: "Pointer from the decision panel to agent-identified gaps that were not asked; not a blocker",
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

const ownerMessages = {
  operator: messages.ownerYou,
  agent: messages.ownerAgent,
  mint_risk: messages.ownerMintRisk,
  applicant: messages.ownerApplicant,
  mint: messages.ownerMint,
} satisfies Record<CaseNextOwner, (typeof messages)[keyof typeof messages]>;

/** The same owner the operator assistant is given for this step. */
function ownerLabel(intl: IntlShape, next: CaseNextStep): string {
  return intl.formatMessage(ownerMessages[caseNextStepOwner(next)]);
}

const stepCopy = {
  facility_review: messages.facilityReview,
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
  facility_review: { href: "#facility-coverage", label: messages.details },
  review_evidence: { href: "#evidence-questions", label: messages.openEvidenceReview },
  decide_unresolved: { href: "#evidence-questions", label: messages.openEvidenceReview },
  manual_review: { href: "#full-governed-assessment", label: messages.openCalculation },
  preparation_attention: { href: "#case-preparation", label: messages.details },
  wait_agent: { href: "#case-preparation", label: messages.details },
  wait_applicant: { href: "#case-conversation", label: messages.openConversation },
};

const blockerAction = {
  reply: messages.applicantAction,
  send_request: messages.requestAction,
  applicant_evidence: messages.applicantEvidenceAction,
  review_reply: messages.reviewAction,
  resolve_evidence: messages.resolveAction,
  provide_risk: messages.riskAction,
  restore_source: messages.sourceAction,
  review_capacity: messages.capacityAction,
} satisfies Record<NonNullable<CaseBrief["outstanding"]>[number]["action"], (typeof messages)[keyof typeof messages]>;

/** Who acts next and whether the operator must intervene; governed controls follow as `actions`. */
export function CaseNextStepPanel({
  next,
  brief,
  actions,
  variant = "header",
  openPoints = 0,
}: {
  next: CaseNextStep;
  brief?: CaseBrief;
  actions?: ReactNode;
  /** `panel` sits in the decision column, which owns its own spacing and actions. */
  variant?: "header" | "panel";
  /** Agent-identified gaps not yet asked; a pointer only, never a blocker. */
  openPoints?: number;
}) {
  const headingId = useId();
  const intl = useIntl();
  if (next.kind === "closed") return actions ? <div className="mt-4 print:hidden">{actions}</div> : null;
  const operator = operatorOwnsNextStep(next);
  const link = stepLink[next.kind];
  return (
    <section aria-labelledby={headingId} className={variant === "panel" ? "" : "mt-5 border-t border-border pt-4"}>
      {/* Beside the case, its status pill already states this; the panel starts with what happens next. */}
      {variant === "header" && (
        <p className={`mb-3 text-sm font-semibold ${next.kind === "decide_offer" ? "text-signal-success" : "text-foreground"}`}>
          {intl.formatMessage(
            next.kind === "decide_offer" ? messages.ready : next.kind === "confirm_no_fit" ? messages.noFit : messages.notReady
          )}
        </p>
      )}
      {(brief?.outstanding?.length ?? 0) > 0 && (
        <div className="mb-4">
          <h3 className="text-xs text-muted-foreground">{intl.formatMessage(messages.blockers)}</h3>
          <ul className="mt-2 space-y-2">
            {brief?.outstanding?.map(({ item, action }) => (
              <li key={`${action}:${item}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
                <span className="min-w-0 flex-1 break-words">{item}</span>
                <span className="text-xs text-muted-foreground">{intl.formatMessage(blockerAction[action])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h2 id={headingId} className="flex flex-wrap items-baseline gap-x-2 text-sm">
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
      {next.kind === "decide_offer" && openPoints > 0 && (
        <a
          href="#case-open-points"
          className="mt-3 flex gap-2 rounded-md bg-signal-alert/10 px-3 py-2 text-sm font-medium text-signal-alert hover:underline print:hidden"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {intl.formatMessage(messages.openPoints, { count: openPoints })}
        </a>
      )}
      {next.kind === "decide_offer" && brief?.repaymentUnverified && (
        <div className={cn("border-l-2 border-signal-alert pl-3", variant === "panel" ? "mt-3 text-xs" : "mt-4 text-sm")}>
          <h3 className="font-medium">{intl.formatMessage(messages.residual)}</h3>
          <p className="mt-1 text-muted-foreground">{intl.formatMessage(messages.residualRepayment)}</p>
        </div>
      )}
      {(next.kind === "decide_unresolved" || next.kind === "review_evidence" || next.kind === "preparation_attention") && (
        <p className="mt-2 text-xs text-muted-foreground">{intl.formatMessage(messages.missingNotDenial)}</p>
      )}
      {actions && <div className="mt-3 print:hidden">{actions}</div>}
    </section>
  );
}

/**
 * Evidence by provenance: signed eBill facts, the applicant's claims (with any unresolved status on
 * the claim itself), checks that rest only on applicant-provided material, and the Mint's own
 * records. Only the last column is independent of the applicant.
 */
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
    <details aria-labelledby="case-progress" className="group border-b border-border print:hidden">
      {/* The same row as "Processing & audit" below it. */}
      <summary
        id="case-progress"
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 marker:hidden [&::-webkit-details-marker]:hidden"
      >
        <span className="text-sm font-semibold">{intl.formatMessage(messages.progress)}</span>
        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
      </summary>
      <div className="flex justify-end border-t border-border px-6 pt-3">
        <a className="text-xs font-medium text-primary hover:underline" href="#case-history">
          {intl.formatMessage(messages.fullHistory)}
        </a>
      </div>
      <ul className="mt-2 divide-y divide-border px-6 pb-4">
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
    </details>
  );
}
