import { Badge } from "@/components/ui/badge";
import { getEbillAttachment } from "@/generated/client/sdk.gen";
import { Button, TruncatedTextPopover } from "@bitcredit/ui-library";
import { FileText, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { SubmittedEvidence } from "./decision-types";

/**
 * The documents the applicant chose to submit with this application, opened as the real files the
 * Mint holds — the same bytes the eBill application shows, fetched through the Mint's own
 * attachment endpoint. Nothing here is a rendering of a document: an operator deciding on an
 * instrument must see the instrument, not a reconstruction of it.
 *
 * A file the applicant uploaded during onboarding has no stored bytes on this side — the host
 * hashed it locally and only the reference travelled — so it is listed with its digest and marked
 * as unavailable rather than offered as something openable.
 */

const messages = defineMessages({
  heading: {
    id: "credit.documents.heading",
    defaultMessage: "Submitted with the application",
    description: "Heading of the applicant's submitted document list",
  },
  caption: {
    id: "credit.documents.caption",
    defaultMessage:
      "Chosen by the applicant out of the documents on the bill. The Documents panel below lists everything the bill carries.",
    description: "Caption distinguishing submitted documents from all bill documents",
  },
  open: { id: "credit.documents.open", defaultMessage: "Open", description: "Button that opens a submitted document" },
  billAttachment: {
    id: "credit.documents.billAttachment",
    defaultMessage: "On the bill",
    description: "Badge for a document carried by the signed bill",
  },
  applicantUpload: {
    id: "credit.documents.applicantUpload",
    defaultMessage: "Added when applying",
    description: "Badge for a document the applicant uploaded during onboarding",
  },
  unavailable: {
    id: "credit.documents.unavailable",
    defaultMessage: "Not stored on this side — reference and digest only",
    description: "Explains why an applicant upload cannot be opened here",
  },
  failed: {
    id: "credit.documents.failed",
    defaultMessage:
      "The Mint cannot serve this file by name yet — that starts once it holds the bill chain. The Documents panel below opens the copy that arrived with the request to mint.",
    description: "Shown when opening a document fails, pointing at the copy that is available",
  },
});

/** Core suffixes stored files with a uuid; the eBill app strips it for display the same way. */
const STORED_FILE_SUFFIX = /_[a-f0-9-]{36}(?=\.\w+$)/;

export function SubmittedDocuments({ billId, submittedEvidence }: { billId: string; submittedEvidence: readonly SubmittedEvidence[] }) {
  const intl = useIntl();
  const [openingReference, setOpeningReference] = useState<string | null>(null);
  const [failedReference, setFailedReference] = useState<string | null>(null);

  if (submittedEvidence.length === 0) return null;

  const open = async (reference: string) => {
    setOpeningReference(reference);
    setFailedReference(null);
    try {
      // `reference` is the stored file name, which is what this endpoint keys on.
      const attachment: unknown = await getEbillAttachment({
        path: { bid: billId, fname: reference },
        responseStyle: "data",
        parseAs: "blob",
      });
      if (!(attachment instanceof Blob)) throw new Error("Attachment response was not a file");
      const blobUrl = window.URL.createObjectURL(attachment);
      // Popups are blocked in some embedded browsers, so fall back to a synthetic click.
      if (window.open(blobUrl, "_blank", "noopener,noreferrer") === null) {
        const link = document.createElement("a");
        link.href = blobUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.click();
      }
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 60_000);
    } catch {
      setFailedReference(reference);
    } finally {
      setOpeningReference(null);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">{intl.formatMessage(messages.heading)}</span>
        <span className="text-muted-foreground">{intl.formatMessage(messages.caption)}</span>
      </div>
      <ul className="flex flex-col gap-1">
        {submittedEvidence.map((evidence) => {
          const isOnBill = evidence.origin === "bill_attachment";
          return (
            <li key={evidence.reference} className="flex flex-wrap items-center gap-2 rounded-md border border-divider-200 px-2 py-1">
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <TruncatedTextPopover text={evidence.label.replace(STORED_FILE_SUFFIX, "")} className="min-w-0 font-medium" />
              <Badge variant={isOnBill ? "outline" : "secondary"}>
                {intl.formatMessage(isOnBill ? messages.billAttachment : messages.applicantUpload)}
              </Badge>
              {isOnBill ? (
                <Button
                  variant="outline"
                  size="xs"
                  className="ml-auto"
                  disabled={openingReference !== null}
                  onClick={() => {
                    void open(evidence.reference);
                  }}
                >
                  {intl.formatMessage(messages.open)}
                  {openingReference === evidence.reference && <LoaderIcon className="ml-1 size-3 animate-spin" />}
                </Button>
              ) : (
                <span className="ml-auto text-muted-foreground" title={evidence.contentDigest}>
                  {intl.formatMessage(messages.unavailable)}
                </span>
              )}
              {failedReference === evidence.reference && (
                <span className="w-full text-signal-alert">{intl.formatMessage(messages.failed)}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
