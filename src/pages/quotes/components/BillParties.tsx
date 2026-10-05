import { NodeIdDisplay } from "@bitcredit/ui-library";
import { useId } from "react";
import { defineMessages, useIntl } from "react-intl";
import type { BillIdentParticipant, BillInfo, BillParticipant } from "@/generated/client/types.gen";
import { participantRoleMessages } from "@/i18n/descriptors";
import {
  isIdentified,
  statedAddress,
  unwrapParticipant,
  type AnonymousParticipant,
  type IdentifiedParticipant,
} from "@/utils/bill-participants";
import { billApplicant } from "../quote-parties";

const messages = defineMessages({
  title: {
    id: "bill.parties.title",
    defaultMessage: "Parties on the bill",
    description: "Heading of the list of everyone the eBill names, with the details they signed it with",
  },
  endorsee: {
    id: "bill.parties.endorsee",
    defaultMessage: "Endorsee {n}",
    description: "The nth party the bill was endorsed to, in endorsement order",
  },
  applicant: {
    id: "bill.parties.applicant",
    defaultMessage: "Applicant",
    description: "Marks the bill's current holder, who asked this Mint to mint",
  },
  payer: {
    id: "bill.parties.payer",
    defaultMessage: "Payer",
    description: "Marks the drawee, who pays the bill at maturity",
  },
  anonymous: {
    id: "bill.parties.anonymous",
    defaultMessage: "Anonymous",
    description: "A party that holds or held the bill without a named identity",
  },
});

interface PartyRow {
  party: IdentifiedParticipant | AnonymousParticipant;
  roles: string[];
}

/**
 * Everyone the eBill names, in the order the bill names them, with the address, email and node id
 * they signed with. A party in several roles (often drawer and payee) is listed once. The applicant
 * and the payer are marked, so the record reads against the rest of the quote page.
 */
export function BillParties({ bill }: { bill: BillInfo }) {
  const intl = useIntl();
  const titleId = useId();
  const rows: PartyRow[] = [];
  const add = (participant: BillParticipant | BillIdentParticipant, role: string) => {
    const party = unwrapParticipant(participant);
    if (party === null) return;
    const listed = rows.find((row) => row.party.node_id === party.node_id);
    if (listed) listed.roles.push(role);
    else rows.push({ party, roles: [role] });
  };
  add(bill.drawer, intl.formatMessage(participantRoleMessages.drawer));
  add(bill.drawee, intl.formatMessage(participantRoleMessages.drawee));
  add(bill.payee, intl.formatMessage(participantRoleMessages.payee));
  bill.endorsees.forEach((endorsee, index) => add(endorsee, intl.formatMessage(messages.endorsee, { n: index + 1 })));
  const applicantNodeId = billApplicant(bill)?.nodeId;

  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="text-sm font-semibold">
        {intl.formatMessage(messages.title)}
      </h3>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border">
        {rows.map(({ party, roles }) => {
          const caseRoles = [
            ...(party.node_id === applicantNodeId ? [intl.formatMessage(messages.applicant)] : []),
            ...(party.node_id === bill.drawee.node_id ? [intl.formatMessage(messages.payer)] : []),
          ];
          const address = isIdentified(party) && "city" in party ? statedAddress(party, intl.locale) : "";
          const email = isIdentified(party) && "email" in party ? party.email : undefined;
          return (
            <li key={party.node_id} className="grid gap-x-4 gap-y-1 px-4 py-3 @lg:grid-cols-[9rem_minmax(0,1fr)]">
              <span className="text-xs text-muted-foreground @lg:pt-0.5">{roles.join(" · ")}</span>
              <div className="min-w-0 space-y-0.5">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium break-words">
                    {isIdentified(party) ? party.name : intl.formatMessage(messages.anonymous)}
                  </span>
                  {caseRoles.length > 0 && <span className="shrink-0 text-xs text-muted-foreground">{caseRoles.join(" · ")}</span>}
                </p>
                {address !== "" && <p className="text-xs break-words text-muted-foreground">{address}</p>}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {email && (
                    <a href={`mailto:${email}`} className="break-all underline-offset-2 hover:text-foreground hover:underline">
                      {email}
                    </a>
                  )}
                  <NodeIdDisplay nodeId={party.node_id} maxLength={20} textClassName="text-xs text-muted-foreground" />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
