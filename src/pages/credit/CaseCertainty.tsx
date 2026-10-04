import { CircleAlert, CircleCheck, FileCheck2, MessageSquareQuote } from "lucide-react";
import type { ReactNode } from "react";
import { defineMessages, useIntl, type MessageDescriptor } from "react-intl";
import type { CaseBrief } from "./case-brief";
import { calendarDate } from "./case-brief-copy";

/**
 * How sure the Mint can be about a case, one line per fact, sorted by what backs it: records the
 * applicant cannot write (verified), the applicant's own documents (checked), the applicant's word
 * alone, and what is still open. Each source links to the record behind it, for the operator's own
 * check. Display only: governed code decides what any of it permits.
 */

type Level = "verified" | "checked" | "stated" | "open";

interface CertaintyItem {
  level: Level;
  text: ReactNode;
  source: string;
  href?: string;
}

const messages = defineMessages({
  title: { id: "credit.certainty.title", defaultMessage: "How sure we are", description: "Heading of the case certainty section" },
  established: {
    id: "credit.certainty.established",
    defaultMessage: "Established",
    description: "Facts backed by records or documents",
  },
  uncertain: {
    id: "credit.certainty.uncertain",
    defaultMessage: "Applicant's word, or open",
    description: "Facts backed only by the applicant, and unresolved points",
  },
  summary: {
    id: "credit.certainty.summary",
    defaultMessage: "{established} established · {stated} applicant's word · {open} open",
    description: "Counts of facts per certainty level",
  },
  nothingEstablished: {
    id: "credit.certainty.nothingEstablished",
    defaultMessage: "Nothing is established by a record or document yet.",
    description: "No verified or checked facts",
  },
  nothingUncertain: {
    id: "credit.certainty.nothingUncertain",
    defaultMessage: "Nothing rests on the applicant's word alone.",
    description: "No stated-only facts and no open points",
  },
  billAccepted: {
    id: "credit.certainty.billAccepted",
    defaultMessage: "{payer} accepted the eBill and owes it at maturity",
    description: "Verified: the payer signed acceptance",
  },
  billNotAccepted: {
    id: "credit.certainty.billNotAccepted",
    defaultMessage: "{payer} has not accepted the eBill",
    description: "Open: no payer acceptance recorded",
  },
  acceptanceUnknown: {
    id: "credit.certainty.acceptanceUnknown",
    defaultMessage: "Payer acceptance is not in this assessment",
    description: "Open: the assessment does not record whether the payer accepted",
  },
  protocolSource: {
    id: "credit.certainty.protocolSource",
    defaultMessage: "eBill record · acceptance, not ability to pay",
    description: "Source: signed eBill chain; acceptance does not show the payer can pay",
  },
  payerRisk: {
    id: "credit.certainty.payerRisk",
    defaultMessage: "Payer risk recorded: {pd} chance of non-payment, {lgd} lost if unpaid",
    description: "Verified: the Mint-signed payer risk record",
  },
  payerRiskPlain: {
    id: "credit.certainty.payerRiskPlain",
    defaultMessage: "Payer risk recorded by the Mint",
    description: "Verified: the Mint-signed payer risk record without its values",
  },
  syntheticData: {
    id: "credit.certainty.syntheticData",
    defaultMessage: "Synthetic test data",
    description: "Source prefix: the Mint or assessor record behind this line is synthetic test data, not a real assessment",
  },
  payerRiskSource: {
    id: "credit.certainty.payerRiskSource",
    defaultMessage: "Mint-signed record",
    description: "Source of the payer risk record; signed means authentic, not true",
  },
  mintRecordSource: {
    id: "credit.certainty.mintRecordSource",
    defaultMessage: "Mint-signed record, corroborated",
    description: "Source: the Mint's own signed record; corroborated evidence",
  },
  independentRecordSource: {
    id: "credit.certainty.independentRecordSource",
    defaultMessage: "Independent assessor, independently verified",
    description: "Source: an assessor admitted by the policy, not the Mint; independently verified evidence",
  },
  payerRiskUnusable: {
    id: "credit.certainty.payerRiskUnusable",
    defaultMessage: "Payer risk record is {state}",
    description: "Open: the payer risk record exists but its evidence is not usable (stale, unavailable, contradicted…)",
  },
  duplicateConflictingBill: {
    id: "credit.certainty.duplicateConflictingBill",
    defaultMessage: "Another bill conflicts with this one",
    description: "Open: the double-financing check found a conflicting bill",
  },
  duplicateReusedInvoice: {
    id: "credit.certainty.duplicateReusedInvoice",
    defaultMessage: "The invoice behind this bill was used for another bill",
    description: "Open: the double-financing check found the invoice reused",
  },
  duplicateAlreadyFinanced: {
    id: "credit.certainty.duplicateAlreadyFinanced",
    defaultMessage: "This bill is already financed",
    description: "Open: the bill is recorded as already financed; a hard gate",
  },
  duplicateUnknown: {
    id: "credit.certainty.duplicateUnknown",
    defaultMessage: "Double-financing check has no usable result",
    description: "Open: the double-financing check is unknown or its evidence is not usable",
  },
  contradictions: {
    id: "credit.certainty.contradictions",
    defaultMessage: "{count, plural, one {# unresolved contradiction} other {# unresolved contradictions}} between claims and records",
    description: "Open: deterministic checks found conflicts that still block the case",
  },
  checksSource: {
    id: "credit.certainty.checksSource",
    defaultMessage: "Deterministic case checks",
    description: "Source: rule-based checks over the case snapshot",
  },
  validThrough: { id: "credit.certainty.validThrough", defaultMessage: "valid through {date}", description: "Validity of a record" },
  notAGuarantee: {
    id: "credit.certainty.notAGuarantee",
    defaultMessage: "not a guarantee of payment",
    description: "A risk record does not guarantee the payer pays",
  },
  noPayerRisk: {
    id: "credit.certainty.noPayerRisk",
    defaultMessage: "No record of the payer's risk",
    description: "Open: the payer risk record is missing",
  },
  duplicateClear: {
    id: "credit.certainty.duplicateClear",
    defaultMessage: "No other financing of this bill found",
    description: "Verified: duplicate financing check is clear",
  },
  mintCheckSource: {
    id: "credit.certainty.mintCheckSource",
    defaultMessage: "Mint records only, not other Mints",
    description: "Source: a Mint-owned check that cannot see other Mints",
  },
  invoiceConsistent: {
    id: "credit.certainty.invoiceConsistent",
    defaultMessage: "Invoice matches the eBill",
    description: "Checked: the applicant's invoice agrees with the bill",
  },
  invoiceConflict: {
    id: "credit.certainty.invoiceConflict",
    defaultMessage: "Invoice conflicts with the eBill",
    description: "Open: the applicant's invoice disagrees with the bill",
  },
  invoiceUnchecked: {
    id: "credit.certainty.invoiceUnchecked",
    defaultMessage: "Invoice not checked yet",
    description: "Open: the invoice was not compared with the bill",
  },
  invoiceAbsent: {
    id: "credit.certainty.invoiceAbsent",
    defaultMessage: "No invoice submitted",
    description: "Open: no underlying trade document",
  },
  documentSource: {
    id: "credit.certainty.documentSource",
    defaultMessage: "Applicant's document, not independent confirmation",
    description: "Source: a document the applicant supplied",
  },
  useOfFunds: {
    id: "credit.certainty.useOfFunds",
    defaultMessage: "Uses the funds for: {answer}",
    description: "Stated: the applicant's use of funds",
  },
  repayment: {
    id: "credit.certainty.repayment",
    defaultMessage: "How the bill gets paid: {answer}",
    description: "Stated: the applicant's account of how and when the payer pays the bill",
  },
  noAnswer: {
    id: "credit.certainty.noAnswer",
    defaultMessage: "no answer recorded",
    description: "The applicant gave no answer",
  },
  recourseAcknowledged: {
    id: "credit.certainty.recourseAcknowledged",
    defaultMessage: "Acknowledged being liable for the whole bill if the payer does not pay",
    description: "Stated: the applicant confirmed whole-bill liability by endorsement, the Mint's fallback if the payer does not pay",
  },
  recourseMissing: {
    id: "credit.certainty.recourseMissing",
    defaultMessage: "Has not acknowledged being liable for the whole bill",
    description: "Open: the applicant has not confirmed whole-bill liability",
  },
  confirmationSource: {
    id: "credit.certainty.confirmationSource",
    defaultMessage: "Applicant's confirmation",
    description: "Source: the applicant's recorded confirmation of their answers",
  },
  abilityNotAssessed: {
    id: "credit.certainty.abilityNotAssessed",
    defaultMessage: "ability to pay not assessed",
    description: "Nothing in the case assesses whether the applicant could pay the bill themselves",
  },
  assessedOn: {
    id: "credit.certainty.assessedOn",
    defaultMessage: "Assessed {date}",
    description: "Date of the case snapshot the facts below come from",
  },
  applicantSource: {
    id: "credit.certainty.applicantSource",
    defaultMessage: "Applicant's interview answer",
    description: "Source: the applicant's own statement",
  },
  openPoints: {
    id: "credit.certainty.openPoints",
    defaultMessage: "{count, plural, one {# point the agent flagged is not resolved} other {# points the agents flagged are not resolved}}",
    description: "Open: agent-flagged points nobody has asked or answered",
  },
  agentSource: {
    id: "credit.certainty.agentSource",
    defaultMessage: "Agent review · see open points",
    description: "Source: agent review, linked to the open points",
  },
});

const levelMessages = defineMessages({
  verified: {
    id: "credit.certainty.level.verified",
    defaultMessage: "Recorded independently of the applicant",
    description: "Certainty level: an eBill or Mint record; authentic, not proof of truth or payment",
  },
  checked: {
    id: "credit.certainty.level.checked",
    defaultMessage: "Consistent with the applicant's documents",
    description: "Certainty level: matches documents the applicant supplied",
  },
  stated: {
    id: "credit.certainty.level.stated",
    defaultMessage: "Applicant's word",
    description: "Certainty level: applicant statement only",
  },
  open: { id: "credit.certainty.level.open", defaultMessage: "Open", description: "Certainty level: unresolved" },
});

const LEVELS: Record<Level, { icon: typeof CircleCheck; className: string; label: MessageDescriptor }> = {
  verified: { icon: CircleCheck, className: "text-signal-success", label: levelMessages.verified },
  checked: { icon: FileCheck2, className: "text-signal-success", label: levelMessages.checked },
  stated: { icon: MessageSquareQuote, className: "text-muted-foreground", label: levelMessages.stated },
  open: { icon: CircleAlert, className: "text-signal-alert", label: levelMessages.open },
};

function Item({ item }: { item: CertaintyItem }) {
  const intl = useIntl();
  const { icon: Icon, className, label } = LEVELS[item.level];
  return (
    <li className="flex gap-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${className}`} aria-hidden="true" />
      <span className="min-w-0">
        <span className="sr-only">{intl.formatMessage(label)}: </span>
        <span className="block text-sm">{item.text}</span>
        <span className="block text-xs text-muted-foreground">
          {item.href ? (
            <a href={item.href} className="underline decoration-dotted underline-offset-2 hover:text-foreground hover:decoration-solid">
              {item.source}
            </a>
          ) : (
            item.source
          )}
        </span>
      </span>
    </li>
  );
}

const USABLE_EVIDENCE = new Set(["corroborated", "independently_verified"]);
const words = (value: string) => value.replace(/_/g, " ");

export function CaseCertainty({
  brief,
  billAcceptanceState,
  payerName,
  useOfFunds,
  repaymentSource,
  acceptorRisk,
  synthetic,
  recourseAcknowledged,
  duplicateCheck,
  alreadyFinanced,
  contradictions = 0,
  openPoints,
  assessedOn,
}: {
  brief: CaseBrief;
  billAcceptanceState?: string;
  payerName: string;
  useOfFunds?: string;
  repaymentSource?: string;
  /** The payer's risk record as the case snapshot holds it. */
  acceptorRisk?: {
    probabilityOfDefaultBps: number | null;
    lossGivenDefaultBps: number | null;
    validThrough: string;
    evidenceState?: string;
  };
  /** The case's inputs or policy are synthetic; every Mint or assessor record then says so. */
  synthetic: boolean;
  /** The applicant's confirmed acknowledgment of whole-bill liability, as the snapshot holds it. */
  recourseAcknowledged?: boolean;
  duplicateCheck?: { result: string; evidenceState: string };
  alreadyFinanced?: boolean | null;
  /** Unresolved contradictions in the case snapshot. */
  contradictions?: number;
  openPoints: number;
  /** The snapshot's as-of date (YYYY-MM-DD). */
  assessedOn?: string;
}) {
  const intl = useIntl();
  const percent = (bps: number) => intl.formatNumber(bps / 10_000, { style: "percent", minimumFractionDigits: 2 });
  const { support } = brief;
  const items: CertaintyItem[] = [];
  const recordSource = (evidenceState: string | undefined, fallback: MessageDescriptor) =>
    intl.formatMessage(
      evidenceState === "corroborated"
        ? messages.mintRecordSource
        : evidenceState === "independently_verified"
          ? messages.independentRecordSource
          : fallback
    );
  // Mint and assessor records come from the case snapshot, so synthetic test data is named on each of them.
  const fromRecord = (...parts: string[]) => [...(synthetic ? [intl.formatMessage(messages.syntheticData)] : []), ...parts].join(" · ");

  // Only acceptance counts: the policy admits accepted bills, and an endorsement says nothing about the payer.
  const accepted = billAcceptanceState === "accepted";
  items.push({
    level: accepted ? "verified" : "open",
    text: intl.formatMessage(
      accepted ? messages.billAccepted : billAcceptanceState === undefined ? messages.acceptanceUnknown : messages.billNotAccepted,
      { payer: payerName }
    ),
    source: intl.formatMessage(messages.protocolSource),
    href: "#bill-record",
  });

  // The payer's risk: read from the record itself, so a record from an independent assessor is not reported missing.
  const pd = acceptorRisk?.probabilityOfDefaultBps ?? null;
  const lgd = acceptorRisk?.lossGivenDefaultBps ?? null;
  if (acceptorRisk !== undefined && pd !== null && lgd !== null && USABLE_EVIDENCE.has(acceptorRisk.evidenceState ?? "")) {
    items.push({
      level: "verified",
      text: intl.formatMessage(messages.payerRisk, { pd: percent(pd), lgd: percent(lgd) }),
      source: fromRecord(
        recordSource(acceptorRisk.evidenceState, messages.payerRiskSource),
        intl.formatMessage(messages.validThrough, { date: calendarDate(intl, acceptorRisk.validThrough) }),
        intl.formatMessage(messages.notAGuarantee)
      ),
      href: "#full-governed-assessment",
    });
  } else if (acceptorRisk?.evidenceState !== undefined && !USABLE_EVIDENCE.has(acceptorRisk.evidenceState)) {
    items.push({
      level: "open",
      text: intl.formatMessage(messages.payerRiskUnusable, { state: words(acceptorRisk.evidenceState) }),
      source: fromRecord(intl.formatMessage(messages.payerRiskSource)),
      href: "#full-governed-assessment",
    });
  } else if (acceptorRisk === undefined && support.acceptorRiskRecord) {
    items.push({
      level: "verified",
      text: intl.formatMessage(messages.payerRiskPlain),
      source: fromRecord(intl.formatMessage(messages.mintRecordSource), intl.formatMessage(messages.notAGuarantee)),
      href: "#full-governed-assessment",
    });
  } else {
    items.push({
      level: "open",
      text: intl.formatMessage(messages.noPayerRisk),
      source: intl.formatMessage(messages.mintCheckSource),
      href: "#full-governed-assessment",
    });
  }

  // Double financing: a hard gate, so every outcome other than a usable clear check is open.
  const duplicateMessages: Record<string, MessageDescriptor> = {
    conflicting_bill: messages.duplicateConflictingBill,
    reused_invoice: messages.duplicateReusedInvoice,
    already_financed: messages.duplicateAlreadyFinanced,
  };
  if (duplicateCheck !== undefined) {
    const clear = duplicateCheck.result === "clear" && USABLE_EVIDENCE.has(duplicateCheck.evidenceState);
    items.push({
      level: clear ? "verified" : "open",
      text: intl.formatMessage(clear ? messages.duplicateClear : (duplicateMessages[duplicateCheck.result] ?? messages.duplicateUnknown)),
      source: fromRecord(recordSource(duplicateCheck.evidenceState, messages.mintCheckSource)),
      href: "#full-governed-assessment",
    });
  } else if (support.duplicateCheckClear) {
    items.push({
      level: "verified",
      text: intl.formatMessage(messages.duplicateClear),
      source: fromRecord(intl.formatMessage(messages.mintCheckSource)),
      href: "#full-governed-assessment",
    });
  }
  if (alreadyFinanced === true && duplicateCheck?.result !== "already_financed") {
    items.push({
      level: "open",
      text: intl.formatMessage(messages.duplicateAlreadyFinanced),
      source: intl.formatMessage(messages.protocolSource),
      href: "#bill-record",
    });
  }
  if (contradictions > 0) {
    items.push({
      level: "open",
      text: intl.formatMessage(messages.contradictions, { count: contradictions }),
      source: intl.formatMessage(messages.checksSource),
      href: "#documents-and-evidence",
    });
  }

  const invoice = {
    consistent: { level: "checked" as const, message: messages.invoiceConsistent },
    conflict: { level: "open" as const, message: messages.invoiceConflict },
    unchecked: { level: "open" as const, message: messages.invoiceUnchecked },
    absent: { level: "open" as const, message: messages.invoiceAbsent },
  }[support.invoice];
  items.push({
    level: invoice.level,
    text: intl.formatMessage(invoice.message),
    source: intl.formatMessage(messages.documentSource),
    href: "#documents-and-evidence",
  });

  // Confirmed claims are the applicant's own statements; an empty answer is a gap, not a statement.
  for (const [value, message] of [
    [useOfFunds, messages.useOfFunds],
    [repaymentSource, messages.repayment],
  ] as const) {
    const answered = Boolean(value?.trim());
    items.push({
      level: answered ? "stated" : "open",
      text: intl.formatMessage(message, { answer: answered ? value : intl.formatMessage(messages.noAnswer) }),
      source: intl.formatMessage(messages.applicantSource),
      href: "#case-conversation",
    });
  }
  // The Mint's fallback if the payer does not pay: the applicant's liability as endorser. Acknowledging it
  // is the applicant's word; whether they could pay is not part of the case.
  if (recourseAcknowledged !== undefined) {
    items.push({
      level: recourseAcknowledged ? "stated" : "open",
      text: intl.formatMessage(recourseAcknowledged ? messages.recourseAcknowledged : messages.recourseMissing),
      source: [
        intl.formatMessage(messages.confirmationSource),
        ...(recourseAcknowledged ? [intl.formatMessage(messages.abilityNotAssessed)] : []),
      ].join(" · "),
      href: "#case-conversation",
    });
  }
  if (openPoints > 0) {
    items.push({
      level: "open",
      text: intl.formatMessage(messages.openPoints, { count: openPoints }),
      source: intl.formatMessage(messages.agentSource),
      href: "#case-open-points-title",
    });
  }

  const established = items.filter((item) => item.level === "verified" || item.level === "checked");
  const stated = items.filter((item) => item.level === "stated");
  const open = items.filter((item) => item.level === "open");
  const uncertain = [...open, ...stated];

  return (
    <section aria-labelledby="case-certainty-title" className="border-b border-border px-6 py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="case-certainty-title" className="text-base font-semibold">
          {intl.formatMessage(messages.title)}
        </h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {assessedOn !== undefined && `${intl.formatMessage(messages.assessedOn, { date: calendarDate(intl, assessedOn) })} · `}
          {intl.formatMessage(messages.summary, { established: established.length, stated: stated.length, open: open.length })}
        </p>
      </div>
      <div className="@container mt-4">
        <div className="grid gap-6 @xl:grid-cols-2">
          <div>
            <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage(messages.established)}
            </h3>
            {established.length > 0 ? (
              <ul className="space-y-3">
                {established.map((item, index) => (
                  <Item key={index} item={item} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.nothingEstablished)}</p>
            )}
          </div>
          <div>
            <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {intl.formatMessage(messages.uncertain)}
            </h3>
            {uncertain.length > 0 ? (
              <ul className="space-y-3">
                {uncertain.map((item, index) => (
                  <Item key={index} item={item} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{intl.formatMessage(messages.nothingUncertain)}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
