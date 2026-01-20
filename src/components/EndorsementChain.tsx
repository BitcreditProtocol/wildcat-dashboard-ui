import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Clock, CheckCircle2, PencilLine, AlertTriangle, XCircle, Coins, DollarSign } from "lucide-react"
import type { Endorsement, LightBillParticipant } from "@/generated/client/types.gen"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TruncatedTextPopover } from "@/components/TruncatedTextPopover"

interface EndorsementChainProps {
  endorsements?: Endorsement[]
  isLoading?: boolean
  issueDate?: string
  maturityDate?: string
  mintingEnabled?: boolean
  quoteOffered?: boolean
}

function LightParticipantInfo({ participant }: { participant: LightBillParticipant }) {
  if ("Anon" in participant) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">Bearer</span>
        <TruncatedTextPopover
          text={participant.Anon.node_id}
          maxLength={64}
          className="font-mono text-xs text-muted-foreground"
        />
      </div>
    )
  } else if ("Ident" in participant) {
    return (
      <div className="flex flex-col gap-0.5">
        <TruncatedTextPopover
          text={participant.Ident.name}
          maxLength={50}
          className="font-medium text-sm"
        />
        {participant.Ident.city && participant.Ident.country && (
          <TruncatedTextPopover
            text={`${participant.Ident.city}, ${participant.Ident.country}`}
            maxLength={40}
            className="text-xs text-muted-foreground"
          />
        )}
      </div>
    )
  }
  return null
}

interface HistoryEvent {
  type: "issue" | "offered" | "endorsement" | "requestToPay" | "payment" | "acceptance" | "rejection" | "minting"
  timestamp?: number
  data: Endorsement | null
  label?: string
  details?: string
}

const EVENT_CONFIG = {
  issue: {
    icon: PencilLine,
    color: "text-blue-500",
    label: "Bill issued",
  },
  offered: {
    icon: CheckCircle2,
    color: "text-blue-500",
    label: "Quote offered",
  },
  acceptance: {
    icon: CheckCircle2,
    color: "text-green-500",
    label: "Bill accepted",
  },
  rejection: {
    icon: XCircle,
    color: "text-red-500",
    label: "Bill rejected",
  },
  endorsement: {
    icon: CheckCircle2,
    color: "text-green-500",
    label: "Bill endorsed",
  },
  minting: {
    icon: Coins,
    color: "text-purple-500",
    label: "Minting enabled",
  },
  requestToPay: {
    icon: AlertTriangle,
    color: "text-orange-500",
    label: "Request to pay",
  },
  payment: {
    icon: DollarSign,
    color: "text-green-600",
    label: "Payment received",
  },
} as const

export function EndorsementChain({
  endorsements,
  isLoading,
  issueDate,
  maturityDate,
  requestToPayTimestamp,
  paymentTimestamp,
  acceptanceTimestamp,
  rejectionTimestamp,
  mintingTimestamp,
  mintingEnabled,
  quoteOffered,
  offeredTimestamp,
}: EndorsementChainProps & {
  requestToPayTimestamp?: number
  paymentTimestamp?: number
  acceptanceTimestamp?: number
  rejectionTimestamp?: number
  mintingTimestamp?: number
  offeredTimestamp?: number
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bill History</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const events: HistoryEvent[] = []

  if (issueDate) {
    const issueTimestamp = new Date(issueDate).getTime() / 1000
    events.push({
      type: "issue",
      timestamp: issueTimestamp,
      data: null
    })
  }

  if (offeredTimestamp !== undefined) {
    events.push({
      type: "offered",
      timestamp: offeredTimestamp,
      data: null,
      label: "Quote offered"
    })
  } else if (quoteOffered) {
    events.push({
      type: "offered",
      timestamp: undefined,
      data: null,
      label: "Quote offered"
    })
  }

  if (endorsements) {
    endorsements.forEach(endorsement => {
      events.push({
        type: "endorsement",
        timestamp: endorsement.signing_timestamp,
        data: endorsement
      })
    })
  }

  if (requestToPayTimestamp) {
    events.push({
      type: "requestToPay",
      timestamp: requestToPayTimestamp,
      data: null,
      label: "Request to pay"
    })
  }

  if (paymentTimestamp) {
    events.push({
      type: "payment",
      timestamp: paymentTimestamp,
      data: null,
      label: "Payment received"
    })
  }

  if (acceptanceTimestamp) {
    events.push({
      type: "acceptance",
      timestamp: acceptanceTimestamp,
      data: null,
      label: "Bill accepted"
    })
  }

  if (rejectionTimestamp) {
    events.push({
      type: "rejection",
      timestamp: rejectionTimestamp,
      data: null,
      label: "Bill rejected"
    })
  }

  if (mintingTimestamp !== undefined) {
    events.push({
      type: "minting",
      timestamp: mintingTimestamp,
      data: null,
      label: "Minting enabled"
    })
  } else if (mintingEnabled) {
    events.push({
      type: "minting",
      timestamp: undefined,
      data: null,
      label: "Minting enabled"
    })
  }

  const typePriority: Record<HistoryEvent["type"], number> = {
    issue: 0,
    offered: 1,
    acceptance: 2,
    rejection: 2,
    endorsement: 3,
    minting: 4,
    requestToPay: 5,
    payment: 6,
  }

  events.sort((a, b) => {
    return typePriority[b.type] - typePriority[a.type]
  })

  const eventCount = events.length

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Bill history</CardTitle>
            <span className="text-sm text-muted-foreground">({eventCount} event{eventCount !== 1 ? 's' : ''})</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 px-2 py-0 gap-1">
            <span className="text-xs text-muted-foreground">{isExpanded ? "Hide history" : "Show history"}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No history events available
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((event, index) => {
                const config = EVENT_CONFIG[event.type]
                const Icon = config.icon
                const displayLabel = event.label ?? config.label

                return (
                  <div key={index}>
                    <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg">
                      {/* Event Header */}
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-sm font-semibold">{displayLabel}</span>
                      </div>

                      {/* Timestamp */}
                      {event.timestamp !== undefined && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(event.timestamp * 1000).toLocaleString()}</span>
                        </div>
                      )}

                      {/* Event-specific content */}
                      {event.type === "issue" && maturityDate && (
                        <div className="text-xs text-muted-foreground">
                          <span className="font-semibold">Maturity date: </span>
                          {maturityDate}
                        </div>
                      )}

                      {event.type === "endorsement" && event.data && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">Signed by</div>
                              <LightParticipantInfo participant={event.data.signed.data} />
                              {event.data.signed.signatory && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  <div>Signatory:</div>
                                  <TruncatedTextPopover
                                    text={event.data.signed.signatory.name}
                                    maxLength={40}
                                    className="inline"
                                  />
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">Endorsed to</div>
                              <LightParticipantInfo participant={event.data.pay_to_the_order_of} />
                            </div>
                          </div>

                          {event.data.signing_address && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <div className="font-semibold">Location: </div>
                              <TruncatedTextPopover
                                text={[
                                  event.data.signing_address.address,
                                  event.data.signing_address.city,
                                  event.data.signing_address.country
                                ].filter(Boolean).join(", ")}
                                maxLength={50}
                                className="inline"
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {index < events.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
