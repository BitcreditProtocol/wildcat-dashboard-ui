import { PageTitle } from "@/components/PageTitle"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useQuery } from "@tanstack/react-query"
import { listKeysetInfosOptions } from "@/generated/client/@tanstack/react-query.gen"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"
import { useState } from "react"
import SearchComponent, { HighlightText } from "@/components/ui/search"
import { ArrowUp, ArrowDown } from "lucide-react"

function Loader() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}

function PageBody() {
  const { data: keysets, isLoading: keysetsLoading } = useQuery(listKeysetInfosOptions())
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"expired-first" | "date-order">("expired-first")

  if (keysetsLoading) {
    return <Loader />
  }

  if (!keysets || keysets.length === 0) {
    return <div className="p-4 text-muted-foreground">No keysets found</div>
  }

  const filteredKeysets = keysets.filter((keyset) => {
    if (!searchQuery) {
      return true
    }

    const query = searchQuery.toLowerCase()
    const keysetId = keyset.id.toLowerCase()
    const currencyUnit = (typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom).toLowerCase()
    const finalExpiryDate = keyset.final_expiry
      ? new Date(keyset.final_expiry * 1000).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3").toLowerCase()
      : "no expiry"
    const status = keyset.active ? "active" : "inactive"

    return (
      keysetId.includes(query) ||
      currencyUnit.includes(query) ||
      finalExpiryDate.includes(query) ||
      status.includes(query)
    )
  })

  const sortedKeysets = [...filteredKeysets].sort((a, b) => {
    const aExpiry = a.final_expiry ? new Date(a.final_expiry * 1000) : null
    const bExpiry = b.final_expiry ? new Date(b.final_expiry * 1000) : null

    if (!aExpiry && !bExpiry) {
      return 0
    }
    if (!aExpiry) {
      return sortBy === "expired-first" ? 1 : -1
    }
    if (!bExpiry) {
      return sortBy === "expired-first" ? -1 : 1
    }

    if (sortBy === "expired-first") {
      const now = new Date()
      const aIsExpired = aExpiry < now
      const bIsExpired = bExpiry < now

      if (aIsExpired && !bIsExpired) {
        return -1
      }
      if (!aIsExpired && bIsExpired) {
        return 1
      }

      return aExpiry.getTime() - bExpiry.getTime()
    } else {
      return bExpiry.getTime() - aExpiry.getTime()
    }
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center justify-between">
        <SearchComponent
          value={searchQuery}
          className="flex-1 max-w-md"
          placeholder="Search by keyset ID, currency, maturity date, or status..."
          onSearch={setSearchQuery}
          onChange={setSearchQuery}
          size="sm"
        />
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSortBy(sortBy === "expired-first" ? "date-order" : "expired-first")}
            title={sortBy === "expired-first" ? "Expired First" : "Date Order"}
            className="flex items-center gap-1"
          >
            {sortBy === "expired-first" ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {sortedKeysets.length === 0 ? (
        <div className="p-4 text-muted-foreground text-center">
          No keysets match your search criteria
        </div>
      ) : (
        <>
          {sortedKeysets.map((keyset) => {
            const finalExpiryDate = keyset.final_expiry
              ? new Date(keyset.final_expiry * 1000).toLocaleDateString("en-US", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).replace(/(\d{2}) (\w{3}), (\d{4})/, "$1. $2. $3")
              : "No expiry"
            const currencyUnit = typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom
            const statusText = keyset.active ? "Active" : "Inactive"

            return (
              <Card key={keyset.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <Link to={`/keysets/${keyset.id}`} className="block">
                        <CardTitle className="font-mono text-sm">
                          <HighlightText text={keyset.id} highlight={searchQuery} />
                        </CardTitle>
                      </Link>
                      <CardDescription className="mt-1">
                        Currency: <HighlightText text={currencyUnit} highlight={searchQuery} /> | Maturity date: <HighlightText text={finalExpiryDate} highlight={searchQuery} />
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant={keyset.active ? "default" : "secondary"}>
                        <HighlightText text={statusText} highlight={searchQuery} />
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Button size="sm" variant="default" asChild>
                    <Link to={`/keysets/${keyset.id}`}>View</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </>
      )}
    </div>
  )
}

export default function KeysetsPage() {
  return (
    <>
      <Breadcrumbs>Keysets</Breadcrumbs>
      <PageTitle>Keysets</PageTitle>
      <PageBody />
    </>
  )
}
