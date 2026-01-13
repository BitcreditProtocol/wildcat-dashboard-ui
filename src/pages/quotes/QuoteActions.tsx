import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import Big from "big.js"
import { LoaderIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ConfirmDrawer } from "@/components/Drawers"
import { humanReadableDuration } from "@/utils/dates"
import {
  updateQuoteMutation,
  postEnableQuoteMintingMutation,
  postEbillReqtopayMutation,
  getQuoteOptions,
} from "@/generated/client/@tanstack/react-query.gen"
import type { InfoReply, PostEbillReqtopayResponse } from "@/generated/client/types.gen"
import { OfferFormDrawer, type OfferFormResult } from "./OfferFormDrawer"
import { DenyConfirmDrawer } from "./DenyConfirmDrawer"

interface QuoteActionsProps {
  value: InfoReply
  isFetching: boolean
  mintingEnabled: boolean
  ebillPaid: boolean
  requestedToPay: boolean
}

export function QuoteActions({
  value,
  isFetching,
  mintingEnabled,
  ebillPaid,
  requestedToPay,
}: QuoteActionsProps) {
  const [offerFormData, setOfferFormData] = useState<OfferFormResult>()
  const [offerFormDrawerOpen, setOfferFormDrawerOpen] = useState(false)
  const [offerConfirmDrawerOpen, setOfferConfirmDrawerOpen] = useState(false)
  const [denyConfirmDrawerOpen, setDenyConfirmDrawerOpen] = useState(false)
  const [enableMintingConfirmDrawerOpen, setEnableMintingConfirmDrawerOpen] = useState(false)
  const [requestToPayConfirmDrawerOpen, setRequestToPayConfirmDrawerOpen] = useState(false)
  const [payRequestResponse, setPayRequestResponse] = useState<PostEbillReqtopayResponse | null>(null)

  const effectiveDiscount = useMemo(() => {
    if (!offerFormData) return
    console.table(offerFormData)
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
          onOpenChange={setOfferConfirmDrawerOpen}
          onSubmit={() => {
            if (!offerFormData) return
            onOfferQuote(offerFormData)
            setOfferConfirmDrawerOpen(false)
          }}
        >
          <div className="flex flex-col justify-center gap-1 py-8 mb-8">
            <span>
              <span className="font-bold">Effective discount (relative):</span>{" "}
              {effectiveDiscount?.mul(new Big("100")).toFixed(2)}%
            </span>
            <span>
              <span className="font-bold">Effective discount (absolute):</span>{" "}
              {offerFormData?.discount.gross.value.minus(offerFormData?.discount.net.value).toFixed(0)}{" "}
              {offerFormData?.discount.net.currency}
            </span>
            <span>
              <span className="font-bold">Net amount:</span> {offerFormData?.discount.net.value.round(0).toFixed(0)}{" "}
              {offerFormData?.discount.net.currency}
            </span>
            <span>
              <span className="font-bold">Valid until:</span> {offerFormData?.ttl.ttl.toDateString()} (
              {offerFormData && humanReadableDuration("en", offerFormData.ttl.ttl)})
            </span>
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

        {value.status === "Accepted" && "keyset_id" in value && !ebillPaid && !requestedToPay ? (
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

      {payRequestResponse && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold mb-2">Payment Request</h3>
          <div className="space-y-2">
            <div>
              <span className="font-bold">ID</span>
              <span className="font-mono ml-2">{payRequestResponse.request_id}</span>
            </div>
            <div>
              <span className="font-bold">Details</span>
              <div className="font-mono text-sm mt-1 p-2 bg-white rounded border break-all">
                {payRequestResponse.request}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
