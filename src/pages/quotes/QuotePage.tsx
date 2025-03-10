import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { IdentityPublicData, InfoReply } from "@/generated/client"
import {
  adminLookupQuoteOptions,
  adminLookupQuoteQueryKey,
  resolveQuoteMutation,
} from "@/generated/client/@tanstack/react-query.gen"
import useLocalStorage from "@/hooks/use-local-storage"
import { formatDate, humanReadableDurationDays } from "@/utils/dates"
import { randomAvatar } from "@/utils/dev"
import { truncateString } from "@/utils/strings"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { LoaderIcon } from "lucide-react"
import { Suspense } from "react"
import { Link, useParams } from "react-router"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function QuoteActions({ value, isFetching }: { value: InfoReply; isFetching: boolean }) {
  const queryClient = useQueryClient()

  const denyQuote = useMutation({
    ...resolveQuoteMutation(),
    onError: (error) => {
      console.log(error)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminLookupQuoteQueryKey({
          path: {
            id: value.id,
          },
        }),
      })
    },
  })
  const offerQuote = useMutation({
    ...resolveQuoteMutation(),
    onError: (error) => {
      console.log(error)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: adminLookupQuoteQueryKey({
          path: {
            id: value.id,
          },
        }),
      })
    },
  })

  const onDenyQuote = () => {
    denyQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "deny",
      },
    })
  }

  const onOfferQuote = () => {
    offerQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "offer",
        discount: "1",
        ttl: "1",
      },
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          className="flex-1"
          onClick={onDenyQuote}
          disabled={isFetching || denyQuote.isPending || value.status !== "pending"}
        >
          Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
        <Button
          className="flex-1"
          onClick={onOfferQuote}
          disabled={isFetching || offerQuote.isPending || value.status !== "pending"}
        >
          Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
      </div>
    </>
  )
}

function ParticipantsOverviewCard({
  drawee,
  drawer,
  holder,
  payee,
}: {
  drawee?: IdentityPublicData
  drawer?: IdentityPublicData
  holder?: IdentityPublicData
  payee?: IdentityPublicData
}) {
  ;<Tooltip />
  return (
    <>
      <div className="flex gap-0.5 items-center py-1">
        <div className="px-1">
          <IdentityPublicDataAvatar value={drawee} tooltip="Drawee" />
        </div>
        <div className="px-1">
          <IdentityPublicDataAvatar value={drawer} tooltip="Drawer" />
        </div>
        <div className="px-1">
          <IdentityPublicDataAvatar value={payee} tooltip="Payee" />
        </div>
        <div className="px-1">
          <IdentityPublicDataAvatar value={holder} tooltip="Holder" />
        </div>
      </div>
    </>
  )
}

function IdentityPublicDataAvatar({ value, tooltip }: { value?: IdentityPublicData; tooltip?: React.ReactNode }) {
  const avatar = (
    <Avatar>
      <AvatarImage src={randomAvatar(value?.node_id.startsWith("03") ? "men" : "women", value?.node_id)} />
      <AvatarFallback>{value?.name}</AvatarFallback>
    </Avatar>
  )
  return !tooltip ? (
    avatar
  ) : (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>{avatar}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function IdentityPublicDataCard({ value }: { value?: IdentityPublicData }) {
  return (
    <>
      <div className="flex gap-0.5 items-center">
        <div className="px-1 me-4">
          <IdentityPublicDataAvatar value={value} />
        </div>
        <div className="flex flex-col">
          <div className="font-bold">{value?.name}</div>
          <div>{value?.email}</div>
          <div>
            {value?.address}, {value?.zip}, {value?.city}, {value?.country}
          </div>
          <div>
            <pre>{value?.node_id}</pre>
          </div>
        </div>
      </div>
    </>
  )
}

function Quote({ value, isFetching }: { value: InfoReply; isFetching: boolean }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Table className="my-2">
          <TableBody>
            <TableRow>
              <TableCell className="font-bold">ID: </TableCell>
              <TableCell>
                <span className="font-mono">{value.id}</span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Status: </TableCell>
              <TableCell>
                <Badge variant={["rejected", "denied"].includes(value.status) ? "destructive" : "default"}>
                  {value.status}
                </Badge>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Sum: </TableCell>
              <TableCell>{value.bill?.sum} sat</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Maturity date: </TableCell>
              <TableCell>
                {!value.bill?.maturity_date ? (
                  <>(empty)</>
                ) : (
                  <div className="flex gap-0.5">
                    <span>{formatDate("en", new Date(Date.parse(value.bill.maturity_date)))}</span>
                    <span>({humanReadableDurationDays("en", new Date(Date.parse(value.bill.maturity_date)))})</span>
                  </div>
                )}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Participants: </TableCell>
              <TableCell>
                <ParticipantsOverviewCard
                  drawee={value.bill?.drawee}
                  drawer={value.bill?.drawer}
                  payee={value.bill?.payee}
                  holder={value.bill?.holder}
                />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Drawee: </TableCell>
              <TableCell>
                <IdentityPublicDataCard value={value.bill?.drawee} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Drawer: </TableCell>
              <TableCell>
                <IdentityPublicDataCard value={value.bill?.drawer} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Payee: </TableCell>
              <TableCell>
                <IdentityPublicDataCard value={value.bill?.payee} />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-bold">Holder: </TableCell>
              <TableCell>
                <IdentityPublicDataCard value={value.bill?.holder} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <QuoteActions value={value} isFetching={isFetching} />
      </div>
    </>
  )
}

function DevSection({ id }: { id: InfoReply["id"] }) {
  const [devMode] = useLocalStorage("devMode", false)

  const { data } = useSuspenseQuery({
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      {devMode && (
        <>
          <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
            {JSON.stringify(data, null, 2)}
          </pre>
        </>
      )}
    </>
  )
}

function PageBody({ id }: { id: InfoReply["id"] }) {
  const { data, isFetching } = useSuspenseQuery({
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      <div className="flex items-center gap-1">
        <span>{isFetching && <LoaderIcon className="stroke-1 animate-spin" />}</span>
      </div>
      <Quote value={data} isFetching={isFetching} />
    </>
  )
}

export default function QuotePage() {
  const { id } = useParams<{ id: InfoReply["id"] }>()

  if (!id) {
    throw Error("Missing `id` param.")
  }

  return (
    <>
      <Breadcrumbs
        parents={[
          <>
            <Link to="/quotes">Quotes</Link>
          </>,
        ]}
      >
        {id}
      </Breadcrumbs>
      <PageTitle>
        Quote <span className="font-mono">{truncateString(id, 16)}</span>
      </PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody id={id} />
        <DevSection id={id} />
      </Suspense>
    </>
  )
}
