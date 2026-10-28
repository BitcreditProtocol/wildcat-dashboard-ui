import {
  comprehensiveIncomeItems,
  financialPositionItems,
  type ApplicantCapacity,
  type FinancialAmount,
} from "@bitcredit/ai-credit-shared";
import { Card, CardContent } from "@bitcredit/ui-library";
import Big from "big.js";
import { useIntl } from "react-intl";
import { capacityMessages as m } from "./applicant-capacity-copy";
import type { DecisionCase } from "./decision-types";
import { financialMoney, financialPercent } from "./financial-display";
import { FxOrientation } from "./FxOrientation";

const farmItems = ["expectedPricePerUnit", "productionCosts", "otherHouseholdIncome", "householdExpenses", "existingDebtPayments"] as const;
const reviewReasonKeys = [
  "statement_arithmetic_inconsistent",
  "current_ratio_assumes_all_borrowings_current",
  "accrual_profit_is_not_verified_cash_flow",
  "projected_season_repetition_requires_human_review",
  "nonpositive_net_cash_flow_requires_review",
  "orientation_fx_rate_unavailable",
  "bill_share_exceeds_reference",
] as const;

function AmountTable({ title, rows }: { title: string; rows: { key: string; label: string; amount: FinancialAmount }[] }) {
  const intl = useIntl();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="pb-2 text-left text-sm font-medium">{title}</caption>
        <thead>
          <tr>
            {[m.item, m.value, m.source, m.state, m.citation].map((label) => (
              <th key={label.id} scope="col" className="p-2">
                {intl.formatMessage(label)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, amount }) => (
            <tr key={key} className="border-t align-top">
              <th scope="row" className="p-2 font-normal">
                {label}
              </th>
              <td className="whitespace-nowrap p-2 tabular-nums">
                {amount.valueMinor === null
                  ? intl.formatMessage(m.empty)
                  : financialMoney(amount.valueMinor, amount.currency, amount.minorUnitScale)}
                <span className="block text-muted-foreground">
                  {amount.currency} · {amount.minorUnitScale}
                </span>
              </td>
              <td className="p-2">{intl.formatMessage(m[amount.source])}</td>
              <td className="p-2">{intl.formatMessage(m[amount.state])}</td>
              <td className="min-w-40 p-2">
                {amount.citation
                  ? intl.formatMessage(m.page, { page: amount.citation.page, snippet: amount.citation.exactSnippet })
                  : intl.formatMessage(m.noCitation)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CapacityRatio({ label, ratio, percent }: { label: string; ratio: ApplicantCapacity["billShareOfNetCashFlow"]; percent: boolean }) {
  const intl = useIntl();
  const value =
    ratio.valueBps === null
      ? intl.formatMessage(m.ratioUnavailable)
      : percent
        ? financialPercent(ratio.valueBps)
        : `${new Big(ratio.valueBps).div(10000).toFixed(4)}×`;
  return (
    <div className="space-y-1 rounded border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm tabular-nums">{value}</dd>
      <dd className="break-words text-xs text-muted-foreground">
        {intl.formatMessage(m.ratioTrace, {
          method: ratio.method,
          numerator: ratio.numeratorMinor ?? intl.formatMessage(m.empty),
          denominator: ratio.denominatorMinor ?? intl.formatMessage(m.empty),
          bps: ratio.valueBps ?? intl.formatMessage(m.empty),
        })}
      </dd>
    </div>
  );
}

/** Secondary applicant context; the primary acceptor assessment remains above this card. */
export function ApplicantCapacityPanel({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const capacity = decisionCase.snapshot.applicantCapacity;
  const statements = capacity?.information?.statements;
  const farm = capacity?.information?.farmCashFlow;
  const period = (p: { startDate: string; endDate: string }, currency: string, scale: number) =>
    intl.formatMessage(m.period, { start: p.startDate, end: p.endDate, currency, scale });
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <section aria-label={intl.formatMessage(m.heading)} className="space-y-5">
          <div>
            <h3 className="text-base font-semibold">{intl.formatMessage(m.heading)}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(m.scope)}</p>
          </div>
          <p className="text-sm">
            {intl.formatMessage(m.method, { method: intl.formatMessage(m[capacity?.cashFlowMethod ?? "unavailable"]) })}
          </p>
          {!capacity || (!statements && !farm) ? (
            <p className="text-sm text-muted-foreground">{intl.formatMessage(m.missing)}</p>
          ) : (
            <p className="text-sm">{intl.formatMessage(capacity.reviewFlag ? m.review : m[capacity.status])}</p>
          )}
          {statements && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">{intl.formatMessage(m.statements)}</h4>
              <p className="text-xs">{period(statements.period, statements.currency, statements.minorUnitScale)}</p>
              <AmountTable
                title={intl.formatMessage(m.position)}
                rows={financialPositionItems.map((key) => ({
                  key,
                  label: intl.formatMessage(m[key]),
                  amount: statements.statementOfFinancialPosition[key],
                }))}
              />
              <AmountTable
                title={intl.formatMessage(m.income)}
                rows={comprehensiveIncomeItems.map((key) => ({
                  key,
                  label: intl.formatMessage(m[key]),
                  amount: statements.statementOfComprehensiveIncome[key],
                }))}
              />
              {statements.evidence && (
                <p className="break-all text-xs text-muted-foreground">
                  {intl.formatMessage(m.evidence, {
                    label: statements.evidence.label,
                    reference: statements.evidence.reference,
                    digest: statements.evidence.contentDigest,
                  })}
                </p>
              )}
              {statements.extraction && (
                <p className="break-all text-xs text-muted-foreground">
                  {intl.formatMessage(m.extraction, {
                    parser: statements.extraction.parserVersion,
                    prompt: statements.extraction.promptVersion,
                    model: statements.extraction.modelId,
                    digest: statements.extraction.derivativeDigest,
                  })}
                </p>
              )}
            </div>
          )}
          {farm && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">{intl.formatMessage(m.farm)}</h4>
              <p className="text-xs">{intl.formatMessage(m.crop, { crop: farm.crop, season: farm.season.name })}</p>
              <p className="text-xs">{period(farm.season.period, farm.currency, farm.minorUnitScale)}</p>
              <dl className="grid gap-2 text-xs sm:grid-cols-2">
                {(["area", "expectedHarvest"] as const).map((key) => (
                  <div key={key}>
                    <dt>{intl.formatMessage(m[key])}</dt>
                    <dd>
                      {farm[key].value ?? intl.formatMessage(m.empty)} {farm[key].unit}
                    </dd>
                  </div>
                ))}
              </dl>
              <AmountTable
                title={intl.formatMessage(m.farm)}
                rows={farmItems.map((key) => ({ key, label: intl.formatMessage(m[key]), amount: farm[key] }))}
              />
            </div>
          )}
          {capacity && (
            <>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{intl.formatMessage(m.checks)}</h4>
                {capacity.arithmeticChecks.length ? (
                  <ul className="text-xs">
                    {capacity.arithmeticChecks.map((check) => (
                      <li key={check.identity}>
                        {intl.formatMessage(m[check.identity])} ·{" "}
                        {intl.formatMessage(check.status === "unavailable" ? m.checkUnavailable : m[check.status])}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{intl.formatMessage(m.noChecks)}</p>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <p>
                  {intl.formatMessage(m.net, {
                    value: capacity.netAnnualCashFlow
                      ? financialMoney(
                          capacity.netAnnualCashFlow.valueMinor,
                          capacity.netAnnualCashFlow.currency,
                          capacity.netAnnualCashFlow.minorUnitScale
                        )
                      : intl.formatMessage(m.empty),
                  })}
                </p>
                {capacity.netAnnualCashFlow && (
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage(m.netSource, {
                      source: intl.formatMessage(m[capacity.netAnnualCashFlow.source]),
                      state: intl.formatMessage(m[capacity.netAnnualCashFlow.state]),
                    })}
                  </p>
                )}
                <FxOrientation amount={capacity.billFaceOrientation} rate={capacity.fxRate} />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{intl.formatMessage(m.ratios)}</h4>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <CapacityRatio label={intl.formatMessage(m.billShare)} ratio={capacity.billShareOfNetCashFlow} percent />
                  {(["currentRatio", "debtToEquity", "grossMargin"] as const).map((key) => (
                    <CapacityRatio
                      key={key}
                      label={intl.formatMessage(m[key])}
                      ratio={capacity.statementRatios[key]}
                      percent={key === "grossMargin"}
                    />
                  ))}
                </dl>
                <p className="break-words text-xs text-muted-foreground">
                  {capacity.maximumRepaymentShareOfNetCashFlowBps === null
                    ? intl.formatMessage(m.noPolicy)
                    : intl.formatMessage(m.policy, {
                        share: financialPercent(capacity.maximumRepaymentShareOfNetCashFlowBps),
                        version: decisionCase.policyPack.policyPackVersion,
                        digest: decisionCase.policyPack.policyPackDigest,
                      })}
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{intl.formatMessage(m.reviewReasons)}</h4>
                {capacity.reviewReasons.length ? (
                  <ul className="list-inside list-disc space-y-1 text-xs">
                    {capacity.reviewReasons.map((code, index) => {
                      const key = reviewReasonKeys.find((key) => key === code);
                      return (
                        <li key={`${code}:${index}`}>{key ? intl.formatMessage(m[key]) : intl.formatMessage(m.unknownReason, { code })}</li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{intl.formatMessage(m.noReasons)}</p>
                )}
              </div>
              <p className="break-all text-xs text-muted-foreground">
                {intl.formatMessage(m.calculation, { version: capacity.calculationVersion, digest: decisionCase.snapshot.snapshotDigest })}
              </p>
            </>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
