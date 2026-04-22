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

export function useQuoteMutations(quoteId: string, billId: string) {
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
        title: `Error while denying quote: ${getApiErrorMessage(error)}`,
        variant: "error",
      });
      console.warn(error);
    },
    onSuccess: () => {
      toast({ title: "Quote has been denied.", variant: "success" });
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
        title: `Error while offering quote: ${getApiErrorMessage(error)}`,
        variant: "error",
      });
      console.warn(error);
    },
    onSuccess: () => {
      toast({ title: "Quote has been offered.", variant: "success" });
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({ path: { qid: quoteId } }).queryKey,
      });
    },
  });

  const requestToPayMutation = useMutation({
    ...postEbillReqtopayMutation(),
    onMutate: () => {
      requestToPayToastRef.current = toast({
        title: "Requesting to pay…",
        variant: "info",
      });
    },
    onSettled: () => {
      requestToPayToastRef.current?.dismiss();
      requestToPayToastRef.current = null;
    },
    onError: (error) => {
      toast({
        title: `Error while requesting to pay: ${getApiErrorMessage(error)}`,
        variant: "error",
      });
      console.warn(error);
    },
    onSuccess: () => {
      toast({ title: "Payment request has been created.", variant: "success" });
      void queryClient.invalidateQueries({
        queryKey: getEbillOptions({ path: { bid: billId } }).queryKey,
      });
    },
  });

  const handleDenyQuote = () => {
    denyToastRef.current?.dismiss();
    denyToastRef.current = toast({
      title: "Denying quote…",
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
      title: "Offering quote…",
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
