import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useIntl } from "react-intl";
import { listEbillsOptions } from "@/generated/client/@tanstack/react-query.gen";
import type { BitcreditBill } from "@/generated/client/types.gen";
import { type AnyParticipant, isIdentified, unwrapParticipant } from "@/utils/bill-participants";
import { isBeforeUtcStartOfDate } from "@/utils/dates";

const BILLS_POLL_INTERVAL_MS = 30_000;

export type BillFilter = "all" | "accepted" | "not-accepted" | "requested-to-pay" | "paid" | "matured-unpaid" | "quoted";
type BillSortField = "maturity" | "lastActivity";
type SortDirection = "asc" | "desc";
export type BillSortBy = `${BillSortField}-${SortDirection}`;

export const DEFAULT_BILL_FILTER: BillFilter = "all";
export const DEFAULT_BILL_SORT: BillSortBy = "maturity-asc";

function matchesFilter(bill: BitcreditBill, filter: BillFilter): boolean {
  const acceptance = bill.status?.acceptance;
  const payment = bill.status?.payment;

  switch (filter) {
    case "accepted":
      return acceptance?.accepted === true;
    case "not-accepted":
      return !acceptance?.accepted;
    case "requested-to-pay":
      return payment?.requested_to_pay === true && !payment.paid;
    case "paid":
      return payment?.paid === true;
    case "matured-unpaid":
      return !payment?.paid && !isBeforeUtcStartOfDate(bill.data?.maturity_date);
    case "quoted":
      return bill.status?.mint?.has_mint_requests === true;
    default:
      return true;
  }
}

function compareBills(left: BitcreditBill, right: BitcreditBill, sortBy: BillSortBy): number {
  switch (sortBy) {
    case "maturity-asc":
      return (left.data?.maturity_date ?? "").localeCompare(right.data?.maturity_date ?? "");
    case "maturity-desc":
      return (right.data?.maturity_date ?? "").localeCompare(left.data?.maturity_date ?? "");
    case "lastActivity-asc":
      return (left.status?.last_block_time ?? 0) - (right.status?.last_block_time ?? 0);
    case "lastActivity-desc":
      return (right.status?.last_block_time ?? 0) - (left.status?.last_block_time ?? 0);
    default:
      return 0;
  }
}

/** Bills have no terminal list state, so the page keeps polling at a slow interval. */
export function useBillList() {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [billFilter, setBillFilter] = useState<BillFilter>(DEFAULT_BILL_FILTER);
  const [sortBy, setSortBy] = useState<BillSortBy>(DEFAULT_BILL_SORT);

  const {
    data: bills,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    ...listEbillsOptions(),
    retry: 1,
    refetchInterval: BILLS_POLL_INTERVAL_MS,
    refetchIntervalInBackground: true,
  });

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredBills = useMemo(() => {
    return (bills ?? []).filter(
      (bill) => matchesFilter(bill, billFilter) && (!normalizedSearchQuery || searchableContent(bill).includes(normalizedSearchQuery))
    );
  }, [bills, billFilter, normalizedSearchQuery]);

  const sortedBills = useMemo(() => [...filteredBills].sort((left, right) => compareBills(left, right, sortBy)), [filteredBills, sortBy]);

  const filterOptions = [
    { value: "accepted" as const, label: intl.formatMessage({ id: "bills.filter.accepted", defaultMessage: "Accepted" }) },
    { value: "not-accepted" as const, label: intl.formatMessage({ id: "bills.filter.notAccepted", defaultMessage: "Not accepted" }) },
    {
      value: "requested-to-pay" as const,
      label: intl.formatMessage({ id: "bills.filter.requestedToPay", defaultMessage: "Requested to pay" }),
    },
    { value: "paid" as const, label: intl.formatMessage({ id: "bills.filter.paid", defaultMessage: "Paid" }) },
    {
      value: "matured-unpaid" as const,
      label: intl.formatMessage({ id: "bills.filter.maturedUnpaid", defaultMessage: "Matured, unpaid" }),
    },
    { value: "quoted" as const, label: intl.formatMessage({ id: "bills.filter.quoted", defaultMessage: "Quoted at this mint" }) },
  ];

  const sortOptions = [
    { field: "maturity" as const, label: intl.formatMessage({ id: "bills.sort.maturity", defaultMessage: "Maturity" }) },
    { field: "lastActivity" as const, label: intl.formatMessage({ id: "bills.sort.lastActivity", defaultMessage: "Last activity" }) },
  ];

  const toggleBillFilter = (value: BillFilter) => {
    setBillFilter(value === billFilter ? DEFAULT_BILL_FILTER : value);
  };

  const toggleSort = (field: BillSortField) => {
    if (sortBy === `${field}-asc`) {
      setSortBy(`${field}-desc`);
      return;
    }

    if (sortBy === `${field}-desc`) {
      setSortBy(DEFAULT_BILL_SORT);
      return;
    }

    setSortBy(`${field}-asc`);
  };

  const hasNonDefaultFilters = billFilter !== DEFAULT_BILL_FILTER || sortBy !== DEFAULT_BILL_SORT;

  const resetFilters = () => {
    setBillFilter(DEFAULT_BILL_FILTER);
    setSortBy(DEFAULT_BILL_SORT);
  };

  return {
    searchQuery,
    setSearchQuery,
    billFilter,
    toggleBillFilter,
    sortBy,
    toggleSort,
    filterOptions,
    sortOptions,
    hasNonDefaultFilters,
    resetFilters,
    bills: bills ?? [],
    sortedBills,
    hasActiveFilters: normalizedSearchQuery.length > 0 || billFilter !== DEFAULT_BILL_FILTER,
    isLoading,
    isFetching,
    error,
  };
}

function participantName(participant: AnyParticipant | null | undefined): string {
  const unwrapped = unwrapParticipant(participant);
  if (!unwrapped) {
    return "";
  }

  return [isIdentified(unwrapped) ? unwrapped.name : "", unwrapped.node_id].filter(Boolean).join(" ");
}

function searchableContent(bill: BitcreditBill): string {
  return [
    bill.id,
    bill.data?.sum ?? "",
    bill.data?.currency ?? "",
    bill.data?.maturity_date ?? "",
    bill.data?.city_of_issuing ?? "",
    participantName(bill.participants?.drawee),
    participantName(bill.participants?.drawer),
    participantName(bill.participants?.payee),
    participantName(bill.participants?.endorsee),
  ]
    .join(" ")
    .toLowerCase();
}
