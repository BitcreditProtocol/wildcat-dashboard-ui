import { Suspense, useState } from "react"
import { Breadcrumbs } from "@/components/Breadcrumbs"
import { PageTitle } from "@/components/PageTitle"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"
import { ChartColumnIncreasingIcon } from "lucide-react"

function Loader() {
  return (
    <div className="flex flex-col gap-2 py-2">
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-32 rounded-lg" />
    </div>
  )
}

function Earnings() {
  const [timeframe, setTimeframe] = useState("1d")

  return (
    <div>
      <div className="flex flex-col justify-center gap-2 my-4 mt-8">
        <div className="flex justify-center gap-2 my-1">
          <div className="scroll-m-20 text-3xl font-extrabold tracking-tight lg:text-4xl">0.00 000 000 BTC</div>
        </div>
        <div className="flex justify-center gap-2">
          <div className="scroll-m-20 tracking-tight text-sm">Earned during the selected timeframe</div>
        </div>
      </div>

      <div className="flex justify-center gap-2 my-4">
        <ToggleGroup
          type="single"
          size="lg"
          variant="outline"
          value={timeframe}
          onValueChange={(val) => setTimeframe((curr) => val || curr)}
        >
          <ToggleGroupItem value="1d" className="px-6 whitespace-nowrap">
            Today
          </ToggleGroupItem>
          <ToggleGroupItem value="1w" className="px-6 whitespace-nowrap">
            Last week
          </ToggleGroupItem>
          <ToggleGroupItem value="1m" className="px-6 whitespace-nowrap">
            Last month
          </ToggleGroupItem>
          <ToggleGroupItem value="3m" className="px-6 whitespace-nowrap">
            Last 3 months
          </ToggleGroupItem>
          <ToggleGroupItem value="6m" className="px-6 whitespace-nowrap">
            Last 6 months
          </ToggleGroupItem>
          <ToggleGroupItem value="1y" className="px-6 whitespace-nowrap">
            Last year
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex flex-col justify-center gap-2 my-4 mt-8">
        <div className="flex justify-center gap-2">
          <div className="scroll-m-20 tracking-tight text-sm">No accepted quotes for the selected timeframe.</div>
        </div>
      </div>
    </div>
  )
}

function PageBody() {
  return (
    <div className="my-4">
      <Link to="/earnings/cashflow">
        <Button>
          <ChartColumnIncreasingIcon /> CashFlow
        </Button>
      </Link>
      <Earnings />
    </div>
  )
}


export default function EarningsPage() {
  return (
    <>
      <Breadcrumbs>Earnings</Breadcrumbs>
      <PageTitle>Earnings</PageTitle>

      <Suspense fallback={<Loader />}>
        <PageBody />
      </Suspense>
    </>
  )
}
