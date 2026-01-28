import { PageTitle } from "@/components/PageTitle"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useParams, Link, useLocation } from "react-router"
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  listKeysetInfosOptions,
  listKeysetInfosQueryKey,
  listQuotesOptions,
  listQuotesQueryKey,
  getQuoteOptions,
  listEbillsOptions,
  listEbillsQueryKey,
  postEnableRedemptionMutation,
  getEbillMintCompleteOptions,
} from "@/generated/client/@tanstack/react-query.gen"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { truncateString, formatStatusLabel } from "@/utils/strings"
import { toast } from "sonner"
import { useMemo } from "react"

/**
 * Check if a bill's maturity date matches a keyset's final expiry date
 * @param keysetFinalExpiry - Keyset final expiry timestamp (seconds)
 * @param billMaturityDate - Bill maturity date string (YYYY-MM-DD)
 * @returns true if dates match (year, month, day)
 */
function doesBillMatchKeysetMaturity(keysetFinalExpiry: number, billMaturityDate: string): boolean {
  const keysetDate = new Date(keysetFinalExpiry * 1000)
  const billDate = new Date(billMaturityDate)

  return (
    keysetDate.getFullYear() === billDate.getFullYear() &&
    keysetDate.getMonth() === billDate.getMonth() &&
    keysetDate.getDate() === billDate.getDate()
  )
}

interface LocationState {
  from?: string
}

function Loader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function PageBody({ keysetId }: { keysetId: string }) {
  const queryClient = useQueryClient()
  const { data: keysets, isLoading: keysetsLoading } = useQuery(listKeysetInfosOptions())
  const { data: allQuotesData, isLoading: quotesLoading } = useQuery(listQuotesOptions())
  const allQuotes = useMemo(() => allQuotesData?.quotes ?? [], [allQuotesData?.quotes])
  const { data: ebills } = useQuery(listEbillsOptions())

  const keyset = keysets?.find((k) => k.id === keysetId)

  const redemptionMutation = useMutation({
    ...postEnableRedemptionMutation(),
    onSuccess: () => {
      toast.success("Redemption enabled successfully")
      void queryClient.invalidateQueries({ queryKey: listKeysetInfosQueryKey() })
      void queryClient.invalidateQueries({ queryKey: listEbillsQueryKey() })
      void queryClient.invalidateQueries({ queryKey: listQuotesQueryKey() })
      void queryClient.invalidateQueries({
        queryKey: [{ _id: "getQuote" }],
        exact: false,
      })
      void queryClient.invalidateQueries({
        queryKey: [{ _id: "getEbillMintComplete" }],
        exact: false,
      })
    },
    onError: (error) => {
      toast.error(`Failed to enable redemption: ${error.message}`)
    },
  })

  const quoteDetailsQueries = useQueries({
    queries: allQuotes.map((quote) =>
      getQuoteOptions({
        path: { qid: quote.id },
      })
    ),
  })

  const quoteDetailsLoading = quoteDetailsQueries.some((q) => q.isLoading)

  const quoteDetailsDepsKey = useMemo(() => {
    const billKeys = quoteDetailsQueries.map((query) => {
      const billId = query.data?.bill?.id ?? ''
      const maturityDate = query.data?.bill?.maturity_date ?? ''
      return `${billId}|${maturityDate}`
    })
    return billKeys.join(',')
  }, [
    // eslint-disable-next-line react-hooks/exhaustive-deps
    quoteDetailsQueries.map((q) => q.data?.bill?.id).join(','),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    quoteDetailsQueries.map((q) => q.data?.bill?.maturity_date).join(',')
  ])

  const matchingBillIds = useMemo(() => {
    const billIds: string[] = []

    if (!keyset?.final_expiry || quoteDetailsLoading) {
      return billIds
    }

    const keysetFinalExpiry = keyset.final_expiry

    allQuotes.forEach((_quote, index) => {
      const quoteDetails = quoteDetailsQueries[index]?.data
      const billMaturityDate = quoteDetails?.bill?.maturity_date
      const billId = quoteDetails?.bill?.id

      if (!billMaturityDate || !billId) {
        return
      }

      if (doesBillMatchKeysetMaturity(keysetFinalExpiry, billMaturityDate)) {
        billIds.push(billId)
      }
    })

    return billIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyset?.final_expiry, allQuotes, quoteDetailsDepsKey, quoteDetailsLoading])

  const MINT_COMPLETE_POLL_INTERVAL_MS = 60_000
  const MINT_COMPLETE_RETRY_COUNT = 3
  const MINT_COMPLETE_RETRY_DELAY_MS = 30_000

  const mintCompleteQueries = useQueries({
    queries: matchingBillIds.map((billId) => ({
      ...getEbillMintCompleteOptions({
        path: { bid: billId },
      }),
      refetchInterval: (query: { state: { data?: { complete?: boolean }; error?: unknown } }) => {
        if (query.state.error) return false
        return query.state.data?.complete === false ? MINT_COMPLETE_POLL_INTERVAL_MS : false
      },
      retry: MINT_COMPLETE_RETRY_COUNT,
      retryDelay: MINT_COMPLETE_RETRY_DELAY_MS,
      refetchOnWindowFocus: false,
    })),
  })

  const allBillsPaid = matchingBillIds.length > 0 && matchingBillIds.every((billId) => {
    const ebill = ebills?.find((e) => e.id === billId)
    return ebill?.status?.payment?.paid === true
  })

  const allMintComplete = matchingBillIds.length > 0 &&
    mintCompleteQueries.every((query) => query.data?.complete === true)

  const canEnableRedemption = allBillsPaid && allMintComplete
  const anyMintCompleteLoading = mintCompleteQueries.some((query) => query.isLoading)

  const hasNoMatchingBills = matchingBillIds.length === 0

  if (keysetsLoading) {
    return <Loader />
  }

  if (!keyset) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Keyset not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const finalExpiryDate = keyset.final_expiry
    ? new Date(keyset.final_expiry * 1000).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
    : "No expiry"
  const currencyUnit = typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom

  type EbillType = NonNullable<typeof ebills>[number]
  const billIdToEbillMap = new Map<string, EbillType>()
  if (ebills) {
    for (const ebill of ebills) {
      billIdToEbillMap.set(ebill.id, ebill)
    }
  }

  const matchingQuotes = allQuotes.filter((_quote, index) => {
    const quoteDetails = quoteDetailsQueries[index]?.data
    const billMaturityDate = quoteDetails?.bill?.maturity_date

    if (!keyset.final_expiry || !billMaturityDate) {
      return false
    }

    return doesBillMatchKeysetMaturity(keyset.final_expiry, billMaturityDate)
  })

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-mono text-sm">{keyset.id}</CardTitle>
              <CardDescription className="mt-1">
                Currency: {currencyUnit} | Maturity date: {finalExpiryDate}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <Badge variant={keyset.active ? "default" : "secondary"}>{keyset.active ? "Active" : "Inactive"}</Badge>
            </div>
          </div>
          {keyset.active && (
            <div className="w-full my-4">
              <Button
                className="w-full max-w-sm"
                size="sm"
                variant="default"
                disabled={redemptionMutation.isPending || !canEnableRedemption || anyMintCompleteLoading || hasNoMatchingBills}
                onClick={() => {
                  redemptionMutation.mutate({
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
                    body: { kid: keyset.id as any },
                  })
                }}
              >
                {redemptionMutation.isPending
                  ? "Enabling redemption..."
                  : hasNoMatchingBills
                  ? "No matching bills found"
                  : !allBillsPaid
                  ? "Waiting for e-bill payments..."
                  : anyMintCompleteLoading
                  ? "Checking mint status..."
                  : !allMintComplete
                  ? "Waiting for mint completion..."
                  : "Redeem"}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : matchingQuotes.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">All quotes ({matchingQuotes.length})</h4>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-semibold">Quote ID</th>
                      <th className="text-left p-2 font-semibold">Quote status</th>
                      <th className="text-left p-2 font-semibold">Payment status</th>
                      <th className="text-left p-2 font-semibold">Mint status</th>
                      <th className="text-left p-2 font-semibold">Payment address</th>
                      <th className="text-right p-2 font-semibold">Sum</th>
                      <th className="text-right p-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingQuotes.map((quote) => {
                      const quoteIndex = allQuotes.findIndex((q) => q.id === quote.id)
                      const quoteDetails = quoteDetailsQueries[quoteIndex]?.data
                      const billId = quoteDetails?.bill?.id
                      const ebill = billId ? billIdToEbillMap.get(billId) : null
                      const isPaid = ebill?.status?.payment?.paid === true

                      const billIdIndex = billId ? matchingBillIds.indexOf(billId) : -1
                      const mintCompleteQuery = billId && billIdIndex >= 0 ? mintCompleteQueries[billIdIndex] : null
                      const isMintComplete = mintCompleteQuery?.data?.complete === true
                      const isMintLoading = mintCompleteQuery?.isLoading

                      const cws = ebill?.current_waiting_state
                      let paymentAddress: string | undefined
                      if (cws && "Payment" in cws) {
                        paymentAddress = cws.Payment.payment_data?.address_to_pay
                      }

                      return (
                        <tr key={quote.id} className="border-t hover:bg-gray-50">
                          <td className="p-2 font-mono">
                            <Link
                              to={{ pathname: `/quotes/${quote.id}` }}
                              state={{ from: `/keysets/${keysetId}` }}
                              className="text-blue-600 hover:underline"
                            >
                              {truncateString(quote.id, 16)}
                            </Link>
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">{formatStatusLabel(quote.status)}</Badge>
                          </td>
                          <td className="p-2">
                            {ebill ? (
                              <Badge
                                variant="outline"
                                className={
                                  isPaid
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-orange-50 text-orange-700 border-orange-200"
                                }
                              >
                                {isPaid ? "Paid" : "Unpaid"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </td>
                          <td className="p-2">
                            {isMintLoading ? (
                              <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                                Checking...
                              </Badge>
                            ) : billId && mintCompleteQuery ? (
                              <Badge
                                variant="outline"
                                className={
                                  isMintComplete
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                }
                              >
                                {isMintComplete ? "Complete" : "Pending"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">N/A</span>
                            )}
                          </td>
                          <td className="p-2 font-mono text-xs break-all">
                            {paymentAddress ?? (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </td>
                          <td className="p-2 text-right">{quote.sum} sat</td>
                          <td className="p-2 text-right">
                            <Link
                              to={{ pathname: `/quotes/${quote.id}` }}
                              state={{ from: `/keysets/${keysetId}` }}
                              className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No quotes available</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function KeysetDetailPage() {
  const { keysetId } = useParams<{ keysetId: string }>()
  const location = useLocation()
  const state = location.state as LocationState | null
  const fromPath = state?.from
  const fromQuote = fromPath?.startsWith("/quotes/")
  const quoteId = fromQuote && fromPath ? fromPath.split("/quotes/")[1] : null

  if (!keysetId) {
    return (
      <div className="p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Invalid keyset ID</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <Breadcrumbs
        parents={[
          <BreadcrumbLink key="keysets" asChild>
            <Link to="/keysets">Keysets</Link>
          </BreadcrumbLink>,
        ]}
      >
        {keysetId}
      </Breadcrumbs>
      <div className="flex items-center justify-between">
        <PageTitle>
          Keyset <span className="font-mono">{truncateString(keysetId, 16)}</span>
        </PageTitle>
        {fromQuote && quoteId && (
          <Button variant="outline" size="sm" asChild>
            <Link to={`/quotes/${quoteId}`} state={{ from: `/keysets/${keysetId}` }}>
              Back to quote <span className="font-mono">{truncateString(quoteId, 16)}</span>
            </Link>
          </Button>
        )}
      </div>
      <PageBody keysetId={keysetId} />
    </>
  )
}
