import { PageTitle } from "@/components/PageTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchInfo } from "@/lib/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";


function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function HomePageBody() {
  const { data } = useSuspenseQuery({
    queryKey: ["info"],
    queryFn: fetchInfo,
  });

  return (
    <>
      <pre>
        {JSON.stringify(data, null, 2)}
      </pre>
    </>
  )
}

export default function HomePage() {
  return (
    <>
      <PageTitle>Home</PageTitle>
      <Suspense fallback={<Loader />}>
        <HomePageBody />
      </Suspense>
    </>
  )
}

