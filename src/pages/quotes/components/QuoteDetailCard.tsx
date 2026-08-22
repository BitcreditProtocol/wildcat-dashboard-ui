import { Badge } from "@/components/ui/badge";
import { Button, Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusVariant } from "@/utils/quote-status";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { InfoReply, MintOperationStatus } from "@/generated/client/types.gen";
import type { DurableAuthorizationReceipt, VerifiedAuthorizationReceipt } from "@/pages/credit/record-operator-decision";
import { CircleAlert, CircleCheck, Clock3, Printer } from "lucide-react";
import type { PropsWithChildren } from "react";
import { useIntl } from "react-intl";

interface QuoteDetailCardProps {
  quote: InfoReply;
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
    totalChecks: number;
    invoiceExtractedAndMatched: boolean;
    answersAffirmed: boolean;
    recourseAcknowledged: boolean;
    unresolvedContradictions: number;
    underwritingEvidenceProvenance: "mint_backed" | "synthetic" | "unavailable";
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

function VerificationLine({ ok, children }: PropsWithChildren<{ ok: boolean }>) {
  const Icon = ok ? CircleCheck : CircleAlert;
  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? "text-signal-success" : "text-signal-alert"}`} aria-hidden="true" />
      <span>{children}</span>
    </li>
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <header className="border-b border-border bg-elevation-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">
                {decisionSummary?.readyForDecision
                  ? intl.formatMessage({ id: "quotes.summary.decisionReadyTitle", defaultMessage: "Decision-ready business case" })
                  : intl.formatMessage({ id: "quotes.summary.verificationTitle", defaultMessage: "Business case requires verification" })}
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
              <Badge variant={getQuoteStatusVariant(effectiveQuoteStatus)}>
                {intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus))}
              </Badge>
              {decisionSummary && (
                <Badge variant={decisionSummary.readyForDecision ? "success" : "pending"}>
                  {decisionSummary.readyForDecision
                    ? intl.formatMessage({ id: "quotes.summary.ready", defaultMessage: "Ready for decision" })
                    : intl.formatMessage({ id: "quotes.summary.verificationRequired", defaultMessage: "Verification required" })}
                </Badge>
              )}
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
                  id: "quotes.summary.decisionEvidence",
                  defaultMessage: "Decision evidence",
                  description: "Heading for evidence and attestations used by the automated credit assessment",
                })}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={decisionSummary.underwritingEvidenceProvenance === "mint_backed" ? "success" : "outline"}>
                  {decisionSummary.underwritingEvidenceProvenance === "mint_backed"
                    ? intl.formatMessage({
                        id: "quotes.summary.mintBackedEvidence",
                        defaultMessage: "Mint-backed underwriting evidence",
                        description: "Badge stating that risk and capacity data came from admissible authoritative sources",
                      })
                    : decisionSummary.underwritingEvidenceProvenance === "synthetic"
                      ? intl.formatMessage({
                          id: "quotes.summary.syntheticInputs",
                          defaultMessage: "Synthetic underwriting inputs",
                          description: "Badge stating that risk and capacity inputs are synthetic and not production evidence",
                        })
                      : intl.formatMessage({
                          id: "quotes.summary.mintEvidenceUnavailable",
                          defaultMessage: "Underwriting evidence unavailable",
                          description: "Badge warning that admissible risk or Mint capacity evidence is unavailable",
                        })}
                </Badge>
                <Badge variant={decisionSummary.hasMintPolicyAssignment ? "success" : "pending"}>
                  {decisionSummary.hasMintPolicyAssignment
                    ? intl.formatMessage({
                        id: "quotes.summary.mintPolicyAssigned",
                        defaultMessage: "Mint policy assigned",
                        description: "Badge confirming that the Mint assigned the governed policy to this exact quote",
                      })
                    : intl.formatMessage({
                        id: "quotes.summary.mintPolicyMissing",
                        defaultMessage: "No Mint policy assignment",
                        description: "Badge warning that the assessment is not assigned to this quote by the Mint",
                      })}
                </Badge>
              </div>
              <div className="mt-5 grid gap-5">
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {intl.formatMessage({
                      id: "quotes.summary.automatedChecks",
                      defaultMessage: "Automated checks",
                      description: "Heading for checks performed by the deterministic credit policy engine",
                    })}
                  </h4>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <VerificationLine ok={decisionSummary.passedChecks === decisionSummary.totalChecks}>
                      {intl.formatMessage(
                        {
                          id: "quotes.summary.checks",
                          defaultMessage: "{passed}/{total} automated policy gates passed",
                          description: "Count of deterministic credit policy gates that passed",
                        },
                        { passed: decisionSummary.passedChecks, total: decisionSummary.totalChecks }
                      )}
                    </VerificationLine>
                    <VerificationLine ok={decisionSummary.invoiceExtractedAndMatched}>
                      {decisionSummary.invoiceExtractedAndMatched
                        ? intl.formatMessage({
                            id: "quotes.summary.invoiceVerified",
                            defaultMessage: "Invoice data extracted and matched",
                            description: "Automated result when submitted invoice data was extracted and matched to the bill and claims",
                          })
                        : intl.formatMessage({
                            id: "quotes.summary.invoiceReview",
                            defaultMessage: "Invoice extraction or match required",
                            description: "Warning when invoice data has not been extracted or matched to the bill and claims",
                          })}
                    </VerificationLine>
                    <VerificationLine ok={decisionSummary.unresolvedContradictions === 0}>
                      {decisionSummary.unresolvedContradictions === 0
                        ? intl.formatMessage({
                            id: "quotes.summary.noContradictions",
                            defaultMessage: "Automated scan found no unresolved contradictions",
                            description: "Automated result when the decision snapshot contains no unresolved contradictions",
                          })
                        : intl.formatMessage(
                            {
                              id: "quotes.summary.contradictions",
                              defaultMessage: "{count} unresolved contradictions",
                              description: "Number of unresolved contradictions in the decision snapshot",
                            },
                            { count: decisionSummary.unresolvedContradictions }
                          )}
                    </VerificationLine>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {intl.formatMessage({
                      id: "quotes.summary.applicantAttestations",
                      defaultMessage: "Applicant attestations",
                      description: "Heading for statements affirmed by the applicant rather than independently verified facts",
                    })}
                  </h4>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <VerificationLine ok={decisionSummary.answersAffirmed}>
                      {decisionSummary.answersAffirmed
                        ? intl.formatMessage({
                            id: "quotes.summary.applicantConfirmed",
                            defaultMessage: "Applicant affirmed the submitted answers",
                            description: "Attestation that the applicant affirmed their submitted answers",
                          })
                        : intl.formatMessage({
                            id: "quotes.summary.applicantUnconfirmed",
                            defaultMessage: "Applicant affirmation required",
                            description: "Warning that the applicant has not affirmed their submitted answers",
                          })}
                    </VerificationLine>
                    <VerificationLine ok={decisionSummary.recourseAcknowledged}>
                      {decisionSummary.recourseAcknowledged
                        ? intl.formatMessage({
                            id: "quotes.summary.recourseAcknowledged",
                            defaultMessage: "Applicant acknowledged full-bill recourse",
                            description: "Attestation that the applicant acknowledged full-bill recourse",
                          })
                        : intl.formatMessage({
                            id: "quotes.summary.recourseRequired",
                            defaultMessage: "Applicant recourse acknowledgment required",
                            description: "Warning that the applicant has not acknowledged full-bill recourse",
                          })}
                    </VerificationLine>
                  </ul>
                </div>
              </div>
              <nav className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Decision proof">
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="#documents-and-evidence">
                  {intl.formatMessage({
                    id: "quotes.summary.reviewEvidence",
                    defaultMessage: "Review source evidence",
                    description: "Link from the executive summary to the source documents and extracted evidence",
                  })}
                </a>
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="#bill-history">
                  {intl.formatMessage({
                    id: "quotes.summary.reviewBillHistory",
                    defaultMessage: "Review bill history",
                    description: "Link from the executive summary to the signed eBill history",
                  })}
                </a>
                <a className="font-medium text-primary underline-offset-4 hover:underline" href="#full-governed-assessment">
                  {intl.formatMessage({
                    id: "quotes.summary.reviewAssessment",
                    defaultMessage: "Open full assessment",
                    description: "Link from the executive summary to the detailed governed assessment",
                  })}
                </a>
              </nav>
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

        <section className="border-t border-border px-6 py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {intl.formatMessage({
                  id: "quotes.lifecycle.title",
                  defaultMessage: "Authorization & lifecycle",
                  description: "Heading for the distinct bill, quote, authorization, applicant and Mint operation stages",
                })}
              </h3>
              <Badge variant={durableExecutionCompleted || hasSignedVerification ? "success" : "outline"}>
                {hasDurableReceipt
                  ? intl.formatMessage({
                      id: "quotes.authorization.executionPersisted",
                      defaultMessage: "Execution receipt persisted",
                      description: "Badge when the Mint exposes a durable authorization execution receipt",
                    })
                  : hasSignedVerification
                    ? intl.formatMessage({
                        id: "quotes.authorization.signedVerified",
                        defaultMessage: "Signed command verified",
                        description: "Badge shown after the Mint accepts the signed authorization command in this session",
                      })
                    : intl.formatMessage({
                        id: "quotes.authorization.unavailable",
                        defaultMessage: "Verification receipt unavailable",
                        description: "Badge when neither a signed command nor durable execution receipt is available",
                      })}
              </Badge>
            </div>

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
        </section>

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
