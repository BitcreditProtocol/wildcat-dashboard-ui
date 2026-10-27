import type { CreditPolicyCatalogue, CreditProgram, SyntheticPolicyPack } from "@bitcredit/ai-credit-shared";
import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl, type IntlShape } from "react-intl";
import { useCreditPolicy } from "@/pages/mint-checks/api";
import { CheckLoading, CheckUnavailable } from "@/pages/mint-checks/MintCheckParts";
import { countryName } from "@/utils/bill-participants";

const messages = defineMessages({
  title: { id: "policy.title", defaultMessage: "Credit policy", description: "Page title of the reviewed credit policy" },
  description: {
    id: "policy.description",
    defaultMessage: "The Mint’s reviewed credit programmes and the immutable policy packs they select.",
    description: "What the policy page shows",
  },
  readOnly: {
    id: "policy.readOnly",
    defaultMessage: "Read-only. Change the policy by publishing a new reviewed release; nothing on this page edits it.",
    description: "Policy changes only through a new digest-pinned release",
  },
  empty: { id: "policy.empty", defaultMessage: "No credit programme is published.", description: "No programmes" },
  programme: {
    id: "policy.programme",
    defaultMessage: "Programme {id} · version {version}",
    description: "Credit programme identifier and version",
  },
  scope: { id: "policy.scope", defaultMessage: "{product} · {country} · {industry}", description: "What a programme or pack covers" },
  synthetic: { id: "policy.synthetic", defaultMessage: "Synthetic", description: "The programme or pack is synthetic demo policy" },
  packMissing: {
    id: "policy.packMissing",
    defaultMessage: "The policy pack this programme selects is not in the published catalogue.",
    description: "A programme references a pack the catalogue does not carry",
  },
  pack: { id: "policy.pack", defaultMessage: "Policy pack {version}", description: "Policy pack version heading" },
  otherPacks: {
    id: "policy.otherPacks",
    defaultMessage: "Policy packs without a programme",
    description: "Packs kept for replay of earlier quotes, not selected by any programme",
  },
  tenor: { id: "policy.tenor", defaultMessage: "Time to maturity", description: "Policy tenor range" },
  tenorRange: {
    id: "policy.tenorRange",
    defaultMessage: "{min}–{max} days",
    description: "Minimum and maximum days to maturity",
  },
  maximumBillSum: { id: "policy.maximumBillSum", defaultMessage: "Maximum bill sum", description: "Policy cap per bill" },
  minimumUseful: {
    id: "policy.minimumUseful",
    defaultMessage: "Minimum useful amount offered",
    description: "Below this the offer is not worth the paperwork",
  },
  operatingCost: { id: "policy.operatingCost", defaultMessage: "Operating cost per case", description: "Fixed cost per case" },
  maximumAnnual: {
    id: "policy.maximumAnnual",
    defaultMessage: "Maximum effective annual rate",
    description: "Holder-protection ceiling on the whole fee",
  },
  maximumFeeRatio: {
    id: "policy.maximumFeeRatio",
    defaultMessage: "Maximum fee ratio",
    description: "Holder-protection ceiling on fee as share of the bill",
  },
  offerValidity: {
    id: "policy.offerValidity",
    defaultMessage: "Offer validity",
    description: "How long an offer stands",
  },
  days: { id: "policy.days", defaultMessage: "{days, plural, one {# day} other {# days}}", description: "A number of days" },
  pricing: { id: "policy.pricing", defaultMessage: "Pricing components", description: "Named components of the rate" },
  costOfFunds: { id: "policy.costOfFunds", defaultMessage: "Cost of funds", description: "Pricing component" },
  marginCorroborated: {
    id: "policy.marginCorroborated",
    defaultMessage: "Uncertainty margin · corroborated evidence",
    description: "Pricing component",
  },
  marginVerified: {
    id: "policy.marginVerified",
    defaultMessage: "Uncertainty margin · independently verified evidence",
    description: "Pricing component",
  },
  returnObjective: { id: "policy.returnObjective", defaultMessage: "Return objective", description: "Pricing component" },
  subsidy: { id: "policy.subsidy", defaultMessage: "Subsidy", description: "Pricing component, subtracted" },
  bps: {
    id: "policy.bps",
    defaultMessage: "{percent, number, percent} ({bps} bps)",
    description: "A rate as percent and basis points",
  },
  evidence: { id: "policy.evidence", defaultMessage: "Evidence rules", description: "Methodology and allowed assessors per evidence" },
  evidenceRule: {
    id: "policy.evidenceRule",
    defaultMessage: "{methodology} · assessed by {assessors}",
    description: "One evidence rule",
  },
  review: { id: "policy.review", defaultMessage: "What a reviewer may do", description: "Review permissions" },
  confirm: { id: "policy.review.confirm", defaultMessage: "Confirm the computed outcome", description: "Review permission" },
  adjust: {
    id: "policy.review.adjust",
    defaultMessage: "Adjust the price and requote within the ceilings",
    description: "Review permission",
  },
  returnForInformation: {
    id: "policy.review.return",
    defaultMessage: "Return the case for information",
    description: "Review permission",
  },
  waiveHardGate: { id: "policy.review.waive", defaultMessage: "Waive a hard gate", description: "Never permitted" },
  allowed: { id: "policy.allowed", defaultMessage: "Allowed", description: "Permission granted by the pack" },
  notAllowed: { id: "policy.notAllowed", defaultMessage: "Not allowed", description: "Permission not granted by the pack" },
  never: { id: "policy.never", defaultMessage: "Never", description: "A hard gate is never waivable" },
  gates: {
    id: "policy.gates",
    defaultMessage: "Hard gates, in order of precedence",
    description: "Non-waivable gates checked before pricing",
  },
  record: { id: "policy.record", defaultMessage: "Digests and versions", description: "Exact identity of programme and pack" },
});

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2 @lg:grid-cols-[16rem_minmax(0,1fr)]">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

function PolicyPackDetails({ pack }: { pack: SyntheticPolicyPack }) {
  const intl = useIntl();
  const sat = (value: string) => `${new Intl.NumberFormat(intl.locale).format(BigInt(value))} sat`;
  const bps = (value: number) => intl.formatMessage(messages.bps, { percent: value / 10_000, bps: value });
  const permission = (allowed: boolean) => intl.formatMessage(allowed ? messages.allowed : messages.notAllowed);
  const components = pack.pricingComponents;
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-border">
        <Row label={intl.formatMessage(messages.tenor)}>
          {intl.formatMessage(messages.tenorRange, { min: pack.minimumTenorDays, max: pack.maximumTenorDays })}
        </Row>
        <Row label={intl.formatMessage(messages.maximumBillSum)}>{sat(pack.maximumBillSumSat)}</Row>
        <Row label={intl.formatMessage(messages.minimumUseful)}>{sat(pack.minimumUsefulDiscountedSat)}</Row>
        <Row label={intl.formatMessage(messages.operatingCost)}>{sat(pack.operatingCostSat)}</Row>
        <Row label={intl.formatMessage(messages.maximumAnnual)}>{bps(pack.maximumEffectiveAnnualBps)}</Row>
        <Row label={intl.formatMessage(messages.maximumFeeRatio)}>{bps(pack.maximumFeeRatioBps)}</Row>
        <Row label={intl.formatMessage(messages.offerValidity)}>{intl.formatMessage(messages.days, { days: pack.offerValidityDays })}</Row>
      </dl>
      <section>
        <h5 className="text-sm font-medium">{intl.formatMessage(messages.pricing)}</h5>
        <dl className="divide-y divide-border">
          <Row label={intl.formatMessage(messages.costOfFunds)}>{bps(components.costOfFundsBps)}</Row>
          <Row label={intl.formatMessage(messages.marginCorroborated)}>
            {bps(components.uncertaintyMarginBpsByEvidenceState.corroborated)}
          </Row>
          <Row label={intl.formatMessage(messages.marginVerified)}>
            {bps(components.uncertaintyMarginBpsByEvidenceState.independently_verified)}
          </Row>
          <Row label={intl.formatMessage(messages.returnObjective)}>{bps(components.returnObjectiveBps)}</Row>
          <Row label={intl.formatMessage(messages.subsidy)}>{bps(components.subsidyBps)}</Row>
        </dl>
      </section>
      <section>
        <h5 className="text-sm font-medium">{intl.formatMessage(messages.evidence)}</h5>
        <dl className="divide-y divide-border">
          {Object.entries(pack.evidenceRules).map(([key, rule]) => (
            <Row key={key} label={key}>
              {intl.formatMessage(messages.evidenceRule, {
                methodology: <span className="font-mono text-xs">{rule.methodologyVersion}</span>,
                assessors: rule.allowedAssessors.join(", "),
              })}
            </Row>
          ))}
        </dl>
      </section>
      <section>
        <h5 className="text-sm font-medium">{intl.formatMessage(messages.review)}</h5>
        <dl className="divide-y divide-border">
          <Row label={intl.formatMessage(messages.confirm)}>{permission(pack.reviewPermissions.confirm)}</Row>
          <Row label={intl.formatMessage(messages.adjust)}>{permission(pack.reviewPermissions.adjustPriceAndRequote)}</Row>
          <Row label={intl.formatMessage(messages.returnForInformation)}>{permission(pack.reviewPermissions.returnForInformation)}</Row>
          <Row label={intl.formatMessage(messages.waiveHardGate)}>{intl.formatMessage(messages.never)}</Row>
        </dl>
      </section>
      <section>
        <h5 className="text-sm font-medium">{intl.formatMessage(messages.gates)}</h5>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 font-mono text-xs">
          {pack.hardGatePrecedence.map((gate) => (
            <li key={gate}>{gate}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Digests({ items }: { items: [string, string][] }) {
  const intl = useIntl();
  return (
    <details className="text-xs text-muted-foreground">
      <summary className="cursor-pointer">{intl.formatMessage(messages.record)}</summary>
      <dl className="mt-2 space-y-1 break-all">
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="font-mono">{value}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

function packDigests(pack: SyntheticPolicyPack): [string, string][] {
  return [
    ["policyPackDigest", pack.policyPackDigest],
    ["schemaVersion", pack.schemaVersion],
    ["calculationVersion", pack.calculationVersion],
    ["localeCatalogVersion", pack.localeCatalogVersion],
    ["questionGraphVersion", pack.questionGraphVersion],
  ];
}

function scopeLabel(item: Pick<CreditProgram, "product" | "country" | "industry">, intl: IntlShape) {
  return intl.formatMessage(messages.scope, {
    product: item.product,
    country: countryName(item.country, intl.locale),
    industry: item.industry,
  });
}

function PolicyCatalogue({ catalogue }: { catalogue: CreditPolicyCatalogue }) {
  const intl = useIntl();
  const selected = new Set<string>();
  const programmes = catalogue.programs.map((program) => {
    const pack = catalogue.policyPacks.find((candidate) => candidate.policyPackDigest === program.policyPackDigest);
    if (pack) selected.add(pack.policyPackDigest);
    return { program, pack };
  });
  const otherPacks = catalogue.policyPacks.filter((pack) => !selected.has(pack.policyPackDigest));
  return (
    <div className="space-y-6">
      {programmes.length === 0 && <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.empty)}</p>}
      {programmes.map(({ program, pack }) => (
        <section key={program.creditProgramDigest} className="@container space-y-4 rounded-lg border border-border bg-card p-5 md:p-6">
          <div>
            <p className="text-xs text-muted-foreground">
              {intl.formatMessage(messages.programme, { id: program.creditProgramId, version: program.creditProgramVersion })}
              {program.isSynthetic && <> · {intl.formatMessage(messages.synthetic)}</>}
            </p>
            <h2 className="mt-1 text-lg font-semibold">{scopeLabel(program, intl)}</h2>
          </div>
          {pack ? (
            <>
              <h3 className="text-sm font-medium">{intl.formatMessage(messages.pack, { version: pack.policyPackVersion })}</h3>
              <PolicyPackDetails pack={pack} />
            </>
          ) : (
            <p className="text-sm text-signal-alert">{intl.formatMessage(messages.packMissing)}</p>
          )}
          <Digests
            items={[
              ["creditProgramDigest", program.creditProgramDigest],
              ["policyPackVersion", program.policyPackVersion],
              ...(pack ? packDigests(pack) : [["policyPackDigest", program.policyPackDigest] as [string, string]]),
            ]}
          />
        </section>
      ))}
      {otherPacks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{intl.formatMessage(messages.otherPacks)}</h2>
          {otherPacks.map((pack) => (
            <details key={pack.policyPackDigest} className="@container rounded-lg border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-medium">
                {intl.formatMessage(messages.pack, { version: pack.policyPackVersion })} · {scopeLabel(pack, intl)}
              </summary>
              <div className="mt-4 space-y-4">
                <PolicyPackDetails pack={pack} />
                <Digests items={packDigests(pack)} />
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}

export default function PolicyPage() {
  const intl = useIntl();
  const query = useCreditPolicy();
  return (
    <div className="space-y-4 p-4 md:p-6">
      <header className="max-w-3xl">
        <h1 className="text-2xl font-semibold">{intl.formatMessage(messages.title)}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.description)}</p>
      </header>
      <p className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {intl.formatMessage(messages.readOnly)}
      </p>
      {query.error ? (
        <CheckUnavailable error={query.error} retrying={query.isFetching} onRetry={() => void query.refetch()} />
      ) : query.data ? (
        <PolicyCatalogue catalogue={query.data} />
      ) : (
        <CheckLoading />
      )}
    </div>
  );
}
