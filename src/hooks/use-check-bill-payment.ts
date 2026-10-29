import { toast } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useIntl } from "react-intl";
import {
  checkBillPaymentMutation,
  getEbillHistoryOptions,
  getEbillOptions,
  getEbillPaymentstatusOptions,
  getQuoteOptions,
  listEbillsOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import { getApiErrorMessage } from "@/lib/api-error";
import { getEbillMintCompleteQueryOptions } from "@/lib/ebill-mint-complete";
import { createLogger } from "@/lib/logger";

const logger = createLogger("check-bill-payment");

export interface UseCheckBillPaymentArgs {
  billId: string | undefined;
  quoteId?: string;
}

export function useCheckBillPayment({ billId, quoteId }: UseCheckBillPaymentArgs) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const pendingToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const checkMutation = useMutation({
    ...checkBillPaymentMutation(),
    onMutate: () => {
      pendingToastRef.current = toast({
        title: intl.formatMessage({
          id: "bills.toast.checkPayment.pending",
          defaultMessage: "Checking payment...",
        }),
        variant: "info",
      });
    },
    onSettled: () => {
      pendingToastRef.current?.dismiss();
      pendingToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: intl.formatMessage(
          {
            id: "bills.toast.checkPayment.error",
            defaultMessage: "Error while checking payment: {error}",
          },
          { error: getApiErrorMessage(error) }
        ),
        variant: "error",
      });
      logger.warn("Check bill payment failed", error);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "bills.toast.checkPayment.success",
          defaultMessage: "Payment has been checked.",
        }),
        variant: "success",
      });

      const checkedQueryKeys = [
        listEbillsOptions().queryKey,
        ...(quoteId ? [getQuoteOptions({ path: { qid: quoteId } }).queryKey] : []),
        ...(billId
          ? [
              getEbillOptions({ path: { bid: billId } }).queryKey,
              getEbillPaymentstatusOptions({ path: { bid: billId } }).queryKey,
              getEbillHistoryOptions({ path: { bid: billId } }).queryKey,
              getEbillMintCompleteQueryOptions({ billId }).queryKey,
            ]
          : []),
      ];

      for (const queryKey of checkedQueryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });

  const checkBillPayment = () => {
    if (!billId || checkMutation.isPending) {
      return;
    }

    checkMutation.mutate({ body: { bill_id: billId } });
  };

  return {
    checkBillPayment,
    isCheckingPayment: checkMutation.isPending,
    canCheckPayment: Boolean(billId) && !checkMutation.isPending,
  };
}
