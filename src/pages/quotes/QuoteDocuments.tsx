import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useIntl } from "react-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover";

interface QuoteDocument {
  name: string;
  hash: string;
}

interface QuoteDocumentsProps {
  documents: QuoteDocument[];
  openingDocumentName: string | null;
  onOpenDocument: (fileName: string) => void | Promise<void>;
}

export function QuoteDocuments({
  documents,
  openingDocumentName,
  onOpenDocument,
}: QuoteDocumentsProps) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);

  console.log(documents);
  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded((value) => !value)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>
              {intl.formatMessage({
                id: "quotes.documents.title",
                defaultMessage: "Documents",
              })}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {intl.formatMessage(
                {
                  id: "quotes.documents.count",
                  defaultMessage:
                    "({count, plural, one {# document} other {# documents}})",
                },
                { count: documents.length },
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 py-0 gap-1"
          >
            <span className="text-xs text-muted-foreground">
              {isExpanded
                ? intl.formatMessage({
                    id: "quotes.documents.hide",
                    defaultMessage: "Hide documents",
                  })
                : intl.formatMessage({
                    id: "quotes.documents.show",
                    defaultMessage: "Show documents",
                  })}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          {documents.length > 0 ? (
            documents.map((file, index) => {
              const isOpening = openingDocumentName === file.name;

              return (
                <div
                  key={`${file.hash}-${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <TruncatedTextPopover
                      text={file.name}
                      maxLength={35}
                      className="text-sm font-medium"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      void onOpenDocument(file.name);
                    }}
                    disabled={openingDocumentName !== null}
                  >
                    {isOpening
                      ? intl.formatMessage({
                          id: "quotes.documents.opening",
                          defaultMessage: "Opening...",
                        })
                      : intl.formatMessage({
                          id: "quotes.documents.view",
                          defaultMessage: "View",
                        })}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground">
              {intl.formatMessage({
                id: "quotes.documents.empty",
                defaultMessage: "No documents available",
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
