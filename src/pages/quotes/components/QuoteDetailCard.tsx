import { Badge } from "@/components/ui/badge";
import { governedTermsExpired } from "@bitcredit/ai-credit-shared";
import { Button, Card, CardContent, Text } from "@bitcredit/ui-library";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import { Currency } from "@/components/Currency";
import { getQuoteStatusMessage } from "@/i18n/descriptors";
import { humanReadableDurationDays } from "@/utils/dates";
import type { AdminInfoReply, MintOperationStatus } from "@/generated/client/types.gen";
import type { DurableAuthorizationReceipt, VerifiedAuthorizationReceipt } from "@/pages/credit/record-operator-decision";
import { ChevronDown, CircleAlert, CircleCheck, Clock3, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { CaseBrief } from "@/pages/credit/case-brief";
import { caseHeadline, caseReason } from "@/pages/credit/case-brief-copy";
import { CaseNextStepPanel, CaseProgress } from "@/pages/credit/CaseBrief";
import { CaseCertainty } from "@/pages/credit/CaseCertainty";
import { billApplicant } from "../quote-parties";
import { cn } from "@bitcredit/ui-library";

interface QuoteDetailCardProps {
  actions?: ReactNode;
  /** `aside`: the page renders the next step and actions in its own decision column. */
  decisionPlacement?: "header" | "aside";
  assessmentUnavailable?: boolean;
  assessmentLoading?: boolean;
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
    brief: CaseBrief;
    assessmentCurrency: "current" | "historical";
    useOfFunds?: string;
    repaymentSource?: string;
    billAcceptanceState?: string;
    acceptorRisk?: {
      probabilityOfDefaultBps: number | null;
      lossGivenDefaultBps: number | null;
      validThrough: string;
      evidenceState?: string;
    };
    /** The applicant's sector and country as the case records them (policy slugs, ISO country). */
    profile?: { industry: string; country: string };
    /** Agent-flagged points nobody has resolved. */
    openPoints?: number;
    duplicateCheck?: { result: string; evidenceState: string };
    alreadyFinanced?: boolean | null;
    /** Unresolved contradictions in the case snapshot. */
    contradictions?: number;
    recommendedTerms?: {
      mintingFee: number;
      amountAvailableForMinting: number;
      feeRatioBps: number;
      tenorDays: number;
      offerExpiresOn: string;
    };
  };
}

const termMessages = defineMessages({
  proposedFee: {
    id: "quotes.summary.proposedFee",
    defaultMessage: "Proposed minting fee",
    description: "Unapproved terms, not an issued offer",
  },
  fee: { id: "quotes.summary.fee", defaultMessage: "Fee", description: "Minting fee in the recorded offer" },
});

/** After the Mint decides, the quote status leads; these lines keep offer, minting and payment apart. */
const statusReasonMessages = defineMessages({
  Offered: {
    id: "quotes.status.reason.offered",
    defaultMessage: "Offer sent · waiting for the holder to accept or reject it.",
    description: "An offer is not acceptance, minting or payment",
  },
  Accepted: {
    id: "quotes.status.reason.accepted",
    defaultMessage: "The holder accepted the offer. This is not minting, issued value or eBill payment.",
    description: "Accepted quote status does not establish issued value or payment",
  },
  MintingEnabled: {
    id: "quotes.status.reason.mintingEnabled",
    defaultMessage: "Minting is permitted. Issued value and eBill payment are tracked separately.",
    description: "Minting enabled does not establish issued value or payment",
  },
  OfferExpired: {
    id: "quotes.status.reason.offerExpired",
    defaultMessage: "The offer expired without being accepted.",
    description: "Expired Mint offer",
  },
  Rejected: {
    id: "quotes.status.reason.rejected",
    defaultMessage: "The holder rejected the offer.",
    description: "Holder rejected the Mint offer",
  },
});

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
        ? "text-brand-200"
        : state === "failed"
          ? "text-destructive"
          : "text-muted-foreground";

  return (
    <li className="flex min-w-0 gap-2">
      <Icon className={`mt-0.5 size-4 shrink-0 ${color}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block text-sm font-medium break-words">{value}</span>
      </span>
    </li>
  );
}

export function QuoteDetailCard({
  actions,
  decisionPlacement = "header",
  assessmentUnavailable = false,
  assessmentLoading = false,
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
    decisionSummary?.recommendedTerms !== undefined &&
    governedTermsExpired(decisionSummary.recommendedTerms.offerExpiresOn, Date.now());
  const netProceeds = "discounted" in quote ? quote.discounted : null;
  // Proposed terms describe a pending decision only; any recorded Mint outcome replaces them.
  const recommendedTerms =
    effectiveQuoteStatus !== "Pending" ||
    assessmentUnavailable ||
    assessmentLoading ||
    isHistoricalAssessment ||
    offerExpired ||
    (decisionSummary?.brief && decisionSummary.brief.next.kind !== "decide_offer")
      ? undefined
      : decisionSummary?.recommendedTerms;
  const showingRecommendation = netProceeds === null && recommendedTerms !== undefined;
  const displayedAmountAvailableForMinting = netProceeds ?? recommendedTerms?.amountAvailableForMinting ?? null;
  const mintingFee = netProceeds === null ? (recommendedTerms?.mintingFee ?? null) : bill.sum - netProceeds;
  const mintingFeeRate =
    mintingFee === null || bill.sum === 0
      ? null
      : showingRecommendation && recommendedTerms
        ? intl.formatMessage(
            {
              id: "quotes.summary.feeContext",
              defaultMessage: "{rate} of the bill · {days, plural, one {# day} other {# days}}",
              description: "Fee as a share of the bill and the days it covers, for the governed proposed minting fee",
            },
            {
              rate: intl.formatNumber(recommendedTerms.feeRatioBps / 10_000, { style: "percent", minimumFractionDigits: 2 }),
              days: recommendedTerms.tenorDays,
            }
          )
        : intl.formatMessage(
            {
              id: "quotes.summary.feeShare",
              defaultMessage: "{rate} of the bill",
              description: "Recorded minting fee as a share of the bill amount",
            },
            { rate: intl.formatNumber(mintingFee / bill.sum, { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
          );
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
  const brief = decisionSummary?.brief;
  // The case brief speaks for a pending quote, and for a quote closed because evidence was unavailable.
  const showBrief =
    brief !== undefined &&
    !assessmentUnavailable &&
    !assessmentLoading &&
    (effectiveQuoteStatus === "Pending" || brief.next.kind === "closed");
  const statusReason = statusReasonMessages[effectiveQuoteStatus as keyof typeof statusReasonMessages];
  const headline =
    assessmentUnavailable && effectiveQuoteStatus === "Pending"
      ? intl.formatMessage({
          id: "quotes.summary.assessmentUnavailable",
          defaultMessage: "Assessment unavailable",
          description: "Financial assessment failed to load, not a missing application",
        })
      : showBrief
        ? caseHeadline(intl, brief)
        : intl.formatMessage(getQuoteStatusMessage(effectiveQuoteStatus));
  const headlineTone =
    offerExpired || (assessmentUnavailable && effectiveQuoteStatus === "Pending")
      ? "alert"
      : showBrief && brief.next.kind === "decide_offer"
        ? "ready"
        : "neutral";
  const applicant = billApplicant(bill);
  const receivedAt = "submitted" in quote ? quote.submitted : undefined;
  const profile = decisionSummary?.profile;
  const profileLine =
    profile === undefined
      ? undefined
      : [
          profile.industry.replace(/_/g, " ").replace(/^./, (first: string) => first.toUpperCase()),
          new Intl.DisplayNames([intl.locale], { type: "region" }).of(profile.country.toUpperCase()) ?? profile.country,
        ].join(" · ");
  // The mint-complete query currently reads the eBill payment endpoint. It can confirm payment,
  // but cannot establish redemption or issued/spendable value.
  const paymentConfirmed = ebillPaid || (!isMintCompleteLoading && isMintComplete);
  const showPaymentFacts = paymentConfirmed || (showPayment && (rejectedToPay || isInMempool === true || requestedToPay));

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <header className="relative border-b border-border bg-elevation-100 px-6 py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              {/* The state of the case is a label; the company it is about leads. */}
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10 text-xs">
                <span
                  data-case-headline=""
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    headlineTone === "ready" && "bg-signal-success/15 text-signal-success",
                    headlineTone === "alert" && "bg-signal-alert/15 text-signal-alert",
                    headlineTone === "neutral" && "bg-elevation-250 text-foreground"
                  )}
                >
                  {headline}
                </span>
                {receivedAt !== undefined && (
                  <span className="text-muted-foreground">
                    {intl.formatMessage(
                      {
                        id: "quotes.summary.received",
                        defaultMessage: "Received {when}",
                        description: "When the Mint received the quote request",
                      },
                      { when: humanReadableDurationDays(intl.locale, new Date(receivedAt)) }
                    )}
                  </span>
                )}
              </p>
              <h1 className="mt-3 pr-8 text-3xl font-semibold tracking-tight">
                {applicant === null || applicant.anonymous
                  ? intl.formatMessage({
                      id: "quotes.summary.anonymousHolder",
                      defaultMessage: "Anonymous holder",
                      description: "Heading when the bill holder is not identified by name",
                    })
                  : applicant.name}
              </h1>
              {applicant?.anonymous && <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{applicant.nodeId}</p>}
              {profileLine !== undefined && <p className="mt-0.5 text-sm text-muted-foreground">{profileLine}</p>}
              <p className="mt-3 max-w-3xl text-base">
                {intl.formatMessage(
                  {
                    id: "quotes.summary.caseSentencePayable",
                    defaultMessage: "Asks to mint against a {amount} eBill payable by {payer} on {date}.",
                    description:
                      "One-sentence case summary from the bill's terms: amount, drawee and maturity; says nothing about acceptance",
                  },
                  {
                    amount: `${intl.formatNumber(bill.sum)} sat`,
                    payer: (
                      <strong key="payer" className="font-semibold">
                        {bill.drawee.name}
                      </strong>
                    ),
                    date: intl.formatDate(bill.maturity_date, { dateStyle: "long", timeZone: "UTC" }),
                  }
                )}
                {Boolean(bill.drawer.name) &&
                  bill.drawer.node_id !== applicant?.nodeId &&
                  ` ${intl.formatMessage(
                    {
                      id: "quotes.summary.drawnBy",
                      defaultMessage: "Drawn by {drawer}.",
                      description: "The bill's drawer, when it is not the applicant",
                    },
                    { drawer: bill.drawer.name }
                  )}`}
              </p>
              {showBrief ? (
                <div className="mt-1 max-w-3xl text-sm text-muted-foreground">
                  {noFitExplanation && (brief.next.kind === "confirm_no_fit" || (brief.next.kind === "not_actionable" && brief.next.noFit))
                    ? noFitExplanation
                    : caseReason(intl, brief, bill.drawee.name)}
                </div>
              ) : (
                statusReason !== undefined && (
                  <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{intl.formatMessage(statusReason)}</p>
                )
              )}
              {showPaymentFacts ? (
                // Payment is separate from the quote status; this signal says nothing about redemption.
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant={paymentConfirmed ? "success" : rejectedToPay ? "destructive" : isInMempool ? "processing" : "info"}>
                    {paymentConfirmed
                      ? intl.formatMessage({ id: "quotes.payment.paid", defaultMessage: "Paid" })
                      : rejectedToPay
                        ? intl.formatMessage({ id: "quotes.summary.paymentRejected", defaultMessage: "Payment rejected" })
                        : isInMempool
                          ? intl.formatMessage({ id: "quotes.summary.paymentInMempool", defaultMessage: "Payment in mempool" })
                          : intl.formatMessage({ id: "quotes.summary.paymentRequested", defaultMessage: "Payment requested" })}
                  </Badge>
                </div>
              ) : null}
              <a
                href="#bill-record"
                title={quote.bill.id}
                className="mt-2 inline-block text-xs text-muted-foreground underline underline-offset-4"
              >
                {intl.formatMessage({
                  id: "quotes.summary.viewBill",
                  defaultMessage: "View eBill",
                  description: "Open the linked eBill record",
                })}
              </a>
              <span className="hidden font-mono text-xs break-all print:block">{quote.bill.id}</span>
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
          {decisionPlacement === "aside" ? (
            // The decision column is screen-only; the printed executive summary keeps the next step and blockers.
            showBrief && (
              <div className="hidden print:block">
                <CaseNextStepPanel next={brief.next} brief={brief} />
              </div>
            )
          ) : showBrief ? (
            <CaseNextStepPanel next={brief.next} brief={brief} actions={actions} />
          ) : (
            actions && <div className="mt-4 print:hidden">{actions}</div>
          )}
        </header>

        <section className="grid grid-cols-2 border-t border-border bg-elevation-100 md:grid-cols-4">
          <div className="border-r border-b border-border px-5 py-4 md:border-b-0">
            <div className="text-xs leading-tight text-muted-foreground">
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
            <div className="text-xs leading-tight text-muted-foreground">
              {intl.formatMessage(showingRecommendation ? termMessages.proposedFee : termMessages.fee)}
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
            <div className="text-xs leading-tight text-muted-foreground">
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
                      { date: intl.formatDate(quote.ttl, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) }
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-1 text-xl font-semibold">—</div>
            )}
          </div>
          <div className="px-5 py-4">
            <div className="text-xs leading-tight text-muted-foreground">
              {intl.formatMessage({ id: "quotes.detail.maturityDate", defaultMessage: "Maturity" })}
            </div>
            <div className="mt-1 whitespace-nowrap text-lg font-semibold tabular-nums">
              {intl.formatDate(bill.maturity_date, { dateStyle: "medium", timeZone: "UTC" })}
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">{maturityLabel}</div>
          </div>
        </section>

        {decisionSummary && brief ? (
          <>
            <CaseCertainty
              brief={brief}
              billAcceptanceState={decisionSummary.billAcceptanceState}
              payerName={bill.drawee.name}
              useOfFunds={decisionSummary.useOfFunds}
              repaymentSource={decisionSummary.repaymentSource}
              acceptorRisk={decisionSummary.acceptorRisk}
              openPoints={decisionSummary.openPoints ?? 0}
              duplicateCheck={decisionSummary.duplicateCheck}
              alreadyFinanced={decisionSummary.alreadyFinanced}
              contradictions={decisionSummary.contradictions}
            />
            {showBrief && brief.next.kind !== "closed" && <CaseProgress work={brief.work} />}
          </>
        ) : (
          <p
            role={assessmentUnavailable ? "alert" : assessmentLoading ? "status" : undefined}
            className={`px-6 py-5 text-sm ${assessmentUnavailable ? "text-signal-alert" : "text-muted-foreground"}`}
          >
            {assessmentUnavailable
              ? intl.formatMessage({
                  id: "credit.quoteCard.unavailable",
                  defaultMessage: "Assessment unavailable. Do not offer until it can be loaded.",
                  description: "Fail-closed error when the deterministic assessment cannot be loaded",
                })
              : assessmentLoading
                ? intl.formatMessage({
                    id: "quotes.summary.loadingAssessment",
                    defaultMessage: "Loading the case assessment…",
                    description: "The governed assessment is still loading; its absence is not yet known",
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
          </footer>
        </details>
      </CardContent>
    </Card>
  );
}
