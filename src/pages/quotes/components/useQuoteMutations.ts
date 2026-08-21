import { toast } from "@bitcredit/ui-library";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updateQuoteMutation,
  postEbillReqtopayMutation,
  getQuoteOptions,
  getEbillOptions,
} from "@/generated/client/@tanstack/react-query.gen";
import type { OfferFormResult } from "./OfferFormDrawer";
import { getApiErrorMessage } from "@/lib/api-error";
import { useRef } from "react";
import { useIntl } from "react-intl";
import { createLogger } from "@/lib/logger";
import { authenticatedFetch } from "@/lib/api-client";
import type { SignedOfferAuthorization } from "@/pages/credit/record-operator-decision";

const logger = createLogger("quote-mutations");

export function governedOfferTtl(result: OfferFormResult, now = Date.now()): string | null {
  const governedExpiry = result.governedOfferExpiresAt;
  const selectedExpiry = result.ttl.ttl;
  if (
    governedExpiry === undefined ||
    Number.isNaN(governedExpiry.getTime()) ||
    Number.isNaN(selectedExpiry.getTime()) ||
    selectedExpiry.getTime() <= now ||
    selectedExpiry.getTime() > governedExpiry.getTime()
  ) {
    return null;
  }
  return selectedExpiry.toISOString();
}

type ExpectedQuoteUpdate = { action: "Deny" } | { action: "Offer"; discounted: number; ttl: string };
interface QuoteUpdateState {
  status: string;
  discounted?: number;
  ttl?: string;
}

/** A dropped response is success only when the Mint now exposes the exact requested state. */
export function isCommittedQuoteUpdate(quote: QuoteUpdateState, expected: ExpectedQuoteUpdate): boolean {
  if (expected.action === "Deny") return quote.status === "Denied";
  return (
    quote.status === "Offered" &&
    quote.discounted === expected.discounted &&
    quote.ttl !== undefined &&
    Date.parse(quote.ttl) === Date.parse(expected.ttl)
  );
}

/** The signed terms, not editable dashboard state, define the exact Mint result to reconcile. */
export function expectedAuthorizedQuoteUpdate(
  signedAuthorization: SignedOfferAuthorization,
  quoteId: string
): Extract<ExpectedQuoteUpdate, { action: "Offer" }> | null {
  if (signedAuthorization.authorization.mintQuoteId !== quoteId) return null;
  const discounted = Number(signedAuthorization.authorization.terms.discountedSat);
  const ttl = `${signedAuthorization.authorization.terms.offerExpiresOn}T23:59:59.999Z`;
  if (!Number.isSafeInteger(discounted) || discounted <= 0 || Number.isNaN(Date.parse(ttl))) return null;
  return { action: "Offer", discounted, ttl };
}

export async function reconcileCommittedQuoteUpdate(
  readQuote: () => Promise<QuoteUpdateState>,
  expected: ExpectedQuoteUpdate
): Promise<boolean> {
  try {
    return isCommittedQuoteUpdate(await readQuote(), expected);
  } catch {
    return false;
  }
}

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
    mutationFn: async (signedAuthorization: SignedOfferAuthorization) => {
      const response = await authenticatedFetch(`/v1/admin/credit/quote/${encodeURIComponent(quoteId)}/authorization`, {
        body: JSON.stringify({ signedAuthorization }),
        headers: { "content-type": "application/json" },
        method: "PUT",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Mint authorization command failed (${String(response.status)})`);
    },
    onSettled: () => {
      offerToastRef.current?.dismiss();
      offerToastRef.current = null;
    },
    onError: (error) => {
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

  const reconcileQuoteUpdate = async (expected: ExpectedQuoteUpdate): Promise<boolean> => {
    const options = getQuoteOptions({ path: { qid: quoteId } });
    const reconciled = await reconcileCommittedQuoteUpdate(async () => {
      await queryClient.invalidateQueries({ queryKey: options.queryKey });
      return queryClient.fetchQuery({ ...options, staleTime: 0 });
    }, expected);
    if (reconciled) {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.update.reconciled",
          defaultMessage: "The Mint had already applied the exact quote action. The dashboard is synchronized.",
          description: "Success shown after an ambiguous Mint response is reconciled against the exact stored quote state",
        }),
        variant: "success",
      });
    }
    return reconciled;
  };

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

  const handleDenyQuote = async (): Promise<boolean> => {
    denyToastRef.current?.dismiss();
    denyToastRef.current = toast({
      title: intl.formatMessage({
        id: "quotes.toast.deny.pending",
        defaultMessage: "Denying quote...",
      }),
      variant: "info",
    });
    try {
      await denyQuote.mutateAsync({
        path: { qid: quoteId },
        body: { action: "Deny" },
      });
      return true;
    } catch {
      if (await reconcileQuoteUpdate({ action: "Deny" })) return true;
      return false;
    }
  };

  const handleOfferQuote = async (signedAuthorization: SignedOfferAuthorization): Promise<boolean> => {
    offerToastRef.current?.dismiss();
    const expected = expectedAuthorizedQuoteUpdate(signedAuthorization, quoteId);
    if (expected === null) {
      toast({
        title: intl.formatMessage({
          id: "quotes.toast.offer.invalidExpiry",
          defaultMessage: "The offer expiry is outside the governed validity period. Review it before offering the quote.",
          description: "Error shown when a Mint offer would outlive its governed credit decision",
        }),
        variant: "error",
      });
      return false;
    }
    offerToastRef.current = toast({
      title: intl.formatMessage({
        id: "quotes.toast.offer.pending",
        defaultMessage: "Offering quote...",
      }),
      variant: "info",
    });
    try {
      await offerQuote.mutateAsync(signedAuthorization);
      return true;
    } catch {
      if (await reconcileQuoteUpdate(expected)) return true;
      return false;
    }
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
