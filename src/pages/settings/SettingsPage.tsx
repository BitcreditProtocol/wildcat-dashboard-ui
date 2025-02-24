import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  return <></>
}

export default function SettingsPage() {
  return (
    <>
      <Breadcrumbs>Settings</Breadcrumbs>
      <PageTitle>Settings</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
