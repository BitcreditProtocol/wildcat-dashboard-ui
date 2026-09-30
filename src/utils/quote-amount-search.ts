/** Face amounts are integer sats. Accept the grouping used by either app, not dates or IDs. */
export function matchesQuoteAmount(sum: number, query: string): boolean {
  const value = query.trim();
  if (!/^(?:\d+|\d{1,3}(?:[.,\s]\d{3})+)(?:\s*sat)?$/iu.test(value)) return false;
  const digits = value.replace(/(?:sat)|[.,\s]/giu, "");
  return String(sum) === digits;
}
