import { Badge } from "@/components/ui/badge";
import { Button, Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { AdminInfoReply, MintOperationStatus } from "@/generated/client/types.gen";
import type { DurableAuthorizationReceipt, VerifiedAuthorizationReceipt } from "@/pages/credit/record-operator-decision";
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
    useOfFunds: string;
    repaymentSource: string;
    acceptor?: string;
    goodsDescription?: string;
    readyForDecision: boolean;
    passedChecks: number;
    failedChecks: number;
    notAssessedChecks: number;
    totalChecks: number;
    invoiceExtractedAndMatched: boolean;
    answersAffirmed: boolean;
    recourseAcknowledged: boolean;
    unresolvedContradictions: number;
    underwritingEvidenceProvenance: "mint_backed" | "synthetic" | "unavailable";
    underwritingAuthoritySignaturesVerified: boolean;
    hasMintPolicyAssignment: boolean;
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
  const netProceeds = "discounted" in quote ? quote.discounted : null;
  const showingRecommendation = netProceeds === null && decisionSummary?.recommendedTerms !== undefined;
  const displayedAmountAvailableForMinting = netProceeds ?? decisionSummary?.recommendedTerms?.amountAvailableForMinting ?? null;
  const mintingFee = netProceeds === null ? (decisionSummary?.recommendedTerms?.mintingFee ?? null) : bill.sum - netProceeds;
  const mintingFeeRate =
    mintingFee === null || bill.sum === 0
      ? null
      : showingRecommendation && decisionSummary?.recommendedTerms
        ? intl.formatMessage(
            {
              id: "quotes.summary.recommendedFeeContext",
              defaultMessage: "{rate}% of bill over {days} days",
              description: "Fee ratio and tenor for the governed recommended Minting fee",
            },
            {
              rate: intl.formatNumber(decisionSummary.recommendedTerms.feeRatioBps / 100, { maximumFractionDigits: 2 }),
              days: decisionSummary.recommendedTerms.tenorDays,
            }
          )
        : `${((mintingFee / bill.sum) * 100).toFixed(4)}%`;
  const exposureReservation =
    quote.credit_exposure_reservation?.quoteId === quote.id &&
    /^(0|[1-9][0-9]*)$/u.test(quote.credit_exposure_reservation.amountSat) &&
    ["reserved", "committed", "released"].includes(quote.credit_exposure_reservation.state)
      ? quote.credit_exposure_reservation
      : null;

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
  const decisionPhaseComplete = effectiveQuoteStatus !== "Pending";
  const positiveDecisionOutcome = ["Offered", "Accepted", "MintingEnabled"].includes(effectiveQuoteStatus);
  const summaryStatusVariant = showDecisionStatus
    ? decisionSummary.readyForDecision
      ? "success"
      : "pending"
    : getQuoteStatusVariant(effectiveQuoteStatus);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <header className="border-b border-border bg-elevation-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {intl.formatMessage({ id: "quotes.summary.caseTitle", defaultMessage: "Minting case" })}
              </h2>
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
              <Badge variant={summaryStatusVariant}>
                {showDecisionStatus
                  ? decisionSummary.readyForDecision
                    ? intl.formatMessage({ id: "quotes.summary.ready", defaultMessage: "Ready for decision" })
                    : intl.formatMessage({ id: "quotes.summary.verificationRequired", defaultMessage: "Verification required" })
                  : intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus))}
              </Badge>
            </div>
          </div>
        </header>

        {decisionSummary ? (
          <div className="grid lg:grid-cols-[1.35fr_1fr]">
            <section className="px-6 py-5">
              <h3 className="text-sm font-semibold">
                {intl.formatMessage({ id: "quotes.summary.businessCase", defaultMessage: "Business case" })}
              </h3>
              <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.purpose", defaultMessage: "Use of proceeds" })}
                  </dt>
                  <dd className="mt-1 text-sm font-medium leading-5">{decisionSummary.useOfFunds}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {intl.formatMessage({ id: "quotes.summary.repayment", defaultMessage: "Repayment source" })}
                  </dt>
                  <dd className="mt-1 text-sm font-medium leading-5">{decisionSummary.repaymentSource}</dd>
                </div>
                {decisionSummary.acceptor && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: "quotes.summary.payer", defaultMessage: "Payer at maturity" })}
                    </dt>
                    <dd className="mt-1 text-sm font-medium leading-5">{decisionSummary.acceptor}</dd>
                  </div>
                )}
                {decisionSummary.goodsDescription && (
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: "quotes.summary.tradeEvidence", defaultMessage: "Underlying trade" })}
                    </dt>
                    <dd className="mt-1 text-sm font-medium leading-5">{decisionSummary.goodsDescription}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="border-t border-border bg-elevation-100 px-6 py-5 lg:border-t-0 lg:border-l">
              <h3 className="text-sm font-semibold">
                {intl.formatMessage({
                  id: "quotes.summary.decisionStatus",
                  defaultMessage: "Decision status",
                  description: "Heading for the compact operator decision status",
                })}
              </h3>
              <div className="mt-4 flex items-start gap-3">
                {positiveDecisionOutcome || (!decisionPhaseComplete && decisionSummary.readyForDecision) ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-signal-success" aria-hidden="true" />
                ) : (
                  <CircleAlert className="mt-0.5 size-5 shrink-0 text-signal-alert" aria-hidden="true" />
                )}
                <div>
                  <p className="text-sm font-semibold">
                    {decisionPhaseComplete
                      ? intl.formatMessage({
                          id: "quotes.summary.decisionPhaseComplete",
                          defaultMessage: "Decision phase complete",
                          description: "Compact status after a quote is no longer awaiting a Mint operator decision",
                        })
                      : decisionSummary.readyForDecision
                        ? intl.formatMessage({ id: "quotes.summary.ready", defaultMessage: "Ready for decision" })
                        : intl.formatMessage({ id: "quotes.summary.verificationRequired", defaultMessage: "Verification required" })}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {decisionPhaseComplete
                      ? intl.formatMessage({
                          id: "quotes.summary.decisionPhaseCompleteExplanation",
                          defaultMessage: "This case is no longer awaiting an operator decision. Evidence remains available for audit.",
                          description: "Compact explanation after a quote leaves the operator decision phase",
                        })
                      : decisionSummary.readyForDecision
                        ? intl.formatMessage(
                            {
                              id: "quotes.summary.readyExplanation",
                              defaultMessage: "{passed}/{total} policy checks passed. Evidence and applicant declarations are complete.",
                              description: "Compact explanation that a governed case is ready for an operator decision",
                            },
                            { passed: decisionSummary.passedChecks, total: decisionSummary.totalChecks }
                          )
                        : intl.formatMessage(
                            {
                              id: "quotes.summary.verificationExplanation",
                              defaultMessage: "{passed}/{total} policy checks passed. {count} items still require verification.",
                              description: "Compact explanation that a governed case still needs verification",
                            },
                            {
                              passed: decisionSummary.passedChecks,
                              total: decisionSummary.totalChecks,
                              count: decisionSummary.failedChecks + decisionSummary.notAssessedChecks,
                            }
                          )}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Badge
                  variant={
                    decisionSummary.underwritingEvidenceProvenance === "mint_backed" &&
                    decisionSummary.underwritingAuthoritySignaturesVerified &&
                    decisionSummary.hasMintPolicyAssignment
                      ? "success"
                      : decisionSummary.underwritingEvidenceProvenance === "synthetic"
                        ? "outline"
                        : "pending"
                  }
                >
                  {decisionSummary.underwritingEvidenceProvenance === "synthetic"
                    ? intl.formatMessage({
                        id: "quotes.summary.syntheticInputs",
                        defaultMessage: "Synthetic testnet inputs",
                        description: "Badge stating that risk and capacity inputs are synthetic testnet data",
                      })
                    : decisionSummary.underwritingEvidenceProvenance === "mint_backed" &&
                        decisionSummary.underwritingAuthoritySignaturesVerified &&
                        decisionSummary.hasMintPolicyAssignment
                      ? intl.formatMessage({
                          id: "quotes.summary.verifiedMintSources",
                          defaultMessage: "Verified Mint sources",
                          description: "Badge stating that policy, risk and capacity records are bound and signature-verified",
                        })
                      : intl.formatMessage({
                          id: "quotes.summary.mintEvidenceUnavailable",
                          defaultMessage: "Underwriting evidence incomplete",
                          description: "Badge warning that admissible or verified Mint underwriting evidence is incomplete",
                        })}
                </Badge>
                <a className="text-sm font-medium text-primary underline-offset-4 hover:underline" href="#documents-and-evidence">
                  {intl.formatMessage({
                    id: "quotes.summary.reviewEvidence",
                    defaultMessage: "Review evidence",
                    description: "Link from the executive summary to source documents and extracted evidence",
                  })}
                </a>
              </div>
            </section>
          </div>
        ) : (
          <p className="px-6 py-5 text-sm text-muted-foreground">
            {intl.formatMessage({
              id: "quotes.summary.unavailable",
              defaultMessage: "No governed business assessment is available for this quote.",
            })}
          </p>
        )}

        <section className="grid grid-cols-2 border-t border-border bg-elevation-100 lg:grid-cols-4">
          <div className="border-r border-b border-border px-5 py-4 lg:border-b-0">
            <div className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.detail.sum", defaultMessage: "Bill amount" })}
            </div>
            <Currency value={bill.sum} sourceCurrency="sat" className="mt-1 text-xl font-semibold" amountClassName="text-current" />
          </div>
          <div className="border-b border-border px-5 py-4 lg:border-r lg:border-b-0">
            <div className="text-xs text-muted-foreground">
              {showingRecommendation
                ? intl.formatMessage({
                    id: "quotes.summary.recommendedMintingFee",
                    defaultMessage: "Recommended Minting fee",
                    description: "Governed recommended Minting fee before the Mint has issued terms",
                  })
                : intl.formatMessage({ id: "quotes.detail.discount.absolute", defaultMessage: "Minting fee" })}
            </div>
            {mintingFee !== null && mintingFeeRate !== null ? (
              <>
                <Currency value={mintingFee} sourceCurrency="sat" className="mt-1 text-xl font-semibold" amountClassName="text-current" />
                <div className="mt-0.5 text-xs text-muted-foreground">{mintingFeeRate}</div>
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold">—</div>
            )}
          </div>
          <div className="border-r border-border px-5 py-4">
            <div className="text-xs text-muted-foreground">
              {showingRecommendation
                ? intl.formatMessage({
                    id: "quotes.summary.recommendedAmountAvailable",
                    defaultMessage: "Recommended amount available for minting",
                    description: "Governed recommended amount before the Mint has issued terms",
                  })
                : intl.formatMessage({ id: "quotes.detail.discounted", defaultMessage: "Amount available for minting" })}
            </div>
            {displayedAmountAvailableForMinting !== null ? (
              <>
                <Currency
                  value={displayedAmountAvailableForMinting}
                  sourceCurrency="sat"
                  className="mt-1 text-xl font-semibold"
                  amountClassName="text-current"
                />
                {showingRecommendation && decisionSummary?.recommendedTerms && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {intl.formatMessage(
                      {
                        id: "quotes.summary.recommendationValidUntil",
                        defaultMessage: "Valid until {date}",
                        description: "Expiry date of the governed recommended terms",
                      },
                      { date: decisionSummary.recommendedTerms.offerExpiresOn }
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold">—</div>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: "quotes.detail.maturityDate", defaultMessage: "Maturity" })}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{bill.maturity_date}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{maturityLabel}</div>
          </div>
        </section>

        <details className="group border-t border-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 marker:hidden">
            <span className="text-sm font-semibold">
              {intl.formatMessage({
                id: "quotes.lifecycle.auditTitle",
                defaultMessage: "Audit & lifecycle",
                description: "Collapsed heading for authorization receipts and lifecycle details",
              })}
            </span>
            <span className="flex items-center gap-2">
              <Badge variant={durableExecutionCompleted || hasSignedVerification ? "success" : "outline"}>
                {hasDurableReceipt
                  ? intl.formatMessage({
                      id: "quotes.authorization.executionPersisted",
                      defaultMessage: "Audit receipt saved",
                      description: "Badge when the Mint exposes a durable authorization execution receipt",
                    })
                  : hasSignedVerification
                    ? intl.formatMessage({
                        id: "quotes.authorization.signedVerified",
                        defaultMessage: "Authorization verified",
                        description: "Badge shown after the Mint accepts the signed authorization command in this session",
                      })
                    : intl.formatMessage({
                        id: "quotes.authorization.unavailable",
                        defaultMessage: "No authorization receipt",
                        description: "Badge when neither a signed command nor durable execution receipt is available",
                      })}
              </Badge>
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
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

              {exposureReservation !== null && (
                <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 px-3 py-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={exposureReservation.state === "released" ? "outline" : "success"}>
                      {intl.formatMessage(
                        {
                          id: "quotes.capacity.state",
                          defaultMessage: "Capacity {state}",
                          description: "State of the quote-bound Mint exposure reservation",
                        },
                        { state: exposureReservation.state }
                      )}
                    </Badge>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.capacity.amount",
                        defaultMessage: "Exposure amount",
                        description: "Label for the amount controlled by the Mint exposure reservation",
                      })}
                    </span>
                    <Currency value={Number(exposureReservation.amountSat)} sourceCurrency="sat" />
                  </div>
                  <span className="truncate font-mono text-muted-foreground" title={exposureReservation.capacityEvidenceId}>
                    {intl.formatMessage({
                      id: "quotes.capacity.evidence",
                      defaultMessage: "Capacity evidence",
                      description: "Label for the authority evidence record controlling an exposure reservation",
                    })}
                    : {exposureReservation.capacityEvidenceId.slice(0, 18)}…
                  </span>
                </div>
              )}

              {hasDurableReceipt ? (
                <dl className="grid gap-x-5 gap-y-3 border-t border-border pt-4 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.operationId",
                        defaultMessage: "Operation ID",
                        description: "Label for the durable Mint authorization operation identifier",
                      })}
                    </dt>
                    <dd className="mt-1 font-mono" title={durableAuthorizationReceipt.operationId}>
                      {durableAuthorizationReceipt.operationId.slice(0, 22)}…
                    </dd>
                  </div>
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
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.digest",
                        defaultMessage: "Authorization digest",
                        description: "Label for the digest binding the signed authorization",
                      })}
                    </dt>
                    <dd className="mt-1 font-mono" title={durableAuthorizationReceipt.authorizationDigest}>
                      {durableAuthorizationReceipt.authorizationDigest.slice(0, 22)}…
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {intl.formatMessage({
                        id: "quotes.authorization.resultDigest",
                        defaultMessage: "Result digest",
                        description: "Label for the digest binding the persisted Mint result",
                      })}
                    </dt>
                    <dd className="mt-1 font-mono" title={durableAuthorizationReceipt.resultDigest}>
                      {durableAuthorizationReceipt.resultDigest.slice(0, 22)}…
                    </dd>
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
                        id: "quotes.authorization.digest",
                        defaultMessage: "Authorization digest",
                        description: "Label for the digest binding the signed authorization",
                      })}
                    </dt>
                    <dd className="mt-1 font-mono" title={signedAuthorizationReceipt.authorizationDigest}>
                      {signedAuthorizationReceipt.authorizationDigest.slice(0, 22)}…
                    </dd>
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
        </details>

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
              {quote.status === "Offered" && "ttl" in quote && quote.ttl && (
                <span className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: "quotes.detail.deadline", defaultMessage: "Offer deadline" })}{" "}
                  {formatLocalDateTime(new Date(quote.ttl))}
                </span>
              )}
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
      </CardContent>
    </Card>
  );
}
