import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDrawer } from "@/components/Drawers"
import { getEbillOptions, getEbillMintCompleteOptions } from "@/generated/client/@tanstack/react-query.gen"
import type { InfoReply, BillWaitingStatePaymentData } from "@/generated/client/types.gen"
import { OfferFormDrawer, type OfferFormResult } from "./components/OfferFormDrawer.tsx"
import { DenyConfirmDrawer } from "./components/DenyConfirmDrawer.tsx"
import { removeItem } from "@/utils/local-storage"
import { PaymentRequestCard } from "./components/PaymentRequestCard.tsx"
import { OfferConfirmation } from "./components/OfferConfirmation.tsx"
import { RequestToPayConfirmation } from "./components/RequestToPayConfirmation.tsx"
import { useQuoteMutations } from "./components/useQuoteMutations.ts"

interface QuoteActionsProps {
  value: InfoReply
  isFetching: boolean
  mintingEnabled: boolean
  ebillPaid: boolean
  requestedToPay: boolean
  paymentDeadlineTs?: number | null
  timeOfRequestToPay?: number | null
}

export function QuoteActions({
  value,
  isFetching,
  mintingEnabled,
  ebillPaid,
  requestedToPay,
  paymentDeadlineTs,
  timeOfRequestToPay,
}: QuoteActionsProps) {
  const billId = value.bill.id
  const quoteStatus = value.status
  const shouldCheckMintComplete = quoteStatus === "Accepted" || quoteStatus === "Minting"

  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: !!billId,
  })

  const mintCompleteQuery = useQuery({
    ...getEbillMintCompleteOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: !!billId && shouldCheckMintComplete,
    refetchInterval: (query) => {
      if (!shouldCheckMintComplete) {
        return false
      }

      const data = query.state.data
      return data?.complete === false ? 60000 : false
    },
  })

  const ebill = ebillQuery.data
  const paymentStatus = ebill?.status.payment
  const cws = ebill?.current_waiting_state

  let waitingPaymentData: BillWaitingStatePaymentData | undefined
  if (cws && "Payment" in cws) {
    waitingPaymentData = cws.Payment.payment_data
  }

  const isMintComplete = mintCompleteQuery.data?.complete ?? false
  const requestedToPayEff = Boolean(requestedToPay || paymentStatus?.requested_to_pay)
  const ebillPaidEff = Boolean((ebillPaid || paymentStatus?.paid) && isMintComplete)
  const effectiveRequestTime =
    timeOfRequestToPay ??
    paymentStatus?.time_of_request_to_pay ??
    waitingPaymentData?.time_of_request ??
    null
  const effectiveDeadlineTs =
    paymentDeadlineTs ??
    paymentStatus?.payment_deadline_timestamp ??
    waitingPaymentData?.payment_deadline ??
    null
  const linkToPay: string | undefined = waitingPaymentData?.mempool_link_for_address_to_pay
  const addressToPay: string | undefined = waitingPaymentData?.address_to_pay

  const [offerFormData, setOfferFormData] = useState<OfferFormResult>()
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false)
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false)
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false)
  const [enableMintingConfirmDrawerOpen, setEnableMintingConfirmDrawerOpen] = useState(false)
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false)

  const {
    denyQuote,
    offerQuote,
    enableMintingMutation,
    requestToPayMutation,
    handleDenyQuote,
    handleOfferQuote,
    handleEnableMinting,
    handleRequestToPay,
  } = useQuoteMutations(value.id, billId)

  return (
    <>
      <div className="flex items-center gap-2">
        {value.status === "Pending" && (
          <DenyConfirmDrawer
            title="Confirm denying quote"
            open={denyConfirmDrawerOpen}
            onOpenChange={setDenyConfirmDrawerOpen}
            onSubmit={() => {
              handleDenyQuote()
              setDenyConfirmDrawerOpen(false)
            }}
          >
            <Button
              className="flex-1 max-w-sm"
              disabled={isFetching || denyQuote.isPending}
              variant="destructive"
            >
              Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
            </Button>
          </DenyConfirmDrawer>
        )}

        {value.status === "Pending" && (
          <OfferFormDrawer
            title="Offer quote"
            description="Make an offer to the current holder of this bill"
            value={value}
            open={offerFormDrawerOpen}
            onOpenChange={setOfferFormDrawerOpen}
            onSubmit={(data) => {
              setOfferFormData(data)
              setOfferConfirmDrawerOpen(true)
              setOfferFormDrawerOpen(false)
            }}
          >
            <Button
              className="flex-1 max-w-sm"
              disabled={isFetching || offerQuote.isPending}
            >
              Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
            </Button>
          </OfferFormDrawer>
        )}

        <OfferConfirmation
          offerFormData={offerFormData}
          open={offerConfirmDrawerOpen}
          onOpenChange={setOfferConfirmDrawerOpen}
          onSubmit={(finalData) => {
            removeItem(`offer-form-${value.id}`)
            handleOfferQuote(finalData)
            setOfferConfirmDrawerOpen(false)
          }}
          maturityDate={value.bill.maturity_date}
        />

        {value.status === "Accepted" && "keyset_id" in value && ebill && !mintingEnabled && (
          <div className="flex-1 max-w-sm">
            <ConfirmDrawer
              title="Confirm enabling minting"
              description="Are you sure you want to enable minting for this quote?"
              open={enableMintingConfirmDrawerOpen}
              onOpenChange={setEnableMintingConfirmDrawerOpen}
              onSubmit={() => {
                handleEnableMinting()
                setEnableMintingConfirmDrawerOpen(false)
              }}
              submitButtonText="Yes, enable minting"
              trigger={
                <Button
                  className="w-full max-w-sm"
                  disabled={isFetching || enableMintingMutation.isPending}
                  variant="default"
                >
                  Enable minting{" "}
                  {enableMintingMutation.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
                </Button>
              }
            />
          </div>
        )}
        {(value.status === "Accepted" || value.status === "Minting") &&
          "keyset_id" in value &&
          ebill &&
          !ebillPaidEff &&
          !requestedToPayEff && (
          <RequestToPayConfirmation
            open={requestToPayConfirmDrawerOpen}
            onOpenChange={setRequestToPayConfirmDrawerOpen}
            onSubmit={(deadline) => {
              handleRequestToPay(value.bill.sum, deadline)
              setRequestToPayConfirmDrawerOpen(false)
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
  )
}
