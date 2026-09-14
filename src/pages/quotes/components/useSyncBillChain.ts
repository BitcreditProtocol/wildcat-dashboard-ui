import { toast } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  syncEbillChainMutation,
  getQuoteOptions,
  getEbillOptions,
  getEbillHistoryOptions,
  getSharedEbillHistoryOptions,
  listEbillsOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import { getEbillMintCompleteQueryOptions } from "@/lib/ebill-mint-complete";
import { getApiErrorMessage } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";
import { useRef } from "react";
import { useIntl } from "react-intl";

const logger = createLogger("sync-bill-chain");

export interface UseSyncBillChainArgs {
  quoteId: string;
  billId: string | undefined;
}

export interface UseSyncBillChainResult {
  syncBillChain: () => void;
  isSyncing: boolean;
  canSync: boolean;
}

export function useSyncBillChain({ quoteId, billId }: UseSyncBillChainArgs): UseSyncBillChainResult {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const syncToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const syncMutation = useMutation({
    ...syncEbillChainMutation(),
    onMutate: () => {
      syncToastRef.current = toast({
        title: intl.formatMessage({
          id: "quotes.toast.syncBill.pending",
          defaultMessage: "Refreshing bill from nostr...",
        }),
        variant: "info",
      });
    },
    onSettled: () => {
      syncToastRef.current?.dismiss();
      syncToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: intl.formatMessage(
          {
            id: "quotes.toast.syncBill.error",
            defaultMessage: "Error while refreshing bill: {error}",
          },
          { error: getApiErrorMessage(error) }
        ),
        variant: "error",
      });
      logger.warn("Sync bill chain failed", error);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.syncBill.success",
          defaultMessage: "Bill has been refreshed.",
        }),
        variant: "success",
      });

      const syncedQueryKeys = [
        getQuoteOptions({ path: { qid: quoteId } }).queryKey,
        getSharedEbillHistoryOptions({ path: { qid: quoteId } }).queryKey,
        listEbillsOptions().queryKey,
        ...(billId
          ? [
              getEbillOptions({ path: { bid: billId } }).queryKey,
              getEbillHistoryOptions({ path: { bid: billId } }).queryKey,
              getEbillMintCompleteQueryOptions({ billId }).queryKey,
            ]
          : []),
      ];

      for (const queryKey of syncedQueryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const syncBillChain = () => {
    if (!billId || syncMutation.isPending) {
      return;
    }

    syncMutation.mutate({
      body: {
        bill_id: billId,
        from_nostr: true,
      },
    });
  };

  return {
    syncBillChain,
    isSyncing: syncMutation.isPending,
    canSync: Boolean(billId) && !syncMutation.isPending,
  };
}
