import { toast } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateQuoteMutation,
  postEbillReqtopayMutation,
  getQuoteOptions,
  getEbillOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import type { OfferFormResult } from "./OfferFormDrawer";
import Big from "big.js";
import { getApiErrorMessage } from "@/lib/api-error";
import { useRef } from "react";
import { useIntl } from "react-intl";
import { createLogger } from "@/lib/logger";

const logger = createLogger("quote-mutations");

export function useQuoteMutations(quoteId: string, billId: string) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const denyToastRef = useRef<ReturnType<typeof toast> | null>(null);
  const offerToastRef = useRef<ReturnType<typeof toast> | null>(null);
  const requestToPayToastRef = useRef<ReturnType<typeof toast> | null>(null);

  const denyQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      denyToastRef.current?.dismiss();
      denyToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: intl.formatMessage(
          {
            id: "quotes.toast.deny.error",
            defaultMessage: "Error while denying quote: {error}",
          },
          { error: getApiErrorMessage(error) }
        ),
        variant: "error",
      });
      logger.warn("Deny quote failed", error);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.deny.success",
          defaultMessage: "Quote has been denied.",
        }),
        variant: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({ path: { qid: quoteId } }).queryKey,
      });
    },
  });

  const offerQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      offerToastRef.current?.dismiss();
      offerToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: intl.formatMessage(
          {
            id: "quotes.toast.offer.error",
            defaultMessage: "Error while offering quote: {error}",
          },
          { error: getApiErrorMessage(error) }
        ),
        variant: "error",
      });
      logger.warn("Offer quote failed", error);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.offer.success",
          defaultMessage: "Quote has been offered.",
        }),
        variant: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({ path: { qid: quoteId } }).queryKey,
      });
    },
  });

  const requestToPayMutation = useMutation({
    ...postEbillReqtopayMutation(),
    onMutate: () => {
      requestToPayToastRef.current = toast({
        title: intl.formatMessage({
          id: "quotes.toast.requestToPay.pending",
          defaultMessage: "Requesting to pay...",
        }),
        variant: "info",
      });
    },
    onSettled: () => {
      requestToPayToastRef.current?.dismiss();
      requestToPayToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: intl.formatMessage(
          {
            id: "quotes.toast.requestToPay.error",
            defaultMessage: "Error while requesting to pay: {error}",
          },
          { error: getApiErrorMessage(error) }
        ),
        variant: "error",
      });
      logger.warn("Request to pay failed", error);
    },
    onSuccess: () => {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.requestToPay.success",
          defaultMessage: "Payment request has been created.",
        }),
        variant: "success",
      });
      void queryClient.invalidateQueries({
        queryKey: getEbillOptions({ path: { bid: billId } }).queryKey,
      });
    },
  });

  const handleDenyQuote = () => {
    denyToastRef.current?.dismiss();
    denyToastRef.current = toast({
      title: intl.formatMessage({
        id: "quotes.toast.deny.pending",
        defaultMessage: "Denying quote...",
      }),
      variant: "info",
    });
    denyQuote.mutate({
      path: { qid: quoteId },
      body: { action: "Deny" },
    });
  };

  const handleOfferQuote = (result: OfferFormResult) => {
    offerToastRef.current?.dismiss();
    offerToastRef.current = toast({
      title: intl.formatMessage({
        id: "quotes.toast.offer.pending",
        defaultMessage: "Offering quote...",
      }),
      variant: "info",
    });
    const net_amount = result.discount.net.value.round(0, Big.roundDown).toNumber();

    offerQuote.mutate({
      path: { qid: quoteId },
      body: {
        action: "Offer",
        discounted: net_amount,
        ttl: result.ttl.ttl.toISOString(),
      },
    });
  };

  const handleRequestToPay = (billSum: number, deadline: Date) => {
    requestToPayMutation.mutate({
      body: {
        ebill_id: billId,
        amount: billSum,
        deadline: deadline.toISOString(),
      },
    });
  };

  return {
    denyQuote,
    offerQuote,
    requestToPayMutation,
    handleDenyQuote,
    handleOfferQuote,
    handleRequestToPay,
  };
}
