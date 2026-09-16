import { DownloadIcon } from "lucide-react";
import { useIntl } from "react-intl";
import {
  AppIcon,
  Button,
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
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-4xl flex-col gap-4 p-4 sm:p-6">
        <DialogHeader className="min-w-0">
          <DialogTitle className="truncate text-base">{preview?.name}</DialogTitle>
          <DialogDescription className="sr-only">
            {intl.formatMessage({
              id: "quotes.documents.preview.description",
              defaultMessage: "Preview of the selected quote document",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30">
          {preview && mode === "pdf" && <iframe src={preview.url} title={preview.name} className="h-full w-full border-0" />}

          {preview && mode === "image" && (
            <div className="flex h-full items-center justify-center p-2">
              <img src={preview.url} alt={preview.name} className="max-h-full max-w-full object-contain" />
            </div>
          )}

          {preview && mode === "download" && (
            <div className="flex h-full items-center justify-center p-6 text-center">
              <Text variant="body">
                {intl.formatMessage({
                  id: "quotes.documents.preview.unsupported",
                  defaultMessage: "This file type cannot be previewed here. Download it to open it with another app.",
                })}
              </Text>
            </div>
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
