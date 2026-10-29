import type { MintSummary } from "./operator-api";

/** Identity refs own the grouping. Names are only a review signal, never a join key. */
export function exposureIdentities(summary: MintSummary) {
  const names = new Map<string, Set<string>>();
  const similarNames = new Map<string, Set<string>>();
  const normalized = (name: string) => name.normalize("NFKC").trim().toLocaleLowerCase("en");
  const withoutSuffix = (name: string) => normalized(name).replace(/\s+r\.?\s*l\.?$/u, "");
  for (const party of summary.portfolio.quotes.flatMap((q) => [q.drawer, q.drawee]).concat(summary.portfolio.counterparties)) {
    const key = party.name.normalize("NFKC").trim().toLocaleLowerCase("en");
    const refs = names.get(key) ?? new Set<string>();
    refs.add(party.ref);
    names.set(key, refs);
    const similarKey = withoutSuffix(party.name);
    const similarRefs = similarNames.get(similarKey) ?? new Set<string>();
    similarRefs.add(party.ref);
    similarNames.set(similarKey, similarRefs);
  }
  const groups = new Map<string, MintSummary["portfolio"]["counterparties"]>();
  for (const party of summary.portfolio.counterparties) {
    const group = groups.get(party.ref) ?? [];
    group.push(party);
    groups.set(party.ref, group);
  }
  return [...groups].map(([ref, roles]) => ({
    ref,
    name: roles[0].name,
    roles,
    similarName: roles.some((p) => (similarNames.get(withoutSuffix(p.name))?.size ?? 0) > 1),
    sameName: roles.some((p) => (names.get(p.name.normalize("NFKC").trim().toLocaleLowerCase("en"))?.size ?? 0) > 1),
  }));
}
