import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import Big from "big.js"
import { LoaderIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDrawer } from "@/components/Drawers"
import { humanReadableDuration } from "@/utils/dates"
import { Calendar } from "@/components/ui/calendar"
import { addDays } from "date-fns"
import {
  updateQuoteMutation,
  postEnableQuoteMintingMutation,
  postEbillReqtopayMutation,
  getQuoteOptions,
  getEbillOptions,
} from "@/generated/client/@tanstack/react-query.gen"
import type { InfoReply, PostEbillReqtopayResponse, BillWaitingStatePaymentData } from "@/generated/client/types.gen"
import { OfferFormDrawer, type OfferFormResult } from "./OfferFormDrawer"
import { DenyConfirmDrawer } from "./DenyConfirmDrawer"
import { removeItem } from "@/utils/local-storage"

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
  const ebillQuery = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    retry: 1,
    enabled: !!billId,
  })
  const ebill = ebillQuery.data
  const paymentStatus = ebill?.status.payment
  const cws = ebill?.current_waiting_state
  let waitingPaymentData: BillWaitingStatePaymentData | undefined
  if (cws && "Payment" in cws) {
    waitingPaymentData = cws.Payment.payment_data
  }

  const requestedToPayEff = Boolean(requestedToPay || paymentStatus?.requested_to_pay)
  const ebillPaidEff = Boolean(ebillPaid || paymentStatus?.paid)
  const effectiveRequestTime = timeOfRequestToPay ?? paymentStatus?.time_of_request_to_pay ?? waitingPaymentData?.time_of_request ?? null
  const effectiveDeadlineTs = paymentDeadlineTs ?? paymentStatus?.payment_deadline_timestamp ?? waitingPaymentData?.payment_deadline ?? null
  const rawLinkToPay = waitingPaymentData?.link_to_pay
  const linkToPay: string | undefined = rawLinkToPay
    ? rawLinkToPay.split('&')[0]
    : undefined
  const addressToPay: string | undefined = waitingPaymentData?.address_to_pay
  // const mempoolLink: string | undefined = waitingPaymentData?.mempool_link_for_address_to_pay
  // const hasPayRef = linkToPay ?? addressToPay

  const [offerFormData, setOfferFormData] = useState<OfferFormResult>()
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false)
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false)
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false)
  const [enableMintingConfirmDrawerOpen, setEnableMintingConfirmDrawerOpen] = useState(false)
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false)
  const [payRequestResponse, setPayRequestResponse] = useState<PostEbillReqtopayResponse | null>(null)
  const [validUntilDate, setValidUntilDate] = useState<Date | undefined>(undefined)

  const effectiveDiscount = useMemo(() => {
    if (!offerFormData) {
      return
    }
    // console.table(offerFormData)
    return new Big(1).minus(offerFormData.discount.net.value.div(offerFormData.discount.gross.value))
  }, [offerFormData])

  const queryClient = useQueryClient()

  const denyQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-deny`)
    },
    onError: (error) => {
      toast.error("Error while denying quote: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Quote has been denied.")
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({
          path: {
            qid: value.id,
          },
        }).queryKey,
      })
    },
  })

  const offerQuote = useMutation({
    ...updateQuoteMutation(),
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-offer`)
    },
    onError: (error) => {
      toast.error("Error while offering quote: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Quote has been offered.")
      void queryClient.invalidateQueries({
        queryKey: getQuoteOptions({
          path: {
            qid: value.id,
          },
        }).queryKey,
      })
    },
  })

  const enableMintingMutation = useMutation({
    ...postEnableQuoteMintingMutation(),
    onMutate: () => {
      toast.loading("Enabling minting…", { id: `quote-${value.id}-enable-minting` })
    },
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-enable-minting`)
    },
    onError: (error) => {
      toast.error("Error while enabling minting: " + error.message)
      console.warn(error)
    },
    onSuccess: () => {
      toast.success("Minting has been enabled.")
      void queryClient.invalidateQueries()
    },
  })

  const requestToPayMutation = useMutation({
    ...postEbillReqtopayMutation(),
    onMutate: () => {
      toast.loading("Requesting to pay…", { id: `quote-${value.id}-request-to-pay` })
    },
    onSettled: () => {
      toast.dismiss(`quote-${value.id}-request-to-pay`)
    },
    onError: (error) => {
      toast.error("Error while requesting to pay")
      console.warn(error)
    },
    onSuccess: (data) => {
      toast.success("Payment request has been created.")
      setPayRequestResponse(data)
      void queryClient.invalidateQueries({
        queryKey: ["bill_id", value.bill.id],
      })
    },
  })

  const onDenyQuote = () => {
    toast.loading("Denying quote…", { id: `quote-${value.id}-deny` })
    denyQuote.mutate({
      path: {
        qid: value.id,
      },
      body: {
        action: "Deny",
      },
    })
  }

  const onOfferQuote = (result: OfferFormResult) => {
    toast.loading("Offering quote…", { id: `quote-${value.id}-offer` })

    const net_amount = result.discount.net.value.round(0, Big.roundDown).toNumber()

    offerQuote.mutate({
      path: {
        qid: value.id,
      },
      body: {
        action: "Offer",
        discounted: net_amount,
        ttl: result.ttl.ttl.toISOString(),
      },
    })
  }

  const onEnableMinting = () => {
    enableMintingMutation.mutate({
      path: {
        qid: value.id,
      },
    })
  }

  const onRequestToPay = () => {
    const deadlineDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    const deadlineString = deadlineDate.toISOString()

    requestToPayMutation.mutate({
      body: {
        ebill_id: value.bill.id,
        amount: value.bill.sum,
        deadline: deadlineString,
      },
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {value.status === "Pending" ? (
          <DenyConfirmDrawer
            title="Confirm denying quote"
            open={denyConfirmDrawerOpen}
            onOpenChange={setDenyConfirmDrawerOpen}
            onSubmit={() => {
              onDenyQuote()
              setDenyConfirmDrawerOpen(false)
            }}
          >
            <Button
              className="flex-1"
              disabled={isFetching || denyQuote.isPending || value.status !== "Pending"}
              variant={value.status !== "Pending" ? "outline" : "destructive"}
            >
              Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
            </Button>
          </DenyConfirmDrawer>
        ) : (
          <></>
        )}
        {value.status === "Pending" ? (
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
            <Button className="flex-1" disabled={isFetching || offerQuote.isPending || value.status !== "Pending"}>
              Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
            </Button>
          </OfferFormDrawer>
        ) : (
          <></>
        )}

        <ConfirmDrawer
          title="Confirm offering quote"
          description="Review your inputs and confirm the offer"
          open={offerConfirmDrawerOpen}
          onOpenChange={(open) => {
            setOfferConfirmDrawerOpen(open)
            if (open && offerFormData) {
              setValidUntilDate(offerFormData.ttl.ttl)
            }
          }}
          onSubmit={() => {
            if (!offerFormData) {
              return
            }
            removeItem(`offer-form-${value.id}`)

            const finalOfferData = validUntilDate
              ? {
                  ...offerFormData,
                  ttl: { ttl: validUntilDate },
                }
              : offerFormData

            onOfferQuote(finalOfferData)
            setOfferConfirmDrawerOpen(false)
          }}
        >
          <div className="flex flex-col justify-center gap-1 px-4 py-8">
            <div className="flex justify-between items-center">
              <span className="font-bold">Effective discount (relative):</span>
              <span className="text-right">{effectiveDiscount?.mul(new Big("100")).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">Effective discount (absolute):</span>
              <span className="text-right">
                {offerFormData?.discount.gross.value.minus(offerFormData?.discount.net.value).toFixed(0)}{" "}
                {offerFormData?.discount.net.currency}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">Net amount:</span>
              <span className="text-right">
                {offerFormData?.discount.net.value.round(0).toFixed(0)} {offerFormData?.discount.net.currency}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Valid until:</span>
                <span className="text-right">
                  {validUntilDate?.toDateString() ?? offerFormData?.ttl.ttl.toDateString()} (
                  {validUntilDate && humanReadableDuration("en", validUntilDate)})
                </span>
              </div>
              <div className="flex justify-center rounded-md border">
                <Calendar
                  mode="single"
                  selected={validUntilDate ?? offerFormData?.ttl.ttl}
                  onSelect={(day) => setValidUntilDate(day)}
                  disabled={{ before: addDays(new Date(Date.now()), 1) }}
                />
              </div>
            </div>
          </div>
        </ConfirmDrawer>

        {value.status === "Accepted" && "keyset_id" in value ? (
          <ConfirmDrawer
            title="Confirm enabling minting"
            description="Are you sure you want to enable minting for this quote?"
            open={enableMintingConfirmDrawerOpen}
            onOpenChange={setEnableMintingConfirmDrawerOpen}
            onSubmit={() => {
              onEnableMinting()
              setEnableMintingConfirmDrawerOpen(false)
            }}
            submitButtonText="Yes, enable minting"
            trigger={
              <Button
                className="flex-1"
                disabled={isFetching || enableMintingMutation.isPending || mintingEnabled}
                variant="default"
              >
                Enable Minting {enableMintingMutation.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
              </Button>
            }
          />
        ) : (
          <></>
        )}

        {value.status === "Accepted" &&
        "keyset_id" in value &&
        !ebillPaidEff &&
        !requestedToPayEff &&
        !payRequestResponse ? (
          <ConfirmDrawer
            title="Confirm requesting to pay"
            description="Are you sure you want to request to pay this e-bill?"
            open={requestToPayConfirmDrawerOpen}
            onOpenChange={setRequestToPayConfirmDrawerOpen}
            onSubmit={() => {
              onRequestToPay()
              setRequestToPayConfirmDrawerOpen(false)
            }}
            submitButtonText="Yes, request to pay"
            trigger={
              <Button className="flex-1" disabled={isFetching || requestToPayMutation.isPending} variant="default">
                Request to Pay {requestToPayMutation.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
              </Button>
            }
          />
        ) : (
          <></>
        )}
      </div>

      {((payRequestResponse ?? requestedToPayEff) || requestedToPayEff) && !ebillPaidEff && (
        <div className="mt-4 p-4 bg-white rounded border">
          <h2 className="text-2xl font-extrabold tracking-tight mb-3">Payment Request</h2>
          <div className="space-y-1">
            {payRequestResponse && (
              <>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-32">ID</span>
                  <span className="font-mono text-sm">{payRequestResponse.request_id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold w-32">Details</span>
                  <span className="font-mono text-sm break-all">{payRequestResponse.request}</span>
                </div>
              </>
            )}
            {!payRequestResponse && addressToPay && (
              <div className="flex items-center gap-2">
                <span className="font-bold w-32">ID</span>
                <span className="font-mono text-sm">{addressToPay}</span>
              </div>
            )}
            {!payRequestResponse && linkToPay && (
              <div className="flex items-center gap-2">
                <span className="font-bold w-32">Details</span>
                <span className="font-mono text-sm">{linkToPay}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="font-bold w-32">Requested at</span>
              <span className="text-sm">
                {effectiveRequestTime ? new Date(effectiveRequestTime * 1000).toLocaleString() : "Unknown"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold w-32">Deadline</span>
              <span className="text-sm">
                {effectiveDeadlineTs ? new Date(effectiveDeadlineTs * 1000).toLocaleString() : "Unknown"}
              </span>
            </div>
            {/* TODO mempool & qr code
            {hasPayRef && (
              <div className="flex items-center gap-2">
                <span className="font-bold w-32">Pay</span>
                <span className="text-sm break-all">
                  {linkToPay ? (
                    <a className="underline" href={linkToPay} target="_blank" rel="noreferrer">
                      {linkToPay}
                    </a>
                  ) : (
                    addressToPay
                  )}
                  {mempoolLink && (
                    <>
                      {" "}
                      <a className="underline" href={mempoolLink} target="_blank" rel="noreferrer">
                        mempool
                      </a>
                    </>
                  )}
                </span>
              </div>
            )}
            */}
          </div>
        </div>
      )}
    </>
  )
}
