import type { InvoiceRecordV2 } from "@bitcredit/ai-credit-shared";
import { Card, CardContent } from "@bitcredit/ui-library";
import type { ReactNode } from "react";
import { useIntl } from "react-intl";
import { BuyerConfirmationPanel } from "./BuyerConfirmationPanel";
import type { DecisionCase } from "./decision-types";
import { fraudMessages as m, fraudReason } from "./fraud-controls-copy";
import type { OperatorCapability } from "./record-operator-decision";

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{children}</dd>
    </div>
  );
}

/** Format decimal minor units exactly, without converting to floating point or quote money. */
function invoiceMoney(value: string | null, currency: string | null, scale: number | null): string | null {
  if (value === null || currency === null || scale === null) return null;
  const digits = value.padStart(scale + 1, "0");
  return `${scale === 0 ? digits : `${digits.slice(0, -scale)}.${digits.slice(-scale)}`} ${currency}`;
}

export function InvoiceTaxAuthorityPanel({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const tax = decisionCase.snapshot.fraudControls?.taxAuthority;
  const record = tax?.record;
  const missing = intl.formatMessage(m.notRecorded);
  const usesFx = (record?.currency.value ?? decisionCase.snapshot.invoice?.currency) !== "SAT";
  const document = tax?.signedDocument?.document;
  const fields: { key: Exclude<keyof InvoiceRecordV2, "schemaVersion">; label: typeof m.documentId }[] = [
    { key: "documentId", label: m.documentId },
    { key: "issueDate", label: m.issueDate },
    { key: "sellerName", label: m.sellerName },
    { key: "sellerTaxId", label: m.sellerTaxId },
    { key: "buyerName", label: m.buyerName },
    { key: "buyerTaxId", label: m.buyerTaxId },
    { key: "currency", label: m.currency },
    { key: "minorUnitScale", label: m.scale },
    { key: "totalWithTaxMinor", label: m.total },
    { key: "taxTotalMinor", label: m.tax },
    { key: "lines", label: m.lines },
  ];
  function value(key: Exclude<keyof InvoiceRecordV2, "schemaVersion">): ReactNode {
    if (!record) {
      if (key === "documentId") return tax?.documentId ?? missing;
      if (key === "totalWithTaxMinor" && decisionCase.snapshot.invoice?.totalSat != null)
        return `${decisionCase.snapshot.invoice.totalSat} SAT`;
      return missing;
    }
    if (key === "totalWithTaxMinor" || key === "taxTotalMinor")
      return invoiceMoney(record[key].value, record.currency.value, record.minorUnitScale.value) ?? missing;
    if (key === "lines")
      return (
        record.lines.value?.map((line, index) => (
          <div key={index}>
            {line.description} · {invoiceMoney(line.totalMinor, record.currency.value, record.minorUnitScale.value) ?? missing}
          </div>
        )) ?? missing
      );
    return record[key].value ?? missing;
  }
  return (
    <section aria-label={intl.formatMessage(m.invoice)} className="space-y-4">
      <div>
        <h3 className="font-semibold">{intl.formatMessage(m.invoice)}</h3>
        <p className="mt-1 text-xs font-medium text-signal-alert">{intl.formatMessage(m.synthetic)}</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label={intl.formatMessage(m.register)}>{document?.register ?? missing}</Fact>
        <Fact label={intl.formatMessage(m.status)}>{tax ? intl.formatMessage(m[tax.status]) : intl.formatMessage(m.unavailable)}</Fact>
        {fields.map(({ key, label }) => (
          <Fact key={key} label={intl.formatMessage(label)}>
            {value(key)}
            {record && (
              <span className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                <span className="rounded border px-1.5">{intl.formatMessage(m[record[key].source])}</span>
                <span className="rounded border px-1.5">{intl.formatMessage(m[record[key].state])}</span>
              </span>
            )}
          </Fact>
        ))}
        {((tax?.authorityStamp !== null && tax?.authorityStamp !== undefined) || decisionCase.snapshot.country === "SV") && (
          <Fact label={intl.formatMessage(m.stamp)}>{tax?.authorityStamp ?? missing}</Fact>
        )}
        <Fact label={intl.formatMessage(m.bill)}>
          {decisionCase.snapshot.bill ? `${decisionCase.snapshot.bill.faceValueSat} sat` : missing}
        </Fact>
      </dl>
      {tax?.status === "not_applicable" && (
        <p className="text-sm">
          {intl.formatMessage(m.alternative, {
            cap: decisionCase.policyPack.maximumBillSumWithoutTaxDocumentSat
              ? `${decisionCase.policyPack.maximumBillSumWithoutTaxDocumentSat} sat`
              : missing,
          })}
        </p>
      )}
      {usesFx || tax?.status !== "not_applicable" ? (
        <p className="text-sm">
          {intl.formatMessage(m.tolerance, {
            result: tax
              ? intl.formatMessage(tax.amountConsistency === "match" ? m.amountMatch : m[tax.amountConsistency])
              : intl.formatMessage(m.unavailable),
            bps: decisionCase.policyPack.invoiceToBillToleranceBps ?? missing,
          })}
        </p>
      ) : (
        <p className="text-sm">{intl.formatMessage(m.satInvoice)}</p>
      )}
      {tax?.status !== "not_applicable" && (
        <p className="text-sm">
          {intl.formatMessage(m.pdf, { result: tax ? intl.formatMessage(m[tax.pdfConsistency]) : intl.formatMessage(m.unavailable) })}
        </p>
      )}
      {usesFx && (
        <>
          <p className="text-xs text-muted-foreground">{intl.formatMessage(m.orientation)}</p>
          <dl>
            <Fact label={intl.formatMessage(m.fx)}>{tax?.fxSnapshotDigest ?? missing}</Fact>
          </dl>
        </>
      )}
      {document && <p className="text-xs text-muted-foreground">{intl.formatMessage(m.checkedAt, { time: document.checkedAt })}</p>}
      <p className="text-xs text-muted-foreground">{intl.formatMessage(m.scope)}</p>
    </section>
  );
}

export function CounterpartyExposurePanel({ decisionCase }: { decisionCase: DecisionCase }) {
  const intl = useIntl();
  const exposure = decisionCase.snapshot.fraudControls?.exposure;
  const bill = decisionCase.snapshot.bill;
  const missing = intl.formatMessage(m.unavailable);
  const caps = { drawee: decisionCase.policyPack.maximumDraweeExposureSat, drawer: decisionCase.policyPack.maximumDrawerExposureSat };
  return (
    <section aria-label={intl.formatMessage(m.exposure)} className="space-y-3">
      <h3 className="font-semibold">{intl.formatMessage(m.exposure)}</h3>
      {!exposure ? (
        <p className="text-sm text-signal-alert">{missing}</p>
      ) : (
        <>
          <p className={`text-sm ${exposure.coverage.complete ? "text-muted-foreground" : "text-signal-alert"}`}>
            {intl.formatMessage(exposure.coverage.complete ? m.complete : m.incomplete)}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["drawee", "drawer"] as const).map((actor) => {
              const projected = BigInt(exposure[actor].exposureSat);
              const existing = bill ? projected - BigInt(bill.faceValueSat) : null;
              const cap = caps[actor];
              const headroom = cap === undefined ? null : BigInt(cap) - projected;
              return (
                <section key={actor} aria-label={intl.formatMessage(m[actor])} className="rounded-md border p-3">
                  <h4 className="text-sm font-semibold">{intl.formatMessage(m[actor])}</h4>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{exposure[actor].nodeId}</p>
                  <dl className="mt-3 grid gap-3">
                    <Fact label={intl.formatMessage(m.existing)}>{existing !== null && existing >= 0n ? `${existing} sat` : missing}</Fact>
                    <Fact label={intl.formatMessage(m.bill)}>{bill ? `${bill.faceValueSat} sat` : missing}</Fact>
                    <Fact label={intl.formatMessage(m.projected)}>{`${projected} sat`}</Fact>
                    <Fact label={intl.formatMessage(m.cap)}>{cap === undefined ? missing : `${cap} sat`}</Fact>
                    <Fact label={intl.formatMessage(m.headroom)}>
                      <span className={headroom !== null && headroom < 0n ? "text-destructive" : ""}>
                        {headroom === null ? missing : `${headroom} sat`}
                      </span>
                    </Fact>
                  </dl>
                </section>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {intl.formatMessage(m.coverage, {
              date: exposure.asOfDate,
              scanned: exposure.coverage.scannedQuotes,
              listed: exposure.coverage.listedQuotes,
              limit: exposure.coverage.limit,
              failures: exposure.coverage.failures,
            })}
          </p>
        </>
      )}
    </section>
  );
}

export function FraudControlsPanel({ decisionCase, capability }: { decisionCase: DecisionCase; capability?: OperatorCapability }) {
  const intl = useIntl();
  const reasons = [
    ...new Set([
      ...decisionCase.result.reasonCodes,
      ...decisionCase.result.axes.flatMap((axis) => axis.reasonCodes),
      ...decisionCase.result.verificationRequests.map((request) => request.reasonCode),
    ]),
  ].flatMap((code) => {
    const label = fraudReason(code, intl);
    return label ? [{ code, label }] : [];
  });
  return (
    <Card>
      <CardContent className="space-y-6 p-6">
        <p className="break-all text-xs text-muted-foreground">
          {decisionCase.policyPack.policyPackVersion} · {decisionCase.snapshot.snapshotDigest}
        </p>
        {!decisionCase.snapshot.fraudControls && <p className="text-sm text-signal-alert">{intl.formatMessage(m.legacy)}</p>}
        {reasons.length > 0 && (
          <ul className="space-y-1 text-sm text-signal-alert">
            {reasons.map(({ code, label }) => (
              <li key={code}>{label}</li>
            ))}
          </ul>
        )}
        <InvoiceTaxAuthorityPanel decisionCase={decisionCase} />
        <div className="border-t pt-5">
          <CounterpartyExposurePanel decisionCase={decisionCase} />
        </div>
        <div className="border-t pt-5">
          <BuyerConfirmationPanel key={decisionCase.resultDigest} decisionCase={decisionCase} capability={capability} />
        </div>
      </CardContent>
    </Card>
  );
}
