import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import useLocalStorage from "@/hooks/use-local-storage"
import { Suspense } from "react"

function Loader() {
  return (
    <div className="flex flex-col gap-1.5 py-2">
      <Skeleton className="h-12 rounded-lg" />
    </div>
  )
}

function PageBody() {
  const [devMode, setDevMode] = useLocalStorage("devMode", false)

  return (
    <>
      <div className="my-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="developer-mode"
            className="cursor-pointer"
            checked={devMode}
            onCheckedChange={() => {
              setDevMode((it) => !it)
            }}
          />
          <Label htmlFor="developer-mode">Developer Mode</Label>
        </div>
      </div>
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
