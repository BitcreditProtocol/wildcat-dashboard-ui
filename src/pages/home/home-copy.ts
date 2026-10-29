import { defineMessages } from "react-intl";

export const homeMessages = defineMessages({
  summary: {
    id: "agentic.home.summary",
    defaultMessage:
      "{needs, plural, =0 {Nothing needs you right now} one {# item needs you} other {# items need you}} · {accepted} sat accepted across {bills, plural, one {# bill} other {# bills}}",
    description: "One-line state of the Mint under the Today title",
  },
  decide: { id: "agentic.home.decide", defaultMessage: "Decide", description: "Card tag: an offer decision is waiting" },
  confirmBuyer: { id: "agentic.home.confirmBuyer", defaultMessage: "Confirm buyer", description: "Card tag: buyer confirmation is due" },
  reply: { id: "agentic.home.reply", defaultMessage: "Reply", description: "Card tag: an applicant asked for help" },
  facility: { id: "agentic.home.facility", defaultMessage: "Facility", description: "Card tag: a facility application waits" },
  open: { id: "agentic.home.open", defaultMessage: "Open case", description: "Button on a queue card" },
  answer: { id: "agentic.home.answer", defaultMessage: "Answer", description: "Button on a help card" },
  offerReady: {
    id: "agentic.home.offerReady",
    defaultMessage: "Proposed: farm receives {net} sat · fee {fee} sat",
    description: "Code-calculated terms awaiting the operator",
  },
  noTerms: { id: "agentic.home.noTerms", defaultMessage: "No price yet", description: "No governed price is recorded" },
  asked: { id: "agentic.home.asked", defaultMessage: "Asked {age} ago", description: "Age of a help request" },
  allClear: {
    id: "agentic.home.allClear",
    defaultMessage: "Nothing waits for you. The agents will bring new cases here.",
    description: "Empty queue",
  },
  queueGaps: {
    id: "agentic.home.queueGaps",
    defaultMessage: "Some queues could not be read",
    description: "Help requests or facility applications are unavailable, so the list may be incomplete",
  },
  portfolio: { id: "agentic.home.portfolio", defaultMessage: "Portfolio", description: "Section title" },
  accepted: { id: "agentic.home.accepted", defaultMessage: "Accepted", description: "Face value of accepted bills" },
  acceptedWhy: {
    id: "agentic.home.acceptedWhy",
    defaultMessage: "Face value of bills this Mint accepted. Not the same as ecash issued or spendable.",
    description: "Tooltip for the accepted total",
  },
  offered: { id: "agentic.home.offered", defaultMessage: "Offered, not yet accepted", description: "Face value under open offers" },
  bills: { id: "agentic.home.bills", defaultMessage: "Bills", description: "Number of bills in the portfolio" },
  exposure: { id: "agentic.home.exposure", defaultMessage: "Exposure by party", description: "Section title" },
  ofLimit: { id: "agentic.home.ofLimit", defaultMessage: "{used} of {cap}", description: "Used amount of a limit" },
  noLimit: { id: "agentic.home.noLimit", defaultMessage: "{used} · no limit published", description: "Used amount without a limit" },
  farm: { id: "agentic.home.farm", defaultMessage: "Farm", description: "Role tag: the bill's drawer" },
  buyer: { id: "agentic.home.buyer", defaultMessage: "Buyer", description: "Role tag: the bill's drawee" },
  lookalike: {
    id: "agentic.home.lookalike",
    defaultMessage: "Look-alike name",
    description: "Another identity has the same or a similar name",
  },
  maturities: { id: "agentic.home.maturities", defaultMessage: "Due dates", description: "Maturity ladder title" },
  activity: { id: "agentic.home.activity", defaultMessage: "Activity", description: "Section title" },
  activityEmpty: { id: "agentic.home.activityEmpty", defaultMessage: "No activity yet.", description: "Empty feed" },
  activityUnavailable: {
    id: "agentic.home.activityUnavailable",
    defaultMessage: "Activity unavailable right now.",
    description: "Feed sources could not be read",
  },
  storage: {
    id: "agentic.home.storage",
    defaultMessage: "Case storage is nearly full. New applications will pause at the limit.",
    description: "Plain alert shown only when storage needs attention",
  },
  partial: {
    id: "agentic.home.partial",
    defaultMessage: "Some records could not be read; totals may be incomplete.",
    description: "Incomplete portfolio coverage",
  },
  footnote: {
    id: "agentic.home.footnote",
    defaultMessage: "Synthetic test data · amounts are bill face values in sat",
    description: "Footer under the Today page",
  },
});

/** One sentence per recorded event; names come from the server's display names. */
export const activityMessages = defineMessages({
  application_received: { id: "agentic.activity.received", defaultMessage: "{applicant} applied to finance a bill on {buyer}" },
  interview_completed: { id: "agentic.activity.interview", defaultMessage: "Interview with {applicant} finished" },
  case_assessed: { id: "agentic.activity.assessed", defaultMessage: "{applicant}’s case assessed" },
  buyer_confirmed: { id: "agentic.activity.buyerConfirmed", defaultMessage: "{buyer} confirmed it owes {applicant}’s bill" },
  offer_made: { id: "agentic.activity.offerMade", defaultMessage: "Offer made to {applicant}" },
  offer_accepted: { id: "agentic.activity.offerAccepted", defaultMessage: "{applicant} accepted the offer" },
  offer_denied: { id: "agentic.activity.offerDenied", defaultMessage: "{applicant}’s request declined" },
  offer_rejected: { id: "agentic.activity.offerRejected", defaultMessage: "{applicant} turned down the offer" },
  help_requested: { id: "agentic.activity.helpRequested", defaultMessage: "{applicant} asked for help" },
  help_answered: { id: "agentic.activity.helpAnswered", defaultMessage: "Help reply sent to {applicant}" },
  finance_lock_elsewhere: {
    id: "agentic.activity.lockElsewhere",
    defaultMessage: "{applicant}’s bill is being financed at another Mint",
  },
  someone: { id: "agentic.activity.someone", defaultMessage: "An applicant" },
  theBuyer: { id: "agentic.activity.theBuyer", defaultMessage: "the buyer" },
});
