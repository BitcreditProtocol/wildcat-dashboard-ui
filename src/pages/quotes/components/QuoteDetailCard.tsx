import { Badge } from "@/components/ui/badge";
import { Button, Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { AdminInfoReply, MintOperationStatus } from "@/generated/client/types.gen";
import type { DurableAuthorizationReceipt, VerifiedAuthorizationReceipt } from "@/pages/credit/record-operator-decision";
import { ChevronDown, CircleAlert, CircleCheck, Clock3, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { useIntl } from "react-intl";

interface QuoteDetailCardProps {
  actions?: ReactNode;
  assessmentUnavailable?: boolean;
  noFitExplanation?: ReactNode;
  quote: AdminInfoReply;
  effectiveQuoteStatus: string;
  ebillPaid: boolean;
  isMintComplete: boolean;
  isMintCompleteLoading: boolean;
  showPayment: boolean;
  rejectedToPay: boolean;
  isInMempool: boolean | null | undefined;
  requestedToPay: boolean;
  signedAuthorizationReceipt?: VerifiedAuthorizationReceipt | null;
  durableAuthorizationReceipt?: DurableAuthorizationReceipt | null;
  mintOperationStatus?: MintOperationStatus;
  isMintOperationLoading?: boolean;
  decisionSummary?: {
    assessmentCurrency: "current" | "historical";
    useOfFunds?: string;
    repaymentSource?: string;
    readyForDecision: boolean;
    investigationPending?: boolean;
    pendingEvidenceQuestions?: number;
    recommendation: "offer_available" | "no_current_product_fit" | null;
    decisionBasis?: {
      counterargument: string;
      counterargumentOpen: boolean;
      answerReviewFollowUpCount?: number;
    };
    applicantRequests?: { axis: string; requiredItem: string; owner?: string }[];
    billAcceptanceState?: string;
    recommendedTerms?: {
      mintingFee: number;
      amountAvailableForMinting: number;
      feeRatioBps: number;
      tenorDays: number;
      offerExpiresOn: string;
    };
  };
}

const formatLocalDateTime = (date: Date): string => {
  const pad = (value: number) => value.toString().padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function ApplicantStatement({ label, value }: { label: string; value: string | undefined }) {
  const intl = useIntl();
  if (value === undefined || value.trim() === "")
    return (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-2 text-sm">
          {intl.formatMessage({
            id: "quotes.summary.answerMissing",
            defaultMessage: "No answer recorded",
            description: "Missing applicant answer is not fabricated",
          })}
        </p>
      </div>
    );
  return (
    <details data-print-statement className="group/statement min-w-0">
      <summary className="cursor-pointer list-none marker:hidden">
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {label}
          <span className="flex shrink-0 items-center gap-1 print:hidden">
            <span className="group-open/statement:hidden">
              {intl.formatMessage({
                id: "quotes.summary.expandStatement",
                defaultMessage: "Full answer",
                description: "Expand the exact applicant answer",
              })}
            </span>
            <span className="hidden group-open/statement:inline">
              {intl.formatMessage({
                id: "quotes.summary.collapseStatement",
                defaultMessage: "Less",
                description: "Collapse the applicant answer",
              })}
            </span>
            <ChevronDown className="size-3 group-open/statement:rotate-180" aria-hidden="true" />
          </span>
        </span>
        <span data-statement-preview className="mt-2 line-clamp-2 break-words text-sm leading-6 group-open/statement:hidden">
          {value}
        </span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 print:hidden">{value}</p>
    </details>
  );
}

function LifecycleStage({
  label,
  value,
  state,
}: {
  label: string;
  value: string;
  state: "complete" | "current" | "unavailable" | "failed";
}) {
  const Icon = state === "complete" ? CircleCheck : state === "current" ? Clock3 : CircleAlert;
  const color =
    state === "complete"
      ? "text-signal-success"
      : state === "current"
        ? "text-brand-200"
        : state === "failed"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <li className="flex min-w-0 gap-2">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate text-sm font-medium" title={value}>
          {value}
        </span>
      </span>
    </li>
  );
}

export function QuoteDetailCard({
  actions,
  assessmentUnavailable = false,
  noFitExplanation,
  quote,
  effectiveQuoteStatus,
  ebillPaid,
  isMintComplete,
  isMintCompleteLoading,
  showPayment,
  rejectedToPay,
  isInMempool,
  requestedToPay,
  signedAuthorizationReceipt,
  durableAuthorizationReceipt,
  mintOperationStatus,
  isMintOperationLoading = false,
  decisionSummary,
}: QuoteDetailCardProps) {
  const intl = useIntl();
  const bill = quote.bill;
  const isHistoricalAssessment = decisionSummary?.assessmentCurrency !== undefined && decisionSummary.assessmentCurrency !== "current";
  const offerExpired =
    effectiveQuoteStatus === "Pending" &&
    decisionSummary?.recommendation === "offer_available" &&
    decisionSummary.recommendedTerms !== undefined &&
    Date.parse(`${decisionSummary.recommendedTerms.offerExpiresOn}T23:59:59.999Z`) <= Date.now();
  const netProceeds = "discounted" in quote ? quote.discounted : null;
  const recommendedTerms = isHistoricalAssessment || offerExpired ? undefined : decisionSummary?.recommendedTerms;
  const showingRecommendation = netProceeds === null && recommendedTerms !== undefined;
  const displayedAmountAvailableForMinting = netProceeds ?? recommendedTerms?.amountAvailableForMinting ?? null;
  const mintingFee = netProceeds === null ? (recommendedTerms?.mintingFee ?? null) : bill.sum - netProceeds;
  const mintingFeeRate =
    mintingFee === null || bill.sum === 0
      ? null
      : showingRecommendation && recommendedTerms
        ? intl.formatMessage(
            {
              id: "quotes.summary.recommendedFeeContext",
              defaultMessage: "{rate}% of bill over {days} days",
              description: "Fee ratio and tenor for the governed recommended Minting fee",
            },
            {
              rate: intl.formatNumber(recommendedTerms.feeRatioBps / 100, { maximumFractionDigits: 2 }),
              days: recommendedTerms.tenorDays,
            }
          )
        : `${((mintingFee / bill.sum) * 100).toFixed(4)}%`;
  const maturityDate = bill.maturity_date ? new Date(bill.maturity_date) : null;
  const maturityLabel = maturityDate
    ? humanReadableDurationDays(intl.locale, maturityDate)
    : intl.formatMessage({
        id: "quotes.common.unknown",
        defaultMessage: "Unknown",
      });
  const unavailable = intl.formatMessage({
    id: "quotes.lifecycle.unavailable",
    defaultMessage: "Unavailable",
    description: "Lifecycle value that the current APIs do not expose",
  });
  const billStage =
    decisionSummary?.billAcceptanceState === "endorsed"
      ? {
          value: intl.formatMessage({ id: "quotes.lifecycle.billEndorsed", defaultMessage: "Endorsed" }),
          state: "complete" as const,
        }
      : decisionSummary?.billAcceptanceState === "accepted"
        ? {
            value: intl.formatMessage({ id: "quotes.lifecycle.billAccepted", defaultMessage: "Accepted" }),
            state: "complete" as const,
          }
        : decisionSummary?.billAcceptanceState === "issued"
          ? {
              value: intl.formatMessage({ id: "quotes.lifecycle.billIssued", defaultMessage: "Issued" }),
              state: "current" as const,
            }
          : { value: unavailable, state: "unavailable" as const };
  const applicantStage =
    effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled"
      ? {
          value: intl.formatMessage({ id: "quotes.lifecycle.applicantAccepted", defaultMessage: "Accepted quote" }),
          state: "complete" as const,
        }
      : effectiveQuoteStatus === "Rejected"
        ? {
            value: intl.formatMessage({ id: "quotes.lifecycle.applicantRejected", defaultMessage: "Rejected quote" }),
            state: "failed" as const,
          }
        : effectiveQuoteStatus === "Offered"
          ? {
              value: intl.formatMessage({ id: "quotes.lifecycle.applicantPending", defaultMessage: "Awaiting response" }),
              state: "current" as const,
            }
          : { value: unavailable, state: "unavailable" as const };
  const mintOperationStage = (() => {
    if (effectiveQuoteStatus !== "MintingEnabled") return { value: unavailable, state: "unavailable" as const };
    if (isMintOperationLoading) {
      return {
        value: intl.formatMessage({
          id: "quotes.lifecycle.mintOperationLoading",
          defaultMessage: "Loading progress…",
          description: "Mint operation lifecycle value while Treasury progress is loading",
        }),
        state: "current" as const,
      };
    }
    if (
      mintOperationStatus?.quote_id !== quote.id ||
      !Number.isFinite(mintOperationStatus.current) ||
      !Number.isFinite(mintOperationStatus.target) ||
      mintOperationStatus.current < 0 ||
      mintOperationStatus.target <= 0
    ) {
      return { value: unavailable, state: "unavailable" as const };
    }
    const current = mintOperationStatus.current;
    const target = mintOperationStatus.target;
    const complete = target > 0 && current >= target;
    const values = { current: intl.formatNumber(current), target: intl.formatNumber(target) };
    return {
      value: complete
        ? intl.formatMessage(
            {
              id: "quotes.lifecycle.mintOperationComplete",
              defaultMessage: "Complete · {current} / {target}",
              description: "Completed Mint operation lifecycle value with actual current and target amounts",
            },
            values
          )
        : intl.formatMessage(
            {
              id: "quotes.lifecycle.mintOperationProgress",
              defaultMessage: "In progress · {current} / {target}",
              description: "Active Mint operation lifecycle value with actual current and target amounts",
            },
            values
          ),
      state: complete ? ("complete" as const) : ("current" as const),
    };
  })();
  const hasDurableReceipt = durableAuthorizationReceipt !== null && durableAuthorizationReceipt !== undefined;
  const hasSignedVerification = signedAuthorizationReceipt !== null && signedAuthorizationReceipt !== undefined;
  const durableExecutionCompleted = durableAuthorizationReceipt?.status === "completed";
  const showDecisionStatus = effectiveQuoteStatus === "Pending" && decisionSummary !== undefined;
  const pendingEvidenceQuestions = decisionSummary?.pendingEvidenceQuestions ?? 0;
  const decisionHeadline =
    decisionSummary?.investigationPending && !isHistoricalAssessment && !offerExpired
      ? intl.formatMessage({
          id: "quotes.summary.investigationPending",
          defaultMessage: "Investigation incomplete",
          description: "Answer investigation has not completed successfully",
        })
      : pendingEvidenceQuestions > 0 && !isHistoricalAssessment && !offerExpired
        ? intl.formatMessage({
            id: "quotes.summary.reviewEvidenceQuestions",
            defaultMessage: "Review evidence",
            description: "Evidence work needs review even though the pricing calculation may be complete",
          })
        : isHistoricalAssessment
          ? intl.formatMessage({
              id: "quotes.summary.evidenceRequired",
              defaultMessage: "Evidence required",
              description: "Primary operator status while current evidence work remains open",
            })
          : offerExpired
            ? intl.formatMessage({
                id: "quotes.summary.termsExpired",
                defaultMessage: "Terms expired",
                description: "Primary operator status when the prepared terms are no longer actionable",
              })
            : decisionSummary?.readyForDecision
              ? intl.formatMessage({
                  id: "quotes.summary.readyForOperatorDecision",
                  defaultMessage: "Ready for operator decision",
                  description: "Primary operator status when the current assessment can be acted on",
                })
              : intl.formatMessage({
                  id: "quotes.summary.evidenceRequired",
                  defaultMessage: "Evidence required",
                  description: "Primary operator status while current evidence work remains open",
                });
  const decisionStatusLine =
    decisionSummary?.investigationPending && !isHistoricalAssessment && !offerExpired
      ? intl.formatMessage({
          id: "quotes.summary.investigationOfferBlocked",
          defaultMessage: "Check Investigation · offer blocked",
          description: "An unfinished investigation cannot authorize an offer",
        })
      : pendingEvidenceQuestions > 0 && !isHistoricalAssessment && !offerExpired
        ? intl.formatMessage(
            {
              id: "quotes.summary.unresolvedEvidenceQuestions",
              defaultMessage:
                "{count, plural, one {# evidence question unresolved} other {# evidence questions unresolved}} · offer blocked",
              description: "Unresolved evidence is a preparation hold, not a credit denial",
            },
            { count: pendingEvidenceQuestions }
          )
        : isHistoricalAssessment
          ? intl.formatMessage({
              id: "quotes.summary.historicalAssessment",
              defaultMessage: "Historical assessment · read-only",
              description: "Retained assessment is read-only; no reason for its historical status is inferred",
            })
          : offerExpired && decisionSummary?.recommendedTerms
            ? intl.formatMessage(
                {
                  id: "quotes.summary.expiredTermsCompact",
                  defaultMessage: "Expired {date} · awaiting applicant request",
                  description: "Expired terms require an applicant-initiated request",
                },
                { date: decisionSummary.recommendedTerms.offerExpiresOn }
              )
            : decisionSummary?.recommendation === "offer_available" && decisionSummary.readyForDecision && decisionSummary.recommendedTerms
              ? intl.formatMessage(
                  {
                    id: "quotes.summary.currentTermsCompact",
                    defaultMessage: "Terms valid through {date}",
                    description: "Expiry of currently actionable proposed terms",
                  },
                  { date: decisionSummary.recommendedTerms.offerExpiresOn }
                )
              : decisionSummary?.recommendation === "no_current_product_fit"
                ? intl.formatMessage({
                    id: "quotes.summary.noFitCompact",
                    defaultMessage: "No offer recommended",
                    description: "Non-binding no-fit recommendation for the operator",
                  })
                : decisionSummary?.readyForDecision
                  ? intl.formatMessage({
                      id: "quotes.summary.manualReviewCompact",
                      defaultMessage: "Manual review required",
                      description: "Current assessment needs an operator review",
                    })
                  : intl.formatMessage({
                      id: "quotes.summary.verificationCompact",
                      defaultMessage: "Verification required",
                      description: "Evidence preparation is incomplete",
                    });
  const applicantRequests = decisionSummary?.applicantRequests ?? [];
  const decisionBasis = decisionSummary?.decisionBasis;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <header className="relative border-b border-border bg-elevation-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className={`pr-8 text-3xl font-semibold tracking-tight ${offerExpired ? "text-signal-alert" : ""}`}>
                {assessmentUnavailable && effectiveQuoteStatus === "Pending"
                  ? intl.formatMessage({
                      id: "quotes.summary.assessmentUnavailable",
                      defaultMessage: "Assessment unavailable",
                      description: "Financial assessment failed to load, not a missing application",
                    })
                  : showDecisionStatus
                    ? decisionHeadline
                    : effectiveQuoteStatus}
              </h1>
              {showDecisionStatus && <p className="mt-1 text-sm text-muted-foreground">{decisionStatusLine}</p>}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xxs"
              className="absolute top-5 right-5 size-8 p-0 print:hidden"
              onClick={() => window.print()}
              aria-label={intl.formatMessage({ id: "quotes.summary.print", defaultMessage: "Print summary" })}
              title={intl.formatMessage({ id: "quotes.summary.print", defaultMessage: "Print summary" })}
            >
              <Printer className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {actions && <div className="mt-4 print:hidden">{actions}</div>}
        </header>

        <section className="grid grid-cols-2 border-t border-border bg-elevation-100 md:grid-cols-4">
          <div className="border-r border-b border-border px-5 py-4 md:border-b-0">
            <div className="truncate text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.detail.sum", defaultMessage: "Bill amount" })}
            </div>
            <Currency
              value={bill.sum}
              sourceCurrency="sat"
              className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums"
              amountClassName="text-current"
            />
          </div>
          <div className="border-b border-border px-5 py-4 md:border-r md:border-b-0">
            <div className="truncate text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.summary.fee", defaultMessage: "Fee" })}
            </div>
            {mintingFee !== null && mintingFeeRate !== null ? (
              <>
                <Currency
                  value={mintingFee}
                  sourceCurrency="sat"
                  className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums"
                  amountClassName="text-current"
                />
                <div className="mt-0.5 text-xs text-muted-foreground">{mintingFeeRate}</div>
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold">—</div>
            )}
          </div>
          <div className="border-r border-border px-5 py-4">
            <div className="truncate text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.summary.availableToMint", defaultMessage: "Available to mint" })}
            </div>
            {displayedAmountAvailableForMinting !== null ? (
              <>
                <Currency
                  value={displayedAmountAvailableForMinting}
                  sourceCurrency="sat"
                  className="mt-1 whitespace-nowrap text-xl font-semibold tabular-nums"
                  amountClassName="text-current"
                />
                {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {intl.formatMessage(
                      {
                        id: "quotes.detail.offerExpiresAt",
                        defaultMessage: "Offer expires {date}",
                        description: "Expiry timestamp for the Mint's current offer",
                      },
                      { date: formatLocalDateTime(new Date(quote.ttl)) }
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold">—</div>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="truncate text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.detail.maturityDate", defaultMessage: "Maturity" })}
            </div>
            <div className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">{bill.maturity_date}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{maturityLabel}</div>
          </div>
        </section>

        {decisionSummary ? (
          <div>
            <section className="border-b border-border px-6 py-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  {intl.formatMessage({ id: "quotes.summary.statedByApplicant", defaultMessage: "Business case" })}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {intl.formatMessage({
                    id: "quotes.summary.applicantTier",
                    defaultMessage: "Applicant answers · not independently confirmed",
                    description: "Provenance of the stated purpose and repayment source, not verified facts",
                  })}
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <ApplicantStatement
                  label={intl.formatMessage({ id: "quotes.summary.purpose", defaultMessage: "Use of proceeds" })}
                  value={decisionSummary.useOfFunds}
                />
                <ApplicantStatement
                  label={intl.formatMessage({ id: "quotes.summary.repayment", defaultMessage: "Repayment source" })}
                  value={decisionSummary.repaymentSource}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {intl.formatMessage(
                  {
                    id: "quotes.summary.protocolPayer",
                    defaultMessage: "Payer at maturity (eBill): {name}",
                    description: "Drawee named in the protocol record, not inferred applicant identity",
                  },
                  { name: bill.drawee.name }
                )}
              </p>
            </section>
            <section className="border-b border-border px-6 py-4">
              {noFitExplanation && <div className="text-sm">{noFitExplanation}</div>}
              {decisionBasis && applicantRequests.length === 0 && !noFitExplanation && (
                <>
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.counterargument", defaultMessage: "Residual uncertainty" })}
                  </p>
                  <p className={`mt-1 text-sm font-medium ${decisionBasis.counterargumentOpen ? "text-signal-alert" : ""}`}>
                    {decisionBasis.counterargument}
                  </p>
                  {(decisionBasis.answerReviewFollowUpCount ?? 0) > 0 && (
                    <p className="mt-3 text-sm text-signal-alert">
                      {intl.formatMessage(
                        {
                          id: "quotes.summary.answerReviewUnverified",
                          defaultMessage: "Answer-review follow-ups · resolution not independently checked",
                          description: "Targeted interview questions remain unverified even when the applicant answered them",
                        },
                        { count: decisionBasis.answerReviewFollowUpCount }
                      )}
                    </p>
                  )}
                </>
              )}

              {applicantRequests.length > 0 && (
                <section className="mt-3 border-l-2 border-signal-alert pl-3">
                  <h4 className="text-xs font-semibold text-signal-alert">
                    {intl.formatMessage({
                      id: "quotes.summary.beforeDecision",
                      defaultMessage: "Before a decision",
                      description: "Open applicant, Mint and system requirements",
                    })}
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {applicantRequests.map((request) => (
                      <li key={`${request.axis}:${request.requiredItem}`} className="text-sm font-medium">
                        {request.requiredItem}
                        {request.owner && <span className="ml-2 text-xs font-normal text-muted-foreground">{request.owner}</span>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </section>
          </div>
        ) : (
          <p
            role={assessmentUnavailable ? "alert" : undefined}
            className={`px-6 py-5 text-sm ${assessmentUnavailable ? "text-signal-alert" : "text-muted-foreground"}`}
          >
            {assessmentUnavailable
              ? intl.formatMessage({
                  id: "credit.quoteCard.unavailable",
                  defaultMessage: "Assessment unavailable. Do not offer until it can be loaded.",
                  description: "Fail-closed error when the deterministic assessment cannot be loaded",
                })
              : intl.formatMessage({
                  id: "quotes.summary.unavailable",
                  defaultMessage: "No business assessment is available for this quote.",
                })}
          </p>
        )}

        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 marker:hidden">
            <span className="text-sm font-semibold">
              {intl.formatMessage({
                id: "quotes.lifecycle.processingDetails",
                defaultMessage: "Processing & audit",
                description: "Collapsed heading for technical quote processing and authorization details",
              })}
            </span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>

          <div className="border-t border-border px-6 py-5">
            <div className="flex flex-col gap-4">
              <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <LifecycleStage
                  label={intl.formatMessage({ id: "quotes.lifecycle.bill", defaultMessage: "eBill" })}
                  value={billStage.value}
                  state={billStage.state}
                />
                <LifecycleStage
                  label={intl.formatMessage({ id: "quotes.lifecycle.quote", defaultMessage: "Quote" })}
                  value={intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus))}
                  state={
                    effectiveQuoteStatus === "Denied" ||
                    effectiveQuoteStatus === "Rejected" ||
                    effectiveQuoteStatus === "Canceled" ||
                    effectiveQuoteStatus === "FailedEbillValidation"
                      ? "failed"
                      : "current"
                  }
                />
                <LifecycleStage
                  label={intl.formatMessage({ id: "quotes.lifecycle.authorization", defaultMessage: "Authorization" })}
                  value={
                    hasDurableReceipt
                      ? durableAuthorizationReceipt.status
                      : hasSignedVerification
                        ? intl.formatMessage({
                            id: "quotes.lifecycle.signedVerified",
                            defaultMessage: "Signed command verified",
                            description: "Authorization lifecycle value for a signed command verified in the current session",
                          })
                        : unavailable
                  }
                  state={durableExecutionCompleted || hasSignedVerification ? "complete" : hasDurableReceipt ? "current" : "unavailable"}
                />
                <LifecycleStage
                  label={intl.formatMessage({ id: "quotes.lifecycle.applicant", defaultMessage: "Applicant" })}
                  value={applicantStage.value}
                  state={applicantStage.state}
                />
                <LifecycleStage
                  label={intl.formatMessage({
                    id: "quotes.lifecycle.mintOperation",
                    defaultMessage: "Mint operation",
                    description: "Lifecycle stage for Treasury minting progress",
                  })}
                  value={mintOperationStage.value}
                  state={mintOperationStage.state}
                />
              </ol>

              {hasDurableReceipt ? (
                <dl className="grid gap-x-5 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.status",
                        defaultMessage: "Execution status",
                        description: "Label for the durable Mint authorization execution status",
                      })}
                    </dt>
                    <dd className="mt-1 font-medium">{durableAuthorizationReceipt.status}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.completedAt",
                        defaultMessage: "Completed at",
                        description: "Label for the exact completion timestamp in a durable authorization receipt",
                      })}
                    </dt>
                    <dd className="mt-1 break-all font-mono">{durableAuthorizationReceipt.completedAt}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.effectId",
                        defaultMessage: "Effect ID",
                        description: "Label for the quote effect identifier in a durable authorization receipt",
                      })}
                    </dt>
                    <dd className="mt-1 break-all font-mono">{durableAuthorizationReceipt.effectId}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.scope",
                        defaultMessage: "Exact scope",
                        description: "Label for the Mint, bill and action bound by an authorization",
                      })}
                    </dt>
                    <dd className="mt-1 break-all font-mono">
                      {durableAuthorizationReceipt.action}
                      <br />
                      {durableAuthorizationReceipt.mintId} / {durableAuthorizationReceipt.billId}
                    </dd>
                  </div>
                </dl>
              ) : hasSignedVerification ? (
                <dl className="grid gap-x-5 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.keyId",
                        defaultMessage: "Signing key",
                        description: "Label for the key identifier on a signed authorization command",
                      })}
                    </dt>
                    <dd className="mt-1 break-all font-mono">{signedAuthorizationReceipt.keyId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.scope",
                        defaultMessage: "Exact scope",
                        description: "Label for the Mint, bill and action bound by an authorization",
                      })}
                    </dt>
                    <dd className="mt-1 break-all font-mono">
                      {signedAuthorizationReceipt.action}
                      <br />
                      {signedAuthorizationReceipt.mintId} / {signedAuthorizationReceipt.billId} / {signedAuthorizationReceipt.mintQuoteId}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.expiry",
                        defaultMessage: "Expires",
                        description: "Label for the signed command expiry timestamp",
                      })}
                    </dt>
                    <dd className="mt-1 tabular-nums">{formatLocalDateTime(new Date(signedAuthorizationReceipt.expiresAt))}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </div>

          <footer className="flex flex-col gap-4 border-t border-border px-6 py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Text variant="label" className="w-32">
                    {intl.formatMessage({ id: "participants.role.drawee", defaultMessage: "Drawee" })}:
                  </Text>
                  <ParticipantDetail participant={bill.drawee} />
                </div>
                <div className="flex items-center gap-2">
                  <Text variant="label" className="w-32">
                    {intl.formatMessage({ id: "participants.role.drawer", defaultMessage: "Drawer" })}:
                  </Text>
                  <ParticipantDetail participant={bill.drawer} />
                </div>
                <div className="flex items-center gap-2">
                  <Text variant="label" className="w-32">
                    {intl.formatMessage({ id: "participants.role.payee", defaultMessage: "Payee" })}:
                  </Text>
                  <ParticipantDetail participant={bill.payee} />
                </div>
                {bill.endorsees && bill.endorsees.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Text variant="label" className="w-32">
                      {intl.formatMessage({ id: "participants.role.holder", defaultMessage: "Holder" })}:
                    </Text>
                    <ParticipantDetail participant={bill.endorsees[bill.endorsees.length - 1]} />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {showPayment && (ebillPaid || rejectedToPay || isInMempool === true || requestedToPay) && (
                  <Badge variant={ebillPaid ? "success" : rejectedToPay ? "destructive" : isInMempool ? "processing" : "info"}>
                    {ebillPaid
                      ? intl.formatMessage({ id: "quotes.payment.paid", defaultMessage: "Paid" })
                      : rejectedToPay
                        ? intl.formatMessage({ id: "quotes.payment.rejected", defaultMessage: "Payment rejected" })
                        : isInMempool
                          ? intl.formatMessage({ id: "quotes.payment.inMempool", defaultMessage: "Payment in mempool" })
                          : intl.formatMessage({ id: "quotes.payment.requested", defaultMessage: "Payment requested" })}
                  </Badge>
                )}
                {ebillPaid && (
                  <Badge variant={!isMintCompleteLoading && isMintComplete ? "success" : "pending"}>
                    {!isMintCompleteLoading && isMintComplete
                      ? intl.formatMessage({ id: "quotes.redemption.complete", defaultMessage: "Redemption complete" })
                      : intl.formatMessage({ id: "quotes.redemption.pending", defaultMessage: "Redemption pending" })}
                  </Badge>
                )}
              </div>
            </div>
          </footer>
        </details>
      </CardContent>
    </Card>
  );
}
