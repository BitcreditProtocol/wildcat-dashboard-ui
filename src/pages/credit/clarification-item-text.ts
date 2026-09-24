import { creditClarificationRequiredItemText, type CreditClarificationRequest } from "@bitcredit/ai-credit-shared";

/** Operator questions stay attributed plain text; reviewed policy items keep their canonical copy. */
export function clarificationItemText(item: CreditClarificationRequest["requiredItems"][number]): string {
  if (typeof item === "string") return item;
  if (item.requestCode === "operator_question" && "question" in item) return item.question;
  return creditClarificationRequiredItemText(item.requestCode);
}
