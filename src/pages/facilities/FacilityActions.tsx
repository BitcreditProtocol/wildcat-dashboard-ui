import { useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { facilityOperatorCommandSchema, type FacilityApplication, type FacilityOperatorCommand } from "@bitcredit/ai-credit-shared";
import { Button } from "@bitcredit/ui-library";
import { FormattedMessage, useIntl } from "react-intl";
import { agreementExpiry, defaultAgreementExpiryDate, facilityActionState } from "./facility-state";

interface FacilityActionsProps {
  application: FacilityApplication;
  live: boolean;
  busy: boolean;
  onCommand: (command: FacilityOperatorCommand) => Promise<void>;
}
interface ActionFields {
  question: string;
  basis: string;
  limitSat: string;
  expiresDate: string;
  eligibleScope: string;
  acknowledge: boolean;
  billCoverage: boolean;
  maxBillSat: string;
  maxTenorDays: string;
  listedPayers: boolean;
  payerRefs: string;
}
type Action = "request_information" | "approve" | "decline";

export function FacilityActions({ application, live, busy, onCommand }: FacilityActionsProps) {
  const intl = useIntl();
  const [action, setAction] = useState<Action | null>(null);
  const [invalid, setInvalid] = useState(false);
  const attempt = useRef<{ fingerprint: string; commandId: string } | undefined>(undefined);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { isSubmitting },
  } = useForm<ActionFields>({
    defaultValues: {
      question: "",
      basis: "",
      limitSat: "",
      expiresDate: "",
      eligibleScope: "",
      acknowledge: false,
      billCoverage: false,
      maxBillSat: "",
      maxTenorDays: "",
      listedPayers: false,
      payerRefs: "",
    },
  });
  const readiness = facilityActionState(application);
  const billCoverage = useWatch({ control, name: "billCoverage" });
  const listedPayers = useWatch({ control, name: "listedPayers" });
  const disabled = busy || isSubmitting || !live;
  const fieldClass = "mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
  const openAction = (next: Action) => {
    reset();
    if (next === "approve") setValue("expiresDate", defaultAgreementExpiryDate());
    setAction(next);
    setInvalid(false);
    attempt.current = undefined;
  };
  const submit = async (fields: ActionFields) => {
    if (!action || disabled || !readiness.submission) return;
    if (action === "request_information" ? !readiness.canAsk : !(readiness.canDecide || (action === "approve" && readiness.canRevise)))
      return;
    const payload = {
      action,
      id: application.id,
      expectedRevision: application.revision,
      submissionDigest: readiness.submission.digest,
      ...(action === "request_information" ? { question: fields.question.trim() } : { basis: fields.basis.trim() }),
      ...(action === "approve"
        ? {
            terms: {
              limitSat: fields.limitSat.trim(),
              expiresAt: agreementExpiry(fields.expiresDate),
              eligibleScope: fields.eligibleScope.trim(),
              ...(fields.billCoverage
                ? {
                    billRules: {
                      version: "facility-bill-rules-v1",
                      exposureBasis: "whole_bill_face_value",
                      maxBillSat: fields.maxBillSat.trim(),
                      maxTenorDays: Number(fields.maxTenorDays),
                      payerScope: fields.listedPayers ? "listed_payers" : "any_payer_subject_to_bill_review",
                      eligiblePayerRefs: fields.listedPayers ? fields.payerRefs.split(/\s+/u).filter(Boolean) : [],
                    },
                  }
                : {}),
            },
          }
        : {}),
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, commandId: crypto.randomUUID() };
    const command = facilityOperatorCommandSchema.safeParse({ ...payload, commandId: attempt.current.commandId });
    if (
      !command.success ||
      (action === "approve" &&
        (!fields.acknowledge ||
          !agreementExpiry(fields.expiresDate) ||
          Date.parse(agreementExpiry(fields.expiresDate) ?? "") <= Date.now()))
    ) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    try {
      await onCommand(command.data);
      setAction(null);
      reset();
      attempt.current = undefined;
    } catch {
      /* Parent displays the confirmed request error, while preserving the entered fields. */
    }
  };
  const reassess = async () => {
    if (disabled || !readiness.canReassess || !readiness.submission) return;
    const payload = {
      action: "reassess",
      id: application.id,
      expectedRevision: application.revision,
      submissionDigest: readiness.submission.digest,
    } as const;
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, commandId: crypto.randomUUID() };
    try {
      await onCommand({ ...payload, commandId: attempt.current.commandId });
      attempt.current = undefined;
    } catch {
      /* Parent displays the error. */
    }
  };
  if (!readiness.submission) return null;
  return (
    <section className="border-t border-border p-5 md:p-6">
      <div className="flex flex-wrap gap-3">
        {(readiness.canDecide || readiness.canRevise) && (
          <Button disabled={disabled} onClick={() => openAction("approve")}>
            {readiness.canRevise ? (
              <FormattedMessage id="facilities.reviseOffer" defaultMessage="Revise agreement" />
            ) : (
              <FormattedMessage
                id="facilities.offer"
                defaultMessage="Prepare agreement"
                description="Operator opens explicit synthetic agreement terms, not a minting authorization"
              />
            )}
          </Button>
        )}
        {readiness.canAsk && (
          <Button variant="outline" disabled={disabled} onClick={() => openAction("request_information")}>
            <FormattedMessage
              id="facilities.ask"
              defaultMessage="Ask the applicant"
              description="Optional question sent to applicant, not an agent"
            />
          </Button>
        )}
        {(readiness.canReassess || readiness.canDecide) && (
          <details className="self-center">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              <FormattedMessage
                id="facilities.moreActions"
                defaultMessage="Other actions"
                description="Secondary facility operator actions"
              />
            </summary>
            <div className="mt-3 flex flex-wrap gap-3">
              {readiness.canReassess && (
                <Button
                  variant="outline"
                  disabled={disabled}
                  onClick={() => {
                    void reassess();
                  }}
                >
                  <FormattedMessage
                    id="facilities.reassess"
                    defaultMessage="Reassess current submission"
                    description="Retry or rerun bounded preparation using current immutable submission"
                  />
                </Button>
              )}
              {readiness.canDecide && (
                <Button variant="outline" disabled={disabled} onClick={() => openAction("decline")}>
                  <FormattedMessage
                    id="facilities.decline"
                    defaultMessage="Decline application"
                    description="Open explicit operator decision, not automatic rejection for unknown data"
                  />
                </Button>
              )}
            </div>
          </details>
        )}
      </div>
      {action && (
        <form
          onSubmit={(event) => {
            void handleSubmit(submit, () => setInvalid(true))(event);
          }}
          className="mt-5 space-y-4 rounded-lg border border-border p-4"
        >
          {action === "request_information" ? (
            <>
              <p className="text-sm text-muted-foreground">
                <FormattedMessage
                  id="facilities.askHint"
                  defaultMessage="Sent to the applicant in eBill. Their reply becomes a new submission and is reassessed automatically. This is not a decision and needs no decision basis."
                  description="Destination and purpose of an operator question"
                />
              </p>
              <label className="block text-sm">
                <FormattedMessage id="facilities.question" defaultMessage="Your question" description="Optional operator question" />
                <textarea
                  {...register("question", { required: true })}
                  maxLength={500}
                  rows={3}
                  disabled={disabled}
                  className={fieldClass}
                />
              </label>
            </>
          ) : (
            <>
              {action === "approve" && (
                <>
                  <p className="text-sm text-muted-foreground">
                    <FormattedMessage
                      id="facilities.offerHint"
                      defaultMessage="Set the terms you reviewed. The applicant must accept this exact version. This synthetic agreement is non-binding, reserves no funds and never authorizes an eBill to be minted."
                      description="Human-owned synthetic terms with separate applicant acceptance and bill authorization"
                    />
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm">
                      <FormattedMessage
                        id="facilities.limit"
                        defaultMessage="Maximum outstanding amount (sat)"
                        description="Explicit facility amount term supplied by human operator"
                      />
                      <input
                        {...register("limitSat", { required: true, pattern: /^[1-9][0-9]{0,15}$/u })}
                        inputMode="numeric"
                        disabled={disabled}
                        maxLength={16}
                        className={fieldClass}
                      />
                    </label>
                    <label className="block text-sm">
                      <FormattedMessage
                        id="facilities.expires"
                        defaultMessage="Valid until (UTC)"
                        description="Agreement expiry date inclusive through end of UTC day"
                      />
                      <input
                        type="date"
                        {...register("expiresDate", { required: true })}
                        min={new Date().toISOString().slice(0, 10)}
                        disabled={disabled}
                        className={fieldClass}
                      />
                      <span className="mt-1 block text-xs text-muted-foreground">
                        <FormattedMessage
                          id="facilities.expiryDefault"
                          defaultMessage="Defaults to one year. You can choose a shorter or longer period."
                          description="Operator-editable agreement validity, separate from eBill maturity"
                        />
                      </span>
                    </label>
                  </div>
                  <label className="block text-sm">
                    <FormattedMessage
                      id="facilities.scope"
                      defaultMessage="Eligible eBills and conditions"
                      description="Human-defined scope of future bills for this agreement"
                    />
                    <textarea
                      {...register("eligibleScope", { required: true, minLength: 10 })}
                      maxLength={1000}
                      rows={3}
                      disabled={disabled}
                      className={fieldClass}
                    />
                  </label>
                  <fieldset className="space-y-4 rounded-lg border border-border p-4">
                    <label className="flex items-start gap-2 text-sm">
                      <Controller
                        control={control}
                        name="billCoverage"
                        render={({ field }) => (
                          <input
                            type="checkbox"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            checked={field.value}
                            onChange={(event) => field.onChange(event.target.checked)}
                            disabled={disabled}
                            className="mt-1"
                          />
                        )}
                      />
                      <FormattedMessage id="facilities.rules.enable" defaultMessage="Enable allowance checks for future eBills" />
                    </label>
                    <p className="text-xs text-muted-foreground">
                      <FormattedMessage
                        id="facilities.rules.hint"
                        defaultMessage="Optional for background-only onboarding. When enabled, each offer holds the whole bill amount against this limit. Every bill still needs its own review and approval."
                      />
                    </p>
                    {billCoverage && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block text-sm">
                            <FormattedMessage id="facilities.rules.maxBill" defaultMessage="Maximum per eBill (sat)" />
                            <input
                              {...register("maxBillSat", { required: billCoverage, pattern: /^[1-9][0-9]{0,15}$/u })}
                              inputMode="numeric"
                              className={fieldClass}
                              disabled={disabled}
                            />
                          </label>
                          <label className="block text-sm">
                            <FormattedMessage id="facilities.rules.tenor" defaultMessage="Maximum days to maturity" />
                            <input
                              type="number"
                              min={1}
                              max={366}
                              {...register("maxTenorDays", { required: billCoverage, min: 1, max: 366 })}
                              className={fieldClass}
                              disabled={disabled}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          <FormattedMessage
                            id="facilities.rules.anyPayer"
                            defaultMessage="Any payer may be considered, subject to the separate eBill and payer checks. Restrict the list below if needed."
                          />
                        </p>
                        <label className="flex items-start gap-2 text-sm">
                          <Controller
                            control={control}
                            name="listedPayers"
                            render={({ field }) => (
                              <input
                                type="checkbox"
                                name={field.name}
                                ref={field.ref}
                                onBlur={field.onBlur}
                                checked={field.value}
                                onChange={(event) => field.onChange(event.target.checked)}
                                disabled={disabled}
                                className="mt-1"
                              />
                            )}
                          />
                          <FormattedMessage id="facilities.rules.listed" defaultMessage="Restrict to specific payers" />
                        </label>
                        {listedPayers && (
                          <label className="block text-sm">
                            <FormattedMessage id="facilities.rules.refs" defaultMessage="Payer eBill identities, one per line" />
                            <textarea
                              {...register("payerRefs", { required: billCoverage && listedPayers })}
                              rows={3}
                              className={fieldClass}
                              disabled={disabled}
                            />
                          </label>
                        )}
                      </>
                    )}
                  </fieldset>
                </>
              )}
              <label className="block text-sm">
                <FormattedMessage
                  id="facilities.basis"
                  defaultMessage="Decision basis"
                  description="Required explanation for a human facility agreement decision, not for questions"
                />
                <textarea
                  {...register("basis", { required: true, minLength: 20 })}
                  minLength={20}
                  maxLength={2000}
                  rows={3}
                  disabled={disabled}
                  className={fieldClass}
                />
                <span className="mt-1 block text-xs text-muted-foreground">
                  <FormattedMessage
                    id="facilities.basisHint"
                    defaultMessage="Explain the reviewed evidence and remaining uncertainty (at least 20 characters). An agent summary is not independent verification."
                    description="Meaningful operator decision explanation"
                  />
                </span>
              </label>
              {action === "approve" && (
                <label className="flex items-start gap-3 text-sm">
                  <Controller
                    control={control}
                    name="acknowledge"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <input
                        type="checkbox"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        disabled={disabled}
                        className="mt-1"
                      />
                    )}
                  />
                  <FormattedMessage
                    id="facilities.acknowledge"
                    defaultMessage="I reviewed these terms and understand this is a non-binding synthetic agreement, not a minting approval."
                    description="Explicit acknowledgement before offering synthetic facility terms"
                  />
                </label>
              )}
            </>
          )}
          {invalid && (
            <p role="alert" className="text-sm text-destructive">
              <FormattedMessage
                id="facilities.invalidAction"
                defaultMessage="Check the required fields. Use a whole sat amount, a future expiry, and a complete decision basis where applicable."
                description="Facility command validation failed before transmission"
              />
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              disabled={
                disabled ||
                (action === "request_information"
                  ? !readiness.canAsk
                  : !(readiness.canDecide || (action === "approve" && readiness.canRevise)))
              }
            >
              {action === "request_information" ? (
                <FormattedMessage
                  id="facilities.sendQuestion"
                  defaultMessage="Send question"
                  description="Send optional applicant follow-up"
                />
              ) : action === "approve" ? (
                <FormattedMessage
                  id="facilities.sendAgreement"
                  defaultMessage="Send agreement for acceptance"
                  description="Offer exact human-reviewed synthetic agreement version"
                />
              ) : (
                <FormattedMessage
                  id="facilities.confirmDecline"
                  defaultMessage="Confirm decline"
                  description="Commit explicit negative operator facility decision"
                />
              )}
            </Button>
            <Button type="button" variant="outline" disabled={busy || isSubmitting} onClick={() => setAction(null)}>
              {intl.formatMessage({
                id: "facilities.cancel",
                defaultMessage: "Cancel",
                description: "Close operator form without submitting",
              })}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
