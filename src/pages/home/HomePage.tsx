import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { getIdentity /* , getClowderMystatus, listKeysetInfos */ } from "@/generated/client/sdk.gen"
import { useQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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
      const response = await getIdentity()
      return response.data ?? null
    },
    staleTime: Infinity,
    gcTime: Infinity,
    throwOnError: false,
  })

  // Mint info: the previous mintInfo() function no longer exists in the generated client.
  // Check for alternatives before removing. Potential endpoints:
  // - listKeysetInfos(): returns keyset metadata (unit, active, expiry) but not mint name/version/description.
  // - getClowderMystatus(): returns overall clowder status, not detailed mint info fields.
  // If a dedicated endpoint is added later (e.g., /v1/admin/mint/info), re-enable the query below.
  /*
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

  const mintData = null as unknown as {
    name?: string
    version?: string
    description?: string
    description_long?: string
    pubkey?: string
    contact?: string[]
  } | null
  */

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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(identityData.node_id).then(() => {
                            toast.success("Node ID copied to clipboard")
                          }).catch(() => {
                            toast.error("Failed to copy Node ID")
                          })
                        }}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(identityData.bitcoin_public_key).then(() => {
                            toast.success("Bitcoin Public Key copied to clipboard")
                          }).catch(() => {
                            toast.error("Failed to copy Bitcoin Public Key")
                          })
                        }}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(identityData.npub).then(() => {
                            toast.success("Nostr Public Key copied to clipboard")
                          }).catch(() => {
                            toast.error("Failed to copy Nostr Public Key")
                          })
                        }}
                        className="h-6 px-2"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
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

        {/* Mint Information Section
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
        */}
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
