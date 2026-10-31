import type { OutcomeReport } from "@bitcredit/ai-credit-shared";
import { useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
import { useId } from "react";
import { Card, CardContent } from "@bitcredit/ui-library";
const m = defineMessages({
  title: { id: "outcomeFunnel.title", defaultMessage: "Applicant journey", description: "Operator dashboard outcomeFunnel: title" },
  scope: {
    id: "outcomeFunnel.scope",
    defaultMessage: "Current Mint records · applicant counts, not approval rates",
    description: "Operator dashboard outcomeFunnel: scope",
  },
  opened: { id: "outcomeFunnel.opened", defaultMessage: "Opened", description: "Operator dashboard outcomeFunnel: opened" },
  answered: { id: "outcomeFunnel.answered", defaultMessage: "Answered", description: "Operator dashboard outcomeFunnel: answered" },
  review: { id: "outcomeFunnel.review", defaultMessage: "Reached review", description: "Operator dashboard outcomeFunnel: review" },
  confirmed: { id: "outcomeFunnel.confirmed", defaultMessage: "Confirmed", description: "Operator dashboard outcomeFunnel: confirmed" },
  submitted: { id: "outcomeFunnel.submitted", defaultMessage: "Submitted", description: "Operator dashboard outcomeFunnel: submitted" },
  axis: {
    id: "outcomeFunnel.axis",
    defaultMessage: "Width = applicants · counts shown at every step",
    description: "Operator dashboard outcomeFunnel: axis",
  },
  sample: { id: "outcomeFunnel.sample", defaultMessage: "{count} of {total}", description: "Operator dashboard outcomeFunnel: sample" },
});
export function OutcomeFunnel({ report }: { report: OutcomeReport }) {
  const intl = useIntl();
  const id = useId();
  const j = report.applicantJourney;
  const rows = [
    { label: m.opened, n: j.opened },
    { label: m.answered, n: j.answered.numerator },
    { label: m.review, n: j.reachedReview.numerator },
    { label: m.confirmed, n: j.confirmed.numerator },
    { label: m.submitted, n: j.submitted.numerator },
  ];
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <Card>
      <CardContent className="p-5">
        <figure aria-labelledby={id}>
          <figcaption id={id} className="text-lg font-semibold">
            {intl.formatMessage(m.title)}
          </figcaption>
          <p className="mt-1 text-xs text-muted-foreground">{intl.formatMessage(m.scope)}</p>
          <svg
            viewBox="0 0 720 270"
            role="img"
            className="mt-4 max-h-72 w-full"
            aria-label={rows.map((r) => `${intl.formatMessage(r.label)}: ${r.n}`).join("; ")}
          >
            {rows.map((r, i) => {
              const width = (r.n / max) * 320;
              const next = ((rows[i + 1]?.n ?? r.n) / max) * 320;
              return (
                <g key={r.label.id}>
                  <text x="0" y={27 + i * 45} className="fill-foreground text-[13px]">
                    {intl.formatMessage(r.label)}
                  </text>
                  <path
                    d={`M ${380 - width / 2} ${i * 45 + 4} H ${380 + width / 2} L ${380 + next / 2} ${i * 45 + 42} H ${380 - next / 2} Z`}
                    className="fill-sky-700 dark:fill-sky-400"
                    opacity={1 - i * 0.1}
                  />
                  <text x="590" y={27 + i * 45} className="fill-foreground text-[13px]">
                    {intl.formatMessage(m.sample, { count: r.n, total: j.opened })}
                  </text>
                </g>
              );
            })}
            <text x="0" y="261" className="fill-muted-foreground text-[11px]">
              {intl.formatMessage(m.axis)}
            </text>
          </svg>
        </figure>
      </CardContent>
    </Card>
  );
}
