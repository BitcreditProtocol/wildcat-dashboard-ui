import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateQuoteMutation,
  postEbillReqtopayMutation,
  getQuoteOptions,
  getEbillOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import type { OfferFormResult } from "./OfferFormDrawer";
import Big from "big.js";
import { getApiErrorMessage } from "@/lib/api-error";

export function useQuoteMutations(quoteId: string, billId: string) {
  const queryClient = useQueryClient();

  const denyQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${quoteId}-deny`);
    },
    onError: (error) => {
      toast.error(`Error while denying quote: ${getApiErrorMessage(error)}`);
      console.warn(error);
    },
    onSuccess: () => {
      toast.success("Quote has been denied.");
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({ path: { qid: quoteId } }).queryKey,
      });
    },
  });

  const offerQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${quoteId}-offer`);
    },
    onError: (error) => {
      toast.error(`Error while offering quote: ${getApiErrorMessage(error)}`);
      console.warn(error);
    },
    onSuccess: () => {
      toast.success("Quote has been offered.");
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({ path: { qid: quoteId } }).queryKey,
      });
    },
  });

  const requestToPayMutation = useMutation({
    ...postEbillReqtopayMutation(),
    onMutate: () => {
      toast.loading("Requesting to pay…", {
        id: `quote-${quoteId}-request-to-pay`,
      });
    },
    onSettled: () => {
      toast.dismiss(`quote-${quoteId}-request-to-pay`);
    },
    onError: (error) => {
      toast.error(
        `Error while requesting to pay: ${getApiErrorMessage(error)}`,
      );
      console.warn(error);
    },
    onSuccess: () => {
      toast.success("Payment request has been created.");
      void queryClient.invalidateQueries({
        queryKey: getEbillOptions({ path: { bid: billId } }).queryKey,
      });
    },
  });

  const handleDenyQuote = () => {
    toast.loading("Denying quote…", { id: `quote-${quoteId}-deny` });
    denyQuote.mutate({
      path: { qid: quoteId },
      body: { action: "Deny" },
    });
  };

  const handleOfferQuote = (result: OfferFormResult) => {
    toast.loading("Offering quote…", { id: `quote-${quoteId}-offer` });
    const net_amount = result.discount.net.value
      .round(0, Big.roundDown)
      .toNumber();

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
