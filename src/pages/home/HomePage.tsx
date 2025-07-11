import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { identityDetail, mintInfo } from "@/generated/client/sdk.gen"
import { useQuery } from "@tanstack/react-query"
import { Suspense } from "react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const { data: identityData } = useQuery({
    queryKey: ["identity-detail"],
    queryFn: async () => {
      const response = await identityDetail()
      return response.data ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    throwOnError: false,
  })

  const { data: mintData } = useQuery({
    queryKey: ["mint-info"],
    queryFn: async () => {
      const response = await mintInfo()
      return response.data ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    throwOnError: false,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Identity</h3>
          {identityData ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Name</span>
                <span className="font-semibold text-base">{identityData.name}</span>
              </div>
              {identityData.email && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Email</span>
                  <span className="font-mono text-sm text-muted-foreground">{identityData.email}</span>
                </div>
              )}
              {identityData.date_of_birth && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Date of Birth
                  </span>
                  <span className="text-sm">{identityData.date_of_birth}</span>
                </div>
              )}

              <div className="border-t pt-4 mt-4">
                <h4 className="text-md font-semibold mb-4">Keys</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Node ID</span>
                    <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                      {identityData.node_id}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Bitcoin Public Key
                    </span>
                    <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                      {identityData.bitcoin_public_key}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                      Nostr Public Key
                    </span>
                    <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                      {identityData.npub}
                    </span>
                  </div>
                </div>
              </div>

              {identityData.postal_address && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-semibold mb-4">Address</h4>
                  <div className="flex flex-col gap-1">
                    <div className="text-sm leading-relaxed">
                      <div className="font-medium">{identityData.postal_address.address}</div>
                      <div className="text-muted-foreground">
                        {identityData.postal_address.city}
                        {identityData.postal_address.zip && `, ${identityData.postal_address.zip}`}
                      </div>
                      <div className="text-muted-foreground">{identityData.postal_address.country}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No identity found</div>
          )}
        </div>

        <div className="bg-card text-card-foreground rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-4">Mint Information</h3>
          {mintData ? (
            <div className="flex flex-col gap-4">
              {mintData.name && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Name</span>
                  <span className="font-semibold text-base">{mintData.name}</span>
                </div>
              )}
              {mintData.version && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Version</span>
                  <span className="text-sm">{mintData.version}</span>
                </div>
              )}
              {mintData.description && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Description</span>
                  <span className="text-sm">{mintData.description}</span>
                </div>
              )}
              {mintData.description_long && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Long Description
                  </span>
                  <span className="text-sm whitespace-pre-line">{mintData.description_long}</span>
                </div>
              )}
              {mintData.pubkey && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Public Key</span>
                  <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                    {mintData.pubkey}
                  </span>
                </div>
              )}
              {mintData.contact && mintData.contact.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Contact</span>
                  <div className="flex flex-wrap gap-2">
                    {mintData.contact.map((contact) => (
                      <span key={contact} className="text-sm bg-muted px-2 py-1 rounded">
                        {contact}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No mint information available</div>
          )}
        </div>
      </div>
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
