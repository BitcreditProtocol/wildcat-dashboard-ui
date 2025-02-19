import { BalanceChart } from "@/components/BalanceChart";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PageTitle } from "@/components/PageTitle";

export default function BalancesPage() {
  return (
    <>
      <Breadcrumbs>Balances</Breadcrumbs>
      <PageTitle>Balances</PageTitle>

      <div className="flex max-h-[500px] max-w-[320px] py-4">
        <BalanceChart />
      </div>
    </>
  )
}

