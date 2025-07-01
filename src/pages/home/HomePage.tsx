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
      return response.data
    },
    staleTime: Infinity, // Data won't change
    gcTime: Infinity,
  })

  return (
    <>
      <div className="flex flex-col gap-2 bg-accent text-accent-foreground rounded-lg p-4 my-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Name</span>
          <span className="font-bold">{data.name}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Email</span>
          <span className="font-mono text-sm">{data.email}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Node ID</span>
          <span className="font-mono text-sm break-all">{data.node_id}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Bitcoin Public Key</span>
          <span className="font-mono text-sm break-all">{data.bitcoin_public_key}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Nostr Public Key</span>
          <span className="font-mono text-sm break-all">{data.npub}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Date of Birth</span>
          <span className="text-sm">{data.date_of_birth}</span>
        </div>

        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-accent-foreground/50 uppercase tracking-wide">Address</span>
          <div className="text-sm">
            <div>{data.postal_address.address}</div>
            <div>
              {data.postal_address.city}
              {data.postal_address.zip && `, ${data.postal_address.zip}`}
            </div>
            <div>{data.postal_address.country}</div>
          </div>
        </div>
      </div>
    </>
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
