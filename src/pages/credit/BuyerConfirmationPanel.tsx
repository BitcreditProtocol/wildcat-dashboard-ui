import type { BuyerConfirmation } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { useIntl } from "react-intl";
import { useRecordBuyerConfirmation } from "@/pages/mint-checks/api";
import type { DecisionCase } from "./decision-types";
import { fraudMessages as m } from "./fraud-controls-copy";
import type { OperatorCapability } from "./record-operator-decision";

type ConfirmationForm = Pick<BuyerConfirmation, "method" | "contactSource" | "contactReference" | "outcome" | "note" | "performedAt">;

export function BuyerConfirmationPanel({ decisionCase, capability }: { decisionCase: DecisionCase; capability?: OperatorCapability }) {
  const intl = useIntl();
  const id = useId();
  const bill = decisionCase.snapshot.bill;
  const threshold = decisionCase.policyPack.buyerConfirmationRequiredAboveSat;
  const records = decisionCase.snapshot.fraudControls?.buyerConfirmations ?? [];
  const mutation = useRecordBuyerConfirmation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConfirmationForm>({ defaultValues: { method: "phone", contactSource: "public_registry", outcome: "unreachable" } });
  const allowed =
    decisionCase.assessmentCurrency === "current" &&
    capability !== undefined &&
    bill !== null &&
    decisionCase.snapshot.fraudControls !== undefined;
  const policyKnown = threshold !== undefined && bill !== null;
  const required = policyKnown && BigInt(bill.faceValueSat) > BigInt(threshold);
  const fieldClass = "mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  async function submit(values: ConfirmationForm) {
    if (!allowed || bill === null) return;
    const performedAt = new Date(values.performedAt).toISOString();
    await mutation
      .mutateAsync({
        ...values,
        contactReference: values.contactReference.trim(),
        note: values.note.trim(),
        performedAt,
        action: "record_buyer_confirmation",
        billId: bill.billId,
        caseId: decisionCase.snapshot.caseId,
        decisionResultDigest: decisionCase.resultDigest,
        draweeNodeId: bill.acceptorRef,
      })
      .then(() => reset())
      .catch(() => undefined);
  }
  return (
    <section aria-label={intl.formatMessage(m.confirmation)} className="space-y-3">
      <h3 className="font-semibold">{intl.formatMessage(m.confirmation)}</h3>
      <p className="text-sm">
        {policyKnown
          ? intl.formatMessage(required ? m.required : m.notRequired, { threshold: `${threshold} sat` })
          : intl.formatMessage(m.unavailable)}
      </p>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(m.independent)}</p>
      <p className="text-xs text-muted-foreground">{intl.formatMessage(m.material)}</p>
      {records.length === 0 ? (
        <p className="text-sm text-muted-foreground">{intl.formatMessage(m.noHistory)}</p>
      ) : (
        <ol className="divide-y rounded-md border px-3">
          {records.map((record, index) => (
            <li key={`${record.recordedAt}:${index}`} className="space-y-1 py-3 text-sm">
              <p className={record.outcome === "denied_obligation" ? "font-medium text-destructive" : "font-medium"}>
                {intl.formatMessage(m[record.outcome])}
              </p>
              <p>
                {intl.formatMessage(m[record.method])} · {intl.formatMessage(m[record.contactSource])}
              </p>
              <p className="break-words">{record.contactReference}</p>
              <p className="whitespace-pre-wrap break-words">{record.note}</p>
              <p className="text-xs text-muted-foreground">
                {record.operatorId} · {record.operatorRole} · <time dateTime={record.performedAt}>{record.performedAt}</time>
              </p>
              <p className="text-xs text-muted-foreground">{intl.formatMessage(m.recordedAt, { time: record.recordedAt })}</p>
            </li>
          ))}
        </ol>
      )}
      {!allowed && <p className="text-sm text-muted-foreground">{intl.formatMessage(m.readOnly)}</p>}
      {allowed && (
        <form onSubmit={(event) => void handleSubmit(submit)(event)} className="grid gap-3 sm:grid-cols-2">
          <fieldset disabled={mutation.isPending} className="contents">
            <label htmlFor={`${id}-method`} className="text-xs">
              {intl.formatMessage(m.method)}
              <select id={`${id}-method`} className={fieldClass} {...register("method", { required: true })}>
                {(["phone", "email", "in_person", "registry"] as const).map((method) => (
                  <option key={method} value={method}>
                    {intl.formatMessage(m[method])}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-source`} className="text-xs">
              {intl.formatMessage(m.contactSource)}
              <select id={`${id}-source`} className={fieldClass} {...register("contactSource", { required: true })}>
                {(["public_registry", "public_directory", "prior_relationship"] as const).map((source) => (
                  <option key={source} value={source}>
                    {intl.formatMessage(m[source])}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-reference`} className="text-xs sm:col-span-2">
              {intl.formatMessage(m.reference)}
              <input
                id={`${id}-reference`}
                className={fieldClass}
                maxLength={500}
                {...register("contactReference", { required: true, validate: (value) => value.trim().length > 0 })}
              />
            </label>
            <label htmlFor={`${id}-outcome`} className="text-xs">
              {intl.formatMessage(m.outcome)}
              <select id={`${id}-outcome`} className={fieldClass} {...register("outcome", { required: true })}>
                {(["confirmed_obligation", "denied_obligation", "unreachable"] as const).map((outcome) => (
                  <option key={outcome} value={outcome}>
                    {intl.formatMessage(m[outcome])}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor={`${id}-time`} className="text-xs">
              {intl.formatMessage(m.performedAt)}
              <input
                id={`${id}-time`}
                type="datetime-local"
                className={fieldClass}
                {...register("performedAt", {
                  required: true,
                  validate: (value) => Number.isFinite(Date.parse(value)) && Date.parse(value) <= Date.now(),
                })}
              />
            </label>
            <label htmlFor={`${id}-note`} className="text-xs sm:col-span-2">
              {intl.formatMessage(m.note)}
              <textarea
                id={`${id}-note`}
                className={fieldClass}
                rows={3}
                maxLength={2000}
                {...register("note", { required: true, validate: (value) => value.trim().length > 0 })}
              />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {intl.formatMessage(mutation.isPending ? m.saving : m.save)}
              </Button>
            </div>
          </fieldset>
          {Object.keys(errors).length > 0 && (
            <p role="alert" className="text-sm text-destructive sm:col-span-2">
              {intl.formatMessage(m.invalid)}
            </p>
          )}
        </form>
      )}
      {mutation.error && (
        <p role="alert" className="whitespace-pre-wrap break-words text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
      {mutation.isSuccess && (
        <p role="status" className="text-sm">
          {intl.formatMessage(m.saved)}
        </p>
      )}
    </section>
  );
}
