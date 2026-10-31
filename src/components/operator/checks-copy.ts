import { defineMessages } from "@/i18n/define-messages";

/** Plain-language names for the policy's hard gates: what passing means, what failing means. */
export const checkMessages = defineMessages({
  title: { id: "agentic.checks", defaultMessage: "Checks", description: "Rules every bill must pass before an offer" },
  why: {
    id: "agentic.checks.why",
    defaultMessage: "Rules every bill must pass before this Mint can make an offer. Code applies them; nobody can override them.",
    description: "Tooltip explaining what the checks are",
  },
  allPassed: { id: "agentic.checks.allPassed", defaultMessage: "All {count} passed", description: "Every check passed" },
  failed: {
    id: "agentic.checks.failed",
    defaultMessage: "{count, plural, one {# failed} other {# failed}}",
    description: "Number of failed checks",
  },
  notRun: { id: "agentic.checks.notRun", defaultMessage: "Not run yet", description: "No check result is recorded yet" },
  partial: {
    id: "agentic.checks.partial",
    defaultMessage: "{passed} passed · {pending} not checked yet",
    description: "Some checks passed, the rest have no result yet",
  },
  pending: { id: "agentic.checks.pending", defaultMessage: "Not checked yet", description: "One check has no recorded result" },
  rule: { id: "agentic.checks.rule", defaultMessage: "Policy rule", description: "Link to the exact policy rule behind a check" },
});

interface Gate {
  pass: { id: string; defaultMessage: string };
  fail: { id: string; defaultMessage: string };
}

export const gateMessages: Record<string, Gate> = {
  bill_already_financed: defineMessages({
    pass: { id: "agentic.check.alreadyFinanced.pass", defaultMessage: "Not already financed here" },
    fail: { id: "agentic.check.alreadyFinanced.fail", defaultMessage: "Already financed by this Mint" },
  }),
  finance_lock_held_elsewhere: defineMessages({
    pass: { id: "agentic.check.financeLock.pass", defaultMessage: "No other Mint is financing it" },
    fail: { id: "agentic.check.financeLock.fail", defaultMessage: "Another Mint is already financing it" },
  }),
  bill_not_accepted: defineMessages({
    pass: { id: "agentic.check.accepted.pass", defaultMessage: "Buyer accepted the bill" },
    fail: { id: "agentic.check.accepted.fail", defaultMessage: "Buyer hasn’t accepted the bill" },
  }),
  tenor_outside_policy: defineMessages({
    pass: { id: "agentic.check.tenor.pass", defaultMessage: "Due date within limits" },
    fail: { id: "agentic.check.tenor.fail", defaultMessage: "Due date outside limits" },
  }),
  bill_sum_above_policy_cap: defineMessages({
    pass: { id: "agentic.check.amount.pass", defaultMessage: "Amount within limit" },
    fail: { id: "agentic.check.amount.fail", defaultMessage: "Amount above limit" },
  }),
  invoice_commercially_implausible: defineMessages({
    pass: { id: "agentic.check.plausible.pass", defaultMessage: "Invoice makes sense" },
    fail: { id: "agentic.check.plausible.fail", defaultMessage: "Invoice doesn’t add up" },
  }),
  invoice_cancelled_at_tax_authority: defineMessages({
    pass: { id: "agentic.check.taxValid.pass", defaultMessage: "Invoice valid at tax authority" },
    fail: { id: "agentic.check.taxValid.fail", defaultMessage: "Invoice cancelled at tax authority" },
  }),
  counterparty_exposure_above_policy_cap: defineMessages({
    pass: { id: "agentic.check.exposure.pass", defaultMessage: "Within buyer and farm limits" },
    fail: { id: "agentic.check.exposure.fail", defaultMessage: "Over a buyer or farm limit" },
  }),
  buyer_denied_obligation: defineMessages({
    pass: { id: "agentic.check.buyer.pass", defaultMessage: "Buyer hasn’t disputed it" },
    fail: { id: "agentic.check.buyer.fail", defaultMessage: "Buyer disputes the debt" },
  }),
  bill_sum_without_tax_document_above_policy_cap: defineMessages({
    pass: { id: "agentic.check.invoice.pass", defaultMessage: "Invoice on file for this amount" },
    fail: { id: "agentic.check.invoice.fail", defaultMessage: "Needs a tax invoice for this amount" },
  }),
};
