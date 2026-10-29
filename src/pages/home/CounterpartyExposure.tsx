import { Link } from "react-router";
import { useIntl } from "react-intl";
import { useCreditPolicy } from "@/pages/mint-checks/api";
import { policyAnchor } from "@/pages/policy/policy-links";
import { HorizontalBars } from "@/components/operator/Charts";
import { exposureIdentities } from "./counterparty-exposure";
import type { MintSummary } from "./operator-api";
import { cockpitMessages as m } from "./cockpit-copy";

export function CounterpartyExposure({ summary }: { summary: MintSummary }) {
  const intl = useIntl();
  const policy = useCreditPolicy();
  const identities = exposureIdentities(summary);
  const sat = (value: string) => intl.formatNumber(BigInt(value));
  return (
    <section aria-label={intl.formatMessage(m.exposure)} className="space-y-3">
      <h3 className="text-sm font-medium">{intl.formatMessage(m.exposure)}</h3>
      {!identities.length && <p className="mt-6 text-sm text-muted-foreground">{intl.formatMessage(m.noExposure)}</p>}
      <ul className="max-h-80 space-y-5 overflow-y-auto">
        {identities.map((identity) => (
          <li key={identity.ref} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-sm font-medium">{identity.name}</span>
              <Link
                className="break-all font-mono text-[11px] text-primary underline"
                title={identity.ref}
                to={`/directory?q=${encodeURIComponent(identity.ref)}`}
              >
                {identity.ref.length > 24 ? `${identity.ref.slice(0, 12)}…${identity.ref.slice(-8)}` : identity.ref}
              </Link>
            </div>
            {(identity.sameName || identity.similarName) && (
              <Link
                to={`/directory?q=${encodeURIComponent(identity.name)}`}
                className="block text-xs font-medium text-amber-800 underline dark:text-amber-300"
              >
                {intl.formatMessage(identity.sameName ? m.sameName : m.similarName)}
              </Link>
            )}
            <HorizontalBars
              title={intl.formatMessage(m.identityUsage)}
              maximum={100}
              axisLabel=""
              data={identity.roles.map((party) => {
                const sources = policy.error
                  ? []
                  : (policy.data?.policyPacks ?? []).filter(
                      (pack) =>
                        "maximumDraweeExposureSat" in pack &&
                        (party.role === "drawee" ? pack.maximumDraweeExposureSat : pack.maximumDrawerExposureSat) === party.capSat
                    );
                return {
                  id: party.role,
                  label: intl.formatMessage(m[party.role]),
                  value: party.capSat === null ? 0 : Number((BigInt(party.usedSat) * 10000n) / (BigInt(party.capSat) || 1n)) / 100,
                  display: intl.formatMessage(party.capSat === null ? m.noCap : m.cap, {
                    used: sat(party.usedSat),
                    cap: party.capSat === null ? "" : sat(party.capSat),
                  }),
                  attention: party.capSat !== null && BigInt(party.usedSat) * 4n >= BigInt(party.capSat) * 3n,
                  detail: (
                    <span>
                      {intl.formatMessage(m.capSource)}{" "}
                      {sources.length
                        ? sources.map((pack, i) => (
                            <span key={pack.policyPackDigest}>
                              {i > 0 && "; "}
                              <Link className="underline" to={`/policy#${policyAnchor(pack.policyPackVersion)}`}>
                                {pack.policyPackVersion}
                              </Link>
                            </span>
                          ))
                        : intl.formatMessage(m.capSourceUnknown)}
                    </span>
                  ),
                };
              })}
            />
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-muted-foreground">{intl.formatMessage(m.capAxis)}</p>
    </section>
  );
}
