import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, getCountryMessage, Skeleton, Text, TruncatedTextPopover } from "@bitcredit/ui-library";
import { useQuery } from "@tanstack/react-query";
import { defineMessages, useIntl, type IntlShape } from "react-intl";
import { getEbillOptions } from "@/generated/client/@tanstack/react-query.gen";
import { type AnyParticipant, formatAddress, isIdentified, participantLabel, unwrapParticipant } from "@/utils/bill-participants";
import { Link } from "react-router";
import type {
  BillAcceptanceStatus,
  BillCurrentWaitingState,
  BillHistoryBlock,
  BillPaymentStatus,
  BillWaitingStatePaymentData,
  BitcreditBill,
  Endorsement,
} from "@/generated/client/types.gen";

const messages = defineMessages({
  title: { id: "quotes.detail.bill.title", defaultMessage: "Bill" },
  error: { id: "quotes.detail.bill.error", defaultMessage: "Bill details could not be loaded." },
  empty: { id: "quotes.detail.bill.empty", defaultMessage: "No bill details available." },
  notAtMint: { id: "quotes.detail.bill.notAtMint", defaultMessage: "This bill has not reached the mint yet." },
  yes: { id: "quotes.detail.bill.yes", defaultMessage: "Yes" },
  no: { id: "quotes.detail.bill.no", defaultMessage: "No" },
  none: { id: "quotes.detail.bill.none", defaultMessage: "None" },
  anonymous: { id: "quotes.detail.bill.anonymous", defaultMessage: "Anonymous" },
  unknown: { id: "quotes.common.unknown", defaultMessage: "Unknown" },

  sectionParticipants: { id: "quotes.detail.bill.section.participants", defaultMessage: "Participants" },
  sectionAcceptance: { id: "quotes.detail.bill.section.acceptance", defaultMessage: "Acceptance" },
  sectionPayment: { id: "quotes.detail.bill.section.payment", defaultMessage: "Payment of the bill" },
  sectionHistory: { id: "quotes.detail.bill.section.history", defaultMessage: "Bill history" },
  sectionWaiting: { id: "quotes.detail.bill.section.waiting", defaultMessage: "Waiting on" },
  sectionFiles: { id: "quotes.detail.bill.section.files", defaultMessage: "Files" },

  billId: { id: "quotes.detail.bill.id", defaultMessage: "Bill ID:" },
  quoteId: { id: "quotes.detail.bill.quoteId", defaultMessage: "Quote ID:" },
  sum: { id: "quotes.detail.bill.sum", defaultMessage: "Sum:" },
  issueDate: { id: "quotes.detail.bill.issueDate", defaultMessage: "Issue date:" },
  drawnAt: { id: "quotes.detail.bill.drawnAt", defaultMessage: "Drawn at:" },
  maturityDate: { id: "quotes.detail.bill.maturityDate", defaultMessage: "Maturity date:" },
  maturesAt: { id: "quotes.detail.bill.maturesAt", defaultMessage: "Matures at:" },
  issuedIn: { id: "quotes.detail.bill.issuedIn", defaultMessage: "Issued in:" },
  payableIn: { id: "quotes.detail.bill.payableIn", defaultMessage: "Payable in:" },

  drawee: { id: "quotes.detail.bill.drawee", defaultMessage: "Drawee:" },
  drawer: { id: "quotes.detail.bill.drawer", defaultMessage: "Drawer:" },
  payee: { id: "quotes.detail.bill.payee", defaultMessage: "Payee:" },
  endorsee: { id: "quotes.detail.bill.endorsee", defaultMessage: "Endorsee:" },
  endorsementsCount: { id: "quotes.detail.bill.endorsementsCount", defaultMessage: "Endorsements:" },
  endorsementIndex: { id: "quotes.detail.bill.endorsementIndex", defaultMessage: "Endorsement {index}" },
  endorsedTo: { id: "quotes.detail.bill.endorsedTo", defaultMessage: "Endorsee:" },
  signedBy: { id: "quotes.detail.bill.signedByLabel", defaultMessage: "Signed by:" },
  signedAt: { id: "quotes.detail.bill.signedAt", defaultMessage: "Signed at:" },
  signatory: { id: "quotes.detail.bill.signatoryLabel", defaultMessage: "Signatory:" },
  signingAddress: { id: "quotes.detail.bill.signingAddress", defaultMessage: "Signed from:" },

  state: { id: "quotes.detail.bill.state", defaultMessage: "State:" },
  requested: { id: "quotes.detail.bill.requested", defaultMessage: "Requested:" },
  requestedAt: { id: "quotes.detail.bill.requestedAt", defaultMessage: "Requested at:" },
  deadline: { id: "quotes.detail.bill.deadline", defaultMessage: "Deadline:" },
  timedOut: { id: "quotes.detail.bill.timedOut", defaultMessage: "Timed out:" },
  rejected: { id: "quotes.detail.bill.rejected", defaultMessage: "Rejected:" },
  paid: { id: "quotes.detail.bill.paid", defaultMessage: "Paid:" },

  acceptanceAccepted: { id: "quotes.detail.bill.acceptance.accepted", defaultMessage: "Accepted" },
  acceptanceRejected: { id: "quotes.detail.bill.acceptance.rejected", defaultMessage: "Rejected" },
  acceptanceTimedOut: { id: "quotes.detail.bill.acceptance.timedOut", defaultMessage: "Request timed out" },
  acceptanceRequested: { id: "quotes.detail.bill.acceptance.requested", defaultMessage: "Requested" },
  acceptanceNotRequested: { id: "quotes.detail.bill.acceptance.notRequested", defaultMessage: "Not requested" },

  blockIndex: { id: "quotes.detail.bill.blockIndex", defaultMessage: "Block {index}" },
  blockDeadline: { id: "quotes.detail.bill.blockDeadline", defaultMessage: "Request deadline:" },
  paymentAddress: { id: "quotes.detail.bill.paymentAddress", defaultMessage: "Payment address:" },
  historyEmpty: { id: "quotes.detail.bill.historyEmpty", defaultMessage: "No blocks on the bill chain yet." },

  waitingFor: { id: "quotes.detail.bill.waitingFor", defaultMessage: "Waiting for:" },
  addressToPay: { id: "quotes.detail.bill.addressToPay", defaultMessage: "Address to pay:" },
  txId: { id: "quotes.detail.bill.txId", defaultMessage: "Transaction:" },
  inMempool: { id: "quotes.detail.bill.inMempool", defaultMessage: "In mempool:" },
  confirmations: { id: "quotes.detail.bill.confirmations", defaultMessage: "Confirmations:" },

  noFiles: { id: "quotes.detail.bill.noFiles", defaultMessage: "No files on the bill." },
});

interface BillDetailCardProps {
  billId: string;
  quoteId?: string;
  historyBlocks?: BillHistoryBlock[];
  isHistoryLoading?: boolean;
  billAtMint?: boolean;
}

function formatTimestamp(intl: IntlShape, value?: number | null): string {
  return value ? new Date(value * 1000).toLocaleString(intl.locale) : intl.formatMessage(messages.unknown);
}

function formatPlace(intl: IntlShape, city: string, country: string): string {
  const countryMessage = getCountryMessage(country);
  const countryLabel = countryMessage ? intl.formatMessage(countryMessage) : country;
  return city ? `${city}, ${countryLabel}` : countryLabel;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:gap-2">
      <Text variant="label" className="w-44 shrink-0">
        {label}
      </Text>
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

function BooleanField({ label, value }: { label: string; value: boolean }) {
  const intl = useIntl();
  return <Field label={label}>{intl.formatMessage(value ? messages.yes : messages.no)}</Field>;
}

function TimestampField({ label, value }: { label: string; value?: number | null }) {
  const intl = useIntl();
  return <Field label={label}>{formatTimestamp(intl, value)}</Field>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Text variant="titleSm" as="h3">
        {title}
      </Text>
      <div className="flex flex-col gap-1.5">{children}</div>
    </section>
  );
}

function MonoValue({ value }: { value: string }) {
  return <TruncatedTextPopover text={value} maxLength={24} className="font-mono text-sm" as="span" />;
}

function ParticipantField({ label, participant }: { label: string; participant?: AnyParticipant | null }) {
  const intl = useIntl();
  const details = unwrapParticipant(participant);

  if (!details) {
    return (
      <Field label={label}>
        <Text variant="bodyMuted">{intl.formatMessage(messages.none)}</Text>
      </Field>
    );
  }

  if (!isIdentified(details)) {
    return (
      <Field label={label}>
        <div className="flex flex-col gap-0.5">
          <Text variant="bodyMuted">{intl.formatMessage(messages.anonymous)}</Text>
          <MonoValue value={details.node_id} />
        </div>
      </Field>
    );
  }

  const email = "email" in details ? details.email : null;
  const relays = "nostr_relays" in details ? details.nostr_relays : [];

  return (
    <Field label={label}>
      <div className="flex flex-col gap-0.5">
        <Text variant="body">{`${details.name} (${details.type})`}</Text>
        <Text variant="bodyMuted">{formatAddress(details)}</Text>
        {email && <Text variant="bodyMuted">{email}</Text>}
        <MonoValue value={details.node_id} />
        {relays.length > 0 && <Text variant="bodyMuted">{relays.join(", ")}</Text>}
      </div>
    </Field>
  );
}

function EndorsementRow({ endorsement, index }: { endorsement: Endorsement; index: number }) {
  const intl = useIntl();
  const fallback = intl.formatMessage(messages.unknown);
  const address = endorsement.signing_address;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-divider-50 p-2">
      <Text variant="label">{intl.formatMessage(messages.endorsementIndex, { index: index + 1 })}</Text>
      <Field label={intl.formatMessage(messages.endorsedTo)}>
        {participantLabel(unwrapParticipant(endorsement.pay_to_the_order_of), fallback)}
      </Field>
      <Field label={intl.formatMessage(messages.signedBy)}>{participantLabel(unwrapParticipant(endorsement.signed.data), fallback)}</Field>
      <TimestampField label={intl.formatMessage(messages.signedAt)} value={endorsement.signing_timestamp} />
      {endorsement.signed.signatory && (
        <Field label={intl.formatMessage(messages.signatory)}>
          {endorsement.signed.signatory.name ?? endorsement.signed.signatory.node_id}
        </Field>
      )}
      {address && <Field label={intl.formatMessage(messages.signingAddress)}>{formatAddress(address)}</Field>}
    </div>
  );
}

function HistoryBlockRow({ block }: { block: BillHistoryBlock }) {
  const intl = useIntl();
  const fallback = intl.formatMessage(messages.unknown);
  const endorsee = unwrapParticipant(block.pay_to_the_order_of);
  const address = block.signing_address;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-divider-50 p-2">
      <div className="flex items-center gap-2">
        <Text variant="label">{intl.formatMessage(messages.blockIndex, { index: block.block_id })}</Text>
        <Badge variant="outline">{block.block_type}</Badge>
      </div>
      <Field label={intl.formatMessage(messages.signedBy)}>{participantLabel(unwrapParticipant(block.signed.data), fallback)}</Field>
      <TimestampField label={intl.formatMessage(messages.signedAt)} value={block.signing_timestamp} />
      {block.signed.signatory && (
        <Field label={intl.formatMessage(messages.signatory)}>{block.signed.signatory.name ?? block.signed.signatory.node_id}</Field>
      )}
      {endorsee && <Field label={intl.formatMessage(messages.endorsedTo)}>{participantLabel(endorsee, fallback)}</Field>}
      {block.payment_data && (
        <>
          <Field label={intl.formatMessage(messages.sum)}>{`${block.payment_data.sum} ${block.payment_data.currency}`}</Field>
          <Field label={intl.formatMessage(messages.paymentAddress)}>
            <MonoValue value={block.payment_data.payment_address} />
          </Field>
        </>
      )}
      {block.request_deadline && <TimestampField label={intl.formatMessage(messages.blockDeadline)} value={block.request_deadline} />}
      {address && <Field label={intl.formatMessage(messages.signingAddress)}>{formatAddress(address)}</Field>}
    </div>
  );
}

function HistorySection({ blocks, isLoading }: { blocks?: BillHistoryBlock[]; isLoading?: boolean }) {
  const intl = useIntl();

  return (
    <Section title={intl.formatMessage(messages.sectionHistory)}>
      {isLoading && <Skeleton className="h-24 rounded-lg" />}
      {!isLoading && (blocks ?? []).length === 0 && <Text variant="bodyMuted">{intl.formatMessage(messages.historyEmpty)}</Text>}
      {!isLoading && (blocks ?? []).map((block) => <HistoryBlockRow key={block.block_id} block={block} />)}
    </Section>
  );
}

function AcceptanceBadge({ acceptance }: { acceptance: BillAcceptanceStatus }) {
  const intl = useIntl();

  if (acceptance.accepted) {
    return <Badge variant="success">{intl.formatMessage(messages.acceptanceAccepted)}</Badge>;
  }
  if (acceptance.rejected_to_accept) {
    return <Badge variant="destructive">{intl.formatMessage(messages.acceptanceRejected)}</Badge>;
  }
  if (acceptance.request_to_accept_timed_out) {
    return <Badge variant="neutral">{intl.formatMessage(messages.acceptanceTimedOut)}</Badge>;
  }
  if (acceptance.requested_to_accept) {
    return <Badge variant="pending">{intl.formatMessage(messages.acceptanceRequested)}</Badge>;
  }
  return <Badge variant="outline">{intl.formatMessage(messages.acceptanceNotRequested)}</Badge>;
}

function AcceptanceSection({ acceptance }: { acceptance: BillAcceptanceStatus }) {
  const intl = useIntl();

  return (
    <Section title={intl.formatMessage(messages.sectionAcceptance)}>
      <Field label={intl.formatMessage(messages.state)}>
        <AcceptanceBadge acceptance={acceptance} />
      </Field>
      <BooleanField label={intl.formatMessage(messages.requested)} value={acceptance.requested_to_accept} />
      <TimestampField label={intl.formatMessage(messages.requestedAt)} value={acceptance.time_of_request_to_accept} />
      <TimestampField label={intl.formatMessage(messages.deadline)} value={acceptance.acceptance_deadline_timestamp} />
      <BooleanField label={intl.formatMessage(messages.timedOut)} value={acceptance.request_to_accept_timed_out} />
      <BooleanField label={intl.formatMessage(messages.rejected)} value={acceptance.rejected_to_accept} />
    </Section>
  );
}

function PaymentSection({ payment }: { payment: BillPaymentStatus }) {
  const intl = useIntl();

  return (
    <Section title={intl.formatMessage(messages.sectionPayment)}>
      <BooleanField label={intl.formatMessage(messages.paid)} value={payment.paid} />
      <BooleanField label={intl.formatMessage(messages.requested)} value={payment.requested_to_pay} />
      <TimestampField label={intl.formatMessage(messages.requestedAt)} value={payment.time_of_request_to_pay} />
      <TimestampField label={intl.formatMessage(messages.deadline)} value={payment.payment_deadline_timestamp} />
      <BooleanField label={intl.formatMessage(messages.timedOut)} value={payment.request_to_pay_timed_out} />
      <BooleanField label={intl.formatMessage(messages.rejected)} value={payment.rejected_to_pay} />
    </Section>
  );
}

function WaitingStateSection({ waitingState }: { waitingState: BillCurrentWaitingState }) {
  const intl = useIntl();
  const entry = Object.entries(waitingState)[0] as [string, { payment_data?: BillWaitingStatePaymentData }] | undefined;

  if (!entry) {
    return null;
  }

  const [kind, state] = entry;
  const paymentData = state.payment_data;

  return (
    <Section title={intl.formatMessage(messages.sectionWaiting)}>
      <Field label={intl.formatMessage(messages.waitingFor)}>{kind}</Field>
      {paymentData && (
        <>
          <TimestampField label={intl.formatMessage(messages.requestedAt)} value={paymentData.time_of_request} />
          <Field label={intl.formatMessage(messages.sum)}>{`${paymentData.sum} ${paymentData.currency}`}</Field>
          <Field label={intl.formatMessage(messages.addressToPay)}>
            <MonoValue value={paymentData.address_to_pay} />
          </Field>
          <Field label={intl.formatMessage(messages.txId)}>
            {paymentData.tx_id ? <MonoValue value={paymentData.tx_id} /> : intl.formatMessage(messages.unknown)}
          </Field>
          <BooleanField label={intl.formatMessage(messages.inMempool)} value={paymentData.in_mempool} />
          <Field label={intl.formatMessage(messages.confirmations)}>{paymentData.confirmations}</Field>
          <TimestampField label={intl.formatMessage(messages.deadline)} value={paymentData.payment_deadline} />
        </>
      )}
    </Section>
  );
}

function BillSections({
  bill,
  quoteId,
  historyBlocks,
  isHistoryLoading,
}: {
  bill: BitcreditBill;
  quoteId?: string;
  historyBlocks?: BillHistoryBlock[];
  isHistoryLoading?: boolean;
  billAtMint?: boolean;
}) {
  const intl = useIntl();
  const { data, participants, status } = bill;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Field label={intl.formatMessage(messages.billId)}>
          <MonoValue value={bill.id} />
        </Field>
        {quoteId && (
          <Field label={intl.formatMessage(messages.quoteId)}>
            <Link to={`/quotes/${quoteId}`} className="font-mono text-sm underline underline-offset-4">
              {quoteId}
            </Link>
          </Field>
        )}
        {data && (
          <>
            <Field label={intl.formatMessage(messages.sum)}>{`${data.sum} ${data.currency}`}</Field>
            <Field label={intl.formatMessage(messages.issueDate)}>{data.issue_date}</Field>
            <TimestampField label={intl.formatMessage(messages.drawnAt)} value={data.time_of_drawing} />
            <Field label={intl.formatMessage(messages.maturityDate)}>{data.maturity_date}</Field>
            <TimestampField label={intl.formatMessage(messages.maturesAt)} value={data.time_of_maturity} />
            <Field label={intl.formatMessage(messages.issuedIn)}>{formatPlace(intl, data.city_of_issuing, data.country_of_issuing)}</Field>
            <Field label={intl.formatMessage(messages.payableIn)}>{formatPlace(intl, data.city_of_payment, data.country_of_payment)}</Field>
          </>
        )}
      </div>

      {participants && (
        <Section title={intl.formatMessage(messages.sectionParticipants)}>
          <ParticipantField label={intl.formatMessage(messages.drawee)} participant={participants.drawee} />
          <ParticipantField label={intl.formatMessage(messages.drawer)} participant={participants.drawer} />
          <ParticipantField label={intl.formatMessage(messages.payee)} participant={participants.payee} />
          <ParticipantField label={intl.formatMessage(messages.endorsee)} participant={participants.endorsee} />
          <Field label={intl.formatMessage(messages.endorsementsCount)}>{participants.endorsements_count}</Field>
          {(participants.endorsements ?? []).length > 0 && (
            <div className="flex flex-col gap-2">
              {participants.endorsements.map((endorsement, index) => (
                <EndorsementRow key={`${endorsement.signing_timestamp}-${index}`} endorsement={endorsement} index={index} />
              ))}
            </div>
          )}
        </Section>
      )}

      {status?.acceptance && <AcceptanceSection acceptance={status.acceptance} />}
      {status?.payment && <PaymentSection payment={status.payment} />}

      {bill.current_waiting_state && <WaitingStateSection waitingState={bill.current_waiting_state} />}

      <HistorySection blocks={historyBlocks} isLoading={isHistoryLoading} />

      {data && (
        <Section title={intl.formatMessage(messages.sectionFiles)}>
          {(data.files ?? []).length === 0 && <Text variant="bodyMuted">{intl.formatMessage(messages.noFiles)}</Text>}
          {(data.files ?? []).map((file) => (
            <div key={file.hash} className="flex flex-col gap-0.5">
              <Text variant="body">{file.name}</Text>
              <MonoValue value={file.hash} />
              <MonoValue value={file.nostr_hash} />
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

export function BillDetailCard({ billId, quoteId, historyBlocks, isHistoryLoading, billAtMint = true }: BillDetailCardProps) {
  const intl = useIntl();
  const {
    data: bill,
    isLoading,
    error,
  } = useQuery({
    ...getEbillOptions({ path: { bid: billId } }),
    enabled: billId.length > 0 && billAtMint,
  });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          <Text variant="titleSm" as="h2">
            {intl.formatMessage(messages.title)}
          </Text>

          {!billAtMint && <Text variant="bodyMuted">{intl.formatMessage(messages.notAtMint)}</Text>}

          {billAtMint && isLoading && <Skeleton className="h-64 rounded-lg" />}

          {billAtMint && !isLoading && !bill && (
            <Text variant="bodyMuted">{intl.formatMessage(error ? messages.error : messages.empty)}</Text>
          )}

          {bill && <BillSections bill={bill} quoteId={quoteId} historyBlocks={historyBlocks} isHistoryLoading={isHistoryLoading} />}
        </div>
      </CardContent>
    </Card>
  );
}
