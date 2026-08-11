import { Badge } from "@/components/ui/badge";
import { TruncatedTextPopover } from "@bitcredit/ui-library";
import { FileText } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import type { EvidencePacket, ProposedEvidenceField, SubmittedEvidence } from "./decision-types";

const messages = defineMessages({
  heading: {
    id: "credit.evidencePacket.heading",
    defaultMessage: "Evidence packet",
    description: "Heading of the operator's evidence provenance packet",
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
    defaultMessage: "The server matched these bytes to a browser-supplied digest; it did not establish a signed bill or revision binding.",
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
  parser: { id: "credit.evidencePacket.parser", defaultMessage: "Parser", description: "Label for evidence parser version" },
  extraction: {
    id: "credit.evidencePacket.extraction",
    defaultMessage: "Extraction",
    description: "Label for the extraction proposal schema version",
  },
  model: { id: "credit.evidencePacket.model", defaultMessage: "Model route", description: "Label for model identifier" },
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
});

const STORED_FILE_SUFFIX = /_[a-f0-9-]{36}(?=\.\w+$)/;

function originMessage(origin: SubmittedEvidence["origin"]) {
  if (origin === "bill_attachment") return messages.originBill;
  if (origin === "client_asserted_bill_attachment") return messages.originClientBill;
  return messages.originUpload;
}

function proposedFields(
  extraction: NonNullable<EvidencePacket["extraction"]>
): { label: keyof typeof messages; value: string; citation: ProposedEvidenceField["citation"] }[] {
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
  return [
    ...fields.flatMap(([label, field]) => (field === null ? [] : [{ label, value: field.value, citation: field.citation }])),
    ...proposal.lineItems.map((line) => ({
      label: "lineItem" as const,
      value: `${line.description} · ${line.amountSat} sat`,
      citation: line.citation,
    })),
  ];
}

export function SubmittedDocuments({
  submittedEvidence,
  evidencePackets,
}: {
  submittedEvidence: readonly SubmittedEvidence[];
  evidencePackets: readonly EvidencePacket[];
}) {
  const intl = useIntl();
  if (submittedEvidence.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 text-xs" data-testid="evidence-packet">
      <div>
        <h3 className="font-medium">{intl.formatMessage(messages.heading)}</h3>
        <p className="text-muted-foreground">{intl.formatMessage(messages.warning)}</p>
      </div>
      {submittedEvidence.map((evidence) => {
        const packet = evidencePackets.find(
          (candidate) =>
            candidate.evidence.reference === evidence.reference &&
            candidate.evidence.contentDigest === evidence.contentDigest &&
            candidate.evidence.origin === evidence.origin
        );
        const extraction = packet?.extraction;
        return (
          <article key={`${evidence.reference}:${evidence.origin}`} className="space-y-2 rounded-md border border-divider-200 p-3">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <TruncatedTextPopover text={evidence.label.replace(STORED_FILE_SUFFIX, "")} className="min-w-0 font-medium" />
              <Badge variant="outline">{intl.formatMessage(originMessage(evidence.origin))}</Badge>
            </div>
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
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
            </dl>
            {evidence.origin === "client_asserted_bill_attachment" && (
              <p className="text-signal-alert">{intl.formatMessage(messages.clientBillWarning)}</p>
            )}
            {extraction === undefined ? (
              <p className="text-muted-foreground">{intl.formatMessage(messages.extractionUnavailable)}</p>
            ) : (
              <div className="space-y-2 rounded-md bg-elevation-100 p-3">
                <div>
                  <h4 className="font-medium">{intl.formatMessage(messages.extractionHeading)}</h4>
                  <p className="text-muted-foreground">{intl.formatMessage(messages.extractionWarning)}</p>
                </div>
                <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{intl.formatMessage(messages.extraction)}</dt>
                    <dd className="font-mono">{extraction.schemaVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{intl.formatMessage(messages.parser)}</dt>
                    <dd className="font-mono">{extraction.parserVersion}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{intl.formatMessage(messages.model)}</dt>
                    <dd className="font-mono">{extraction.modelId}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{intl.formatMessage(messages.prompt)}</dt>
                    <dd className="font-mono">{extraction.promptVersion}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted-foreground">{intl.formatMessage(messages.derivative)}</dt>
                    <dd className="break-all font-mono">{extraction.derivativeDigest}</dd>
                  </div>
                </dl>
                <ul className="space-y-2">
                  {proposedFields(extraction).map((field, index) => (
                    <li key={`${field.label}:${String(index)}`}>
                      <span className="font-medium">
                        {intl.formatMessage(messages[field.label])}: {field.value}
                      </span>
                      <p className="whitespace-pre-wrap text-muted-foreground">
                        {intl.formatMessage(messages.pageCitation, {
                          page: field.citation.page,
                          snippet: field.citation.exactSnippet,
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}
