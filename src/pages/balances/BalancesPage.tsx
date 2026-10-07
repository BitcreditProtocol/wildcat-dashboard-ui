import { PropsWithChildren, type ReactNode, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle, Heading, Skeleton, Text, cn } from "@bitcredit/ui-library";
import { getClowderLocalCoverageOptions, getForeignBalanceOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { Amount } from "@/generated/client/types.gen";
import { FormattedMessage } from "react-intl";
import { Currency } from "@/components/Currency";
import { isSourceCurrencyCode } from "@/lib/currency";
import { foreignBalanceTotals } from "@/utils/foreign-balance";
import { CollectFeesCard } from "./CollectFeesCard";
import { AddReserveCard } from "./AddReserveCard";
import { BalanceChartDrawer } from "./BalanceChartDrawer";
import { OnChainBalanceChart } from "./OnChainBalanceChart";
import { EbillCollateralChart } from "./EbillCollateralChart";
import { ForeignBalanceBreakdown } from "./ForeignBalanceBreakdown";
import { KeysetBalanceChart } from "./KeysetBalanceChart";

function Loader() {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-96 rounded-lg" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    </div>
  );
}

interface BalanceDisplay {
  amount: string;
  unit: string;
  unavailable?: boolean;
}

function formatAmountValue(amount?: Amount | number | null) {
  if (typeof amount === "number") {
    return String(amount);
  }

  return amount ? String(amount.value) : "0";
}

interface BalanceCardProps extends BalanceDisplay {
  title: ReactNode;
  className: string;
  chart?: ReactNode;
  detail?: ReactNode;
}

function BalanceCard({ title, className, amount, unit, unavailable, chart, detail }: BalanceCardProps) {
  const card = (
    <Card className={cn(className, "h-full text-left text-text-on-tint", chart && "cursor-pointer transition-opacity hover:opacity-90")}>
      <CardHeader>
        <CardTitle className="text-text-on-tint">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <BalanceText amount={amount} unit={unit} unavailable={unavailable}>
          {detail}
        </BalanceText>
      </CardContent>
    </Card>
  );

  if (chart === undefined) {
    return card;
  }

  return (
    <BalanceChartDrawer
      title={title}
      trigger={
        <button type="button" className="w-full rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-200">
          {card}
        </button>
      }
    >
      {chart}
    </BalanceChartDrawer>
  );
}

export function BalanceText({ amount, unit, unavailable, children }: PropsWithChildren<BalanceDisplay>) {
  return (
    <>
      <Heading as="h3" variant="page" className="text-text-on-tint">
        {unavailable ? (
          "—"
        ) : isSourceCurrencyCode(unit) ? (
          <Currency
            value={Number(amount)}
            sourceCurrency={unit}
            amountClassName="text-current"
            currencyClassName="text-sm font-medium text-text-on-tint-muted"
          />
        ) : (
          `${amount} ${unit}`
        )}
      </Heading>
      {children}
    </>
  );
}

function useBalances() {
  const {
    data: coverage,
    isError,
    refetch,
  } = useQuery({
    ...getClowderLocalCoverageOptions(),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });

  const { data: foreign, isError: isForeignError } = useQuery({
    ...getForeignBalanceOptions(),
    refetchInterval: 30_000,
    staleTime: 25_000,
    retry: 2,
  });

  const error = isError ? "Failed to load coverage data" : null;
  const foreignTotals = foreignBalanceTotals(foreign?.balances ?? []);

  const balances: Record<string, BalanceDisplay> = {
    bitcoin: {
      amount: coverage?.onchain_collateral?.toString() ?? "0",
      unit: "sat",
    },
    ebillCollateral: {
      amount: coverage?.ebill_collateral?.toString() ?? "0",
      unit: "sat",
    },
    eiou: {
      amount: foreignTotals.settled.toString(),
      unit: "eiou",
      unavailable: isForeignError,
    },
    credit: {
      amount: formatAmountValue(coverage?.credit_circulating_supply),
      unit: "crsat",
    },
    debit: {
      amount: formatAmountValue(coverage?.debit_circulating_supply),
      unit: "sat",
    },
  };

  return { balances, foreignTotals, isForeignError, error, refetch };
}

function PageBodyWithDevSection() {
  const { balances, foreignTotals, isForeignError, error } = useBalances();

  if (error) {
    return (
      <>
        <div className="flex flex-col gap-4 my-2">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4">
              <p className="text-red-800">
                <FormattedMessage id="balances.error" defaultMessage="Error loading balances: {error}" values={{ error }} />
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 my-2">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <BalanceCard
            title={<FormattedMessage id="balances.bitcoin" defaultMessage="Bitcoin balance" />}
            className="bg-indigo-100"
            amount={balances.bitcoin.amount}
            unit={balances.bitcoin.unit}
            chart={<OnChainBalanceChart />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.ebillCollateral" defaultMessage="E-bill collateral balance" />}
            className="bg-teal-200"
            amount={balances.ebillCollateral.amount}
            unit={balances.ebillCollateral.unit}
            chart={<EbillCollateralChart />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.eiou" defaultMessage="e-IOU balance" />}
            className="bg-orange-100"
            amount={balances.eiou.amount}
            unit={balances.eiou.unit}
            unavailable={balances.eiou.unavailable}
            detail={
              isForeignError ? (
                <Text variant="caption" className="mt-1 text-text-on-tint-muted">
                  <FormattedMessage id="balances.eiou.unavailable" defaultMessage="Foreign balances unavailable" />
                </Text>
              ) : (
                <Text variant="caption" className="mt-1 flex flex-wrap items-baseline gap-1 text-text-on-tint-muted">
                  <FormattedMessage id="balances.eiou.unsettled" defaultMessage="Unsettled" />
                  <Currency
                    value={foreignTotals.unsettled}
                    sourceCurrency="eiou"
                    amountClassName="text-current"
                    currencyClassName="text-current"
                  />
                </Text>
              )
            }
            chart={<ForeignBalanceBreakdown />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.creditToken" defaultMessage="Credit token balance" />}
            className="bg-purple-200"
            amount={balances.credit.amount}
            unit={balances.credit.unit}
            chart={<KeysetBalanceChart token="credit" />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.debitToken" defaultMessage="Debit token balance" />}
            className="bg-purple-400"
            amount={balances.debit.amount}
            unit={balances.debit.unit}
            chart={<KeysetBalanceChart token="debit" />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CollectFeesCard />
          <AddReserveCard />
        </div>
      </div>
    </>
  );
}

export default function BalancesPage() {
  return (
    <>
      <Breadcrumbs>
        <FormattedMessage id="balances.page.title" defaultMessage="Balances" />
      </Breadcrumbs>
      <Heading as="h1" variant="page" className="mb-6 pt-4">
        <FormattedMessage id="balances.page.title" defaultMessage="Balances" />
      </Heading>

      <Suspense fallback={<Loader />}>
        <PageBodyWithDevSection />
      </Suspense>
    </>
  );
}
