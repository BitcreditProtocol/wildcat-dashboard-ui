import { PageTitle } from "@/components/PageTitle"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useParams, Link } from "react-router"
import { useQuery, useQueries } from "@tanstack/react-query"
import { listKeysetInfosOptions, listQuotesOptions, getQuoteOptions, listEbillsOptions } from "@/generated/client/@tanstack/react-query.gen"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { BreadcrumbLink } from "@/components/ui/breadcrumb"
import { truncateString } from "@/utils/strings"

function Loader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function PageBody({ keysetId }: { keysetId: string }) {
  const { data: keysets, isLoading: keysetsLoading } = useQuery(listKeysetInfosOptions())
  const { data: allQuotesData, isLoading: quotesLoading } = useQuery(listQuotesOptions())
  const allQuotes = allQuotesData?.quotes ?? []
  const { data: ebills } = useQuery(listEbillsOptions())

  const quoteDetailsQueries = useQueries({
    queries: allQuotes.map((quote) =>
      getQuoteOptions({
        path: { qid: quote.id },
      })
    ),
  })

  if (keysetsLoading) {
    return <Loader />
  }

  const keyset = keysets?.find((k) => k.id === keysetId)

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

  const finalExpiryDate = keyset.final_expiry ? new Date(keyset.final_expiry * 1000).toLocaleDateString() : "No expiry"
  const currencyUnit = typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom

  type EbillType = NonNullable<typeof ebills>[number]
  const billIdToEbillMap = new Map<string, EbillType>()
  if (ebills) {
    for (const ebill of ebills) {
      billIdToEbillMap.set(ebill.id, ebill)
    }
  }

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
          <div className="w-full my-4">
            <Button
              className="w-full"
              size="sm"
              variant="default"
              onClick={() => {
                // TODO: Implement redeem functionality
                console.log("Redeem keyset:", keyset.id)
              }}
            >
              Redeem
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {quotesLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : allQuotes.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">All Quotes ({allQuotes.length})</h4>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-semibold">Quote ID</th>
                      <th className="text-left p-2 font-semibold">Quote status</th>
                      <th className="text-left p-2 font-semibold">Payment status</th>
                      <th className="text-left p-2 font-semibold">Payment address</th>
                      <th className="text-right p-2 font-semibold">Sum</th>
                      <th className="text-right p-2 font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allQuotes.map((quote, index) => {
                      const quoteDetails = quoteDetailsQueries[index]?.data
                      const billId = quoteDetails?.bill?.id
                      const ebill = billId ? billIdToEbillMap.get(billId) : null
                      const isPaid = ebill?.status?.payment?.paid === true

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
                            <Badge variant="outline">{quote.status}</Badge>
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
      <PageTitle>
        Keyset <span className="font-mono">{truncateString(keysetId, 16)}</span>
      </PageTitle>
      <PageBody keysetId={keysetId} />
    </>
  )
}
