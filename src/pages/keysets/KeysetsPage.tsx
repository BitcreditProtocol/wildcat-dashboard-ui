import { PageTitle } from "@/components/PageTitle"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { useQuery } from "@tanstack/react-query"
import { listKeysetInfosOptions } from "@/generated/client/@tanstack/react-query.gen"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Link } from "react-router"

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

  if (keysetsLoading) {
    return <Loader />
  }

  if (!keysets || keysets.length === 0) {
    return <div className="p-4 text-muted-foreground">No keysets found</div>
  }

  return (
    <div className="space-y-4">
      {keysets.map((keyset) => {
        const finalExpiryDate = keyset.final_expiry ? new Date(keyset.final_expiry * 1000).toLocaleDateString() : "No expiry"
        const currencyUnit = typeof keyset.unit === "string" ? keyset.unit : keyset.unit.Custom

        return (
          <Card key={keyset.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <Link to={`/keysets/${keyset.id}`} className="block">
                    <CardTitle className="font-mono text-sm">{keyset.id}</CardTitle>
                  </Link>
                  <CardDescription className="mt-1">
                    Currency: {currencyUnit} | Maturity date: {finalExpiryDate}
                  </CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant={keyset.active ? "default" : "secondary"}>
                    {keyset.active ? "Active" : "Inactive"}
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
