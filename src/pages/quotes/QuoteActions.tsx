import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderIcon } from "lucide-react";
import { AppIcon, Button } from "@bitcredit/ui-library";
import { getEbillOptions, getMintInfoOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { InfoReply, BillWaitingStatePaymentData } from "@/generated/client/types.gen";
import { OfferFormDrawer, type OfferFormResult } from "./components/OfferFormDrawer";
import { DenyConfirmDrawer } from "./components/DenyConfirmDrawer";
import { removeItem } from "@/utils/local-storage";
import { PaymentRequestCard } from "./components/PaymentRequestCard";
import { OfferConfirmation } from "./components/OfferConfirmation";
import { RequestToPayConfirmation } from "./components/RequestToPayConfirmation";
import { useQuoteMutations } from "./components/useQuoteMutations";
import { useIntl } from "react-intl";
import { getEffectiveQuoteStatus } from "@/utils/quote-status";
import { buildMempoolTransactionUrl } from "@/utils/mempool";

interface QuoteActionsProps {
  value: InfoReply;
  isFetching: boolean;
  ebillPaid: boolean;
  isMintComplete: boolean;
  requestedToPay: boolean;
  paymentDeadlineTs?: number | null;
  timeOfRequestToPay?: number | null;
}

export function QuoteActions({
  value,
  isFetching,
  ebillPaid,
  isMintComplete,
  requestedToPay,
  paymentDeadlineTs,
  timeOfRequestToPay,
}: QuoteActionsProps) {
  const intl = useIntl();
  const billId = value.bill.id;
  const EBILL_DETAIL_POLL_INTERVAL_MS = 10_000;
  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: !!billId,
    refetchInterval: (query) => {
      if (query.state.error) {
        return false;
      }

      return query.state.data?.status?.payment?.paid ? false : EBILL_DETAIL_POLL_INTERVAL_MS;
    },
    refetchIntervalInBackground: true,
  });

  const ebill = ebillQuery.data;
  const effectiveQuoteStatus = getEffectiveQuoteStatus(value.status, ebill);
  const paymentStatus = ebill?.status.payment;
  const cws = ebill?.current_waiting_state;

  let waitingPaymentData: BillWaitingStatePaymentData | undefined;
  if (cws && "Payment" in cws) {
    waitingPaymentData = cws.Payment.payment_data;
  }

  const requestedToPayEff = Boolean(requestedToPay || paymentStatus?.requested_to_pay);
  const ebillPaidEff = Boolean(ebillPaid || (paymentStatus?.paid && isMintComplete));
  const effectiveRequestTime = timeOfRequestToPay ?? paymentStatus?.time_of_request_to_pay ?? waitingPaymentData?.time_of_request ?? null;
  const effectiveDeadlineTs =
    paymentDeadlineTs ?? paymentStatus?.payment_deadline_timestamp ?? waitingPaymentData?.payment_deadline ?? null;
  const rawBackendMempoolLink = waitingPaymentData?.mempool_link_for_address_to_pay?.trim();
  const backendMempoolLink = rawBackendMempoolLink === "" ? undefined : rawBackendMempoolLink;
  const mintInfoQuery = useQuery({
    ...getMintInfoOptions(),
    retry: 1,
    enabled: Boolean(waitingPaymentData?.tx_id && !backendMempoolLink),
    staleTime: 5 * 60 * 1000,
  });
  const linkToPay: string | undefined =
    backendMempoolLink ??
    buildMempoolTransactionUrl({
      txId: waitingPaymentData?.tx_id,
      network: mintInfoQuery.data?.network,
    });
  const addressToPay: string | undefined = waitingPaymentData?.address_to_pay;

  const [offerFormData, setOfferFormData] = useState<OfferFormResult>();
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false);
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false);
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false);
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false);

  const denyTitle = intl.formatMessage({
    id: "quotes.actions.deny.title",
    defaultMessage: "Confirm denying quote",
  });
  const denyButtonLabel = intl.formatMessage({
    id: "quotes.actions.deny.button",
    defaultMessage: "Deny",
  });
  const offerTitle = intl.formatMessage({
    id: "quotes.actions.offer.title",
    defaultMessage: "Offer quote",
  });
  const offerDescription = intl.formatMessage({
    id: "quotes.actions.offer.description",
    defaultMessage: "Make an offer to the current holder of this bill",
  });
  const offerButtonLabel = intl.formatMessage({
    id: "quotes.actions.offer.button",
    defaultMessage: "Offer",
  });
  const { denyQuote, offerQuote, requestToPayMutation, handleDenyQuote, handleOfferQuote, handleRequestToPay } = useQuoteMutations(
    value.id,
    billId
  );

  return (
    <>
      <div className="flex items-center gap-2">
        {effectiveQuoteStatus === "Pending" && (
          <DenyConfirmDrawer
            title={denyTitle}
            open={denyConfirmDrawerOpen}
            onOpenChange={setDenyConfirmDrawerOpen}
            onSubmit={() => {
              handleDenyQuote();
              setDenyConfirmDrawerOpen(false);
            }}
          >
            <Button className="flex-1 max-w-sm" disabled={isFetching || denyQuote.isPending} variant="destructive">
              {denyButtonLabel} {denyQuote.isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
            </Button>
          </DenyConfirmDrawer>
        )}

        {effectiveQuoteStatus === "Pending" && (
          <OfferFormDrawer
            title={offerTitle}
            description={offerDescription}
            value={value}
            open={offerFormDrawerOpen}
            onOpenChange={setOfferFormDrawerOpen}
            onSubmit={(data) => {
              setOfferFormData(data);
              setOfferConfirmDrawerOpen(true);
              setOfferFormDrawerOpen(false);
            }}
          >
            <Button className="flex-1 max-w-sm" disabled={isFetching || offerQuote.isPending}>
              {offerButtonLabel} {offerQuote.isPending && <AppIcon icon={LoaderIcon} weight="thin" className="animate-spin" />}
            </Button>
          </OfferFormDrawer>
        )}

        <OfferConfirmation
          offerFormData={offerFormData}
          open={offerConfirmDrawerOpen}
          onOpenChange={setOfferConfirmDrawerOpen}
          onSubmit={(finalData) => {
            removeItem(`offer-form-${value.id}`);
            handleOfferQuote(finalData);
            setOfferConfirmDrawerOpen(false);
          }}
          quoteId={value.id}
        />

        {(effectiveQuoteStatus === "Accepted" || effectiveQuoteStatus === "MintingEnabled") &&
          "keyset_id" in value &&
          ebill &&
          !ebillPaidEff &&
          !requestedToPayEff && (
            <RequestToPayConfirmation
              open={requestToPayConfirmDrawerOpen}
              onOpenChange={setRequestToPayConfirmDrawerOpen}
              onSubmit={(deadline) => {
                handleRequestToPay(value.bill.sum, deadline);
                setRequestToPayConfirmDrawerOpen(false);
              }}
              isFetching={isFetching}
              isPending={requestToPayMutation.isPending}
              maturityDate={value.bill.maturity_date}
              billId={value.bill.id}
            />
          )}
      </div>

      {requestedToPayEff && (addressToPay ?? linkToPay) && (
        <PaymentRequestCard
          addressToPay={addressToPay}
          linkToPay={linkToPay}
          effectiveRequestTime={effectiveRequestTime}
          effectiveDeadlineTs={effectiveDeadlineTs}
        />
      )}
    </>
  );
}
