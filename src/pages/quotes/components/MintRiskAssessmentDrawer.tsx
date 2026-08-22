import { ConfirmDrawer } from "@/components/Drawers";
import { useState, type ReactNode } from "react";
import { FormattedMessage, useIntl } from "react-intl";

export interface MintRiskAssessmentFormValue {
  probabilityOfDefaultBps: number;
  lossGivenDefaultBps: number;
  sourceReference: string;
  validThrough: string;
  writtenBasis: string;
}

export function MintRiskAssessmentDrawer({
  open,
  onOpenChange,
  isPending,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (value: MintRiskAssessmentFormValue) => void;
  children: ReactNode;
}) {
  const intl = useIntl();
  const [pd, setPd] = useState("");
  const [lgd, setLgd] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [validThrough, setValidThrough] = useState("");
  const [writtenBasis, setWrittenBasis] = useState("");
  const pdNumber = Number(pd);
  const lgdNumber = Number(lgd);
  const valid =
    pd !== "" &&
    lgd !== "" &&
    Number.isFinite(pdNumber) &&
    Number.isFinite(lgdNumber) &&
    pdNumber >= 0 &&
    pdNumber <= 100 &&
    lgdNumber >= 0 &&
    lgdNumber <= 100 &&
    sourceReference.trim().length > 0 &&
    validThrough !== "" &&
    writtenBasis.trim().length >= 20;

  return (
    <ConfirmDrawer
      title={intl.formatMessage({
        id: "quotes.mintRisk.title",
        defaultMessage: "Record Mint risk assessment",
        description: "Title of the Mint-owned acceptor risk assessment form",
      })}
      description={intl.formatMessage({
        id: "quotes.mintRisk.description",
        defaultMessage:
          "Record the Mint's current, source-referenced acceptor risk values. Saving creates a new governed snapshot and automatically re-evaluates the case.",
        description: "Explanation of the Mint-owned risk resolution workflow",
      })}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={() =>
        onSubmit({
          probabilityOfDefaultBps: Math.round(pdNumber * 100),
          lossGivenDefaultBps: Math.round(lgdNumber * 100),
          sourceReference: sourceReference.trim(),
          validThrough,
          writtenBasis: writtenBasis.trim(),
        })
      }
      cancelButtonDisabled={isPending}
      submitButtonDisabled={isPending || !valid}
      submitButtonText={intl.formatMessage({
        id: "quotes.mintRisk.submit",
        defaultMessage: "Save and re-evaluate",
        description: "Submit button for a Mint-owned risk assessment",
      })}
      trigger={children}
    >
      <div className="grid gap-4 px-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">
          <span>
            <FormattedMessage id="quotes.mintRisk.pd" defaultMessage="Probability of default (%)" description="Mint risk PD input label" />
          </span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={pd}
            onChange={(event) => setPd(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>
            <FormattedMessage id="quotes.mintRisk.lgd" defaultMessage="Loss given default (%)" description="Mint risk LGD input label" />
          </span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={lgd}
            onChange={(event) => setLgd(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span>
            <FormattedMessage
              id="quotes.mintRisk.source"
              defaultMessage="Source reference"
              description="Mint risk source reference input label"
            />
          </span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            maxLength={200}
            value={sourceReference}
            onChange={(event) => setSourceReference(event.target.value)}
            placeholder={intl.formatMessage({
              id: "quotes.mintRisk.source.placeholder",
              defaultMessage: "risk-file-2026-08",
              description: "Example Mint risk source reference",
            })}
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>
            <FormattedMessage
              id="quotes.mintRisk.validThrough"
              defaultMessage="Valid through"
              description="Mint risk validity date input label"
            />
          </span>
          <input
            className="rounded-md border border-input bg-background px-3 py-2"
            type="date"
            value={validThrough}
            onChange={(event) => setValidThrough(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm sm:col-span-2">
          <span>
            <FormattedMessage
              id="quotes.mintRisk.basis"
              defaultMessage="Assessment basis"
              description="Mint risk written basis input label"
            />
          </span>
          <textarea
            className="min-h-24 rounded-md border border-input bg-background px-3 py-2"
            maxLength={2000}
            value={writtenBasis}
            onChange={(event) => setWrittenBasis(event.target.value)}
            placeholder={intl.formatMessage({
              id: "quotes.mintRisk.basis.placeholder",
              defaultMessage: "Explain the source, method and reviewer conclusion",
              description: "Mint risk written basis placeholder",
            })}
          />
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          <FormattedMessage
            id="quotes.mintRisk.syntheticNotice"
            defaultMessage="Synthetic/testnet only. Values are recorded with source, assessor, validity and a digest of the written basis."
            description="Trust-boundary notice for local Mint risk evidence"
          />
        </p>
      </div>
    </ConfirmDrawer>
  );
}
