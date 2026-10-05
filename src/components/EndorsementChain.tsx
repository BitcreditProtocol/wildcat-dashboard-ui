import { useId, useState } from "react";
import { Skeleton, TruncatedTextPopover } from "@bitcredit/ui-library";
import { ArrowUpDown, CheckCircle2, Coins, DollarSign, HelpCircle, PencilLine, Send, Repeat2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BillHistoryBlock, BillParticipant } from "@/generated/client/types.gen";
import { defineMessages, useIntl } from "react-intl";
import { statedAddress } from "@/utils/bill-participants";

interface EndorsementChainProps {
  historyBlocks?: BillHistoryBlock[];
  isLoading?: boolean;
  maturityDate?: string;
}

const messages = defineMessages({
  title: { id: "bill.record.history.title", defaultMessage: "Signed history", description: "Heading of the bill's signed blocks" },
  count: {
    id: "bill.record.history.count",
    defaultMessage: "{count, plural, one {# event} other {# events}}",
    description: "Number of signed blocks in the bill's history",
  },
  newestFirst: { id: "bill.record.history.newestFirst", defaultMessage: "Newest first", description: "Current sort of the history" },
  oldestFirst: { id: "bill.record.history.oldestFirst", defaultMessage: "Oldest first", description: "Current sort of the history" },
  sortLabel: {
    id: "bill.record.history.sortLabel",
    defaultMessage: "Change the order of the signed history",
    description: "Accessible label of the history sort toggle",
  },
  unavailable: {
    id: "bill.record.history.unavailable",
    defaultMessage: "The signed history is not available. Refresh the bill to fetch it again.",
    description: "The bill's history could not be read",
  },
  empty: {
    id: "bill.record.history.empty",
    defaultMessage: "No signed events are recorded for this bill.",
    description: "The bill's history was read and holds no blocks",
  },
  signedBy: { id: "bill.record.history.signedBy", defaultMessage: "Signed by {party}", description: "Who signed the block" },
  signatory: {
    id: "bill.record.history.signatory",
    defaultMessage: "signatory {name}",
    description: "The person who signed for a company",
  },
  payableTo: { id: "bill.record.history.payableTo", defaultMessage: "Payable to {party}", description: "The payee the bill was issued to" },
  endorsedTo: { id: "bill.record.history.endorsedTo", defaultMessage: "Endorsed to {party}", description: "Who the bill was passed to" },
  anonymous: { id: "bill.record.history.anonymous", defaultMessage: "anonymous {nodeId}", description: "An unnamed party, by node id" },
  due: { id: "bill.record.history.due", defaultMessage: "Due {date}", description: "Maturity date written into the issued bill" },
  amount: {
    id: "bill.record.history.amount",
    defaultMessage: "{amount} {currency} to",
    description: "Payment requested in the block, followed by the address it goes to",
  },
  deadline: { id: "bill.record.history.deadline", defaultMessage: "Deadline {date}", description: "Deadline of a request in the block" },
});

const eventMessages = defineMessages({
  Issue: { id: "bill.history.Issue", defaultMessage: "Bill issued" },
  Endorse: { id: "bill.history.Endorse", defaultMessage: "Bill endorsed" },
  RequestToAccept: { id: "bill.history.RequestToAccept", defaultMessage: "Request to accept" },
  Accept: { id: "bill.history.Accept", defaultMessage: "Bill accepted" },
  RejectToAccept: { id: "bill.history.RejectToAccept", defaultMessage: "Acceptance rejected" },
  RequestToPay: { id: "bill.history.RequestToPay", defaultMessage: "Request to pay" },
  RejectToPay: { id: "bill.history.RejectToPay", defaultMessage: "Payment rejected" },
  Pay: { id: "bill.history.Pay", defaultMessage: "Payment received" },
  Mint: { id: "bill.history.Mint", defaultMessage: "Minting enabled" },
});

// Colour only where the event decides something: acceptance and payment, or their refusal.
const EVENTS: Record<string, { icon: LucideIcon; tone?: "success" | "alert"; message: keyof typeof eventMessages }> = {
  Issue: { icon: PencilLine, message: "Issue" },
  Endorse: { icon: Repeat2, message: "Endorse" },
  RequestToAccept: { icon: Send, message: "RequestToAccept" },
  Accept: { icon: CheckCircle2, tone: "success", message: "Accept" },
  RejectToAccept: { icon: XCircle, tone: "alert", message: "RejectToAccept" },
  RequestToPay: { icon: Send, message: "RequestToPay" },
  RejectToPay: { icon: XCircle, tone: "alert", message: "RejectToPay" },
  Pay: { icon: DollarSign, tone: "success", message: "Pay" },
  Mint: { icon: Coins, message: "Mint" },
};

/**
 * The bill's signed blocks as a timeline: who signed what, when, from where, and to whom it went.
 * This is the record behind "accepted the eBill" on the quote summary; signed means authentic,
 * not that the payer can pay.
 */
export function EndorsementChain({ historyBlocks, isLoading, maturityDate }: EndorsementChainProps) {
  const intl = useIntl();
  const titleId = useId();
  const [newestFirst, setNewestFirst] = useState(false);
  const events = [...(historyBlocks ?? [])].sort((a, b) =>
    newestFirst ? b.signing_timestamp - a.signing_timestamp : a.signing_timestamp - b.signing_timestamp
  );

  return (
    <section id="bill-history" aria-labelledby={titleId} className="scroll-mt-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={titleId} className="text-sm font-semibold">
          {intl.formatMessage(messages.title)}
          {events.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {intl.formatMessage(messages.count, { count: events.length })}
            </span>
          )}
        </h3>
        {events.length > 1 && (
          <button
            type="button"
            onClick={() => setNewestFirst((value) => !value)}
            aria-label={intl.formatMessage(messages.sortLabel)}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowUpDown className="size-3" aria-hidden="true" />
            {intl.formatMessage(newestFirst ? messages.newestFirst : messages.oldestFirst)}
          </button>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="mt-3 h-24 w-full" />
      ) : historyBlocks === undefined ? (
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.unavailable)}</p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">{intl.formatMessage(messages.empty)}</p>
      ) : (
        <ol className="mt-3 ml-2 border-l border-border">
          {events.map((block) => (
            <BlockEvent key={block.block_id} block={block} maturityDate={maturityDate} />
          ))}
        </ol>
      )}
    </section>
  );
}

function PartyName({ participant }: { participant: BillParticipant }) {
  const intl = useIntl();
  if ("Anon" in participant) {
    return <>{intl.formatMessage(messages.anonymous, { nodeId: `${participant.Anon.node_id.slice(0, 12)}…` })}</>;
  }
  return <span className="text-foreground">{participant.Ident.name}</span>;
}

function BlockEvent({ block, maturityDate }: { block: BillHistoryBlock; maturityDate?: string }) {
  const intl = useIntl();
  const event: (typeof EVENTS)[string] | undefined = EVENTS[block.block_type];
  const Icon = event?.icon ?? HelpCircle;
  const iconClass =
    event?.tone === "success" ? "text-signal-success" : event?.tone === "alert" ? "text-signal-alert" : "text-muted-foreground";
  const signedAt = new Date(block.signing_timestamp * 1000);
  const date = (value: Date | string) => intl.formatDate(value, { dateStyle: "medium", timeZone: "UTC" });
  const signer = block.signed.data;
  const signedFrom = block.signing_address ? statedAddress(block.signing_address, intl.locale) : "";

  return (
    <li className="relative pb-4 pl-5 last:pb-0">
      <span className="absolute top-0.5 -left-2 flex size-4 items-center justify-center rounded-full bg-card">
        <Icon className={`size-4 ${iconClass}`} aria-hidden="true" />
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm font-medium">{event ? intl.formatMessage(eventMessages[event.message]) : block.block_type}</span>
        <time
          dateTime={signedAt.toISOString()}
          title={`${intl.formatDate(signedAt, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`}
          className="text-xs text-muted-foreground tabular-nums"
        >
          {date(signedAt)}
        </time>
      </div>
      <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
        <p className="break-words">
          {intl.formatMessage(messages.signedBy, { party: <PartyName key="signer" participant={signer} /> })}
          {block.signed.signatory && (
            <>
              {" · "}
              {intl.formatMessage(messages.signatory, { name: block.signed.signatory.name ?? block.signed.signatory.node_id })}
            </>
          )}
          {signedFrom !== "" && ` · ${signedFrom}`}
        </p>
        {block.pay_to_the_order_of && (
          <p className="break-words">
            {intl.formatMessage(block.block_type === "Issue" ? messages.payableTo : messages.endorsedTo, {
              party: <PartyName key="to" participant={block.pay_to_the_order_of} />,
            })}
          </p>
        )}
        {block.block_type === "Issue" && maturityDate && <p>{intl.formatMessage(messages.due, { date: date(maturityDate) })}</p>}
        {block.payment_data && (
          <p className="flex flex-wrap items-baseline gap-x-1">
            {intl.formatMessage(messages.amount, { amount: block.payment_data.sum, currency: block.payment_data.currency })}
            <TruncatedTextPopover text={block.payment_data.payment_address} maxLength={28} className="inline font-mono" />
          </p>
        )}
        {block.request_deadline && <p>{intl.formatMessage(messages.deadline, { date: date(new Date(block.request_deadline * 1000)) })}</p>}
      </div>
    </li>
  );
}
