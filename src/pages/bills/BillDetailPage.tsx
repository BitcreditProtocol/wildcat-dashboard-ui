import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BreadcrumbLink } from "@/components/ui/breadcrumb";
import { AppIcon, Button, cn, Heading, TruncatedTextPopover } from "@bitcredit/ui-library";
import { RefreshCwIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { defineMessages, useIntl } from "react-intl";
import { Link, useParams } from "react-router";
import { getEbillHistoryOptions } from "@/generated/client/@tanstack/react-query.gen";
import { useQuoteIdByBill } from "@/hooks/use-quote-id-by-bill";
import { BillDetailCard } from "@/pages/quotes/components/BillDetailCard";
import { useSyncBillChain } from "@/pages/quotes/components/useSyncBillChain";

const messages = defineMessages({
  bills: { id: "bills.breadcrumb", defaultMessage: "Bills" },
  title: { id: "bills.detail.title", defaultMessage: "Bill" },
  refresh: {
    id: "bills.detail.refresh",
    defaultMessage: "Refresh bill",
    description: "Re-fetches the bill chain from nostr and reloads the bill view",
  },
});

export default function BillDetailPage() {
  const intl = useIntl();
  const params = useParams();
  const billId = typeof params.billId === "string" ? params.billId : "";
  const { quoteId } = useQuoteIdByBill(billId);
  const { syncBillChain, isSyncing, canSync, hasSyncableBill } = useSyncBillChain({ quoteId, billId });

  const { data: historyBlocks, isLoading: isHistoryLoading } = useQuery({
    ...getEbillHistoryOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: billId.length > 0,
  });

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink key="bills" asChild>
            <Link to="/bills">{intl.formatMessage(messages.bills)}</Link>
          </BreadcrumbLink>,
        ]}
      >
        {billId}
      </Breadcrumbs>

      <div className="flex flex-col gap-3 mb-4 sm:mb-0 sm:flex-row sm:items-center sm:justify-between">
        <Heading as="h1" variant="page" className="mb-2 sm:mb-6 pt-4">
          <span className="inline-flex items-baseline gap-1 whitespace-nowrap">
            <span>{intl.formatMessage(messages.title)}</span>
            <TruncatedTextPopover text={billId} maxLength={16} className="inline font-mono" as="span" />
          </span>
        </Heading>
        {hasSyncableBill && (
          <Button
            variant="outline"
            size="sm"
            onClick={syncBillChain}
            disabled={!canSync}
            className="inline-flex items-center gap-1 leading-none"
          >
            <AppIcon icon={RefreshCwIcon} weight="thin" className={cn("h-4 w-4", { "animate-spin": isSyncing })} />
            <span className="relative top-px leading-none">{intl.formatMessage(messages.refresh)}</span>
          </Button>
        )}
      </div>

      <BillDetailCard billId={billId} quoteId={quoteId} historyBlocks={historyBlocks} isHistoryLoading={isHistoryLoading} />
    </>
  );
}
