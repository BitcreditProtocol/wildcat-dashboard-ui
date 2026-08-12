import { ConfirmDrawer } from "@/components/Drawers";
import { useState, type ReactNode } from "react";
import { useIntl } from "react-intl";

interface DenyConfirmDrawerProps {
  title: string;
  mode?: "deny" | "return_for_information";
  requiredItems?: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (writtenBasis: string) => void;
  children: ReactNode;
}

export function DenyConfirmDrawer({
  title,
  mode = "deny",
  requiredItems = [],
  open,
  onOpenChange,
  isPending = false,
  onSubmit,
  children,
}: DenyConfirmDrawerProps) {
  const intl = useIntl();
  const [writtenBasis, setWrittenBasis] = useState("");
  const trimmedBasis = writtenBasis.trim();
  const isReturn = mode === "return_for_information";
  const fieldId = `${mode}-written-basis`;
  return (
    <ConfirmDrawer
      title={title}
      description={
        isReturn
          ? intl.formatMessage({
              id: "quotes.returnForInformation.description",
              defaultMessage:
                "Record the verification items from the governed assessment. Applicant status is delivered separately and is not confirmed here.",
              description: "Confirmation description that records required information without claiming applicant delivery",
            })
          : intl.formatMessage({
              id: "quotes.deny.description",
              defaultMessage: "Are you sure you want to deny this quote? This action cannot be undone.",
            })
      }
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setWrittenBasis("");
        onOpenChange(nextOpen);
      }}
      onSubmit={() => onSubmit(trimmedBasis)}
      submitButtonDisabled={isPending || trimmedBasis.length < 20}
      submitButtonText={
        isReturn
          ? intl.formatMessage({
              id: "quotes.returnForInformation.confirmButton",
              defaultMessage: "Record required information",
              description: "Confirmation button that records required information without claiming applicant delivery",
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
        {isReturn && requiredItems.length > 0 && (
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
            defaultMessage: "Required, at least 20 characters. This is stored with the governed decision.",
            description: "Help text for the operator's written reason when denying a credit quote",
          })}
        </p>
      </div>
    </ConfirmDrawer>
  );
}
