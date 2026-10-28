import { PropsWithChildren, type ReactNode, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, Heading, Skeleton, Text, cn } from "@bitcredit/ui-library";
import { AlertTriangle, ChartColumnIncreasingIcon } from "lucide-react";
import { Link } from "react-router";
import { getClowderLocalCoverageOptions, getForeignBalanceOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { Amount } from "@/generated/client/types.gen";
import { FormattedMessage } from "react-intl";
import { Currency } from "@/components/Currency";
import { isSourceCurrencyCode } from "@/lib/currency";
import { foreignBalanceTotals } from "@/utils/foreign-balance";
import { type SupplyMismatch, supplyMismatches } from "@/utils/supply-coverage";
import { CollectFeesCard } from "./CollectFeesCard";
import { AddReserveCard } from "./AddReserveCard";
import { EiouDepositCard } from "./EiouDepositCard";
import { BalanceChartDrawer } from "./BalanceChartDrawer";
import { OnChainBalanceChart } from "./OnChainBalanceChart";
import { EbillCollateralChart } from "./EbillCollateralChart";
import { ForeignBalanceBreakdown } from "./ForeignBalanceBreakdown";
import { EiouHistoryChart } from "./EiouHistoryChart";
import { KeysetBalanceChart } from "./KeysetBalanceChart";

function Loader() {
  return (
    <div className="@container flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 @min-[128rem]:grid-cols-6 gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Skeleton className="h-96 rounded-lg" />
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
      amount: coverage?.eiou_collateral?.toString() ?? "0",
      unit: "eiou",
    },
    foreign: {
      amount: foreignTotals.settled.toString(),
      unit: "crsat",
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

  const mismatches = coverage ? supplyMismatches(coverage) : [];

  return { balances, foreignTotals, isForeignError, mismatches, error, refetch };
}

function MismatchLine({ mismatch }: { mismatch: SupplyMismatch }) {
  const difference = (
    <Currency
      value={Math.abs(mismatch.difference)}
      sourceCurrency={mismatch.token === "debit" ? "sat" : "crsat"}
      amountClassName="font-semibold text-current"
      currencyClassName="text-current"
    />
  );

  if (mismatch.token === "debit") {
    return mismatch.difference > 0 ? (
      <FormattedMessage
        id="balances.mismatch.debit.over"
        defaultMessage="Debit token balance exceeds Bitcoin balance by {difference}"
        values={{ difference }}
      />
    ) : (
      <FormattedMessage
        id="balances.mismatch.debit.under"
        defaultMessage="Debit token balance is below Bitcoin balance by {difference}"
        values={{ difference }}
      />
    );
  }

  return mismatch.difference > 0 ? (
    <FormattedMessage
      id="balances.mismatch.credit.over"
      defaultMessage="Credit token balance exceeds e-bill collateral balance by {difference}"
      values={{ difference }}
    />
  ) : (
    <FormattedMessage
      id="balances.mismatch.credit.under"
      defaultMessage="Credit token balance is below e-bill collateral balance by {difference}"
      values={{ difference }}
    />
  );
}

function SupplyMismatchAlert({ mismatches }: { mismatches: SupplyMismatch[] }) {
  if (mismatches.length === 0) {
    return null;
  }

  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-yellow-900">
      <AppIcon icon={AlertTriangle} size="sm" className="mt-0.5 flex-shrink-0" />
      <div className="flex flex-col gap-1">
        <Text className="font-medium text-current">
          <FormattedMessage id="balances.mismatch.title" defaultMessage="Token supply does not match collateral" />
        </Text>
        {mismatches.map((mismatch) => (
          <Text key={mismatch.token} variant="caption" className="flex flex-wrap items-baseline gap-1 text-current">
            <MismatchLine mismatch={mismatch} />
          </Text>
        ))}
      </div>
    </div>
  );
}

function PageBodyWithDevSection() {
  const { balances, foreignTotals, isForeignError, mismatches, error } = useBalances();

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
      <div className="@container flex flex-col gap-4 my-2">
        <SupplyMismatchAlert mismatches={mismatches} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 @min-[128rem]:grid-cols-6 gap-4">
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
            chart={<EiouHistoryChart />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.debitToken" defaultMessage="Debit token balance" />}
            className="bg-purple-400"
            amount={balances.debit.amount}
            unit={balances.debit.unit}
            chart={<KeysetBalanceChart token="debit" />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.creditToken" defaultMessage="Credit token balance" />}
            className="bg-purple-200"
            amount={balances.credit.amount}
            unit={balances.credit.unit}
            chart={<KeysetBalanceChart token="credit" />}
          />
          <BalanceCard
            title={<FormattedMessage id="balances.foreign" defaultMessage="Foreign e-cash balance" />}
            className="bg-amber-100"
            amount={balances.foreign.amount}
            unit={balances.foreign.unit}
            unavailable={balances.foreign.unavailable}
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
                    sourceCurrency="crsat"
                    amountClassName="text-current"
                    currencyClassName="text-current"
                  />
                </Text>
              )
            }
            chart={<ForeignBalanceBreakdown />}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <CollectFeesCard />
          <AddReserveCard />
          <EiouDepositCard />
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
      <div className="flex flex-col gap-3 mb-4 sm:mb-0 sm:flex-row sm:items-center sm:justify-between">
        <Heading as="h1" variant="page" className="mb-2 sm:mb-6 pt-4">
          <FormattedMessage id="balances.page.title" defaultMessage="Balances" />
        </Heading>
        <Button asChild variant="outline" size="sm" className="inline-flex items-center gap-1 leading-none">
          <Link to="/balances/cashflow">
            <AppIcon icon={ChartColumnIncreasingIcon} weight="thin" className="h-4 w-4" />
            <FormattedMessage id="cashflow.page.title" defaultMessage="CashFlow" />
          </Link>
        </Button>
      </div>

      <Suspense fallback={<Loader />}>
        <PageBodyWithDevSection />
      </Suspense>
    </>
  );
}
