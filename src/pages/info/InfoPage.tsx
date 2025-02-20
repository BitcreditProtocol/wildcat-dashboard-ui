import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInfo } from "@/lib/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";


function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-48 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const { data } = useSuspenseQuery({
    queryKey: ["info"],
    queryFn: fetchInfo,
  });

  return (
    <>
      <pre className="text-sm bg-accent text-accent-foreground rounded-lg p-2 my-2">
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  )
}

export default function InfoPage() {
  return (
    <>
      <Breadcrumbs>Info</Breadcrumbs>
      <PageTitle>Info</PageTitle>
      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}

