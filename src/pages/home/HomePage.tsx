import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { useQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { CopyButton } from "@/components/CopyButton"
import { getIdentityOptions, getClowderInfoOptions } from "@/generated/client/@tanstack/react-query.gen"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const { data: identityData } = useQuery({
    ...getIdentityOptions(),
    staleTime: Infinity,
    gcTime: Infinity,
  })

  const { data: clowderData, isLoading: clowderLoading, isError: clowderError } = useQuery({
    ...getClowderInfoOptions(),
    staleTime: 60_000,
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
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Node ID</span>
                      <CopyButton value={identityData.node_id} label="Node ID" />
                    </div>
                    <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                      {identityData.node_id}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Bitcoin Public Key
                      </span>
                      <CopyButton value={identityData.bitcoin_public_key} label="Bitcoin Public Key" />
                    </div>
                    <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                      {identityData.bitcoin_public_key}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center">
                      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                        Nostr Public Key
                      </span>
                      <CopyButton value={identityData.npub} label="Nostr Public Key" />
                    </div>
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
          <h3 className="text-lg font-semibold mb-4">Clowder</h3>
          {clowderLoading ? (
            <div className="text-center text-muted-foreground">Loading clowder information...</div>
          ) : clowderError ? (
            <div className="text-center text-muted-foreground">Failed to load clowder information</div>
          ) : clowderData ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Node ID</span>
                  <CopyButton value={clowderData.node_id as unknown as string} label="Clowder Node ID" />
                </div>
                <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                  {clowderData.node_id as unknown as string}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Version</span>
                <span className="text-sm">{clowderData.version}</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Network</span>
                <span className="text-sm capitalize">{clowderData.network}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                    Change Address
                  </span>
                  <CopyButton value={clowderData.change_address} label="Change Address" />
                </div>
                <span className="font-mono text-sm break-all bg-muted p-2 rounded text-muted-foreground">
                  {clowderData.change_address}
                </span>
              </div>

              {clowderData.uptime_timestamp && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Started At</span>
                  <span className="text-sm">{new Date(clowderData.uptime_timestamp * 1000).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">No clowder information available</div>
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
