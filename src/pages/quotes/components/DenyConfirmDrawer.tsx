import { ConfirmDrawer } from "@/components/Drawers";
import { useState, type ReactNode } from "react";
import { useIntl } from "react-intl";

interface DenyConfirmDrawerProps {
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (writtenBasis: string) => void;
  children: ReactNode;
}

export function DenyConfirmDrawer({ title, open, onOpenChange, isPending = false, onSubmit, children }: DenyConfirmDrawerProps) {
  const intl = useIntl();
  const [writtenBasis, setWrittenBasis] = useState("");
  const trimmedBasis = writtenBasis.trim();
  return (
    <ConfirmDrawer
      title={title}
      description={intl.formatMessage({
        id: "quotes.deny.description",
        defaultMessage: "Are you sure you want to deny this quote? This action cannot be undone.",
      })}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setWrittenBasis("");
        onOpenChange(nextOpen);
      }}
      onSubmit={() => onSubmit(trimmedBasis)}
      submitButtonDisabled={isPending || trimmedBasis.length < 20}
      submitButtonText={intl.formatMessage({
        id: "quotes.deny.confirmButton",
        defaultMessage: "Yes, deny quote",
      })}
      submitButtonVariant="destructive"
      trigger={children}
    >
      <div className="px-4">
        <label className="mb-2 block text-sm font-medium" htmlFor="deny-written-basis">
          {intl.formatMessage({
            id: "quotes.deny.writtenBasis.label",
            defaultMessage: "Decision basis",
            description: "Label for the operator's written reason when denying a credit quote",
          })}
        </label>
        <textarea
          id="deny-written-basis"
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
