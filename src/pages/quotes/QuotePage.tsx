import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { InfoReply } from "@/generated/client"
import {
  adminLookupQuoteOptions,
  adminLookupQuoteQueryKey,
  resolveQuoteMutation,
} from "@/generated/client/@tanstack/react-query.gen"
import useLocalStorage from "@/hooks/use-local-storage"
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
          disabled={isFetching || denyQuote.isPending || value.status === "denied"}
        >
          Deny {denyQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
        <Button
          className="flex-1"
          onClick={onOfferQuote}
          disabled={isFetching || offerQuote.isPending || value.status === "offered"}
        >
          Offer {offerQuote.isPending && <LoaderIcon className="stroke-1 animate-spin" />}
        </Button>
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
              <TableCell>id: </TableCell>
              <TableCell>{value.id}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>status: </TableCell>
              <TableCell><Badge variant={['rejected', 'denied'].includes(value.status) ? 'destructive' : 'default'}>{value.status}</Badge></TableCell>
            </TableRow>
            <TableRow>
              <TableCell>bill: </TableCell>
              <TableCell>{value.bill ? (<pre>{JSON.stringify(value.bill, null, 2)}</pre>) : "(empty)"}</TableCell>
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
      <PageTitle>Quote {id}</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody id={id} />
        <DevSection id={id} />
      </Suspense>
    </>
  )
}
