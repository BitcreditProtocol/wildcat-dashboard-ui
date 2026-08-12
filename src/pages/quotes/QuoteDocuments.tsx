import { Badge } from "@/components/ui/badge";
import type { EvidencePacket, SubmittedEvidence } from "@/pages/credit/decision-types";
import { SubmittedDocuments } from "@/pages/credit/SubmittedDocuments";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, TruncatedTextPopover } from "@bitcredit/ui-library";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { QuoteDocument } from "@/hooks/use-quote-detail";

export type CreditEvidenceState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "absent" }
  | { status: "available"; submittedEvidence: readonly SubmittedEvidence[]; evidencePackets: readonly EvidencePacket[] };

interface QuoteDocumentsProps {
  billAttachments: QuoteDocument[];
  requestToMintFiles: QuoteDocument[];
  creditEvidence: CreditEvidenceState;
  openingDocumentHash: string | null;
  onOpenDocument: (document: QuoteDocument) => void | Promise<void>;
}

const messages = defineMessages({
  title: {
    id: "quotes.documentsAndEvidence.title",
    defaultMessage: "Documents & evidence",
    description: "Heading for bill files and AI Credit evidence on a quote",
  },
  billFileCount: {
    id: "quotes.documentsAndEvidence.billFileCount",
    defaultMessage: "{count, plural, =0 {No bill files} one {# bill file} other {# bill files}}",
    description: "Count of retrievable bill and request-to-mint files",
  },
  evidenceCount: {
    id: "quotes.documentsAndEvidence.evidenceCount",
    defaultMessage: "{count, plural, =0 {No submitted credit evidence} one {# credit evidence item} other {# credit evidence items}}",
    description: "Count of evidence items submitted with the AI Credit application",
  },
  evidenceLoadingSummary: {
    id: "quotes.documentsAndEvidence.evidenceLoadingSummary",
    defaultMessage: "Loading credit evidence",
    description: "Collapsed summary while AI Credit evidence is loading",
  },
  evidenceUnavailableSummary: {
    id: "quotes.documentsAndEvidence.evidenceUnavailableSummary",
    defaultMessage: "Credit evidence unavailable",
    description: "Collapsed summary when AI Credit evidence cannot be loaded",
  },
  noAssessmentSummary: {
    id: "quotes.documentsAndEvidence.noAssessmentSummary",
    defaultMessage: "No credit assessment",
    description: "Collapsed summary when no AI Credit assessment exists for the bill",
  },
  show: {
    id: "quotes.documentsAndEvidence.show",
    defaultMessage: "Show details",
    description: "Button label to expand quote documents and evidence",
  },
  hide: {
    id: "quotes.documentsAndEvidence.hide",
    defaultMessage: "Hide details",
    description: "Button label to collapse quote documents and evidence",
  },
  billAttachments: {
    id: "quotes.documentsAndEvidence.billAttachments",
    defaultMessage: "Attached to the bill",
    description: "Heading for files retrieved as eBill attachments",
  },
  requestToMintFiles: {
    id: "quotes.documentsAndEvidence.requestToMintFiles",
    defaultMessage: "Submitted with the mint request",
    description: "Heading for files retrieved from request-to-mint URLs",
  },
  noBillFiles: {
    id: "quotes.documentsAndEvidence.noBillFiles",
    defaultMessage: "No bill files are available.",
    description: "Empty state when a quote exposes no retrievable files",
  },
  opening: {
    id: "quotes.documentsAndEvidence.opening",
    defaultMessage: "Opening…",
    description: "Button label while a bill file is opening",
  },
  view: {
    id: "quotes.documentsAndEvidence.view",
    defaultMessage: "View",
    description: "Button label for opening a retrievable bill file",
  },
  creditEvidence: {
    id: "quotes.documentsAndEvidence.creditEvidence",
    defaultMessage: "Credit evidence",
    description: "Heading for AI Credit evidence state",
  },
  loadingEvidence: {
    id: "quotes.documentsAndEvidence.loadingEvidence",
    defaultMessage: "Loading submitted credit evidence…",
    description: "Visible loading state for AI Credit evidence",
  },
  unavailableEvidence: {
    id: "quotes.documentsAndEvidence.unavailableEvidence",
    defaultMessage: "Credit evidence is unavailable. Do not treat this as an absence of evidence.",
    description: "Fail-closed state when AI Credit evidence cannot be loaded",
  },
  absentAssessment: {
    id: "quotes.documentsAndEvidence.absentAssessment",
    defaultMessage: "No AI Credit assessment exists for this bill.",
    description: "State when the adapter has no assessment for the bill",
  },
  emptyEvidence: {
    id: "quotes.documentsAndEvidence.emptyEvidence",
    defaultMessage: "No submitted credit evidence is recorded for this assessment. This is not an adverse finding.",
    description: "Non-adverse empty state for an assessment without submitted evidence",
  },
});

function DocumentGroup({
  title,
  documents,
  openingDocumentHash,
  onOpenDocument,
}: {
  title: string;
  documents: QuoteDocument[];
  openingDocumentHash: string | null;
  onOpenDocument: QuoteDocumentsProps["onOpenDocument"];
}) {
  const intl = useIntl();
  if (documents.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <Badge variant="outline">{intl.formatNumber(documents.length)}</Badge>
      </div>
      {documents.map((file, index) => {
        const isOpening = openingDocumentHash === file.hash;
        return (
          <div
            key={`${file.source}:${file.hash}:${file.name}:${String(index)}`}
            className="flex items-center justify-between gap-3 rounded-lg border p-3"
          >
            <div className="min-w-0">
              <TruncatedTextPopover text={file.name} className="text-sm font-medium" />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                void onOpenDocument(file);
              }}
              disabled={openingDocumentHash !== null}
            >
              {intl.formatMessage(isOpening ? messages.opening : messages.view)}
            </Button>
          </div>
        );
      })}
    </section>
  );
}

function CreditEvidence({ state }: { state: CreditEvidenceState }) {
  const intl = useIntl();
  if (state.status === "loading") {
    return (
      <section aria-labelledby="credit-evidence-heading" role="status" className="space-y-2">
        <h3 id="credit-evidence-heading" className="text-sm font-medium">
          {intl.formatMessage(messages.creditEvidence)}
        </h3>
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.loadingEvidence)}</p>
      </section>
    );
  }
  if (state.status === "unavailable") {
    return (
      <section aria-labelledby="credit-evidence-heading" role="alert" className="space-y-2">
        <h3 id="credit-evidence-heading" className="text-sm font-medium">
          {intl.formatMessage(messages.creditEvidence)}
        </h3>
        <p className="text-sm text-signal-alert">{intl.formatMessage(messages.unavailableEvidence)}</p>
      </section>
    );
  }
  if (state.status === "absent") {
    return (
      <section aria-labelledby="credit-evidence-heading" className="space-y-2">
        <h3 id="credit-evidence-heading" className="text-sm font-medium">
          {intl.formatMessage(messages.creditEvidence)}
        </h3>
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.absentAssessment)}</p>
      </section>
    );
  }
  if (state.submittedEvidence.length === 0) {
    return (
      <section aria-labelledby="credit-evidence-heading" className="space-y-2">
        <h3 id="credit-evidence-heading" className="text-sm font-medium">
          {intl.formatMessage(messages.creditEvidence)}
        </h3>
        <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.emptyEvidence)}</p>
      </section>
    );
  }
  return <SubmittedDocuments submittedEvidence={state.submittedEvidence} evidencePackets={state.evidencePackets} />;
}

export function QuoteDocuments({
  billAttachments,
  requestToMintFiles,
  creditEvidence,
  openingDocumentHash,
  onOpenDocument,
}: QuoteDocumentsProps) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const billFileCount = billAttachments.length + requestToMintFiles.length;
  const evidenceSummary =
    creditEvidence.status === "loading"
      ? intl.formatMessage(messages.evidenceLoadingSummary)
      : creditEvidence.status === "unavailable"
        ? intl.formatMessage(messages.evidenceUnavailableSummary)
        : creditEvidence.status === "absent"
          ? intl.formatMessage(messages.noAssessmentSummary)
          : intl.formatMessage(messages.evidenceCount, { count: creditEvidence.submittedEvidence.length });

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 p-6 text-left"
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
        >
          <span className="min-w-0">
            <CardTitle>{intl.formatMessage(messages.title)}</CardTitle>
            <span className="mt-1 block text-sm text-muted-foreground">
              {intl.formatMessage(messages.billFileCount, { count: billFileCount })} · {evidenceSummary}
            </span>
          </span>
          <span className="flex h-8 shrink-0 items-center gap-1 px-2 py-0">
            <span className="text-xs text-muted-foreground">{intl.formatMessage(isExpanded ? messages.hide : messages.show)}</span>
            {isExpanded ? <AppIcon icon={ChevronUp} size="sm" /> : <AppIcon icon={ChevronDown} size="sm" />}
          </span>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          {billFileCount === 0 ? (
            <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.noBillFiles)}</p>
          ) : (
            <>
              <DocumentGroup
                title={intl.formatMessage(messages.billAttachments)}
                documents={billAttachments}
                openingDocumentHash={openingDocumentHash}
                onOpenDocument={onOpenDocument}
              />
              <DocumentGroup
                title={intl.formatMessage(messages.requestToMintFiles)}
                documents={requestToMintFiles}
                openingDocumentHash={openingDocumentHash}
                onOpenDocument={onOpenDocument}
              />
            </>
          )}
          <div className="border-t border-border pt-5">
            <CreditEvidence state={creditEvidence} />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
