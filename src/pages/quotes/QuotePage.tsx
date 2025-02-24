import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { InfoReply } from "@/generated/client"
import useApiClient from "@/hooks/use-api-client"
import useLocalStorage from "@/hooks/use-local-storage"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"
import { Link, useParams } from "react-router"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
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
              <TableCell>endorser: </TableCell>
              <TableCell>{value.endorser || "(empty)"}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>bill: </TableCell>
              <TableCell>{value.bill || "(empty)"}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </>
  )
}

function DevSection({ id }: { id: InfoReply["id"] }) {
  const [devMode] = useLocalStorage("devMode", false)

  const client = useApiClient()

  const { data } = useSuspenseQuery({
    queryKey: ["quote", id],
    queryFn: () =>
      client.adminLookupQuote({
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
  const client = useApiClient()

  const { data } = useSuspenseQuery({
    queryKey: ["quote", id],
    queryFn: () =>
      client.adminLookupQuote({
        path: {
          id,
        },
      }),
  })

  return (
    <>
      {data.data && (
        <>
          <Quote value={data.data} />
        </>
      )}
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
