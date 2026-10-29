import { useMintSummary } from "@/pages/home/operator-api";
import { partyNameSignal } from "@/pages/home/counterparty-exposure";
import { cockpitMessages } from "@/pages/home/cockpit-copy";
import { homeMessages } from "@/pages/home/home-copy";
import type { DecisionCase } from "@/pages/credit/decision-types";
import { policyLocation } from "@/pages/policy/policy-links";
import { ArrowRight, FlaskConical } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import type { BillInfo } from "@/generated/client/types.gen";
import { billApplicant } from "./quote-parties";
import { gateMessages } from "@/components/operator/checks-copy";

/** Who asks, for how much, from whom — one line. Names link to the Directory by identity, never by name. */
export function CaseHero({
  bill,
  status,
  synthetic,
  decisionCase,
}: {
  bill: BillInfo;
  status: string;
  synthetic: boolean;
  decisionCase?: DecisionCase;
}) {
  const intl = useIntl();
  const applicant = billApplicant(bill);
  const summary = useMintSummary();
  const signal =
    summary.data && !summary.error ? partyNameSignal(summary.data, { ref: bill.drawee.node_id, name: bill.drawee.name }) : undefined;
  const lock = decisionCase?.result.assessmentTrace.find((row) => row.ruleId === "finance_lock_held_elsewhere" && row.outcome === "fail");
  return (
    <header className="case-hero">
      <div className="case-flow">
        <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight">
          <Link to={`/directory?q=${encodeURIComponent(applicant?.nodeId ?? "")}`} title={applicant?.nodeId} className="hover:underline">
            {applicant?.name ?? "—"}
          </Link>
        </h1>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="flow-bill">
          <span className="text-xl font-semibold tabular-nums">{intl.formatNumber(bill.sum)}</span>
          <span className="ml-1 text-xs text-muted-foreground">sat</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {intl.formatDate(bill.maturity_date, { dateStyle: "medium", timeZone: "UTC" })}
          </span>
        </p>
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="flex min-w-0 items-center gap-2">
          <Link
            to={`/directory?q=${encodeURIComponent(bill.drawee.node_id)}`}
            title={bill.drawee.node_id}
            className="truncate text-lg font-medium hover:underline"
          >
            {bill.drawee.name}
          </Link>
          {(signal?.sameName === true || signal?.similarName === true) && (
            <Link
              className="lookalike-tag"
              title={intl.formatMessage(signal.sameName ? cockpitMessages.sameName : cockpitMessages.similarName)}
              to={`/directory?q=${encodeURIComponent(bill.drawee.name)}`}
            >
              {intl.formatMessage(homeMessages.lookalike)}
            </Link>
          )}
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {lock && decisionCase && (
          <Link to={policyLocation(decisionCase.policyPack.policyPackVersion, lock.ruleId)} className="hero-chip hero-chip-alert">
            {intl.formatMessage(gateMessages.finance_lock_held_elsewhere.fail)}
          </Link>
        )}
        <span className="hero-chip">{status}</span>
        {synthetic && (
          <span className="hero-chip hero-chip-synthetic">
            <FlaskConical className="size-3" />
            {intl.formatMessage({
              id: "quotes.summary.synthetic",
              defaultMessage: "Synthetic test data",
              description: "The case's risk inputs or fee policy are synthetic, not real or calibrated",
            })}
          </span>
        )}
      </div>
    </header>
  );
}
