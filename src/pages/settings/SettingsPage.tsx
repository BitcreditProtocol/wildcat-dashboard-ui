import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import useLocalStorage from "@/hooks/use-local-storage"
import { Suspense } from "react"
import { toast } from "sonner"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  return (
    <>
      <div className="my-2"></div>
    </>
  )
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
