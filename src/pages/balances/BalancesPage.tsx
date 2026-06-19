import { PropsWithChildren, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AppIcon, Button, Card, CardContent, CardHeader, CardTitle, Heading, Skeleton, TruncatedTextPopover } from "@bitcredit/ui-library";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { collectFeesTokenOptions, getClowderLocalCoverageOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { Amount } from "@/generated/client/types.gen";
import { FormattedMessage, useIntl } from "react-intl";
import { Currency } from "@/components/Currency";
import { FeeTokenQRCodeModal } from "@/components/QRCodeWithErrorBoundary";
import { LoaderIcon, RefreshCw } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api-error";

function Loader() {
  return (
    <div className="flex flex-col gap-4 my-2">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

const getMonthLabels = (intl: ReturnType<typeof useIntl>) => [
  intl.formatMessage({ id: "month.jan.short", defaultMessage: "Jan" }),
  intl.formatMessage({ id: "month.feb.short", defaultMessage: "Feb" }),
  intl.formatMessage({ id: "month.mar.short", defaultMessage: "Mar" }),
  intl.formatMessage({ id: "month.apr.short", defaultMessage: "Apr" }),
  intl.formatMessage({ id: "month.may.short", defaultMessage: "May" }),
  intl.formatMessage({ id: "month.jun.short", defaultMessage: "Jun" }),
  intl.formatMessage({ id: "month.jul.short", defaultMessage: "Jul" }),
  intl.formatMessage({ id: "month.aug.short", defaultMessage: "Aug" }),
  intl.formatMessage({ id: "month.sep.short", defaultMessage: "Sep" }),
  intl.formatMessage({ id: "month.oct.short", defaultMessage: "Oct" }),
  intl.formatMessage({ id: "month.nov.short", defaultMessage: "Nov" }),
  intl.formatMessage({ id: "month.dec.short", defaultMessage: "Dec" }),
];

export function BitcoinBalanceChart() {
  const intl = useIntl();
  const config = {
    bitcoin: {
      label: intl.formatMessage({
        id: "balances.chart.bitcoin",
        defaultMessage: "Bitcoin",
      }),
      color: "#2563eb",
    },
  } satisfies ChartConfig;

  const months = getMonthLabels(intl);

  const data = [
    { month: months[0], bitcoin: 186 },
    { month: months[1], bitcoin: 305 },
    { month: months[2], bitcoin: 237 },
    { month: months[3], bitcoin: 73 },
    { month: months[4], bitcoin: 209 },
    { month: months[5], bitcoin: 214 },
    { month: months[6], bitcoin: 21 },
    { month: months[7], bitcoin: 32 },
    { month: months[8], bitcoin: 0 },
    { month: months[9], bitcoin: 0 },
    { month: months[10], bitcoin: 0 },
    { month: months[11], bitcoin: 0 },
  ];

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: string) => value} />
        <YAxis dataKey="bitcoin" tickLine={false} tickMargin={10} axisLine={false} />
        <Bar dataKey="bitcoin" fill="var(--color-bitcoin)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

export function OtherBalanceChart() {
  const intl = useIntl();
  const config = {
    eIOU: {
      label: intl.formatMessage({
        id: "balances.chart.eiou",
        defaultMessage: "e-IOU",
      }),
      color: "#911198",
    },
    credit: {
      label: intl.formatMessage({
        id: "balances.chart.creditToken",
        defaultMessage: "Credit token",
      }),
      color: "#e9d4ff",
    },
    debit: {
      label: intl.formatMessage({
        id: "balances.chart.debitToken",
        defaultMessage: "Debit token",
      }),
      color: "#c27aff",
    },
  } satisfies ChartConfig;

  const months = getMonthLabels(intl);

  const data = [
    { month: months[0], credit: 121, debit: 0 },
    { month: months[1], credit: 231, debit: 0 },
    { month: months[2], credit: 321, debit: 51 },
    { month: months[3], credit: 603, debit: 186 },
    { month: months[4], credit: 583, debit: 486 },
    { month: months[5], credit: 893, debit: 359 },
    { month: months[6], credit: 1023, debit: 192 },
    { month: months[7], credit: 2023, debit: 521 },
    { month: months[8], credit: 1821, debit: 789 },
    { month: months[9], credit: 1782, debit: 1232 },
    { month: months[10], credit: 0, debit: 0 },
    { month: months[11], credit: 0, debit: 0 },
  ];

  return (
    <ChartContainer config={config} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tickFormatter={(value: string) => value} />
        <YAxis dataKey="credit" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis dataKey="debit" tickLine={false} tickMargin={10} axisLine={false} />
        <Bar dataKey="credit" fill="var(--color-credit)" radius={4} />
        <Bar dataKey="debit" fill="var(--color-debit)" radius={4} />
        <ChartLegend content={<ChartLegendContent />} />
      </BarChart>
    </ChartContainer>
  );
}

interface BalanceDisplay {
  amount: string;
  unit: string;
}

function formatAmountValue(amount?: Amount | number | null) {
  if (typeof amount === "number") {
    return String(amount);
  }

  return amount ? String(amount.value) : "0";
}

function getAmountValue(amount?: Amount | number | null) {
  if (typeof amount === "number") {
    return amount;
  }

  return amount?.value ?? null;
}

function getCollectableFeesSats(feesToken?: unknown) {
  if (!feesToken || typeof feesToken !== "object") {
    return null;
  }

  const response = feesToken as {
    amount?: Amount | number | null;
    total?: Amount | number | null;
  };

  return getAmountValue(response.amount ?? response.total);
}

export function BalanceText({ amount, unit, children }: PropsWithChildren<BalanceDisplay>) {
  return (
    <>
      <Heading as="h3" variant="page" className="text-[#1b0f00]">
        {unit === "sat" ? (
          <Currency
            value={Number(amount)}
            sourceCurrency="sat"
            amountClassName="text-current"
            currencyClassName="text-sm font-medium text-[#6b5a45]"
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

  const error = isError ? "Failed to load coverage data" : null;

  const balances: Record<string, BalanceDisplay> = {
    bitcoin: {
      amount: coverage?.onchain_collateral?.toString() ?? "0",
      unit: "sat",
    },
    eiou: {
      amount: coverage?.eiou_collateral?.toString() ?? "0",
      unit: "e-IOU",
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

  return { balances, error, refetch };
}

function CollectFeesCard() {
  const {
    data: feesToken,
    error,
    isFetching,
    refetch,
  } = useQuery({
    ...collectFeesTokenOptions(),
    retry: 3,
  });
  const hasToken = Boolean(feesToken?.token);
  const collectableFeesSats = getCollectableFeesSats(feesToken);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pt-6 pb-2 px-6">
        <CardTitle>
          <FormattedMessage id="balances.collectFees.title" defaultMessage="Fee collection" />
        </CardTitle>
        <Button type="button" variant="secondary" size="sm" className="w-fit gap-2" onClick={() => void refetch()} disabled={isFetching}>
          <AppIcon icon={isFetching ? LoaderIcon : RefreshCw} size="sm" className={isFetching ? "animate-spin" : undefined} />
          {hasToken ? (
            <FormattedMessage id="balances.collectFees.refreshButton" defaultMessage="Refresh" />
          ) : (
            <FormattedMessage id="balances.collectFees.loadingButton" defaultMessage="Loading fees" />
          )}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-2 pb-6 px-6">
        <p className="text-sm text-text-200">
          <FormattedMessage
            id="balances.collectFees.description"
            defaultMessage="Current e-cash fees collectable as a wallet import token."
          />
        </p>

        <div className="rounded-md border border-divider-200 bg-elevation-100 p-4">
          <span className="text-sm text-text-200 pr-2">
            <FormattedMessage id="balances.collectFees.amount" defaultMessage="Current fees collectable" />
          </span>
          {feesToken ? (
            <>
              <Currency
                value={collectableFeesSats ?? 0}
                sourceCurrency="sat"
                className="mt-1 text-2xl font-bold text-text-300"
                amountClassName="text-current"
              />

              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <TruncatedTextPopover
                    text={feesToken.token}
                    maxLength={32}
                    showCopyButton={true}
                    truncationMode="middle"
                    className="font-mono text-xs text-text-300 hover:text-text-300"
                    contentClassName="border-divider-200 bg-elevation-200 text-text-300"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-text-300">
                  <FeeTokenQRCodeModal feeToken={feesToken.token} />
                </div>
              </div>
            </>
          ) : (
            <Skeleton className="mt-2 h-8 w-40 rounded-md" />
          )}
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <FormattedMessage
              id="balances.collectFees.error"
              defaultMessage="Failed to collect fees: {error}"
              values={{ error: getApiErrorMessage(error) }}
            />
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function PageBodyWithDevSection() {
  const { balances, error } = useBalances();

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card className="bg-indigo-100 text-[#1b0f00]">
            <CardHeader>
              <CardTitle className="text-[#1b0f00]">
                <FormattedMessage id="balances.bitcoin" defaultMessage="Bitcoin balance" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.bitcoin.amount} unit={balances.bitcoin.unit} />
            </CardContent>
          </Card>
          <Card className="bg-orange-100 text-[#1b0f00]">
            <CardHeader>
              <CardTitle className="text-[#1b0f00]">
                <FormattedMessage id="balances.eiou" defaultMessage="e-IOU balance" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.eiou.amount} unit={balances.eiou.unit} />
            </CardContent>
          </Card>
          <Card className="bg-purple-200 text-[#1b0f00]">
            <CardHeader>
              <CardTitle className="text-[#1b0f00]">
                <FormattedMessage id="balances.creditToken" defaultMessage="Credit token balance" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.credit.amount} unit={balances.credit.unit} />
            </CardContent>
          </Card>
          <Card className="bg-purple-400 text-[#1b0f00]">
            <CardHeader>
              <CardTitle className="text-[#1b0f00]">
                <FormattedMessage id="balances.debitToken" defaultMessage="Debit token balance" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BalanceText amount={balances.debit.amount} unit={balances.debit.unit} />
            </CardContent>
          </Card>
        </div>

        <CollectFeesCard />

        {/*
          TODO Charts display mock data - will be updated when historical data endpoint is available
          TODO Mint fees display pending - endpoint TBD
          https://github.com/BitcreditProtocol/wildcat-dashboard-ui/issues/129
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="py-4">
            <BitcoinBalanceChart />
          </Card>
          <Card className="py-4">
            <OtherBalanceChart />
          </Card>
        </div>
        */}
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
