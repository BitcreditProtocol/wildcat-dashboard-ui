import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@bitcredit/ui-library";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  PencilLine,
  AlertTriangle,
  XCircle,
  Coins,
  DollarSign,
  ArrowUpDown,
  HelpCircle,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";
import type { BillHistoryBlock, BillParticipant } from "@/generated/client/types.gen";
import { AppIcon, Button, Text } from "@bitcredit/ui-library";
import { NodeIdDisplay, Separator, TruncatedTextPopover } from "@bitcredit/ui-library";
import { defineMessages, useIntl } from "react-intl";

interface EndorsementChainProps {
  historyBlocks?: BillHistoryBlock[];
  isLoading?: boolean;
  maturityDate?: string;
}

function BillParticipantInfo({ participant }: { participant: BillParticipant }) {
  const intl = useIntl();
  if ("Anon" in participant) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">
          {intl.formatMessage({
            id: "participants.role.bearer",
            defaultMessage: "Bearer",
          })}
        </span>
        <NodeIdDisplay nodeId={participant.Anon.node_id} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <TruncatedTextPopover text={participant.Ident.name} maxLength={50} className="font-medium text-sm" />
      {participant.Ident.city && participant.Ident.country && (
        <TruncatedTextPopover
          text={`${participant.Ident.city}, ${participant.Ident.country}`}
          maxLength={40}
          className="text-xs text-muted-foreground"
        />
      )}
    </div>
  );
}

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

const BLOCK_TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; messageKey: keyof typeof eventMessages }> = {
  Issue: { icon: PencilLine, color: "text-blue-500", messageKey: "Issue" },
  Endorse: { icon: CheckCircle2, color: "text-green-500", messageKey: "Endorse" },
  RequestToAccept: { icon: AlertTriangle, color: "text-orange-500", messageKey: "RequestToAccept" },
  Accept: { icon: CheckCircle2, color: "text-green-500", messageKey: "Accept" },
  RejectToAccept: { icon: XCircle, color: "text-red-500", messageKey: "RejectToAccept" },
  RequestToPay: { icon: AlertTriangle, color: "text-orange-500", messageKey: "RequestToPay" },
  RejectToPay: { icon: XCircle, color: "text-red-500", messageKey: "RejectToPay" },
  Pay: { icon: DollarSign, color: "text-green-600", messageKey: "Pay" },
  Mint: { icon: Coins, color: "text-purple-500", messageKey: "Mint" },
};

export function EndorsementChain({ historyBlocks, isLoading, maturityDate }: EndorsementChainProps) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const [sortDescending, setSortDescending] = useState(false);

  const titleLabel = intl.formatMessage({
    id: "endorsement.history.title",
    defaultMessage: "Bill history",
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{titleLabel}</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const events = [...(historyBlocks ?? [])].sort((a, b) =>
    sortDescending ? b.signing_timestamp - a.signing_timestamp : a.signing_timestamp - b.signing_timestamp
  );

  const eventCount = events.length;

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between p-6 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="flex items-center gap-2">
            <CardTitle>{titleLabel}</CardTitle>
            <span className="text-sm text-muted-foreground">
              {intl.formatMessage(
                {
                  id: "endorsement.history.eventCount",
                  defaultMessage: "({count, plural, one {# event} other {# events}})",
                },
                { count: eventCount }
              )}
            </span>
          </span>
          <span className="flex h-8 items-center gap-1 px-2 py-0">
            <span className="text-xs text-muted-foreground">
              {isExpanded
                ? intl.formatMessage({
                    id: "endorsement.history.hide",
                    defaultMessage: "Hide history",
                  })
                : intl.formatMessage({
                    id: "endorsement.history.show",
                    defaultMessage: "Show history",
                  })}
            </span>
            {isExpanded ? <AppIcon icon={ChevronUp} size="sm" /> : <AppIcon icon={ChevronDown} size="sm" />}
          </span>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSortDescending(!sortDescending);
              }}
              className="gap-2"
            >
              <AppIcon icon={ArrowUpDown} size={12} />
              <span className="text-xs">
                {sortDescending
                  ? intl.formatMessage({
                      id: "endorsement.history.descending",
                      defaultMessage: "Descending",
                    })
                  : intl.formatMessage({
                      id: "endorsement.history.ascending",
                      defaultMessage: "Ascending",
                    })}
              </span>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {intl.formatMessage({
                id: "endorsement.history.empty",
                defaultMessage: "No history events available",
              })}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {events.map((block, index) => (
                <div key={block.block_id}>
                  <BlockEventRow block={block} maturityDate={maturityDate} />
                  {index < events.length - 1 && <Separator className="bg-divider-75 my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function BlockEventRow({ block, maturityDate }: { block: BillHistoryBlock; maturityDate?: string }) {
  const intl = useIntl();
  const config = BLOCK_TYPE_CONFIG[block.block_type];
  const label = config ? intl.formatMessage(eventMessages[config.messageKey]) : block.block_type;
  const IconComponent: LucideIcon = config?.icon ?? HelpCircle;
  const iconColor = config?.color ?? "text-muted-foreground";

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <AppIcon icon={IconComponent} size="sm" className={iconColor} />
        <Text variant="label">{label}</Text>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <AppIcon icon={Clock} size={12} />
        <span>
          {new Date(block.signing_timestamp * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </div>

      {block.block_type === "Issue" && maturityDate && (
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">
            {intl.formatMessage({
              id: "endorsement.history.maturityDateLabel",
              defaultMessage: "Maturity date:",
            })}{" "}
          </span>
          {maturityDate}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">
            {intl.formatMessage({
              id: "endorsement.history.signedBy",
              defaultMessage: "Signed by",
            })}
          </div>
          <BillParticipantInfo participant={block.signed.data} />
          {block.signed.signatory && (
            <div className="text-xs text-muted-foreground mt-1">
              <div>
                {intl.formatMessage({
                  id: "endorsement.history.signatory",
                  defaultMessage: "Signatory:",
                })}
              </div>
              <TruncatedTextPopover
                text={block.signed.signatory.name ?? block.signed.signatory.node_id}
                maxLength={40}
                className="inline"
              />
            </div>
          )}
        </div>

        {block.pay_to_the_order_of && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              {intl.formatMessage({
                id: "endorsement.history.endorsedTo",
                defaultMessage: "Endorsed to",
              })}
            </div>
            <BillParticipantInfo participant={block.pay_to_the_order_of} />
          </div>
        )}
      </div>

      {block.payment_data && (
        <div className="text-xs text-muted-foreground mt-2 space-y-1">
          <div>
            <span className="font-semibold">{intl.formatMessage({ id: "bill.history.amount", defaultMessage: "Amount:" })} </span>
            {block.payment_data.sum} {block.payment_data.currency}
          </div>
          <div>
            <span className="font-semibold">{intl.formatMessage({ id: "bill.history.paymentAddress", defaultMessage: "Address:" })} </span>
            <TruncatedTextPopover text={block.payment_data.payment_address} maxLength={40} className="inline font-mono" />
          </div>
        </div>
      )}

      {block.request_deadline && (
        <div className="text-xs text-muted-foreground">
          <span className="font-semibold">{intl.formatMessage({ id: "bill.history.deadline", defaultMessage: "Deadline:" })} </span>
          {new Date(block.request_deadline * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })}
        </div>
      )}

      {block.signing_address && (
        <div className="text-xs text-muted-foreground">
          <div className="font-semibold">
            {intl.formatMessage({
              id: "endorsement.history.locationLabel",
              defaultMessage: "Location:",
            })}{" "}
          </div>
          <TruncatedTextPopover
            text={[block.signing_address.address, block.signing_address.city, block.signing_address.country].filter(Boolean).join(", ")}
            maxLength={50}
            className="inline"
          />
        </div>
      )}
    </div>
  );
}
