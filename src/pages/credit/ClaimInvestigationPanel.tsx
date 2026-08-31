import { ChevronDown } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import type { ClaimInvestigationFindingStatus, ClaimInvestigationState, ClaimInvestigationTrack } from "./decision-types";

const messages = defineMessages({
  title: {
    id: "credit.claimInvestigation.title",
    defaultMessage: "Public-source research",
    description: "Heading for the supplemental AI public-source review",
  },
  authority: {
    id: "credit.claimInvestigation.authority",
    defaultMessage: "Supplemental",
    description: "Compact authority boundary for supplemental public-source research",
  },
  running: {
    id: "credit.claimInvestigation.running",
    defaultMessage: "In progress",
    description: "Status while the public-source investigation runs",
  },
  unavailable: {
    id: "credit.claimInvestigation.unavailable",
    defaultMessage: "Unavailable",
    description: "Fail-neutral state when public-source investigation fails",
  },
  notConfigured: {
    id: "credit.claimInvestigation.notConfigured",
    defaultMessage: "Not enabled",
    description: "State when public-source investigation is not configured",
  },
  unsupportedProvider: {
    id: "credit.claimInvestigation.unsupportedProvider",
    defaultMessage: "Unavailable",
    description: "State when the configured model provider cannot research public sources",
  },
  insufficientData: {
    id: "credit.claimInvestigation.insufficientData",
    defaultMessage: "Insufficient case data",
    description: "State when the case cannot support a public-source investigation",
  },
  noFindings: {
    id: "credit.claimInvestigation.noFindings",
    defaultMessage: "No relevant public context found",
    description: "Neutral empty state for a completed public-source investigation",
  },
  source: {
    id: "credit.claimInvestigation.source",
    defaultMessage: "Public source: {title}",
    description: "Label for an untrusted public-source lead",
  },
  completed: {
    id: "credit.claimInvestigation.completed",
    defaultMessage: "{findings, plural, one {# finding} other {# findings}} · {sources, plural, one {# source} other {# sources}}",
    description: "Compact coverage summary for completed public-source research",
  },
  sources: {
    id: "credit.claimInvestigation.sources",
    defaultMessage: "{count, plural, one {# source} other {# sources}}",
    description: "Disclosure label for the public sources behind one investigation finding",
  },
  marketContext: {
    id: "credit.claimInvestigation.track.marketContext",
    defaultMessage: "Market context",
    description: "Public-source investigation track for market context",
  },
  operationalPlausibility: {
    id: "credit.claimInvestigation.track.operationalPlausibility",
    defaultMessage: "Operational plausibility",
    description: "Public-source investigation track for operational plausibility",
  },
  repaymentDependency: {
    id: "credit.claimInvestigation.track.repaymentDependency",
    defaultMessage: "Repayment dependency",
    description: "Public-source investigation track for repayment dependency",
  },
  publicContext: {
    id: "credit.claimInvestigation.status.publicContext",
    defaultMessage: "Context found",
    description: "Neutral status for sourced public context",
  },
  notVerifiable: {
    id: "credit.claimInvestigation.status.notVerifiable",
    defaultMessage: "Not verifiable",
    description: "Neutral status when public sources cannot verify the context",
  },
});

const trackMessage = {
  market_context: messages.marketContext,
  operational_plausibility: messages.operationalPlausibility,
  repayment_dependency: messages.repaymentDependency,
} satisfies Record<ClaimInvestigationTrack, (typeof messages)[keyof typeof messages]>;

const statusMessage = {
  public_context: messages.publicContext,
  not_verifiable: messages.notVerifiable,
} satisfies Record<ClaimInvestigationFindingStatus, (typeof messages)[keyof typeof messages]>;

export function ClaimInvestigationPanel({ state }: { state: ClaimInvestigationState; readOnly?: boolean }) {
  const intl = useIntl();

  const disabledText =
    state.status !== "disabled"
      ? null
      : state.reason === "not_configured"
        ? intl.formatMessage(messages.notConfigured)
        : state.reason === "unsupported_provider"
          ? intl.formatMessage(messages.unsupportedProvider)
          : intl.formatMessage(messages.insufficientData);
  const completedSourceCount =
    state.status === "available" ? state.proposal.findings.reduce((count, finding) => count + finding.sources.length, 0) : 0;

  if (state.status === "disabled" || state.status === "unavailable") return null;

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:hidden">
        <span className="truncate text-sm font-medium">{intl.formatMessage(messages.title)}</span>
        <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
          {state.status === "available"
            ? intl.formatMessage(messages.completed, {
                findings: state.proposal.findings.length,
                sources: completedSourceCount,
              })
            : state.status === "running" || state.status === "idle"
              ? intl.formatMessage(messages.running)
              : (disabledText ?? intl.formatMessage(messages.unavailable))}
          <span aria-hidden="true">·</span>
          {intl.formatMessage(messages.authority)}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
        </span>
      </summary>

      {state.status === "available" && (
        <div className="border-t border-border p-4">
          {state.proposal.findings.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{intl.formatMessage(messages.noFindings)}</p>
          ) : (
            <div className="divide-y divide-border rounded-md border border-border bg-background">
              {state.proposal.findings.map((finding, index) => (
                <details key={`${finding.track}:${finding.claim.field}:${String(index)}`} className="group">
                  <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 marker:hidden hover:bg-muted/20">
                    <span className="grid min-w-0 gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center">
                      <span className="text-sm font-medium">{intl.formatMessage(trackMessage[finding.track])}</span>
                      <span className="text-xs text-muted-foreground">{intl.formatMessage(statusMessage[finding.status])}</span>
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {intl.formatMessage(messages.sources, { count: finding.sources.length })}
                      <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
                    </span>
                  </summary>
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-sm leading-6">{finding.summary}</p>
                    {finding.sources.length > 0 && (
                      <ul className="mt-4 space-y-3">
                        {finding.sources.map((source) => (
                          <li key={source.url} className="border-l-2 border-divider-100 pl-3 text-xs">
                            <p className="font-medium">{intl.formatMessage(messages.source, { title: source.title })}</p>
                            <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{source.url}</p>
                            <p className="mt-1 leading-5 text-muted-foreground">{source.excerpt}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </details>
  );
}
