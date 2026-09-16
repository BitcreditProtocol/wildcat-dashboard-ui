import { DownloadIcon } from "lucide-react";
import { useIntl } from "react-intl";
import {
  AppIcon,
  Button,
  cn,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Text,
} from "@bitcredit/ui-library";
import { getDocumentPreviewMode } from "@/utils/document-preview";

export interface QuoteDocumentPreview {
  name: string;
  url: string;
  mimeType: string;
}

interface QuoteDocumentViewerProps {
  preview: QuoteDocumentPreview | null;
  onClose: () => void;
}

/**
 * Renders an attachment inside the app rather than handing it to a new tab: an installed
 * PWA runs standalone, where a `blob:` URL passed to `window.open` or a `_blank` link has
 * no tab to land in and cannot be resolved by the external browser it is handed to (#463).
 * Downloading is the one handoff that still works, so it is always offered.
 */
export function QuoteDocumentViewer({ preview, onClose }: QuoteDocumentViewerProps) {
  const intl = useIntl();
  const mode = preview ? getDocumentPreviewMode(preview.mimeType) : "download";

  return (
    <Dialog
      open={preview !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className={cn("flex w-[95vw] max-w-4xl flex-col gap-3 p-4", mode === "pdf" ? "h-[85vh]" : "max-h-[90vh]")}>
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate text-base">{preview?.name}</DialogTitle>
          <DialogDescription className="sr-only">
            {intl.formatMessage({
              id: "quotes.documents.preview.description",
              defaultMessage: "Preview of the selected quote document",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          {preview && mode === "pdf" && <iframe src={preview.url} title={preview.name} className="h-full w-full border-0" />}

          {preview && mode === "image" && <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" />}

          {preview && mode === "download" && (
            <Text variant="body" className="p-6 text-center">
              {intl.formatMessage({
                id: "quotes.documents.preview.unsupported",
                defaultMessage: "This file type cannot be previewed here. Download it to open it with another app.",
              })}
            </Text>
          )}
        </div>

        <DialogFooter className="gap-2">
          {preview && (
            <Button variant="outline" size="sm" asChild>
              <a href={preview.url} download={preview.name}>
                <AppIcon icon={DownloadIcon} size="sm" />
                {intl.formatMessage({
                  id: "quotes.documents.preview.download",
                  defaultMessage: "Download",
                })}
              </a>
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              {intl.formatMessage({
                id: "quotes.documents.preview.close",
                defaultMessage: "Close",
              })}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
