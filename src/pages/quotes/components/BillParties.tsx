import { Card, CardContent, CardHeader, CardTitle } from "@bitcredit/ui-library";
import { useIntl } from "react-intl";
import { ParticipantDetail } from "@/components/ParticipantsOverview";
import type { BillInfo } from "@/generated/client/types.gen";

/**
 * Who issued the bill and who pays it, with the details they stated in the eBill. The payee and
 * endorsees follow in the endorsement list, so every party on the bill is listed once.
 */
export function BillParties({ bill }: { bill: Pick<BillInfo, "drawer" | "drawee"> }) {
  const intl = useIntl();
  const rows = [
    { key: "drawer", label: intl.formatMessage({ id: "participants.role.drawer", defaultMessage: "Drawer" }), participant: bill.drawer },
    { key: "drawee", label: intl.formatMessage({ id: "participants.role.drawee", defaultMessage: "Drawee" }), participant: bill.drawee },
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {intl.formatMessage({
            id: "bill.parties.title",
            defaultMessage: "Drawer and drawee",
            description: "Card listing who issued the bill and who pays it at maturity",
          })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {rows.map(({ key, label, participant }) => (
          <div key={key} className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="flex">
              <ParticipantDetail participant={participant} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
