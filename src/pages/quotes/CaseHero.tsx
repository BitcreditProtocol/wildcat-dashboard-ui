import { useMintSummary } from "@/pages/home/operator-api";
import { partyNameSignal } from "@/pages/home/counterparty-exposure";
import { cockpitMessages } from "@/pages/home/cockpit-copy";
import type { DecisionCase } from "@/pages/credit/decision-types";
import { policyLocation } from "@/pages/policy/policy-links";
import { briefMessages } from "./decision-brief-copy";
import { ArrowRight, Fingerprint, FlaskConical, FileText, UserRound, Building2 } from "lucide-react";
import { useIntl } from "react-intl";
import { Link } from "react-router";
import type { BillInfo } from "@/generated/client/types.gen";
import { billApplicant } from "./quote-parties";
import { cockpit as m } from "@/components/operator/cockpit-messages";
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="eyebrow">{intl.formatMessage(m.human)}</span>
        <div className="flex flex-wrap gap-2">
          {lock && decisionCase && (
            <Link
              to={policyLocation(decisionCase.policyPack.policyPackVersion, lock.ruleId)}
              className="rounded-full border border-amber-500/40 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300"
            >
              {intl.formatMessage(briefMessages.finance_lock_held_elsewhere)} ↗
            </Link>
          )}
          <span className="rounded-full border border-border bg-muted px-2 py-1 text-[11px]">{status}</span>
          {synthetic && (
            <span className="flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/5 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
              <FlaskConical className="size-3" />
              {intl.formatMessage({ id: "quotes.summary.synthetic", defaultMessage: "Synthetic test data" })}
            </span>
          )}
        </div>
      </div>
      <div className="case-flow">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <UserRound className="size-3.5" />
            {intl.formatMessage(m.applicant)}
          </p>
          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight" title={applicant?.name}>
            {applicant?.name ?? "—"}
          </h1>
          <Link
            title={applicant?.nodeId}
            to={`/directory?q=${encodeURIComponent(applicant?.nodeId ?? "")}`}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <Fingerprint className="size-3" />
            {intl.formatMessage(m.identity)} · {applicant?.nodeId.slice(-8)}
          </Link>
        </div>
        <ArrowRight className="flow-arrow size-5 text-muted-foreground" aria-hidden="true" />
        <div className="flow-bill">
          <p className="eyebrow flex items-center justify-center gap-2">
            <FileText className="size-3.5" />
            eBill
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
            {intl.formatNumber(bill.sum)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">sat</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {intl.formatDate(bill.maturity_date, { dateStyle: "medium", timeZone: "UTC" })}
          </p>
        </div>
        <ArrowRight className="flow-arrow size-5 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-2">
            <Building2 className="size-3.5" />
            {intl.formatMessage(m.buyer)}
          </p>
          <h2 className="mt-2 truncate text-xl font-semibold tracking-tight" title={bill.drawee.name}>
            {bill.drawee.name}
          </h2>
          <Link
            title={bill.drawee.node_id}
            to={`/directory?q=${encodeURIComponent(bill.drawee.node_id)}`}
            className="mt-2 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
          >
            <Fingerprint className="size-3" />
            {intl.formatMessage(m.identity)} · {bill.drawee.node_id.slice(-8)}
          </Link>
          {(signal?.sameName === true || signal?.similarName === true) && (
            <Link
              className="mt-1 block text-[11px] text-amber-700 underline dark:text-amber-300"
              to={`/directory?q=${encodeURIComponent(bill.drawee.name)}`}
            >
              {intl.formatMessage(signal.sameName ? cockpitMessages.sameName : cockpitMessages.similarName)}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
