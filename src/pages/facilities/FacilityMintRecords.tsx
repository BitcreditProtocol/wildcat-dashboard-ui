import { useState } from "react";
import {
  type FacilityApplication,
  type MintRecordEntry,
  mintRecordEntrySchema,
  mintRecordStatusSchema,
  type PriorMintRecords,
} from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defineMessages, FormattedDate, FormattedMessage, useIntl } from "react-intl";
import { authenticatedFetch } from "@/lib/api-client";
import { FacilityRequestError } from "./facility-api";

const topics = defineMessages({
  business: { id: "facilities.records.topic.business", defaultMessage: "Business" },
  purpose: { id: "facilities.records.topic.purpose", defaultMessage: "Purpose" },
  buyers: { id: "facilities.records.topic.buyers", defaultMessage: "Buyers" },
  timing: { id: "facilities.records.topic.timing", defaultMessage: "Payment timing" },
  other: { id: "facilities.records.topic.other", defaultMessage: "Statement" },
});
const evidence = defineMessages({
  applicant_statement: { id: "facilities.records.evidence.statement", defaultMessage: "applicant statement" },
  applicant_confirmed: { id: "facilities.records.evidence.confirmed", defaultMessage: "confirmed by the applicant" },
  corroborated: { id: "facilities.records.evidence.corroborated", defaultMessage: "corroborated" },
  verified: { id: "facilities.records.evidence.verified", defaultMessage: "verified" },
  contradicted: { id: "facilities.records.evidence.contradicted", defaultMessage: "contradicted" },
});
const recognition = defineMessages({
  followed: { id: "facilities.records.recognition.followed", defaultMessage: "Mint you follow" },
  directory: { id: "facilities.records.recognition.directory", defaultMessage: "Listed in the public directory" },
  unknown: { id: "facilities.records.recognition.unknown", defaultMessage: "Key not known here" },
});
const outcomes = defineMessages({
  paid_on_time: { id: "facilities.records.outcome.onTime", defaultMessage: "Paid on time" },
  paid_late: { id: "facilities.records.outcome.late", defaultMessage: "Paid {days, plural, one {# day} other {# days}} late" },
  unpaid: { id: "facilities.records.outcome.unpaid", defaultMessage: "Unpaid" },
  recourse_used: { id: "facilities.records.outcome.recourse", defaultMessage: "Recourse used" },
  unknown: { id: "facilities.records.outcome.unknown", defaultMessage: "Not recorded" },
});
const lateOption = { id: "facilities.records.outcome.lateOption", defaultMessage: "Paid late" };
const reasons = defineMessages({
  applicant_request: { id: "facilities.records.reason.request", defaultMessage: "asked for by the applicant" },
  instrument_outcome: { id: "facilities.records.reason.outcome", defaultMessage: "repayment recorded" },
  correction: { id: "facilities.records.reason.correction", defaultMessage: "correction" },
  facility_decision: { id: "facilities.records.reason.decision", defaultMessage: "facility decision" },
  wind_down: { id: "facilities.records.reason.windDown", defaultMessage: "final entry" },
});

type Issuer = PriorMintRecords["issuers"][number];

function Collapsed({ label, count, children }: { label: React.ReactNode; count: number; children: React.ReactNode }) {
  if (count === 0) return null;
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-muted-foreground">
        {label} · {count}
      </summary>
      <div className="mt-2 space-y-2 pl-3">{children}</div>
    </details>
  );
}

function IssuerRecord({ issuer }: { issuer: Issuer }) {
  const intl = useIntl();
  const { record, omissions } = issuer.latest;
  const reusableCheck = issuer.identityReuse.eligibleForReview ? record.identityCheck?.[record.identityCheck.length - 1] : undefined;
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{issuer.latest.issuer.name}</p>
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(recognition[issuer.recognition])} ·{" "}
          <FormattedMessage
            id="facilities.records.asOf"
            defaultMessage="as of {date} · {count, plural, one {# entry} other {# entries}}"
            values={{ date: intl.formatDate(issuer.latest.createdAt, { dateStyle: "medium" }), count: issuer.history.length }}
          />
        </p>
      </div>
      {(record.claims?.length ?? 0) > 0 && (
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          {record.claims?.map((claim, index) => (
            <div key={`${String(index)}-${claim.topic ?? "other"}`} className="contents">
              <dt className="text-muted-foreground">{intl.formatMessage(topics[claim.topic ?? "other"])}</dt>
              <dd>
                {claim.claim} <span className="text-xs text-muted-foreground">· {intl.formatMessage(evidence[claim.evidenceState])}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {record.facilityAgreement?.map((agreement, index) => (
        <p key={`agreement-${String(index)}`} className="text-sm">
          <FormattedMessage
            id="facilities.records.agreement"
            defaultMessage="Facility agreement: {status}{limit, select, none {} other {, limit {limit} sat}}"
            values={{
              status: agreement.status,
              limit: agreement.limitSat ? BigInt(agreement.limitSat).toLocaleString(intl.locale) : "none",
            }}
          />
        </p>
      ))}
      {record.instruments?.map((bill) => (
        <p key={bill.billId} className="flex justify-between gap-3 text-sm">
          <span className="truncate font-mono text-xs text-muted-foreground">{bill.billId}</span>
          <span className="shrink-0">{intl.formatMessage(outcomes[bill.outcome], { days: bill.daysLate ?? 0 })}</span>
        </p>
      ))}
      {reusableCheck && (
        <p className="text-sm">
          <FormattedMessage
            id="facilities.records.identityReuse"
            defaultMessage="{mint} checked identity key control on {date}. You may review it under your policy; accountability stays with this Mint."
            values={{ mint: issuer.latest.issuer.name, date: intl.formatDate(reusableCheck.checkedAt, { dateStyle: "medium" }) }}
          />
        </p>
      )}
      {issuer.sourceChecks.map((check, index) => (
        <p key={`${check.check}-${String(index)}`} className={`text-sm ${check.result === "invalid" ? "text-signal-error" : ""}`}>
          <FormattedMessage
            id="facilities.records.sourceCheck"
            defaultMessage="Re-checked here: {check} — {result, select, valid {signature valid} invalid {signature invalid} other {cannot be checked here}}"
            values={{ check: check.check, result: check.result }}
          />
        </p>
      ))}
      {issuer.disputes.map((dispute) => (
        <p key={`${String(dispute.entryBlockId)}-${String(dispute.createdAt)}`} className="rounded-md bg-signal-alert/10 p-2 text-sm">
          <FormattedMessage
            id="facilities.records.dispute"
            defaultMessage="The applicant disputes this record: {statement}"
            values={{ statement: dispute.statement }}
          />
        </p>
      ))}
      <Collapsed
        label={<FormattedMessage id="facilities.records.answers" defaultMessage="Answers" />}
        count={record.interview?.length ?? 0}
      >
        {record.interview?.map((pair, index) => (
          <div key={`${String(index)}-${pair.submittedAt}`}>
            <p className="text-xs text-muted-foreground">{pair.question}</p>
            <p className="whitespace-pre-wrap">{pair.answer}</p>
          </div>
        ))}
      </Collapsed>
      <Collapsed
        label={<FormattedMessage id="facilities.records.finances" defaultMessage="Financial figures" />}
        count={record.financialInformation?.length ?? 0}
      >
        {record.financialInformation?.map((figure, index) => (
          <p key={`${figure.field}-${String(index)}`} className="flex justify-between gap-3">
            <span className="text-muted-foreground">{figure.field}</span>
            <span>
              {figure.value} {figure.unit ?? figure.currency ?? ""}
              {figure.minorUnitScale ? ` (×10^-${String(figure.minorUnitScale)})` : ""}
            </span>
          </p>
        ))}
      </Collapsed>
      <Collapsed label={<FormattedMessage id="facilities.records.omitted" defaultMessage="Not in this record" />} count={omissions.length}>
        {omissions.map((omission, index) => (
          <p key={`${omission.section}-${String(index)}`} className="text-muted-foreground">
            {omission.reason}
          </p>
        ))}
      </Collapsed>
    </div>
  );
}

/** Records an applicant shared from earlier Mints: statements by each Mint as of its date, never this Mint's findings. */
export function PriorMintRecordsSection({ application }: { application: FacilityApplication }) {
  const intl = useIntl();
  const prior = application.priorMintRecords;
  // Starting from scratch is not shown: it must never read as a signal.
  if (prior?.choice !== "shared") return null;
  const reply = prior.confirmation?.reply;
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <h3 className="font-medium">
        <FormattedMessage id="facilities.records.title" defaultMessage="Shared from earlier Mints" />
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        <FormattedMessage
          id="facilities.records.provenance"
          defaultMessage="Shared by the applicant on {date}. Each Mint signed its own statements as of their date; a signature shows what that Mint recorded, not that it is true."
          values={{ date: intl.formatDate(prior.chosenAt, { dateStyle: "medium", timeStyle: "short" }) }}
        />
      </p>
      {reply && (
        <p className="mt-3 text-sm">
          {reply.decision === "confirmed" ? (
            <FormattedMessage id="facilities.records.confirmed" defaultMessage="The applicant confirmed this record is still correct." />
          ) : (
            <FormattedMessage
              id="facilities.records.corrected"
              defaultMessage="The applicant corrected: {corrections}"
              values={{
                corrections: Object.entries(reply.corrections)
                  .map(([topic, text]) => `${intl.formatMessage(topics[topic as keyof typeof topics])}: ${text}`)
                  .join(" · "),
              }}
            />
          )}
        </p>
      )}
      <div className="mt-4 space-y-4">
        {prior.issuers.map((issuer) => (
          <IssuerRecord key={issuer.signingKey} issuer={issuer} />
        ))}
      </div>
    </section>
  );
}

async function mintRecordCommand(body: unknown) {
  const response = await authenticatedFetch("/api/ai-credit/mint-record-operator-command", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new FacilityRequestError(response.status);
  return mintRecordStatusSchema.parse(await response.json());
}

function latestEntry(entries: { entry: string }[]): MintRecordEntry | null {
  const last = entries[entries.length - 1];
  if (!last) return null;
  const parsed = mintRecordEntrySchema.safeParse(JSON.parse(last.entry));
  return parsed.success ? parsed.data : null;
}

type Outcome = "paid_on_time" | "paid_late" | "unpaid" | "recourse_used";

/** This Mint's own record in the applicant's chain: what it issued, disputes it received, and repayment it records. */
export function MintRecordStatusSection({ application }: { application: FacilityApplication }) {
  const intl = useIntl();
  const queryClient = useQueryClient();
  const queryKey = ["ai-credit", "mint-record", application.applicantRef] as const;
  const status = useQuery({
    queryKey,
    queryFn: () => mintRecordCommand({ action: "read", subjectNodeId: application.applicantRef }),
    retry: false,
  });
  const [billId, setBillId] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("paid_on_time");
  const [daysLate, setDaysLate] = useState("1");
  const record = useMutation({
    mutationFn: (bill: string) =>
      mintRecordCommand({
        action: "record_outcome",
        commandId: crypto.randomUUID(),
        subjectNodeId: application.applicantRef,
        outcome: { billId: bill, outcome, ...(outcome === "paid_late" ? { daysLate: Number(daysLate) } : {}) },
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },
  });
  if (!status.data) return null;
  const latest = latestEntry(status.data.entries);
  const bills = [
    ...new Set([
      ...(latest?.record.chainReferences?.bills.map((bill) => bill.billId) ?? []),
      ...(latest?.record.instruments?.map((bill) => bill.billId) ?? []),
    ]),
  ];
  const selected = billId || bills[0] || "";
  return (
    <section className="rounded-lg border border-border bg-card p-5 md:p-6">
      <h3 className="font-medium">
        <FormattedMessage id="facilities.records.own.title" defaultMessage="Your record in the applicant's profile" />
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {latest ? (
          <FormattedMessage
            id="facilities.records.own.latest"
            defaultMessage="{count, plural, one {# entry} other {# entries}} · latest {date}, {reason}"
            values={{
              count: status.data.entries.length,
              date: intl.formatDate(latest.createdAt, { dateStyle: "medium", timeStyle: "short" }),
              reason: intl.formatMessage(reasons[latest.reason]),
            }}
          />
        ) : (
          <FormattedMessage
            id="facilities.records.own.none"
            defaultMessage="No entry issued yet. One is issued after a facility decision and whenever the applicant asks."
          />
        )}
      </p>
      {status.data.disputes.map((dispute) => (
        <p key={dispute.id} className="mt-3 rounded-md bg-signal-alert/10 p-2 text-sm">
          <FormattedMessage
            id="facilities.records.own.dispute"
            defaultMessage="Disputed on {date}: {statement}"
            values={{ date: <FormattedDate value={dispute.createdAt} dateStyle="medium" />, statement: dispute.statement }}
          />
        </p>
      ))}
      {bills.length > 0 && !status.data.woundDown && (
        <form
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            record.mutate(selected);
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            <FormattedMessage id="facilities.records.own.bill" defaultMessage="How was this bill repaid?" />
            <select
              className="h-9 rounded-md border border-border bg-background px-2 font-mono text-xs text-foreground"
              value={selected}
              onChange={(event) => setBillId(event.target.value)}
            >
              {bills.map((bill) => (
                <option key={bill} value={bill}>
                  {bill}
                </option>
              ))}
            </select>
          </label>
          <select
            aria-label={intl.formatMessage({ id: "facilities.records.own.outcome", defaultMessage: "Repayment" })}
            className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={outcome}
            onChange={(event) => setOutcome(event.target.value as Outcome)}
          >
            {(["paid_on_time", "paid_late", "unpaid", "recourse_used"] as const).map((value) => (
              <option key={value} value={value}>
                {intl.formatMessage(value === "paid_late" ? lateOption : outcomes[value], { days: 0 })}
              </option>
            ))}
          </select>
          {outcome === "paid_late" && (
            <input
              aria-label={intl.formatMessage({ id: "facilities.records.own.daysLate", defaultMessage: "Days late" })}
              className="h-9 w-20 rounded-md border border-border bg-background px-2 text-sm"
              type="number"
              min={1}
              value={daysLate}
              onChange={(event) => setDaysLate(event.target.value)}
            />
          )}
          <Button size="sm" type="submit" disabled={record.isPending || !selected}>
            <FormattedMessage id="facilities.records.own.record" defaultMessage="Record" />
          </Button>
          {record.isError && (
            <p className="basis-full text-sm text-signal-error" role="alert">
              {record.error instanceof FacilityRequestError && record.error.status === 403 ? (
                <FormattedMessage id="facilities.records.own.approverOnly" defaultMessage="Only an approver can record repayment." />
              ) : (
                <FormattedMessage id="facilities.records.own.failed" defaultMessage="Could not record this. Try again." />
              )}
            </p>
          )}
          <p className="basis-full text-xs text-muted-foreground">
            <FormattedMessage
              id="facilities.records.own.note"
              defaultMessage="Recording a repayment adds a new entry to the applicant's record. The applicant sees it and can dispute it."
            />
          </p>
        </form>
      )}
    </section>
  );
}
