import { Badge } from "@/components/ui/badge";
import { Button, TruncatedTextPopover } from "@bitcredit/ui-library";
import { FileText } from "lucide-react";
import { defineMessages, type IntlShape, useIntl } from "react-intl";
import {
  displayEvidenceLabel,
  words,
  type DecisionInvoice,
  type EvidencePacket,
  type ProposedEvidenceField,
  type SubmittedEvidence,
  type VerificationRequest,
} from "./decision-types";

const messages = defineMessages({
  heading: {
    id: "credit.submittedEvidence.heading",
    defaultMessage: "Evidence review",
    description: "Heading for evidence submitted with the AI Credit application",
  },
  summary: {
    id: "credit.submittedEvidence.summary",
    defaultMessage:
      "{documents, plural, one {# submitted document} other {# submitted documents}} · {claims, plural, one {# cited claim} other {# cited claims}}",
    description: "Compact count of documents and source-cited extracted claims",
  },
  clear: {
    id: "credit.submittedEvidence.clear",
    defaultMessage: "No evidence requests outstanding",
    description: "Badge when the governed decision has no outstanding evidence request",
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
    defaultMessage:
      "Synthetic/testnet only. A server digest identifies the received bytes; it does not prove who issued them, whether their contents are true, or legal enforceability.",
    description: "Warning about the limits of evidence digests in the prototype",
  },
  origin: { id: "credit.evidencePacket.origin", defaultMessage: "Origin", description: "Label for evidence origin" },
  originBill: {
    id: "credit.evidencePacket.origin.bill",
    defaultMessage: "Bill attachment lineage",
    description: "Evidence origin reserved for governed or explicitly synthetic bill attachments",
  },
  originClientBill: {
    id: "credit.evidencePacket.origin.clientBill",
    defaultMessage: "Browser-asserted bill attachment",
    description: "Evidence origin supplied by the browser without server proof of bill binding",
  },
  originUpload: {
    id: "credit.evidencePacket.origin.upload",
    defaultMessage: "Applicant upload",
    description: "Evidence origin for an applicant-uploaded file",
  },
  clientBillWarning: {
    id: "credit.evidencePacket.clientBillWarning",
    defaultMessage:
      "Attachment integrity only: these exact bytes were found in this Mint quote's bill attachments. The document itself is not signed or bound to a signed eBill revision.",
    description: "Warning about browser-asserted bill attachment provenance",
  },
  digest: { id: "credit.evidencePacket.digest", defaultMessage: "Server digest", description: "Label for server-computed evidence digest" },
  submittedDigest: {
    id: "credit.evidencePacket.submittedDigest",
    defaultMessage: "Submitted digest (no server receipt)",
    description: "Label for a digest that has no current evidence-service receipt",
  },
  status: { id: "credit.evidencePacket.status", defaultMessage: "Ingress", description: "Label for evidence ingress status" },
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
    defaultMessage: "Invoice matched to eBill",
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
    defaultMessage: "Extraction available",
    description: "Status for a supporting document with extracted fields that are not used by the governed invoice assessment",
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
    defaultMessage: "Extracted claims",
    description: "Heading for source-cited claims proposed by an extraction adapter",
  },
  lineItems: {
    id: "credit.evidencePacket.lineItems",
    defaultMessage: "{count, plural, one {# line item} other {# line items}}",
    description: "Disclosure heading for extracted invoice line items",
  },
  citations: {
    id: "credit.evidencePacket.citations",
    defaultMessage: "Source citations ({count})",
    description: "Disclosure for exact document snippets supporting extracted fields",
  },
  technical: {
    id: "credit.evidencePacket.technical",
    defaultMessage: "Technical provenance",
    description: "Disclosure for evidence receipt, digest, parser, and model-route metadata",
  },
  extractedAt: {
    id: "credit.evidencePacket.extractedAt",
    defaultMessage: "Extracted at",
    description: "Label for the extraction timestamp",
  },
  extractionHeading: {
    id: "credit.evidencePacket.extractionHeading",
    defaultMessage: "Automated extraction proposal",
    description: "Heading for model-proposed invoice fields and their citations",
  },
  extractionWarning: {
    id: "credit.evidencePacket.extractionWarning",
    defaultMessage: "Proposed text only. It is not a verification, risk finding, price, or authorization.",
    description: "Warning that automated extraction has no decision authority",
  },
  extractionUnavailable: {
    id: "credit.evidencePacket.extractionUnavailable",
    defaultMessage: "No extraction proposal. Human review is required; absence is not an adverse finding.",
    description: "Non-adverse fallback when no automated extraction exists",
  },
  supportingUnavailable: {
    id: "credit.evidencePacket.supportingUnavailable",
    defaultMessage: "No extraction proposal. This supporting document was not used by the current governed assessment.",
    description: "Explanation for supporting evidence without extraction that is outside the current governed assessment",
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
  derivative: {
    id: "credit.evidencePacket.derivative",
    defaultMessage: "Text derivative",
    description: "Label for the parsed text derivative digest",
  },
  pageCitation: {
    id: "credit.evidencePacket.pageCitation",
    defaultMessage: "Page {page}: “{snippet}”",
    description: "Exact document snippet supporting a proposed field",
  },
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

function ClaimGrid({ claims }: { claims: readonly EvidenceClaim[] }) {
  return (
    <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {claims.map((claim) => (
        <div key={claim.id} className="min-w-0 rounded-md bg-elevation-100 p-3">
          <dt className="text-xs text-muted-foreground">{claim.label}</dt>
          <dd className="mt-1 break-words font-medium">{claim.value}</dd>
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
  onOpenEvidence,
}: {
  submittedEvidence: readonly SubmittedEvidence[];
  evidencePackets: readonly EvidencePacket[];
  invoiceAssessment?: DecisionInvoice | null;
  verificationRequests?: readonly VerificationRequest[];
  openingEvidenceReference?: string | null;
  onOpenEvidence?: (evidence: SubmittedEvidence) => void | Promise<void>;
}) {
  const intl = useIntl();
  if (submittedEvidence.length === 0) return null;
  const citedClaimCount = evidencePackets.reduce(
    (count, packet) =>
      count +
      (packet.extraction
        ? invoiceClaimGroups(packet.extraction, intl)
            .flatMap((group) => group.claims)
            .filter((claim) => claim.citations.length > 0).length
        : 0),
    0
  );

  return (
    <section className="flex flex-col gap-4 text-sm" data-testid="evidence-packet">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{intl.formatMessage(messages.heading)}</h3>
          <p className="text-xs text-muted-foreground">
            {intl.formatMessage(messages.summary, { documents: submittedEvidence.length, claims: citedClaimCount })}
          </p>
        </div>
        <Badge variant={verificationRequests.length === 0 ? "success" : "pending"}>
          {intl.formatMessage(verificationRequests.length === 0 ? messages.clear : messages.requests, {
            count: verificationRequests.length,
          })}
        </Badge>
      </div>
      {verificationRequests.length > 0 && (
        <div className="rounded-lg border border-signal-alert/40 bg-signal-alert/5 p-3">
          <p className="font-medium text-signal-alert">{intl.formatMessage(messages.outstanding)}</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-xs">
            {verificationRequests.map((request) => (
              <li key={`${request.axis}:${request.code}`}>{request.requiredItem}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.warning)}</p>
      {submittedEvidence.map((evidence) => {
        const packet = evidencePackets.find(
          (candidate) =>
            candidate.evidence.reference === evidence.reference &&
            candidate.evidence.contentDigest === evidence.contentDigest &&
            candidate.evidence.origin === evidence.origin
        );
        const extraction = packet?.extraction;
        const claimGroups = extraction ? invoiceClaimGroups(extraction, intl) : [];
        const claims = claimGroups.flatMap((group) => group.claims);
        const citations = claims.flatMap((claim) => claim.citations.map((citation) => ({ claim, citation })));
        const isDecisionEvidence = invoiceAssessment?.reference === evidence.reference;
        const isMatched =
          isDecisionEvidence &&
          invoiceAssessment.plausibility === "plausible" &&
          invoiceAssessment.billAndClaimsConsistency === "match" &&
          extraction !== undefined;
        const reviewStatus = isMatched
          ? messages.matched
          : packet === undefined
            ? messages.receiptUnavailable
            : isDecisionEvidence
              ? extraction === undefined
                ? messages.humanReview
                : messages.verificationRequired
              : extraction === undefined
                ? messages.supporting
                : messages.extractionAvailable;
        return (
          <article key={`${evidence.reference}:${evidence.origin}`} className="overflow-hidden rounded-lg border border-divider-200">
            <header className="flex min-w-0 flex-col gap-3 border-b border-border bg-elevation-100 p-4 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <TruncatedTextPopover text={displayEvidenceLabel(evidence.label)} className="min-w-0 font-medium" />
              </div>
              <Badge variant={isMatched ? "success" : packet === undefined || isDecisionEvidence ? "pending" : "outline"}>
                {intl.formatMessage(reviewStatus)}
              </Badge>
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
            </header>
            <div className="space-y-4 p-4">
              {evidence.origin === "client_asserted_bill_attachment" && (
                <p className="rounded-md bg-signal-alert/5 p-2 text-xs text-signal-alert">
                  {intl.formatMessage(messages.clientBillWarning)}
                </p>
              )}
              {isDecisionEvidence && invoiceAssessment && (
                <section>
                  <h4 className="mb-2 font-medium">{intl.formatMessage(messages.decisionChecks)}</h4>
                  <dl className="grid gap-2 sm:grid-cols-3">
                    {(
                      [
                        [messages.plausibility, invoiceAssessment.plausibility],
                        [messages.consistency, invoiceAssessment.billAndClaimsConsistency],
                        [messages.evidenceState, invoiceAssessment.evidenceState],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label.id} className="rounded-md border border-border p-3">
                        <dt className="text-xs text-muted-foreground">{intl.formatMessage(label)}</dt>
                        <dd className="mt-1 font-medium">{words(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {extraction === undefined ? (
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage(isDecisionEvidence ? messages.extractionUnavailable : messages.supportingUnavailable)}
                </p>
              ) : (
                <section>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="font-medium">{intl.formatMessage(messages.extractedFields)}</h4>
                    <p className="text-xs text-muted-foreground">{intl.formatMessage(messages.extractionWarning)}</p>
                  </div>
                  <div className="space-y-2">
                    {claimGroups.map((group) =>
                      group.collapsed ? (
                        <details key={group.id} className="rounded-md border border-border">
                          <summary className="cursor-pointer px-3 py-2 text-xs font-medium">{group.label}</summary>
                          <div className="border-t border-border p-3">
                            <ClaimGrid claims={group.claims} />
                          </div>
                        </details>
                      ) : (
                        <ClaimGrid key={group.id} claims={group.claims} />
                      )
                    )}
                  </div>
                  <details className="mt-3 rounded-md border border-border">
                    <summary className="cursor-pointer px-3 py-2 text-xs font-medium">
                      {intl.formatMessage(messages.citations, { count: citations.length })}
                    </summary>
                    <ul className="space-y-3 border-t border-border p-3 text-xs">
                      {citations.map(({ claim, citation }, index) => (
                        <li key={`${claim.id}:citation:${String(index)}`}>
                          <span className="font-medium">{claim.label}</span>
                          <p className="whitespace-pre-wrap text-muted-foreground">
                            {intl.formatMessage(messages.pageCitation, {
                              page: citation.page,
                              snippet: citation.exactSnippet,
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </details>
                </section>
              )}
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
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">
                      {intl.formatMessage(packet === undefined ? messages.submittedDigest : messages.digest)}
                    </dt>
                    <dd className="break-all font-mono">{evidence.contentDigest}</dd>
                  </div>
                  {extraction && (
                    <>
                      {(
                        [
                          [messages.extraction, extraction.schemaVersion],
                          [messages.parser, extraction.parserVersion],
                          [messages.model, extraction.modelId],
                          [messages.prompt, extraction.promptVersion],
                          [messages.extractedAt, extraction.extractedAt],
                          [messages.derivative, extraction.derivativeDigest],
                        ] as const
                      ).map(([label, value]) => (
                        <div key={label.id} className={label === messages.derivative ? "sm:col-span-2" : undefined}>
                          <dt className="text-muted-foreground">{intl.formatMessage(label)}</dt>
                          <dd className="break-all font-mono">{value}</dd>
                        </div>
                      ))}
                    </>
                  )}
                </dl>
              </details>
            </div>
          </article>
        );
      })}
    </section>
  );
}
