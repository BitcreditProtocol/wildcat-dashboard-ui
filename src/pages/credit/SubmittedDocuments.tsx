import { Button, TruncatedTextPopover } from "@bitcredit/ui-library";
import { ChevronDown, FileText } from "lucide-react";
import { defineMessages, type IntlShape, useIntl } from "react-intl";
import {
  countCitedEvidenceClaims,
  displayEvidenceLabel,
  words,
  type DecisionInvoice,
  type EvidencePacket,
  type ProposedEvidenceField,
  type SubmittedEvidence,
  type VerificationRequest,
} from "./decision-types";

const messages = defineMessages({
  summary: {
    id: "credit.submittedEvidence.summary",
    defaultMessage:
      "{documents, plural, one {# submitted document} other {# submitted documents}} · {claims, plural, one {# cited claim} other {# cited claims}}",
    description: "Compact count of documents and source-cited extracted claims",
  },
  requests: {
    id: "credit.submittedEvidence.requests",
    defaultMessage: "{count, plural, one {# verification request} other {# verification requests}}",
    description: "Badge counting outstanding governed verification requests",
  },
  outstanding: {
    id: "credit.submittedEvidence.outstanding",
    defaultMessage: "Required before a decision",
    description: "Heading above outstanding evidence requests",
  },
  warning: {
    id: "credit.evidencePacket.warning",
    defaultMessage: "Extracted text only — verify against the PDF.",
    description: "Plain-language boundary for machine-extracted evidence statements",
  },
  origin: { id: "credit.evidencePacket.origin", defaultMessage: "Independence", description: "Label for evidence origin" },
  originBill: {
    id: "credit.evidencePacket.origin.bill",
    defaultMessage: "Bill-bound",
    description: "Evidence origin reserved for governed or explicitly synthetic bill attachments",
  },
  originClientBill: {
    id: "credit.evidencePacket.origin.clientBill",
    defaultMessage: "Browser-asserted",
    description: "Evidence origin supplied by the browser without server proof of bill binding",
  },
  originUpload: {
    id: "credit.evidencePacket.origin.upload",
    defaultMessage: "Applicant",
    description: "Evidence origin for an applicant-uploaded file",
  },
  clientBillWarning: {
    id: "credit.evidencePacket.clientBillWarning",
    defaultMessage: "Attachment bytes match this quote. Document authenticity is not verified.",
    description: "Warning about browser-asserted bill attachment provenance",
  },
  status: { id: "credit.evidencePacket.status", defaultMessage: "Status", description: "Label for evidence review status" },
  quarantined: {
    id: "credit.evidencePacket.quarantined",
    defaultMessage: "Quarantined · {bytes} bytes",
    description: "Evidence ingress status and received byte count",
  },
  receiptUnavailable: {
    id: "credit.evidencePacket.receiptUnavailable",
    defaultMessage: "No current server receipt",
    description: "Shown when the local evidence service has no receipt for a submitted reference",
  },
  matched: {
    id: "credit.evidencePacket.matched",
    defaultMessage: "Matched",
    description: "Evidence status when the decision snapshot records a plausible invoice consistent with the eBill",
  },
  verificationRequired: {
    id: "credit.evidencePacket.verificationRequired",
    defaultMessage: "Verification required",
    description: "Evidence status when the decision uses the document but does not record a governed match",
  },
  humanReview: {
    id: "credit.evidencePacket.humanReview",
    defaultMessage: "Human review required",
    description: "Evidence status when received bytes have no extraction proposal",
  },
  extractionAvailable: {
    id: "credit.evidencePacket.extractionAvailable",
    defaultMessage: "Analyzed",
    description: "Status for a document with source-backed extracted claims",
  },
  analysisPending: {
    id: "credit.evidencePacket.analysisPending",
    defaultMessage: "Analyzing…",
    description: "Status while the evidence service analyzes a document",
  },
  supporting: {
    id: "credit.evidencePacket.supporting",
    defaultMessage: "Supporting document",
    description: "Status for a received supporting document not used by the governed invoice assessment",
  },
  decisionChecks: {
    id: "credit.evidencePacket.decisionChecks",
    defaultMessage: "Decision checks",
    description: "Heading for governed invoice checks derived from the decision snapshot",
  },
  document: {
    id: "credit.evidencePacket.document",
    defaultMessage: "Document",
    description: "Evidence table document column",
  },
  establishes: {
    id: "credit.evidencePacket.establishes",
    defaultMessage: "Establishes",
    description: "Evidence table extracted-facts column",
  },
  invoiceAligned: {
    id: "credit.evidencePacket.invoiceAligned",
    defaultMessage: "Invoice aligns with eBill",
    description: "Compact evidence-table statement for a governed invoice match",
  },
  noExtractedFacts: {
    id: "credit.evidencePacket.noExtractedFacts",
    defaultMessage: "No extracted facts",
    description: "Evidence table fallback when no source-cited facts are available",
  },
  plausibility: { id: "credit.evidencePacket.plausibility", defaultMessage: "Plausibility", description: "Invoice plausibility label" },
  consistency: {
    id: "credit.evidencePacket.consistency",
    defaultMessage: "Invoice and eBill consistency",
    description: "Invoice-to-eBill consistency label",
  },
  evidenceState: {
    id: "credit.evidencePacket.evidenceState",
    defaultMessage: "Evidence state",
    description: "Governed invoice evidence-state label",
  },
  extractedFields: {
    id: "credit.evidencePacket.extractedFields",
    defaultMessage: "What this document says",
    description: "Heading for the concise source-backed statements extracted from any document type",
  },
  lineItems: {
    id: "credit.evidencePacket.lineItems",
    defaultMessage: "{count, plural, one {# line item} other {# line items}}",
    description: "Disclosure heading for extracted invoice line items",
  },
  technical: {
    id: "credit.evidencePacket.technical",
    defaultMessage: "Audit details",
    description: "Disclosure for evidence receipt, digest, parser, and model-route metadata",
  },
  extractedAt: {
    id: "credit.evidencePacket.extractedAt",
    defaultMessage: "Extracted at",
    description: "Label for the extraction timestamp",
  },
  extractionUnavailable: {
    id: "credit.evidencePacket.extractionUnavailable",
    defaultMessage: "No extraction proposal. Human review is required; absence is not an adverse finding.",
    description: "Non-adverse fallback when no automated extraction exists",
  },
  supportingUnavailable: {
    id: "credit.evidencePacket.supportingUnavailable",
    defaultMessage: "Not analyzed for this decision.",
    description: "Explanation for supporting evidence without extraction",
  },
  pendingAnalysis: {
    id: "credit.evidencePacket.pendingAnalysis",
    defaultMessage: "Document analysis is in progress. The original PDF remains available for review.",
    description: "Non-blocking message while generic document analysis runs",
  },
  source: {
    id: "credit.evidencePacket.source",
    defaultMessage: "Show source · page {page}",
    description: "Disclosure to reveal the exact source text behind an extracted claim",
  },
  parser: { id: "credit.evidencePacket.parser", defaultMessage: "Parser", description: "Label for evidence parser version" },
  extraction: {
    id: "credit.evidencePacket.extraction",
    defaultMessage: "Extraction",
    description: "Label for the extraction proposal schema version",
  },
  model: {
    id: "credit.evidencePacket.model",
    defaultMessage: "Requested model route",
    description: "Label for the model route requested by the adapter, not provider attestation",
  },
  prompt: { id: "credit.evidencePacket.prompt", defaultMessage: "Prompt", description: "Label for prompt version" },
  invoiceNumber: { id: "credit.evidencePacket.field.invoiceNumber", defaultMessage: "Invoice", description: "Invoice-number field label" },
  seller: { id: "credit.evidencePacket.field.seller", defaultMessage: "Seller", description: "Invoice seller field label" },
  buyer: { id: "credit.evidencePacket.field.buyer", defaultMessage: "Buyer", description: "Invoice buyer field label" },
  issueDate: { id: "credit.evidencePacket.field.issueDate", defaultMessage: "Issue date", description: "Invoice issue-date field label" },
  goods: { id: "credit.evidencePacket.field.goods", defaultMessage: "Goods", description: "Invoice goods field label" },
  transaction: {
    id: "credit.evidencePacket.field.transaction",
    defaultMessage: "Transaction reference",
    description: "Invoice transaction-reference field label",
  },
  currency: { id: "credit.evidencePacket.field.currency", defaultMessage: "Currency", description: "Invoice currency field label" },
  total: { id: "credit.evidencePacket.field.total", defaultMessage: "Total", description: "Invoice total field label" },
  lineItem: { id: "credit.evidencePacket.field.lineItem", defaultMessage: "Line item", description: "Invoice line-item field label" },
  view: { id: "credit.evidencePacket.view", defaultMessage: "View PDF", description: "Button to open submitted evidence" },
  opening: { id: "credit.evidencePacket.opening", defaultMessage: "Opening…", description: "Button while submitted evidence opens" },
  review: {
    id: "credit.evidencePacket.review",
    defaultMessage: "Confirm eBill match",
    description: "Action to record a governed operator comparison of an extracted invoice and the current eBill",
  },
  reviewing: {
    id: "credit.evidencePacket.reviewing",
    defaultMessage: "Recording…",
    description: "Pending label while a governed operator invoice review is recorded",
  },
});

function originMessage(origin: SubmittedEvidence["origin"]) {
  if (origin === "bill_attachment") return messages.originBill;
  if (origin === "client_asserted_bill_attachment") return messages.originClientBill;
  return messages.originUpload;
}

interface EvidenceClaim {
  id: string;
  label: string;
  value: string;
  citations: readonly ProposedEvidenceField["citation"][];
}

interface EvidenceClaimGroup {
  id: string;
  label?: string;
  collapsed?: boolean;
  claims: readonly EvidenceClaim[];
}

function formatSat(value: string, locale: string): string {
  return /^\d+$/u.test(value) ? `${new Intl.NumberFormat(locale).format(BigInt(value))} sat` : value;
}

function invoiceClaimGroups(extraction: NonNullable<EvidencePacket["extraction"]>, intl: IntlShape): EvidenceClaimGroup[] {
  const { proposal } = extraction;
  const fields = [
    ["invoiceNumber", proposal.invoiceNumber],
    ["seller", proposal.seller],
    ["buyer", proposal.buyer],
    ["issueDate", proposal.issueDate],
    ["goods", proposal.goodsDescription],
    ["transaction", proposal.transactionReference],
    ["currency", proposal.currency],
    ["total", proposal.totalSat],
  ] as const;
  const claims = fields.flatMap(([label, field]) =>
    field === null
      ? []
      : [
          {
            id: label,
            label: intl.formatMessage(messages[label]),
            value: label === "total" ? formatSat(field.value, intl.locale) : field.value,
            citations: [field.citation],
          },
        ]
  );
  const lineItems = proposal.lineItems.map((line, index) => ({
    id: `line-item-${String(index)}`,
    label: intl.formatMessage(messages.lineItem),
    value: `${line.description} · ${formatSat(line.amountSat, intl.locale)}`,
    citations: [line.citation],
  }));
  return [
    { id: "invoice", claims },
    ...(lineItems.length === 0
      ? []
      : [
          {
            id: "line-items",
            label: intl.formatMessage(messages.lineItems, { count: lineItems.length }),
            collapsed: true,
            claims: lineItems,
          },
        ]),
  ];
}

function documentClaimGroups(analysis: NonNullable<EvidencePacket["analysis"]>): EvidenceClaimGroup[] {
  return [
    {
      id: "document-analysis",
      claims: analysis.analysis.claims.map((claim, index) => ({
        id: `${claim.kind}-${String(index)}`,
        label: claim.label,
        value: claim.value,
        citations: [claim.citation],
      })),
    },
  ];
}

function claimGroupsFor(packet: EvidencePacket | undefined, intl: IntlShape): EvidenceClaimGroup[] {
  if (packet?.analysis !== undefined) return documentClaimGroups(packet.analysis);
  return packet?.extraction === undefined ? [] : invoiceClaimGroups(packet.extraction, intl);
}

function ClaimGrid({ claims, intl }: { claims: readonly EvidenceClaim[]; intl: IntlShape }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {claims.map((claim) => (
        <div key={claim.id} className="min-w-0 rounded-md bg-elevation-100 p-3">
          <dt className="text-xs text-muted-foreground">{claim.label}</dt>
          <dd className="mt-1 break-words font-medium">{claim.value}</dd>
          {claim.citations.map((citation, index) => (
            <details key={`${claim.id}-source-${String(index)}`} className="mt-3 border-t border-border pt-2 text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                {intl.formatMessage(messages.source, { page: citation.page })}
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">“{citation.exactSnippet}”</p>
            </details>
          ))}
        </div>
      ))}
    </dl>
  );
}

export function SubmittedDocuments({
  submittedEvidence,
  evidencePackets,
  invoiceAssessment = null,
  verificationRequests = [],
  openingEvidenceReference,
  reviewingEvidenceReference,
  onOpenEvidence,
  onReviewInvoiceEvidence,
}: {
  submittedEvidence: readonly SubmittedEvidence[];
  evidencePackets: readonly EvidencePacket[];
  invoiceAssessment?: DecisionInvoice | null;
  verificationRequests?: readonly VerificationRequest[];
  openingEvidenceReference?: string | null;
  reviewingEvidenceReference?: string | null;
  onOpenEvidence?: (evidence: SubmittedEvidence) => void | Promise<void>;
  onReviewInvoiceEvidence?: (evidence: SubmittedEvidence) => void | Promise<void>;
}) {
  const intl = useIntl();
  if (submittedEvidence.length === 0) return null;
  const citedClaimCount = countCitedEvidenceClaims(evidencePackets);

  return (
    <section className="space-y-3 text-sm" data-testid="evidence-packet">
      <div className="flex items-center justify-between gap-4">
        <p className="truncate text-xs text-muted-foreground">
          {intl.formatMessage(messages.summary, { documents: submittedEvidence.length, claims: citedClaimCount })}
        </p>
        {verificationRequests.length > 0 && (
          <span className="shrink-0 whitespace-nowrap text-xs font-medium text-signal-alert">
            {intl.formatMessage(messages.requests, { count: verificationRequests.length })}
          </span>
        )}
      </div>

      {verificationRequests.length > 0 && (
        <section className="border-l-2 border-signal-alert pl-3">
          <h4 className="text-xs font-semibold text-signal-alert">{intl.formatMessage(messages.outstanding)}</h4>
          <ul className="mt-1 space-y-1 text-xs">
            {verificationRequests.map((request) => (
              <li key={`${request.axis}:${request.code}`}>{request.requiredItem}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_8rem_7rem_1.25rem] gap-4 border-b border-border bg-elevation-100 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
          <span>{intl.formatMessage(messages.document)}</span>
          <span>{intl.formatMessage(messages.establishes)}</span>
          <span>{intl.formatMessage(messages.origin)}</span>
          <span>{intl.formatMessage(messages.status)}</span>
          <span />
        </div>
        <div className="divide-y divide-border">
          {submittedEvidence.map((evidence) => {
            const packet = evidencePackets.find(
              (candidate) =>
                candidate.evidence.reference === evidence.reference &&
                candidate.evidence.contentDigest === evidence.contentDigest &&
                candidate.evidence.origin === evidence.origin
            );
            const extraction = packet?.extraction;
            const analysis = packet?.analysis;
            const claimGroups = claimGroupsFor(packet, intl);
            const documentType = analysis?.analysis.documentType?.value;
            const isDecisionEvidence = invoiceAssessment?.reference === evidence.reference;
            const isMatched =
              isDecisionEvidence &&
              invoiceAssessment.plausibility === "plausible" &&
              invoiceAssessment.billAndClaimsConsistency === "match" &&
              invoiceAssessment.evidenceState === "corroborated";
            const canReviewInvoice =
              isDecisionEvidence &&
              extraction !== undefined &&
              invoiceAssessment?.evidenceState !== "corroborated" &&
              verificationRequests.some((request) => request.code === "invoice_evidence" || request.code === "invoice_consistency");
            const reviewStatus = isMatched
              ? messages.matched
              : packet === undefined
                ? messages.receiptUnavailable
                : isDecisionEvidence
                  ? extraction === undefined
                    ? messages.humanReview
                    : messages.verificationRequired
                  : analysis !== undefined || extraction !== undefined
                    ? messages.extractionAvailable
                    : packet.analysisStatus === "pending"
                      ? messages.analysisPending
                      : messages.supporting;
            const establishes =
              claimGroups
                .flatMap((group) => group.claims)
                .slice(0, 3)
                .map((claim) => claim.value)
                .join(" · ") || (isMatched ? intl.formatMessage(messages.invoiceAligned) : "");
            const independence = intl.formatMessage(originMessage(evidence.origin));
            return (
              <details key={`${evidence.reference}:${evidence.origin}`} className="group">
                <summary className="grid cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto_1.25rem] items-center gap-3 px-4 py-3 marker:hidden md:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)_8rem_7rem_1.25rem] md:gap-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="min-w-0">
                      <TruncatedTextPopover text={displayEvidenceLabel(evidence.label)} className="block truncate font-medium" />
                      {documentType !== undefined && <span className="block truncate text-xs text-muted-foreground">{documentType}</span>}
                    </span>
                  </span>
                  <span className="hidden truncate text-xs text-muted-foreground md:block" title={establishes || undefined}>
                    {establishes || intl.formatMessage(messages.noExtractedFacts)}
                  </span>
                  <span
                    className="hidden truncate text-xs md:block"
                    title={
                      evidence.origin === "client_asserted_bill_attachment" ? intl.formatMessage(messages.clientBillWarning) : undefined
                    }
                  >
                    {independence}
                  </span>
                  <span className={`whitespace-nowrap text-xs font-medium ${isMatched ? "text-signal-success" : "text-muted-foreground"}`}>
                    {intl.formatMessage(reviewStatus)}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                  <span className="col-span-3 truncate text-xs text-muted-foreground md:hidden" title={establishes || undefined}>
                    {establishes || independence}
                  </span>
                </summary>
                <div className="space-y-4 border-t border-border bg-elevation-100/40 p-4">
                  {(canReviewInvoice || (packet !== undefined && onOpenEvidence !== undefined)) && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {canReviewInvoice && onReviewInvoiceEvidence !== undefined && (
                        <Button
                          size="sm"
                          disabled={reviewingEvidenceReference !== null && reviewingEvidenceReference !== undefined}
                          onClick={() => void onReviewInvoiceEvidence(evidence)}
                        >
                          {intl.formatMessage(reviewingEvidenceReference === evidence.reference ? messages.reviewing : messages.review)}
                        </Button>
                      )}
                      {packet !== undefined && onOpenEvidence !== undefined && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={openingEvidenceReference !== null && openingEvidenceReference !== undefined}
                          onClick={() => void onOpenEvidence(evidence)}
                        >
                          {intl.formatMessage(openingEvidenceReference === evidence.reference ? messages.opening : messages.view)}
                        </Button>
                      )}
                    </div>
                  )}
                  {isDecisionEvidence && invoiceAssessment && (
                    <section>
                      <h4 className="mb-2 text-xs font-medium text-muted-foreground">{intl.formatMessage(messages.decisionChecks)}</h4>
                      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-3">
                        {(
                          [
                            [messages.plausibility, invoiceAssessment.plausibility],
                            [messages.consistency, invoiceAssessment.billAndClaimsConsistency],
                            [messages.evidenceState, invoiceAssessment.evidenceState],
                          ] as const
                        ).map(([label, value]) => (
                          <div key={label.id}>
                            <dt className="text-xs text-muted-foreground">{intl.formatMessage(label)}</dt>
                            <dd className="mt-1 font-medium">{words(value)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  )}
                  {packet?.analysisStatus === "pending" && analysis === undefined && (
                    <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.pendingAnalysis)}</p>
                  )}
                  {claimGroups.length === 0 && packet?.analysisStatus !== "pending" && !isMatched ? (
                    <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.noExtractedFacts)}</p>
                  ) : claimGroups.length > 0 ? (
                    <section>
                      <h4 className="mb-2 font-medium">{intl.formatMessage(messages.extractedFields)}</h4>
                      <div className="space-y-2">
                        {claimGroups.map((group) =>
                          group.collapsed ? (
                            <details key={group.id} className="rounded-md border border-border">
                              <summary className="cursor-pointer px-3 py-2 text-xs font-medium">{group.label}</summary>
                              <div className="border-t border-border p-3">
                                <ClaimGrid claims={group.claims} intl={intl} />
                              </div>
                            </details>
                          ) : (
                            <ClaimGrid key={group.id} claims={group.claims} intl={intl} />
                          )
                        )}
                      </div>
                    </section>
                  ) : null}
                  <details className="rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium">{intl.formatMessage(messages.technical)}</summary>
                    <dl className="grid gap-3 border-t border-border p-3 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="text-muted-foreground">{intl.formatMessage(messages.origin)}</dt>
                        <dd>{intl.formatMessage(originMessage(evidence.origin))}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">{intl.formatMessage(messages.status)}</dt>
                        <dd>
                          {packet === undefined
                            ? intl.formatMessage(messages.receiptUnavailable)
                            : intl.formatMessage(messages.quarantined, { bytes: intl.formatNumber(packet.byteLength) })}
                        </dd>
                      </div>
                      {(analysis ?? extraction) && (
                        <>
                          {(
                            [
                              [messages.extraction, (analysis ?? extraction)?.schemaVersion ?? ""],
                              [messages.parser, (analysis ?? extraction)?.parserVersion ?? ""],
                              [messages.model, (analysis ?? extraction)?.modelId ?? ""],
                              [messages.prompt, (analysis ?? extraction)?.promptVersion ?? ""],
                              [messages.extractedAt, (analysis ?? extraction)?.extractedAt ?? ""],
                            ] as const
                          ).map(([label, value]) => (
                            <div key={label.id}>
                              <dt className="text-muted-foreground">{intl.formatMessage(label)}</dt>
                              <dd className="break-all font-mono">{value}</dd>
                            </div>
                          ))}
                        </>
                      )}
                    </dl>
                  </details>
                </div>
              </details>
            );
          })}
        </div>
      </div>
    </section>
  );
}
