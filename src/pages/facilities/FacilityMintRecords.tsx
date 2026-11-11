import { useState } from "react";
import {
  type FacilityApplication,
  foldMintRecordEntries,
  type MintRecordEntry,
  mintRecordEntrySchema,
  mintRecordStatusSchema,
  type PriorMintRecords,
} from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormattedDate, FormattedMessage, useIntl } from "react-intl";
import { defineMessages } from "@/i18n/define-messages";
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

/** Exact: amounts are decimal strings of up to 30 digits, which a float would round. */
function exactAmount(value: string, scale = 0) {
  const isNegative = value.startsWith("-");
  const raw = (isNegative ? value.slice(1) : value).padStart(scale + 1, "0");
  const whole = BigInt(raw.slice(0, raw.length - scale)).toLocaleString("en-US");
  return `${isNegative ? "-" : ""}${whole}${scale > 0 ? `.${raw.slice(raw.length - scale)}` : ""}`;
}

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

/** The name the issuing key gives itself in its last entry; the current record does not repeat it. */
function issuerName(issuer: Issuer): string | null {
  const last = issuer.history[issuer.history.length - 1];
  if (!last) return null;
  try {
    const parsed = mintRecordEntrySchema.safeParse(JSON.parse(last.entry));
    return parsed.success ? parsed.data.issuer.name : null;
  } catch {
    return null;
  }
}

const EMAIL_PROOF_CHECK = "Email identity proof";

function IssuerRecord({ issuer, name }: { issuer: Issuer; name: string }) {
  const intl = useIntl();
  const { record, omissions, asOf, sequence } = issuer.current;
  const proofs = record.identityProofs ?? [];
  // AI-Credit rechecks each referenced email proof from the shared IdentityProof block, in order, before any other source.
  const proofChecks = issuer.sourceChecks.filter((check) => check.check === EMAIL_PROOF_CHECK);
  const otherChecks = issuer.sourceChecks.filter((check) => check.check !== EMAIL_PROOF_CHECK);
  const proofResult = (index: number) => (proofChecks.length === proofs.length ? proofChecks[index]?.result : undefined);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {intl.formatMessage(recognition[issuer.recognition])} ·{" "}
          <FormattedMessage
            id="facilities.records.asOf"
            defaultMessage="as of {date} · {count, plural, one {# entry} other {# entries}}"
            values={{ date: intl.formatDate(asOf, { dateStyle: "medium" }), count: sequence }}
          />
        </p>
      </div>
      {proofs.map((proof, index) => {
        const result = proofResult(index);
        return (
          <p key={proof.id} className={`text-sm ${result === "invalid" ? "text-signal-error" : ""}`}>
            <FormattedMessage
              id="facilities.records.emailProof"
              defaultMessage="Email confirmed by {mint} · {date}"
              values={{ mint: name, date: intl.formatDate(proof.issuedAt, { dateStyle: "medium" }) }}
            />
            {result && (
              <span className={`text-xs ${result === "invalid" ? "" : "text-muted-foreground"}`}>
                {" "}
                ·{" "}
                <FormattedMessage
                  id="facilities.records.emailProofCheck"
                  defaultMessage="{result, select, valid {proof valid} invalid {proof invalid} other {cannot be checked here}}"
                  values={{ result }}
                />
              </span>
            )}
          </p>
        );
      })}
      {record.identityCheck?.map((check) => (
        <p key={check.id} className="text-sm">
          {check.check} <span className="text-xs text-muted-foreground">· {intl.formatDate(check.checkedAt, { dateStyle: "medium" })}</span>
        </p>
      ))}
      {issuer.identityReuse.eligibleForReview && (
        <p className="text-sm text-muted-foreground">
          <FormattedMessage
            id="facilities.records.identityReview"
            defaultMessage="You may review {mint}'s recent identity checks under your policy; accountability stays with this Mint."
            values={{ mint: name }}
          />
        </p>
      )}
      {(record.claims?.length ?? 0) > 0 && (
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
          {record.claims?.map((claim) => (
            <div key={claim.id} className="contents">
              <dt className="text-muted-foreground">{intl.formatMessage(topics[claim.topic ?? "other"])}</dt>
              <dd>
                {claim.claim} <span className="text-xs text-muted-foreground">· {intl.formatMessage(evidence[claim.evidenceState])}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
      {record.facilityAgreement?.map((agreement) => (
        <p key={agreement.id} className="text-sm">
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
        <p key={bill.id} className="text-sm">
          <FormattedMessage
            id="facilities.records.bill"
            defaultMessage="Bill: {outcome}"
            values={{ outcome: intl.formatMessage(outcomes[bill.outcome], { days: bill.daysLate ?? 0 }) }}
          />
          {bill.recordedAt && (
            <span className="text-xs text-muted-foreground"> · {intl.formatDate(bill.recordedAt, { dateStyle: "medium" })}</span>
          )}
        </p>
      ))}
      {otherChecks.map((check, index) => (
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
        {record.interview?.map((pair) => (
          <div key={pair.id}>
            <p className="text-xs text-muted-foreground">{pair.question}</p>
            <p className="whitespace-pre-wrap">{pair.answer}</p>
          </div>
        ))}
      </Collapsed>
      <Collapsed
        label={<FormattedMessage id="facilities.records.finances" defaultMessage="Financial figures" />}
        count={record.financialInformation?.length ?? 0}
      >
        {record.financialInformation?.map((figure) => (
          <div key={figure.id}>
            <p className="flex justify-between gap-3">
              <span className="text-muted-foreground">{figure.field}</span>
              <span>
                {figure.unit === undefined
                  ? `${exactAmount(figure.value, figure.minorUnitScale)}${figure.currency ? ` ${figure.currency}` : ""}`
                  : `${figure.value} ${figure.unit}`}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              {[
                figure.period && `${figure.period.startDate} – ${figure.period.endDate}`,
                intl.formatMessage(evidence[figure.evidenceState]),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
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

/** Records an applicant shared from earlier Mints: statements by each Mint as of its date, never this Mint's findings.
 * One issuing Mint at a time: each record is that Mint's own due diligence and is never merged with or set against another's. */
export function PriorMintRecordsSection({ application }: { application: FacilityApplication }) {
  const intl = useIntl();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const prior = application.priorMintRecords;
  // Starting from scratch is not shown: it must never read as a signal.
  if (prior?.choice !== "shared") return null;
  const reply = prior.confirmation?.reply;
  const unnamed = intl.formatMessage({ id: "facilities.records.unnamedMint", defaultMessage: "Unnamed Mint" });
  const names = prior.issuers.map((issuer) => issuerName(issuer) ?? unnamed);
  // Two Mints may give themselves the same name; number them so the selector stays usable without showing keys.
  const labels = names.map((name, index) =>
    names.filter((other) => other === name).length > 1
      ? `${name} (${String(names.slice(0, index + 1).filter((other) => other === name).length)})`
      : name
  );
  const selectedIndex = Math.max(
    0,
    prior.issuers.findIndex((issuer) => issuer.signingKey === selectedKey)
  );
  const selected = prior.issuers[selectedIndex];
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
      {prior.issuers.length > 1 && (
        <div
          className="mt-4 flex flex-wrap gap-1"
          role="group"
          aria-label={intl.formatMessage({ id: "facilities.records.mints", defaultMessage: "Shared records by Mint" })}
        >
          {prior.issuers.map((issuer, index) => (
            <Button
              key={issuer.signingKey}
              size="sm"
              variant={index === selectedIndex ? "outline" : "ghost"}
              aria-pressed={index === selectedIndex}
              onClick={() => setSelectedKey(issuer.signingKey)}
            >
              {labels[index]}
            </Button>
          ))}
        </div>
      )}
      {selected && (
        <div className="mt-4">
          <IssuerRecord key={selected.signingKey} issuer={selected} name={labels[selectedIndex] ?? unnamed} />
        </div>
      )}
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

function parseEntry(signed: { entry: string }): MintRecordEntry | null {
  try {
    const parsed = mintRecordEntrySchema.safeParse(JSON.parse(signed.entry));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** The bills in this Mint's current record: entries carry only new or corrected items, so all of them are folded. */
function recordedBills(entries: { entry: string }[]): string[] {
  const parsed = entries.map(parseEntry);
  if (parsed.length === 0 || parsed.some((entry) => entry === null)) return [];
  try {
    return (foldMintRecordEntries(parsed as MintRecordEntry[]).record.instruments ?? []).map((bill) => bill.billId);
  } catch {
    return [];
  }
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
  // No record for this applicant yet is not an error; anything else must not look like an empty record.
  if (status.error instanceof FacilityRequestError && status.error.status === 404) return null;
  if (status.isError)
    return (
      <section className="rounded-lg border border-border bg-card p-5 md:p-6" role="alert">
        <h3 className="font-medium">
          <FormattedMessage id="facilities.records.own.title" defaultMessage="Your record in the applicant's profile" />
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          <FormattedMessage id="facilities.records.own.readFailed" defaultMessage="This Mint's record status could not be read." />
        </p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => void status.refetch()}>
          <FormattedMessage id="facilities.records.own.retry" defaultMessage="Try again" />
        </Button>
      </section>
    );
  if (!status.data) return null;
  const lastIssued = status.data.entries[status.data.entries.length - 1];
  const latest = lastIssued ? parseEntry(lastIssued) : null;
  const bills = recordedBills(status.data.entries);
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
