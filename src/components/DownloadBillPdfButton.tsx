import { useState } from "react";
import { AppIcon, Button, cn, toast } from "@bitcredit/ui-library";
import { useQueryClient } from "@tanstack/react-query";
import { PrinterIcon } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { getEbillHistoryOptions, getEbillOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getApiErrorMessage } from "@/lib/api-error";

const messages = defineMessages({
  download: {
    id: "bills.pdf.download",
    defaultMessage: "Print bill",
    description: "Downloads the bill of exchange as a printable PDF, the same layout the eBill app prints",
  },
  error: { id: "bills.pdf.error", defaultMessage: "The bill could not be printed" },
});

function saveFile(bytes: Uint8Array, fileName: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function DownloadBillPdfButton({ billId }: { billId: string | undefined }) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const [isPrinting, setIsPrinting] = useState(false);

  if (!billId) {
    return null;
  }

  const printBill = async () => {
    setIsPrinting(true);

    try {
      const [bill, historyBlocks, { createBillPdf }, { billPdfContentFromBill, billPdfEndorsementsFromHistory }] = await Promise.all([
        queryClient.fetchQuery(getEbillOptions({ path: { bid: billId } })),
        queryClient.fetchQuery(getEbillHistoryOptions({ path: { bid: billId } })),
        import("@bitcredit/ui-library/bill-pdf"),
        import("@/lib/bill-pdf"),
      ]);

      const bytes = await createBillPdf(billPdfContentFromBill(bill, historyBlocks), billPdfEndorsementsFromHistory(historyBlocks));
      saveFile(bytes, `bill-${billId}.pdf`);
    } catch (error) {
      toast({ title: intl.formatMessage(messages.error), description: getApiErrorMessage(error), variant: "error" });
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void printBill()}
      disabled={isPrinting}
      className="inline-flex items-center gap-1 leading-none"
    >
      <AppIcon icon={PrinterIcon} weight="thin" className={cn("h-4 w-4", { "animate-pulse": isPrinting })} />
      <span className="relative top-px leading-none">{intl.formatMessage(messages.download)}</span>
    </Button>
  );
}
