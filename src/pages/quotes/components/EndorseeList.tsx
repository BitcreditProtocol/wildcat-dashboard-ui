import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useIntl } from "react-intl";
import { AppIcon } from "@bitcredit/ui-library";
import { Card, CardContent, CardHeader, CardTitle } from "@bitcredit/ui-library";
import { NodeIdDisplay, Separator, TruncatedTextPopover } from "@bitcredit/ui-library";
import type { BillParticipant } from "@/generated/client/types.gen";

interface EndorseeListProps {
  payee: BillParticipant;
  endorsees: BillParticipant[];
}

function ParticipantRow({ participant, label }: { participant: BillParticipant; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {"Anon" in participant ? (
        <NodeIdDisplay nodeId={participant.Anon.node_id} />
      ) : (
        <div className="flex flex-col gap-0.5">
          <TruncatedTextPopover text={participant.Ident.name} maxLength={50} className="text-sm font-medium" />
          {participant.Ident.city && participant.Ident.country && (
            <TruncatedTextPopover
              text={`${participant.Ident.city}, ${participant.Ident.country}`}
              maxLength={40}
              className="text-xs text-muted-foreground"
            />
          )}
        </div>
      )}
    </div>
  );
}

export function EndorseeList({ payee, endorsees }: EndorseeListProps) {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);

  const entries = [
    { participant: payee, label: intl.formatMessage({ id: "bill.endorsees.payee", defaultMessage: "Payee" }) },
    ...endorsees.map((p, i) => ({
      participant: p,
      label: intl.formatMessage({ id: "bill.endorsees.endorsee", defaultMessage: "Endorsee #{n}" }, { n: i + 1 }),
    })),
  ];

  return (
    <Card>
      <CardHeader className="p-0">
        <button
          type="button"
          className="flex w-full items-center justify-between p-6 text-left"
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
        >
          <span className="flex items-center gap-2">
            <CardTitle>
              {intl.formatMessage({ id: "bill.endorsees.title", defaultMessage: "Endorsees" })}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {intl.formatMessage(
                { id: "bill.endorsees.count", defaultMessage: "({count, plural, one {# party} other {# parties}})" },
                { count: entries.length }
              )}
            </span>
          </span>
          <span className="flex h-8 items-center gap-1 px-2 py-0">
            <span className="text-xs text-muted-foreground">
              {isExpanded
                ? intl.formatMessage({ id: "bill.endorsees.hide", defaultMessage: "Hide endorsees" })
                : intl.formatMessage({ id: "bill.endorsees.show", defaultMessage: "Show endorsees" })}
            </span>
            {isExpanded ? <AppIcon icon={ChevronUp} size="sm" /> : <AppIcon icon={ChevronDown} size="sm" />}
          </span>
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {intl.formatMessage({ id: "bill.endorsees.empty", defaultMessage: "No endorsees" })}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map(({ participant, label }, index) => (
                <div key={index}>
                  <ParticipantRow participant={participant} label={label} />
                  {index < entries.length - 1 && <Separator className="bg-divider-75 mt-3" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
