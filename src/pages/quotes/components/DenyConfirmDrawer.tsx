import { ConfirmDrawer } from "@/components/Drawers";
import type { ApplicantMaterialEvidence, OperatorMaterialEvidenceSelection } from "@/pages/credit/decision-types";
import { useState, type ReactNode } from "react";
import { useIntl } from "react-intl";

interface DenyConfirmDrawerProps {
  title: string;
  mode?: "deny" | "return_for_information" | "close_unable_to_assess";
  requiredItems?: readonly string[];
  materialEvidenceOptions?: readonly ApplicantMaterialEvidence[];
  requireMaterialEvidence?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (writtenBasis: string, materialEvidence: OperatorMaterialEvidenceSelection[]) => void;
  children: ReactNode;
}

const evidenceKey = (evidence: OperatorMaterialEvidenceSelection): string => `${evidence.kind}\0${evidence.reference}`;

export function DenyConfirmDrawer({
  title,
  mode = "deny",
  requiredItems = [],
  materialEvidenceOptions = [],
  requireMaterialEvidence = false,
  open,
  onOpenChange,
  isPending = false,
  onSubmit,
  children,
}: DenyConfirmDrawerProps) {
  const intl = useIntl();
  const [writtenBasis, setWrittenBasis] = useState("");
  const [selectedEvidence, setSelectedEvidence] = useState<Set<string>>(() => new Set());
  const trimmedBasis = writtenBasis.trim();
  const isReturn = mode === "return_for_information";
  const isUnableToAssess = mode === "close_unable_to_assess";
  const fieldId = `${mode}-written-basis`;
  const selectedMaterialEvidence = materialEvidenceOptions
    .filter((evidence) => selectedEvidence.has(evidenceKey(evidence)))
    .map(({ kind, reference }) => ({ kind, reference }));
  const materialEvidenceLabel = (evidence: ApplicantMaterialEvidence): string => {
    switch (evidence.kind) {
      case "bill_state":
        return intl.formatMessage({
          id: "quotes.deny.evidence.bill",
          defaultMessage: "Accepted bill record",
          description: "Operator-facing label for bill-state evidence selected for a discretionary decline",
        });
      case "applicant_confirmation":
        return intl.formatMessage({
          id: "quotes.deny.evidence.confirmation",
          defaultMessage: "Applicant's confirmed answers",
          description: "Operator-facing label for applicant confirmation selected for a discretionary decline",
        });
      case "submitted_document":
        return evidence.label === undefined
          ? intl.formatMessage({
              id: "quotes.deny.evidence.document",
              defaultMessage: "Submitted document",
              description: "Operator-facing fallback label for submitted evidence selected for a discretionary decline",
            })
          : intl.formatMessage(
              {
                id: "quotes.deny.evidence.namedDocument",
                defaultMessage: "Submitted document: {fileName}",
                description: "Operator-facing label for named submitted evidence selected for a discretionary decline",
              },
              { fileName: evidence.label }
            );
      case "acceptor_risk":
        return intl.formatMessage({
          id: "quotes.deny.evidence.acceptorRisk",
          defaultMessage: "Current acceptor risk record",
          description: "Operator-facing label for acceptor-risk evidence selected for a discretionary decline",
        });
      case "duplicate_check":
        return intl.formatMessage({
          id: "quotes.deny.evidence.duplicateCheck",
          defaultMessage: "Duplicate-financing check",
          description: "Operator-facing label for duplicate-financing evidence selected for a discretionary decline",
        });
      case "mint_capacity":
        return intl.formatMessage({
          id: "quotes.deny.evidence.mintCapacity",
          defaultMessage: "Mint capacity record",
          description: "Operator-facing label for Mint-capacity evidence selected for a discretionary decline",
        });
    }
  };
  return (
    <ConfirmDrawer
      title={title}
      description={
        isReturn
          ? intl.formatMessage({
              id: "quotes.returnForInformation.description",
              defaultMessage: "Record what the applicant must provide. No notification is sent from this screen.",
              description: "Confirmation description for an applicant information request without claiming notification delivery",
            })
          : isUnableToAssess
            ? intl.formatMessage({
                id: "quotes.unableToAssess.description",
                defaultMessage:
                  "Close this case because the Mint cannot obtain the evidence needed for an informed decision. This is not a credit-risk denial, but the quote will be denied and no minting can occur.",
                description: "Explanation of the terminal unable-to-assess outcome",
              })
            : intl.formatMessage({
                id: "quotes.deny.description",
                defaultMessage:
                  "Record why the Mint is declining and select the evidence that was material to your judgement. The applicant will see the decision basis.",
                description: "Explanation of a governed discretionary decline and its applicant-facing record",
              })
      }
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return;
        if (!nextOpen) {
          setWrittenBasis("");
          setSelectedEvidence(new Set());
        }
        onOpenChange(nextOpen);
      }}
      onSubmit={() => onSubmit(trimmedBasis, selectedMaterialEvidence)}
      cancelButtonDisabled={isPending}
      submitButtonDisabled={isPending || trimmedBasis.length < 20 || (requireMaterialEvidence && selectedMaterialEvidence.length === 0)}
      submitButtonText={
        isReturn
          ? intl.formatMessage({
              id: "quotes.returnForInformation.confirmButton",
              defaultMessage: "Request information",
              description: "Confirmation button that records an applicant information request without claiming notification delivery",
            })
          : isUnableToAssess
            ? intl.formatMessage({
                id: "quotes.unableToAssess.confirmButton",
                defaultMessage: "Close case and deny minting",
                description: "Terminal action for an unresolved case that cannot be assessed",
              })
            : intl.formatMessage({
                id: "quotes.deny.confirmButton",
                defaultMessage: "Yes, deny quote",
              })
      }
      submitButtonVariant={isReturn ? "default" : "destructive"}
      trigger={children}
    >
      <div className="px-4">
        {(isReturn || isUnableToAssess) && requiredItems.length > 0 && (
          <div className="mb-4 rounded-md border border-input p-3">
            <p className="mb-2 text-sm font-medium">
              {intl.formatMessage({
                id: "quotes.returnForInformation.requiredItems",
                defaultMessage: "Required information",
                description: "Heading above verification items sent back with a returned credit case",
              })}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {requiredItems.map((item, index) => (
                <li key={`${String(index)}:${item}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        {requireMaterialEvidence && (
          <fieldset className="mb-4 rounded-md border border-input p-3">
            <legend className="px-1 text-sm font-medium">
              {intl.formatMessage({
                id: "quotes.deny.evidence.title",
                defaultMessage: "Evidence material to this decision",
                description: "Heading for evidence an operator selects before a discretionary decline",
              })}
            </legend>
            <p className="mb-3 text-xs text-muted-foreground">
              {intl.formatMessage({
                id: "quotes.deny.evidence.help",
                defaultMessage: "Select every current record you relied on. Internal references are not shown to the applicant.",
                description: "Help text for selecting material evidence before a discretionary decline",
              })}
            </p>
            <div className="space-y-2">
              {materialEvidenceOptions.map((evidence, index) => {
                const key = evidenceKey(evidence);
                const inputId = `deny-material-evidence-${String(index)}`;
                return (
                  <label className="flex items-start gap-2 text-sm" htmlFor={inputId} key={key}>
                    <input
                      checked={selectedEvidence.has(key)}
                      className="mt-0.5 h-4 w-4"
                      id={inputId}
                      onChange={(event) => {
                        setSelectedEvidence((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(key);
                          else next.delete(key);
                          return next;
                        });
                      }}
                      type="checkbox"
                    />
                    <span>{materialEvidenceLabel(evidence)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        <label className="mb-2 block text-sm font-medium" htmlFor={fieldId}>
          {intl.formatMessage({
            id: "quotes.deny.writtenBasis.label",
            defaultMessage: "Decision basis",
            description: "Label for the operator's written reason when denying a credit quote",
          })}
        </label>
        <textarea
          id={fieldId}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={2_000}
          onChange={(event) => setWrittenBasis(event.target.value)}
          placeholder={intl.formatMessage({
            id: "quotes.deny.writtenBasis.placeholder",
            defaultMessage: "Explain the reviewed basis for this decision",
            description: "Placeholder for the operator's written reason when denying a credit quote",
          })}
          required
          value={writtenBasis}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {intl.formatMessage({
            id: "quotes.deny.writtenBasis.help",
            defaultMessage: "Required, at least 20 characters.",
            description: "Help text for the operator's written reason when denying a credit quote",
          })}
        </p>
      </div>
    </ConfirmDrawer>
  );
}
