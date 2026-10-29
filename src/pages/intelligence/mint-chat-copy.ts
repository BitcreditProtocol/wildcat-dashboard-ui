import { defineMessages } from "react-intl";
export const mintChatMessages = defineMessages({
  title: { id: "mintChat.title", defaultMessage: "Ask the Mint", description: "Operator dashboard mintChat: title" },
  subtitle: {
    id: "mintChat.subtitle",
    defaultMessage: "See the connections in your Mint’s records.",
    description: "Operator dashboard mintChat: subtitle",
  },
  label: {
    id: "mintChat.label",
    defaultMessage: "Model explanation · read-only · not verification.",
    description: "Operator dashboard mintChat: label",
  },
  boundary: {
    id: "mintChat.boundary",
    defaultMessage:
      "Only bounded Mint notes, published policy, aggregate outcomes, portfolio, queue, federation and capacity observations reach this prompt. No interviews, evidence files, help messages, statement detail, keys or proofs. It cannot edit, contact, reprice, decide or authorize. Its answers never feed the applicant interview, assessment, pricing, gates, authorization or any other prompt. General knowledge is undated and may be out of date; stale notes are labelled. Synthetic data only.",
    description: "Operator dashboard mintChat: boundary",
  },
  input: { id: "mintChat.input", defaultMessage: "Your question to the Mint", description: "Operator dashboard mintChat: input" },
  placeholder: {
    id: "mintChat.placeholder",
    defaultMessage: "Ask about your cases, buyers or due dates…",
    description: "Operator dashboard mintChat: placeholder",
  },
  send: { id: "mintChat.send", defaultMessage: "Ask", description: "Operator dashboard mintChat: send" },
  pending: {
    id: "mintChat.pending",
    defaultMessage: "Reading the Mint’s records and preparing an explanation…",
    description: "Operator dashboard mintChat: pending",
  },
  pendingDetail: {
    id: "mintChat.pendingDetail",
    defaultMessage: "This may take up to a minute. No action is being taken.",
    description: "Operator dashboard mintChat: pendingDetail",
  },
  emptyTitle: {
    id: "mintChat.emptyTitle",
    defaultMessage: "What would you like to understand?",
    description: "Operator dashboard mintChat: emptyTitle",
  },
  emptyBody: {
    id: "mintChat.emptyBody",
    defaultMessage: "Ask about cases, buyers, due dates or the harvest, in English or Spanish. Every answer cites the records it used.",
    description: "Operator dashboard mintChat: emptyBody",
  },
  exampleMaturity: {
    id: "mintChat.exampleMaturity",
    defaultMessage: "Which bills mature in the next 30 days?",
    description: "Operator dashboard mintChat: exampleMaturity",
  },
  exampleExposure: {
    id: "mintChat.exampleExposure",
    defaultMessage: "Which counterparties are closest to their exposure cap?",
    description: "Operator dashboard mintChat: exampleExposure",
  },
  exampleHarvest: {
    id: "mintChat.exampleHarvest",
    defaultMessage: "What matters about the Guatemalan coffee harvest for repayment?",
    description: "Operator dashboard mintChat: exampleHarvest",
  },
  model: { id: "mintChat.model", defaultMessage: "Model: {model}", description: "Accessible name of the model picker" },
  modelMenu: { id: "mintChat.modelMenu", defaultMessage: "Answer with", description: "Heading of the model picker menu" },
  modelDefault: { id: "mintChat.modelDefault", defaultMessage: "Default", description: "Marks the Mint's default model" },
  modelFixed: {
    id: "mintChat.modelFixed",
    defaultMessage: "This Mint answers with one configured model",
    description: "Tooltip when the Mint offers no model choice",
  },
  copy: { id: "mintChat.copy", defaultMessage: "Copy answer", description: "Copies one answer's text" },
  copied: { id: "mintChat.copied", defaultMessage: "Copied", description: "Confirmation after copying an answer" },
  conversations: { id: "mintChat.conversations", defaultMessage: "Earlier conversations", description: "Conversation menu heading" },
  limitWhy: {
    id: "mintChat.limitWhy",
    defaultMessage: "One daily limit for the whole Mint, shared by every operator",
    description: "Tooltip for the daily question count",
  },
  newThread: { id: "mintChat.newThread", defaultMessage: "New conversation", description: "Operator dashboard mintChat: newThread" },
  history: { id: "mintChat.history", defaultMessage: "Conversation", description: "Operator dashboard mintChat: history" },
  you: { id: "mintChat.you", defaultMessage: "You", description: "Operator dashboard mintChat: you" },
  sources: { id: "mintChat.sources", defaultMessage: "Sources supplied to the model", description: "Operator dashboard mintChat: sources" },
  followUps: { id: "mintChat.followUps", defaultMessage: "Explore next", description: "Operator dashboard mintChat: followUps" },
  retry: { id: "mintChat.retry", defaultMessage: "Retry the same question", description: "Operator dashboard mintChat: retry" },
  failed: {
    id: "mintChat.failed",
    defaultMessage: "No explanation was saved. The question remains in the journal; an identical retry will not run inference again.",
    description: "Operator dashboard mintChat: failed",
  },
  unavailable: {
    id: "mintChat.unavailable",
    defaultMessage: "Ask the Mint is unavailable on this API. Your notes are still available below.",
    description: "Operator dashboard mintChat: unavailable",
  },
  error: {
    id: "mintChat.error",
    defaultMessage: "The answer could not be retrieved. Retry with the same request ID before sending a new question.",
    description: "Operator dashboard mintChat: error",
  },
  busy: {
    id: "mintChat.busy",
    defaultMessage: "Another model call is active. Try again shortly.",
    description: "Operator dashboard mintChat: busy",
  },
  daily_limit: {
    id: "mintChat.dailyLimit",
    defaultMessage: "Today’s question limit has been reached. You can still read the history and all Mint records.",
    description: "Operator dashboard mintChat: dailyLimit",
  },
  journal_full: {
    id: "mintChat.journalFull",
    defaultMessage: "The discussion journal is full. Ask an administrator to rotate its authenticated history.",
    description: "Operator dashboard mintChat: journalFull",
  },
  request_conflict: {
    id: "mintChat.requestConflict",
    defaultMessage: "This request ID is already bound to a different question or operator. Start a new conversation.",
    description: "Operator dashboard mintChat: requestConflict",
  },
  invalid_answer: {
    id: "mintChat.invalidAnswer",
    defaultMessage: "The model returned an invalid or unsupported explanation. No answer was published.",
    description: "Operator dashboard mintChat: invalidAnswer",
  },
  general: {
    id: "mintChat.general",
    defaultMessage: "General knowledge — not from this Mint’s records, undated, may be out of date.",
    description: "Operator dashboard mintChat: general",
  },
  elapsed: { id: "mintChat.elapsed", defaultMessage: "{seconds}s elapsed", description: "Elapsed time while the Mint prepares an answer" },
  limit: {
    id: "mintChat.limit",
    defaultMessage: "{used} / {limit} questions today",
    description: "Operator dashboard mintChat: limit",
  },
  caseHint: {
    id: "mintChat.caseHint",
    defaultMessage: "For evidence or a decision on one bill, open its quote and use “Ask about this case”.",
    description: "Operator dashboard mintChat: caseHint",
  },
  "intelligence-note": {
    id: "mintChat.source.note",
    defaultMessage: "Intelligence note",
    description: "Operator dashboard mintChat: source note",
  },
  policy: { id: "mintChat.source.policy", defaultMessage: "Policy", description: "Operator dashboard mintChat: source policy" },
  outcomes: { id: "mintChat.source.outcomes", defaultMessage: "Outcomes", description: "Operator dashboard mintChat: source outcomes" },
  portfolio: {
    id: "mintChat.source.portfolio",
    defaultMessage: "Portfolio / quote",
    description: "Operator dashboard mintChat: source portfolio",
  },
  queue: { id: "mintChat.source.queue", defaultMessage: "Queue", description: "Operator dashboard mintChat: source queue" },
  federation: {
    id: "mintChat.source.federation",
    defaultMessage: "Federation",
    description: "Operator dashboard mintChat: source federation",
  },
  capacity: { id: "mintChat.source.capacity", defaultMessage: "Capacity", description: "Operator dashboard mintChat: source capacity" },
  "general-knowledge": {
    id: "mintChat.source.general",
    defaultMessage: "General knowledge",
    description: "Operator dashboard mintChat: source general",
  },
});
