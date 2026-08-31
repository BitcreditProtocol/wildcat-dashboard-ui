import { Badge } from "@/components/ui/badge";
import { Button, Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { AdminInfoReply, MintOperationStatus } from "@/generated/client/types.gen";
import type { DurableAuthorizationReceipt, VerifiedAuthorizationReceipt } from "@/pages/credit/record-operator-decision";
import type { AssessmentChange } from "@/pages/credit/assessment-diff";
import { axisLabels, words } from "@/pages/credit/decision-types";
import { ChevronDown, CircleAlert, CircleCheck, Clock3, Printer } from "lucide-react";
import { useIntl } from "react-intl";

interface QuoteDetailCardProps {
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
    assessmentCurrency: "current" | "historical_pending_applicant_response";
    useOfFunds: string;
    repaymentSource: string;
    acceptor?: string;
    goodsDescription?: string;
    readyForDecision: boolean;
    recommendation: "offer_available" | "no_current_product_fit" | null;
    passedChecks: number;
    failedChecks: number;
    notAssessedChecks: number;
    totalChecks: number;
    answersAffirmed: boolean;
    recourseAcknowledged: boolean;
    unresolvedContradictions: number;
    evidenceSummary: {
      documents: number;
      citedClaims: number;
      openRequests: number;
      investigation: {
        status: "available" | "disabled" | "idle" | "running" | "unavailable" | "not_run";
        findings: number;
        sources: number;
      };
    };
    applicantRequests?: { axis: string; requiredItem: string }[];
    reassessmentChanges?: AssessmentChange[];
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
        ? "text-signal-info"
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
  const isHistoricalAssessment = decisionSummary?.assessmentCurrency === "historical_pending_applicant_response";
  const netProceeds = "discounted" in quote ? quote.discounted : null;
  const recommendedTerms = isHistoricalAssessment ? undefined : decisionSummary?.recommendedTerms;
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
  const offerExpired =
    showDecisionStatus &&
    decisionSummary.recommendation === "offer_available" &&
    decisionSummary.recommendedTerms !== undefined &&
    Date.parse(`${decisionSummary.recommendedTerms.offerExpiresOn}T23:59:59.999Z`) <= Date.now();
  const summaryStatusVariant = showDecisionStatus
    ? isHistoricalAssessment
      ? "pending"
      : offerExpired
        ? "pending"
        : decisionSummary.recommendation === "no_current_product_fit"
          ? "secondary"
          : decisionSummary.recommendation === "offer_available" && decisionSummary.readyForDecision
            ? "success"
            : decisionSummary.readyForDecision
              ? "destructive"
              : "pending"
    : getQuoteStatusVariant(effectiveQuoteStatus);
  const decisionHeadline = isHistoricalAssessment
    ? intl.formatMessage({
        id: "quotes.summary.actionHold",
        defaultMessage: "Hold",
        description: "Recommended operator action while applicant evidence is pending",
      })
    : offerExpired
      ? intl.formatMessage({
          id: "quotes.summary.termsExpired",
          defaultMessage: "Terms expired",
          description: "Primary operator status when the prepared terms are no longer actionable",
        })
      : decisionSummary?.recommendation === "no_current_product_fit"
        ? intl.formatMessage({ id: "quotes.summary.actionDoNotOffer", defaultMessage: "Do not offer" })
        : decisionSummary?.recommendation === "offer_available" && decisionSummary.readyForDecision
          ? intl.formatMessage({
              id: "quotes.summary.actionOffer",
              defaultMessage: "Offer",
              description: "Recommended operator action for a governed offer-ready case",
            })
          : decisionSummary?.readyForDecision
            ? intl.formatMessage({ id: "quotes.summary.actionReview", defaultMessage: "Review" })
            : intl.formatMessage({
                id: "quotes.summary.actionHold",
                defaultMessage: "Hold",
                description: "Recommended operator action while applicant evidence is pending",
              });
  const decisionStatusLine = isHistoricalAssessment
    ? intl.formatMessage({
        id: "quotes.summary.awaitingApplicantEvidence",
        defaultMessage: "Awaiting applicant evidence",
        description: "Status and executive headline for a retained non-actionable assessment pending an applicant response",
      })
    : offerExpired && decisionSummary?.recommendedTerms
      ? intl.formatMessage(
          { id: "quotes.summary.termsExpiredOn", defaultMessage: "Expired {date} · Awaiting applicant" },
          { date: decisionSummary.recommendedTerms.offerExpiresOn }
        )
      : decisionSummary?.recommendation === "offer_available" && decisionSummary.readyForDecision && decisionSummary.recommendedTerms
        ? intl.formatMessage(
            { id: "quotes.summary.termsValidTo", defaultMessage: "Ready · terms valid to {date}" },
            { date: decisionSummary.recommendedTerms.offerExpiresOn }
          )
        : decisionSummary?.recommendation === "no_current_product_fit"
          ? intl.formatMessage({ id: "quotes.summary.noCurrentProductFit", defaultMessage: "No current product fit" })
          : intl.formatMessage({ id: "quotes.summary.verificationRequired", defaultMessage: "Verification required" });
  const changeLabel = (change: AssessmentChange): string => {
    if (change.field === "axis") return axisLabels[change.axis ?? ""] ?? words(change.axis ?? "axis");
    const labels: Record<Exclude<AssessmentChange["field"], "axis">, string> = {
      assessment: intl.formatMessage({ id: "quotes.reassessment.assessment", defaultMessage: "Assessment" }),
      recommendation: intl.formatMessage({ id: "quotes.reassessment.recommendation", defaultMessage: "Recommendation" }),
      required_information: intl.formatMessage({ id: "quotes.reassessment.requiredInformation", defaultMessage: "Required information" }),
      contradictions: intl.formatMessage({ id: "quotes.reassessment.contradictions", defaultMessage: "Contradictions" }),
      invoice_plausibility: intl.formatMessage({ id: "quotes.reassessment.invoicePlausibility", defaultMessage: "Invoice plausibility" }),
      invoice_consistency: intl.formatMessage({ id: "quotes.reassessment.invoiceConsistency", defaultMessage: "Invoice consistency" }),
      invoice_evidence: intl.formatMessage({ id: "quotes.reassessment.invoiceEvidence", defaultMessage: "Invoice evidence" }),
      invoice_amount: intl.formatMessage({
        id: "quotes.reassessment.invoiceAmount",
        defaultMessage: "Submitted invoice amount",
        description: "Label for the amount extracted from the submitted invoice",
      }),
      invoice_amount_vs_bill: intl.formatMessage({
        id: "quotes.reassessment.invoiceAmountVsBill",
        defaultMessage: "Invoice amount vs eBill",
        description: "Label for the deterministic comparison between invoice and eBill amounts",
      }),
      use_of_funds: intl.formatMessage({
        id: "quotes.reassessment.useOfFunds",
        defaultMessage: "Use of funds",
        description: "Label for a changed applicant use-of-funds claim",
      }),
      acceptor: intl.formatMessage({
        id: "quotes.reassessment.acceptor",
        defaultMessage: "Acceptor",
        description: "Label for a changed acceptor claim",
      }),
      repayment_source: intl.formatMessage({
        id: "quotes.reassessment.repaymentSource",
        defaultMessage: "Repayment source",
        description: "Label for a changed applicant repayment-source claim",
      }),
      recourse_acknowledgement: intl.formatMessage({
        id: "quotes.reassessment.recourseAcknowledgement",
        defaultMessage: "Whole-face recourse",
        description: "Label for a changed whole-face recourse acknowledgement",
      }),
      claim_evidence: intl.formatMessage({
        id: "quotes.reassessment.claimEvidence",
        defaultMessage: "Claim evidence",
        description: "Label for a changed applicant-claim evidence state",
      }),
      document_count: intl.formatMessage({
        id: "quotes.reassessment.documentCount",
        defaultMessage: "Submitted document count",
        description: "Label for a changed submitted-document count",
      }),
      documents: intl.formatMessage({
        id: "quotes.reassessment.documents",
        defaultMessage: "Submitted documents",
        description: "Label for changed submitted-document identities and digests",
      }),
      minting_fee: intl.formatMessage({ id: "quotes.reassessment.mintingFee", defaultMessage: "Minting fee" }),
      amount_available: intl.formatMessage({
        id: "quotes.reassessment.amountAvailable",
        defaultMessage: "Amount available for minting",
      }),
      offer_expiry: intl.formatMessage({ id: "quotes.reassessment.offerExpiry", defaultMessage: "Offer expiry" }),
    };
    return labels[change.field];
  };
  const changeValue = (change: AssessmentChange, value: string): string => {
    if (value === "") return intl.formatMessage({ id: "quotes.reassessment.none", defaultMessage: "None" });
    if (change.field === "minting_fee" || change.field === "amount_available" || change.field === "invoice_amount") {
      return `${intl.formatNumber(BigInt(value))} sat`;
    }
    if (change.field === "recourse_acknowledgement") {
      return value === "true"
        ? intl.formatMessage({ id: "quotes.reassessment.acknowledged", defaultMessage: "Acknowledged" })
        : intl.formatMessage({ id: "quotes.reassessment.notAcknowledged", defaultMessage: "Not acknowledged" });
    }
    return ["required_information", "offer_expiry", "use_of_funds", "acceptor", "repayment_source", "documents"].includes(change.field)
      ? value
      : words(value);
  };
  const applicantRequests = decisionSummary?.applicantRequests ?? [];
  const reassessmentChanges = decisionSummary?.reassessmentChanges ?? [];

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <header className="border-b border-border bg-elevation-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className={`text-3xl font-semibold tracking-tight ${offerExpired ? "text-signal-alert" : ""}`}>
                {showDecisionStatus ? decisionHeadline : effectiveQuoteStatus}
              </h1>
              {showDecisionStatus && <p className="mt-1 truncate text-sm text-muted-foreground">{decisionStatusLine}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="xxs"
                className="size-8 p-0"
                onClick={() => window.print()}
                aria-label={intl.formatMessage({ id: "quotes.summary.print", defaultMessage: "Print summary" })}
                title={intl.formatMessage({ id: "quotes.summary.print", defaultMessage: "Print summary" })}
              >
                <Printer className="size-4" aria-hidden="true" />
              </Button>
              {!showDecisionStatus && (
                <Badge variant={summaryStatusVariant}>{intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus))}</Badge>
              )}
            </div>
          </div>
        </header>

        {decisionSummary ? (
          <div>
            <section className="overflow-x-auto border-b border-border px-6 py-3">
              <p className="whitespace-nowrap text-xs font-medium text-muted-foreground">
                {decisionSummary.unresolvedContradictions > 0
                  ? intl.formatMessage(
                      { id: "quotes.summary.contradictionCount", defaultMessage: "{count} contradictions" },
                      { count: decisionSummary.unresolvedContradictions }
                    )
                  : decisionSummary.evidenceSummary.openRequests > 0
                    ? intl.formatMessage(
                        { id: "quotes.summary.openCount", defaultMessage: "{count} open" },
                        { count: decisionSummary.evidenceSummary.openRequests }
                      )
                    : intl.formatMessage({ id: "quotes.summary.noOpenExceptions", defaultMessage: "No open exceptions" })}
                {" · "}
                {intl.formatMessage(
                  { id: "quotes.summary.policyCompact", defaultMessage: "Policy {passed}/{total}" },
                  { passed: decisionSummary.passedChecks, total: decisionSummary.totalChecks }
                )}
                {" · "}
                {intl.formatMessage(
                  {
                    id: "quotes.summary.documentCountCompact",
                    defaultMessage: "{count, plural, one {# document} other {# documents}}",
                  },
                  { count: decisionSummary.evidenceSummary.documents }
                )}
              </p>

              {applicantRequests.length > 0 && (
                <section className="mt-3 border-l-2 border-signal-alert pl-3">
                  <h4 className="text-xs font-semibold text-signal-alert">
                    {intl.formatMessage({ id: "quotes.summary.blockingItems", defaultMessage: "Blocking items" })}
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {applicantRequests.map((request) => (
                      <li key={`${request.axis}:${request.requiredItem}`} className="text-sm font-medium">
                        {request.requiredItem}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {reassessmentChanges.length > 0 && (
                <details className="group mt-4 rounded-md border border-border bg-background">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-xs font-medium marker:hidden">
                    {intl.formatMessage(
                      { id: "quotes.reassessment.changed", defaultMessage: "Changed since last assessment ({count})" },
                      { count: reassessmentChanges.length }
                    )}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <div className="border-t border-border px-3 py-1">
                    {reassessmentChanges.map((change) => (
                      <div key={`${change.field}:${change.axis ?? ""}`} className="border-b border-border py-2 last:border-b-0">
                        <div className="text-xs font-medium">{changeLabel(change)}</div>
                        <dl className="mt-1 grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-muted-foreground">
                              {intl.formatMessage({ id: "quotes.reassessment.before", defaultMessage: "Before" })}
                            </dt>
                            <dd className="mt-0.5 break-words">{changeValue(change, change.before)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">
                              {intl.formatMessage({ id: "quotes.reassessment.after", defaultMessage: "After" })}
                            </dt>
                            <dd className="mt-0.5 break-words font-medium">{changeValue(change, change.after)}</dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>

            <details className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-4 marker:hidden">
                <h3 className="shrink-0 text-sm font-semibold">
                  {intl.formatMessage({ id: "quotes.summary.statedByApplicant", defaultMessage: "Business case" })}
                </h3>
                <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                  {decisionSummary.goodsDescription
                    ? `${decisionSummary.goodsDescription} · ${decisionSummary.useOfFunds}`
                    : decisionSummary.useOfFunds}
                </span>
                <ChevronDown
                  className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <dl className="grid gap-x-8 gap-y-5 border-t border-border px-6 py-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.purpose", defaultMessage: "Use of proceeds" })}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium leading-6">{decisionSummary.useOfFunds}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.repayment", defaultMessage: "Repayment source" })}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium leading-6">{decisionSummary.repaymentSource}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.payer", defaultMessage: "Payer at maturity" })}
                  </dt>
                  <dd className="mt-1 break-words text-sm font-medium leading-6">{bill.drawee.name}</dd>
                </div>
                {decisionSummary.goodsDescription && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: "quotes.summary.tradeEvidence", defaultMessage: "Underlying trade" })}
                    </dt>
                    <dd className="mt-1 break-words text-sm font-medium leading-6">{decisionSummary.goodsDescription}</dd>
                  </div>
                )}
              </dl>
            </details>
          </div>
        ) : (
          <p className="px-6 py-5 text-sm text-muted-foreground">
            {intl.formatMessage({
              id: "quotes.summary.unavailable",
              defaultMessage: "No business assessment is available for this quote.",
            })}
          </p>
        )}

        <section className="grid grid-cols-2 border-t border-border bg-elevation-100 md:grid-cols-4">
          <div className="border-r border-b border-border px-5 py-4 lg:border-b-0">
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
          <div className="border-b border-border px-5 py-4 lg:border-r lg:border-b-0">
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
