import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
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
import { Suspense } from "react"
import { Link, useParams } from "react-router"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function QuoteActions({ value }: { value: InfoReply }) {
  const queryClient = useQueryClient()

  const resolveQuote = useMutation({
    ...resolveQuoteMutation(),
    onError: (error) => {
      console.log(error)
    },
    onSuccess: (data) => {
      console.log(data)
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
    resolveQuote.mutate({
      path: {
        id: value.id,
      },
      body: {
        action: "deny",
      },
    })
  }

  const onOfferQuote = () => {
    resolveQuote.mutate({
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
        <Button className="flex-1" onClick={onDenyQuote} disabled={value.status === "denied"}>
          Deny
        </Button>
        <Button className="flex-1" onClick={onOfferQuote} disabled={value.status === "offered"}>
          Offer
        </Button>
      </div>
    </>
  )
}

function Quote({ value }: { value: InfoReply }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>id: </TableCell>
              <TableCell>{value.id}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>status: </TableCell>
              <TableCell>{value.status}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>bill: </TableCell>
              <TableCell>{value.bill || "(empty)"}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <QuoteActions value={value} />
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
  const { data } = useSuspenseQuery({
    ...adminLookupQuoteOptions({
      path: {
        id,
      },
    }),
  })

  return (
    <>
      <Quote value={data} />
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
