import { useQuery } from "@tanstack/react-query";
import { listQuotesOptions } from "@/generated/client/@tanstack/react-query.gen";
import { getPageQuotes } from "@/utils/quote-pages";

/**
 * The quote a bill was quoted for. The list endpoint filters by bill id, so this stays a
 * single small request rather than a scan of every quote.
 */
export function useQuoteIdByBill(billId: string) {
  const { data, isLoading } = useQuery({
    ...listQuotesOptions({ query: { bill_id: billId, limit: 1 } }),
    retry: 1,
    enabled: billId.length > 0,
  });

  return {
    quoteId: getPageQuotes(data)[0]?.id,
    isLoading,
  };
}
