import { useEffect, useState } from "react";
import type { FacilityApplication, FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import { FacilityActions } from "./FacilityActions";
import { FacilityAllowance } from "./FacilityAllowance";
import { CircleAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import {
  facilityActorMessages,
  facilityDisplayStatus,
  facilityIdentityMessages,
  facilityOperatorProgress,
  facilitySummaryMessages,
  facilityStatusKey,
} from "./facility-copy";

interface FacilityCaseProps {
  application: FacilityApplication;
  live: boolean;
  busy: boolean;
  onCommand: (command: FacilityOperatorCommand) => Promise<void>;
}
const summaryFields = ["business", "purpose", "buyers", "timing"] as const;

function SubmissionConversation({ application, target }: { application: FacilityApplication; target: string | null }) {
  const intl = useIntl();
  const submissions = application.submissions;
  return (
    <div className="space-y-4">
      {submissions.map((submission, index) => {
        const requests = application.informationRequests.filter((request) => request.answeredBySubmission === submission.version);
        const assessments = application.assessmentHistory.filter((assessment) => assessment.submissionDigest === submission.digest);
        const previous = submissions[index - 1];
        const changed = previous ? summaryFields.filter((field) => previous.summary[field] !== submission.summary[field]) : [];
        return (
          <details
            key={submission.digest}
            open={index === submissions.length - 1 || !!target?.startsWith(`facility-submission-${submission.version}-`)}
            className="rounded-lg border border-border"
          >
            <summary className="disclosure-row cursor-pointer p-4 text-sm font-medium">
              <FormattedMessage
                id="facilities.submissionVersion"
                defaultMessage="Submission {version}"
                values={{ version: submission.version }}
                description="Immutable applicant submission version"
              />
              <span className="ml-3 text-xs font-normal text-muted-foreground">
                <FormattedDate value={submission.submittedAt} dateStyle="medium" timeStyle="short" />
              </span>
            </summary>
            <div className="space-y-5 border-t border-border p-4">
              {!!changed.length && (
                <p className="text-xs text-muted-foreground">
                  <FormattedMessage
                    id="facilities.changed"
                    defaultMessage="Changed: {fields}"
                    values={{ fields: changed.map((field) => intl.formatMessage(facilitySummaryMessages[field])).join(", ") }}
                    description="Summary fields changed from prior immutable submission"
                  />
                </p>
              )}
              {requests.map((request) => (
                <section key={request.id} className="rounded-lg bg-muted p-3 text-sm">
                  <h4 className="font-medium">
                    <FormattedMessage
                      id="facilities.respondsTo"
                      defaultMessage="Reply to {actor}"
                      values={{ actor: intl.formatMessage(facilityActorMessages[request.source]) }}
                      description="Identifies the source of a follow-up round"
                    />
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {request.questions.map((question) => (
                      <li key={question}>{question}</li>
                    ))}
                  </ul>
                </section>
              ))}
              <ol className="space-y-4">
                {submission.messages.map((message, messageIndex) => (
                  <li
                    id={`facility-submission-${submission.version}-message-${messageIndex}`}
                    tabIndex={-1}
                    key={`${messageIndex}-${message.role}`}
                    className={message.role === "applicant" ? "ml-5 rounded-lg bg-muted p-3" : "mr-5 p-3"}
                  >
                    <p className="mb-1 text-xs text-muted-foreground">
                      {message.role === "applicant" ? (
                        <FormattedMessage id="facilities.applicant" defaultMessage="Applicant" description="Conversation speaker" />
                      ) : (
                        <FormattedMessage
                          id="facilities.assistant"
                          defaultMessage="Interview assistant"
                          description="Conversation speaker"
                        />
                      )}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
                  </li>
                ))}
              </ol>
              {assessments.map((assessment, assessmentIndex) => (
                <section key={`${assessment.assessedAt}-${assessmentIndex}`} className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium">
                    <FormattedMessage
                      id="facilities.preparationResult"
                      defaultMessage="Preparation agent’s assessment"
                      description="Actual persisted assessment, not a fabricated agent conversation"
                    />
                  </h4>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{assessment.summary}</p>
                  {!!assessment.questionDetails.length && (
                    <ul className="mt-3 space-y-3 text-sm">
                      {assessment.questionDetails.map((question) => (
                        <li key={question.objective} className="rounded-lg bg-muted p-3">
                          <p>{question.question}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{question.reason}</p>
                          <details className="mt-2 text-xs">
                            <summary className="cursor-pointer">
                              <FormattedMessage
                                id="facilities.questionSources"
                                defaultMessage="Applicant statements behind this question"
                                description="Recorded quotes supporting the request, not independent research"
                              />
                            </summary>
                            {question.sources.map((source) => (
                              <blockquote key={source.messageIndex} className="mt-2 border-l border-border pl-3">
                                {source.quote}
                              </blockquote>
                            ))}
                          </details>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!!assessment.limitations.length && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                      {assessment.limitations.map((limitation) => (
                        <li key={limitation}>{limitation}</li>
                      ))}
                    </ul>
                  )}
                  <details className="mt-3 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      <FormattedMessage
                        id="facilities.assessmentRecord"
                        defaultMessage="Assessment record"
                        description="Audit record of exact assessment model route and prompt"
                      />
                    </summary>
                    <p className="mt-2 break-all">
                      {assessment.modelRoute} · {assessment.promptVersion}
                    </p>
                    <p>
                      <FormattedDate value={assessment.assessedAt} dateStyle="medium" timeStyle="short" />
                    </p>
                    <code className="break-all">{assessment.submissionDigest}</code>
                  </details>
                </section>
              ))}
            </div>
          </details>
        );
      })}
      {!submissions.length && (
        <p className="text-sm text-muted-foreground">
          <FormattedMessage
            id="facilities.notSubmitted"
            defaultMessage="No submitted conversation yet. The applicant is still preparing their answers."
            description="Unsubmitted draft is not an operator decision case"
          />
        </p>
      )}
    </div>
  );
}

function FacilityAgreement({ application }: { application: FacilityApplication }) {
  const intl = useIntl();
  const agreement = application.currentAgreement;
  if (!agreement) return null;
  const currentSubmission = application.submissions[application.submissions.length - 1];
  const olderSubmission = currentSubmission?.digest !== agreement.submissionDigest;
  const updateInProgress = !["agreement_offered", "agreement_accepted", "declined"].includes(application.status);
  const expired = application.agreementStatus === "expired" || Date.parse(agreement.terms.expiresAt) <= Date.now();
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <h3 className="font-medium">
        <FormattedMessage
          id="facilities.agreementVersion"
          defaultMessage="Facility Agreement · version {version}"
          values={{ version: agreement.version }}
          description="Exact offered or accepted agreement version"
        />
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {expired ? (
          <FormattedMessage
            id="facilities.agreementExpired"
            defaultMessage="Expired — not reusable for a new eBill"
            description="Expired agreement cannot be reused"
          />
        ) : agreement.acceptedAt ? (
          <FormattedMessage
            id="facilities.agreementAcceptedAt"
            defaultMessage="Accepted by the applicant · {date}"
            values={{ date: intl.formatDate(agreement.acceptedAt, { dateStyle: "medium", timeStyle: "short" }) }}
            description="Acceptance recorded for this exact agreement version"
          />
        ) : (
          <FormattedMessage
            id="facilities.agreementAwaiting"
            defaultMessage="Sent to the applicant; not accepted yet"
            description="Offered is not accepted"
          />
        )}
      </p>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.limit"
              defaultMessage="Maximum outstanding amount (sat)"
              description="Explicit facility amount term supplied by human operator"
            />
          </dt>
          <dd className="mt-1 font-medium">{new Intl.NumberFormat(intl.locale).format(BigInt(agreement.terms.limitSat))} sat</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.expires"
              defaultMessage="Valid until (UTC)"
              description="Agreement expiry date inclusive through end of UTC day"
            />
          </dt>
          <dd className="mt-1 text-sm">
            <FormattedDate value={agreement.terms.expiresAt} timeZone="UTC" dateStyle="medium" timeStyle="short" />
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.scope"
              defaultMessage="Eligible eBills and conditions"
              description="Human-defined scope of future bills for this agreement"
            />
          </dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm">{agreement.terms.eligibleScope}</dd>
        </div>
      </dl>
      {(olderSubmission || updateInProgress) && (
        <p className="mt-3 text-sm">
          <FormattedMessage
            id="facilities.olderAgreement"
            defaultMessage="These terms preserve the earlier decision. Changes are not approved until a new agreement is accepted; earlier findings are not reused while an update is being prepared or reassessed."
            description="Preserves prior agreement and does not imply updated facts are approved"
          />
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        <FormattedMessage
          id="facilities.agreementBoundary"
          defaultMessage="Synthetic, non-binding agreement, not a minting authorization. Accepting it alone reserves nothing. Each eBill still needs its own eligibility, payer, maturity and exposure checks."
          description="Facility agreement is separate from bill and minting authority"
        />
      </p>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer">
          <FormattedMessage
            id="facilities.agreementBasis"
            defaultMessage="Operator’s decision basis"
            description="Human recorded reason for the current agreement"
          />
        </summary>
        <p className="mt-2 whitespace-pre-wrap">{agreement.basis}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <FormattedMessage
            id="facilities.boundSubmission"
            defaultMessage="Based on submission {version}"
            values={{ version: agreement.submissionVersion }}
            description="Exact applicant version assessed for these terms"
          />
        </p>
      </details>
      {application.agreements.length > 1 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer">
            <FormattedMessage
              id="facilities.previousAgreements"
              defaultMessage="Earlier agreement versions"
              description="Preserved immutable facility agreement history"
            />
          </summary>
          <ol className="mt-3 space-y-3">
            {application.agreements
              .filter((item) => item.digest !== agreement.digest)
              .map((item) => (
                <li key={item.digest} className="rounded-lg bg-muted p-3">
                  <p>
                    <FormattedMessage
                      id="facilities.agreementVersion"
                      defaultMessage="Facility Agreement · version {version}"
                      values={{ version: item.version }}
                      description="Exact offered or accepted agreement version"
                    />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.NumberFormat(intl.locale).format(BigInt(item.terms.limitSat))} sat ·{" "}
                    <FormattedDate value={item.offeredAt} dateStyle="medium" />
                  </p>
                  <p className="mt-2 text-sm">{item.terms.eligibleScope}</p>
                  <p className="mt-2 text-sm">{item.basis}</p>
                </li>
              ))}
          </ol>
        </details>
      )}
    </section>
  );
}

export function FacilityCase({ application: app, live, busy, onCommand }: FacilityCaseProps) {
  const intl = useIntl();
  const [view, setView] = useState<"overview" | "history">("overview");
  const [target, setTarget] = useState<string | null>(null);
  useEffect(() => {
    if (view !== "history" || !target) return;
    const element = document.getElementById(target);
    element?.scrollIntoView?.({ block: "center", behavior: "instant" });
    element?.focus({ preventScroll: true });
  }, [view, target]);
  const latest = app.submissions[app.submissions.length - 1];
  const assessment = app.assessment;
  const hasCurrentAssessment = assessment?.submissionDigest === latest?.digest;
  const requests = app.informationRequests.filter((request) => request.answeredBySubmission === null);
  const progressCopy = facilityOperatorProgress(app);
  const operatorActs = app.progress.nextActor === "operator";
  const keyProof = app.identityAssurance === "ebill_identity_key_proof";
  const IdentityIcon = keyProof ? ShieldCheck : ShieldQuestion;
  const profile = [app.profile?.country ?? latest?.profile?.country, app.profile?.industry ?? latest?.profile?.industry].filter(Boolean);
  const showAllowance =
    app.currentAgreement && app.allowance && (app.currentAgreement.terms.billRules !== undefined || app.allowance.entries.length > 0);
  const openSource = (id: string) => {
    setTarget(id);
    setView("history");
  };
  return (
    // Decision column beside the case once the page is wide enough; DOM order keeps it right after the header.
    <article className="@container">
      <div className="grid gap-4 @4xl:grid-cols-[minmax(0,1fr)_22rem] @4xl:items-start @6xl:grid-cols-[minmax(0,1fr)_24rem]">
        <header className="rounded-lg border border-border bg-elevation-100 p-5 md:p-6 @4xl:col-start-1 @4xl:row-start-1">
          <p className="text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.prebill"
              defaultMessage="Pre-bill application · synthetic demo"
              description="Not a bill financing assessment"
            />
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{app.applicantName}</h2>
          <p
            className={`mt-3 inline-flex rounded-md border px-2 py-1 text-xs font-medium ${
              facilityStatusKey(app) === "operator_review" ? "border-primary/40 bg-primary/10" : "border-border bg-card"
            }`}
            role="status"
          >
            {app.agreementStatus === "expired" && app.status === "agreement_accepted" ? (
              <FormattedMessage
                id="facilities.agreementExpired"
                defaultMessage="Expired — not reusable for a new eBill"
                description="Expired agreement cannot be reused"
              />
            ) : (
              intl.formatMessage(facilityDisplayStatus(app))
            )}
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {profile.length > 0 && (
              <div>
                <dt className="sr-only">
                  <FormattedMessage
                    id="facilities.profile"
                    defaultMessage="Profile details shared by the applicant"
                    description="Origin of consented profile fields"
                  />
                </dt>
                <dd>
                  <span className="text-muted-foreground">
                    <FormattedMessage
                      id="facilities.applicantProvided"
                      defaultMessage="Applicant-provided:"
                      description="Prefix marking self-declared profile details, not verified facts"
                    />
                  </span>{" "}
                  {profile.join(" · ")}
                </dd>
              </div>
            )}
            <div>
              <dt className="sr-only">
                <FormattedMessage
                  id="facilities.identity.label"
                  defaultMessage="Identity admission"
                  description="How the applicant's eBill identity was admitted; not KYC"
                />
              </dt>
              <dd className={`flex items-center gap-1.5 ${keyProof ? "" : "text-signal-alert"}`}>
                <IdentityIcon className="size-4" aria-hidden="true" />
                {intl.formatMessage(facilityIdentityMessages[app.identityAssurance])}
              </dd>
            </div>
            {latest && (
              <div>
                <dt className="sr-only">
                  <FormattedMessage
                    id="facilities.latestSubmission"
                    defaultMessage="Latest submission"
                    description="Most recent immutable applicant submission"
                  />
                </dt>
                <dd className="text-muted-foreground">
                  <FormattedMessage
                    id="facilities.submissionMeta"
                    defaultMessage="Submission {version} · {date}"
                    values={{
                      version: latest.version,
                      date: intl.formatDate(latest.submittedAt, { dateStyle: "medium", timeStyle: "short" }),
                    }}
                    description="Latest submission version and time"
                  />
                </dd>
              </div>
            )}
          </dl>
          {app.profile?.businessDescription && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">
                <FormattedMessage
                  id="facilities.applicantProvided"
                  defaultMessage="Applicant-provided:"
                  description="Prefix marking self-declared profile details, not verified facts"
                />
              </span>{" "}
              {app.profile.businessDescription}
            </p>
          )}
        </header>

        <aside
          aria-labelledby="facility-decision-title"
          className="overflow-hidden rounded-lg border border-border bg-card @4xl:sticky @4xl:top-2 @4xl:col-start-2 @4xl:row-span-2 @4xl:row-start-1 @4xl:max-h-[calc(100svh-1rem)] @4xl:self-start @4xl:overflow-y-auto @4xl:overscroll-contain"
        >
          <div className="border-b border-border bg-elevation-100 px-5 py-4">
            <h3 id="facility-decision-title" className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <FormattedMessage
                id="facilities.decision.title"
                defaultMessage="Decision"
                description="Heading of the operator decision column for a facility application"
              />
            </h3>
            <p className={`mt-3 text-sm font-semibold ${operatorActs ? "text-signal-success" : ""}`}>
              <FormattedMessage
                id="facilities.nextActor"
                defaultMessage="Next: {actor}"
                values={{ actor: intl.formatMessage(facilityActorMessages[app.progress.nextActor]) }}
                description="Explicit next actor for the application"
              />
            </p>
            <p className="mt-1 text-sm">{progressCopy ? intl.formatMessage(progressCopy.reason) : app.progress.reason}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {progressCopy ? intl.formatMessage(progressCopy.nextStep) : app.progress.nextStep}
            </p>
          </div>
          {!!requests.length && (
            <div className="space-y-3 border-b border-border px-5 py-4">
              {requests.map((request) => (
                <div key={request.id} className="text-sm">
                  <p className="text-xs text-muted-foreground">
                    <FormattedMessage
                      id="facilities.requestedBy"
                      defaultMessage="Requested by {actor}"
                      values={{ actor: intl.formatMessage(facilityActorMessages[request.source]) }}
                      description="Automatic versus manual applicant request provenance"
                    />
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {request.questions.map((question) => {
                      const reason = app.assessmentHistory
                        .find((item) => item.submissionDigest === request.submissionDigest)
                        ?.questionDetails.find((item) => item.question === question)?.reason;
                      return (
                        <li key={question}>
                          {question}
                          {reason && <p className="mt-1 text-xs text-muted-foreground">{reason}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <FacilityActions key={`${app.id}-${app.revision}`} application={app} live={live} busy={busy} onCommand={onCommand} />
          <p className="border-t border-border bg-elevation-50 px-5 py-3 text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.description"
              defaultMessage="Meet applicants before their first eBill. No minting takes place here."
              description="Facility preparation boundary"
            />
          </p>
        </aside>

        <div className="flex min-w-0 flex-col gap-4 @4xl:col-start-1 @4xl:row-start-2">
          <FacilityAgreement application={app} />
          {showAllowance && app.currentAgreement && app.allowance && (
            <section className="rounded-lg border border-border bg-card p-5 md:p-6">
              <h3 className="font-medium">
                <FormattedMessage id="facilities.allowance.title" defaultMessage="eBills using this agreement" />
              </h3>
              <FacilityAllowance allowance={app.allowance} />
              {app.currentAgreement.terms.billRules ? (
                <p className="mt-3 text-sm">
                  <FormattedMessage
                    id="facilities.rules.summary"
                    defaultMessage="Up to {amount} sat per eBill · up to {days} days to maturity"
                    values={{
                      amount: BigInt(app.currentAgreement.terms.billRules.maxBillSat).toLocaleString(intl.locale),
                      days: app.currentAgreement.terms.billRules.maxTenorDays,
                    }}
                  />
                </p>
              ) : (
                <p className="mt-3 text-sm">
                  <FormattedMessage
                    id="facilities.rules.legacy"
                    defaultMessage="Background-only agreement. Bill coverage needs an updated agreement with explicit eligibility rules and applicant acceptance."
                  />
                </p>
              )}
            </section>
          )}
          {app.decision && (
            <section className="rounded-lg border border-border bg-card p-5 md:p-6">
              <h3 className="text-sm font-medium">
                <FormattedMessage
                  id="facilities.declinedBasis"
                  defaultMessage="Recorded decline decision"
                  description="Historical operator decision distinct from missing data"
                />
              </h3>
              <p className="mt-2 whitespace-pre-wrap text-sm">{app.decision.basis}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <FormattedDate value={app.decision.decidedAt} dateStyle="medium" timeStyle="short" />
              </p>
            </section>
          )}
          <section className="min-w-0 rounded-lg border border-border bg-card">
            <div
              className="flex gap-1 border-b border-border p-2"
              aria-label={intl.formatMessage({
                id: "facilities.views",
                defaultMessage: "Application details",
                description: "Switch case summary and immutable history",
              })}
            >
              <Button
                size="sm"
                variant={view === "overview" ? "outline" : "ghost"}
                aria-pressed={view === "overview"}
                onClick={() => setView("overview")}
              >
                <FormattedMessage id="facilities.overview" defaultMessage="Overview" description="Facility summary view" />
              </Button>
              <Button
                size="sm"
                variant={view === "history" ? "outline" : "ghost"}
                aria-pressed={view === "history"}
                onClick={() => {
                  setView("history");
                  setTarget(null);
                }}
              >
                <FormattedMessage
                  id="facilities.history"
                  defaultMessage="Case history"
                  description="Actual interviews, follow-up rounds and preparation records"
                />
              </Button>
            </div>
            <div className="space-y-6 p-5 md:p-6">
              {view === "history" ? (
                <SubmissionConversation application={app} target={target} />
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-medium">
                      <FormattedMessage
                        id="facilities.applicantAccount"
                        defaultMessage="Applicant’s account"
                        description="Self-reported information, not independent verification"
                      />
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      <FormattedMessage
                        id="facilities.summaryProvenance"
                        defaultMessage="AI summary of submitted answers. Claims and profile details are not independently verified."
                        description="Explicit boundary for model summaries and profile fields"
                      />
                    </p>
                  </div>
                  <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border @xl:grid-cols-2">
                    {summaryFields.map((field) => {
                      const value = latest?.summary[field] ?? app.summary?.[field];
                      return (
                        <section key={field} className="bg-card p-4">
                          <h4 className="text-xs text-muted-foreground">{intl.formatMessage(facilitySummaryMessages[field])}</h4>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{value?.trim() ? value : "—"}</p>
                        </section>
                      );
                    })}
                  </div>
                  {assessment && (
                    <section className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">
                          <FormattedMessage
                            id="facilities.preparationResult"
                            defaultMessage="Preparation agent’s assessment"
                            description="Actual persisted assessment, not a fabricated agent conversation"
                          />
                        </h3>
                        {!hasCurrentAssessment && (
                          <p className="mt-1 text-xs text-signal-alert">
                            <FormattedMessage
                              id="facilities.earlierAssessment"
                              defaultMessage="Earlier submission — not a decision basis for the current update"
                              description="Assessment is bound to a previous immutable submission"
                            />
                          </p>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{assessment.summary}</p>
                      {(!!assessment.openQuestions.length || !!assessment.limitations.length) && (
                        <div className="space-y-3 rounded-lg border border-signal-alert/30 bg-signal-alert/5 p-4">
                          {!!assessment.openQuestions.length && (
                            <section>
                              <h4 className="flex items-center gap-1.5 text-sm font-medium">
                                <CircleAlert className="size-4 text-signal-alert" aria-hidden="true" />
                                <FormattedMessage
                                  id="facilities.uncertainties"
                                  defaultMessage="Remaining uncertainty"
                                  description="Open questions are not automatic adverse findings"
                                />
                              </h4>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                                {assessment.openQuestions.map((question) => (
                                  <li key={question}>{question}</li>
                                ))}
                              </ul>
                            </section>
                          )}
                          {!!assessment.limitations.length && (
                            <section>
                              <h4 className="text-xs font-medium">
                                <FormattedMessage
                                  id="facilities.limitations"
                                  defaultMessage="What this assessment does not establish"
                                  description="Specific limitations rather than an AI confidence score"
                                />
                              </h4>
                              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                                {assessment.limitations.map((limitation) => (
                                  <li key={limitation}>{limitation}</li>
                                ))}
                              </ul>
                            </section>
                          )}
                        </div>
                      )}
                      <ul className="divide-y divide-border rounded-lg border border-border">
                        {assessment.findings.map((finding, index) => (
                          <li key={`${index}-${finding.claim}`} className="px-4 py-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                              <p className="text-sm font-medium">{finding.claim}</p>
                              <p className="text-xs text-muted-foreground">
                                <FormattedMessage
                                  id="facilities.statementOnly"
                                  defaultMessage="Applicant statement · not independently verified"
                                  description="Evidence classification has no model confidence percentage"
                                />
                              </p>
                            </div>
                            {finding.sources.map((source) => {
                              const id = `facility-submission-${assessment.submissionVersion}-message-${source.messageIndex}`;
                              return (
                                <blockquote key={source.messageIndex} className="mt-2 border-l-2 border-divider-200 pl-3">
                                  <p className="line-clamp-3 text-sm text-muted-foreground">“{source.quote}”</p>
                                  <a
                                    href={`#${id}`}
                                    onClick={(event) => {
                                      event.preventDefault();
                                      openSource(id);
                                    }}
                                    title={source.quote}
                                    className="mt-1 inline-block text-xs text-primary underline"
                                  >
                                    <FormattedMessage
                                      id="facilities.sourceAnswer"
                                      defaultMessage="Read answer · submission {version}"
                                      values={{ version: assessment.submissionVersion }}
                                      description="Link from prepared claim to exact recorded applicant answer"
                                    />
                                  </a>
                                </blockquote>
                              );
                            })}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
              <details className="border-t border-border pt-4 text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  <FormattedMessage
                    id="facilities.references"
                    defaultMessage="Technical references"
                    description="Exact case, applicant, mint and snapshot identity retained off the primary reading path"
                  />
                </summary>
                <dl className="mt-3 space-y-2 break-all">
                  <div>
                    <dt>
                      <FormattedMessage
                        id="facilities.reference.application"
                        defaultMessage="Application"
                        description="Technical application identifier label"
                      />
                    </dt>
                    <dd>{app.id}</dd>
                  </div>
                  <div>
                    <dt>
                      <FormattedMessage
                        id="facilities.reference.applicant"
                        defaultMessage="Applicant"
                        description="Technical applicant identifier label"
                      />
                    </dt>
                    <dd>{app.applicantRef}</dd>
                  </div>
                  <div>
                    <dt>
                      <FormattedMessage
                        id="facilities.reference.mint"
                        defaultMessage="Mint"
                        description="Technical mint identifier label"
                      />
                    </dt>
                    <dd>{app.mintNodeId}</dd>
                  </div>
                  {latest && (
                    <div>
                      <dt>
                        <FormattedMessage
                          id="facilities.reference.submission"
                          defaultMessage="Submission"
                          description="Immutable submission digest label"
                        />
                      </dt>
                      <dd>{latest.digest}</dd>
                    </div>
                  )}
                </dl>
              </details>
            </div>
          </section>
        </div>
      </div>
    </article>
  );
}
