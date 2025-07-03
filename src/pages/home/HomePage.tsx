import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { identityDetail } from "@/generated/client/sdk.gen"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const { data } = useSuspenseQuery({
    queryKey: ["identity-detail"],
    queryFn: async () => {
      const response = await identityDetail()
      return response.data ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
  })

  if (!data) {
    return (
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <div className="text-center text-muted-foreground">No identity found</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Name</span>
            <span className="font-semibold text-base">{data.name}</span>
          </div>
          {data.email && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Email</span>
              <span className="font-mono text-sm text-muted-foreground">{data.email}</span>
            </div>
          )}
          {data.date_of_birth && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Date of Birth</span>
              <span className="text-sm">{data.date_of_birth}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-card text-card-foreground rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Keys</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Node ID</span>
            <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
              {data.node_id}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Bitcoin Public Key
            </span>
            <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
              {data.bitcoin_public_key}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Nostr Public Key</span>
            <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">{data.npub}</span>
          </div>
        </div>
      </div>

      {data.postal_address && (
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Address</h3>
          <div className="flex flex-col gap-1">
            <div className="text-sm leading-relaxed">
              <div className="font-medium">{data.postal_address.address}</div>
              <div className="text-muted-foreground">
                {data.postal_address.city}
                {data.postal_address.zip && `, ${data.postal_address.zip}`}
              </div>
              <div className="text-muted-foreground">{data.postal_address.country}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <>
      <PageTitle>Home</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
