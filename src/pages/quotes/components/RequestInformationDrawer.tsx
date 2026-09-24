import { ConfirmDrawer } from "@/components/Drawers";
import { operatorQuestionTextSchema } from "@bitcredit/ai-credit-shared";
import { useEffect, useState, type ReactNode } from "react";
import { useIntl } from "react-intl";

interface RequestInformationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSubmit: (question: string) => void;
  children: ReactNode;
}

/** An optional preparation question, not a financial decision. */
export function RequestInformationDrawer({ open, onOpenChange, isPending = false, onSubmit, children }: RequestInformationDrawerProps) {
  const intl = useIntl();
  const [question, setQuestion] = useState("");
  useEffect(() => {
    if (!open) setQuestion("");
  }, [open]);
  const trimmedQuestion = question.trim();
  const validQuestion = operatorQuestionTextSchema.safeParse(trimmedQuestion).success;
  return (
    <ConfirmDrawer
      title={intl.formatMessage({
        id: "quotes.askApplicant.title",
        defaultMessage: "Ask the applicant",
        description: "Title for an optional operator question, separate from the financial decision",
      })}
      description={intl.formatMessage({
        id: "quotes.askApplicant.description",
        defaultMessage: "The applicant will receive this question in eBill.",
        description: "Delivery destination for an optional operator question",
      })}
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && isPending) return;
        if (!nextOpen) setQuestion("");
        onOpenChange(nextOpen);
      }}
      onSubmit={() => {
        if (!isPending && validQuestion) onSubmit(trimmedQuestion);
      }}
      cancelButtonDisabled={isPending}
      submitButtonDisabled={isPending || !validQuestion}
      submitButtonText={intl.formatMessage({
        id: "quotes.askApplicant.send",
        defaultMessage: "Send question",
        description: "Submit an optional question to the applicant",
      })}
      trigger={children}
    >
      <div className="px-4">
        <label className="mb-2 block text-sm font-medium" htmlFor="applicant-question">
          {intl.formatMessage({
            id: "quotes.askApplicant.question",
            defaultMessage: "Your question",
            description: "Label for the question the operator wants to ask the applicant",
          })}
        </label>
        <textarea
          id="applicant-question"
          className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          maxLength={500}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          disabled={isPending}
          aria-invalid={trimmedQuestion.length > 0 && !validQuestion}
          aria-describedby={trimmedQuestion.length > 0 && !validQuestion ? "applicant-question-error" : undefined}
        />
        {trimmedQuestion.length > 0 && !validQuestion && (
          <p id="applicant-question-error" className="mt-2 text-sm text-destructive">
            {intl.formatMessage({
              id: "quotes.askApplicant.invalidQuestion",
              defaultMessage: "Use one line of plain text, up to 500 characters.",
            })}
          </p>
        )}
      </div>
    </ConfirmDrawer>
  );
}
