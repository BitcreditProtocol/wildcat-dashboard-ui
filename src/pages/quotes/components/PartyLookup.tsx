import { Popover, PopoverContent, PopoverTrigger } from "@bitcredit/ui-library";
import { Building2, ChevronDown, Globe, Search, ShieldAlert } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { countryName } from "@/utils/bill-participants";

/**
 * Mock-up of the operator's own lookups on a party outside the Mint. Nothing is connected yet: the
 * sources are listed without links, so no name or address leaves the dashboard. Once wired, a
 * source opens only on the operator's click and receives only the party's stated name and country.
 */

const messages = defineMessages({
  trigger: {
    id: "quotes.party.lookup",
    defaultMessage: "Look up",
    description: "Opens the list of outside sources the operator can check this party in",
  },
  title: { id: "quotes.party.lookup.title", defaultMessage: "Look up {name}", description: "Heading of the outside-sources list" },
  notConnected: {
    id: "quotes.party.lookup.notConnected",
    defaultMessage: "Not connected yet",
    description: "The outside sources are a mock-up; none of them opens or receives anything",
  },
  register: { id: "quotes.party.lookup.register", defaultMessage: "Business register", description: "Outside source: company register" },
  registerIn: {
    id: "quotes.party.lookup.registerIn",
    defaultMessage: "Business register · {country}",
    description: "Outside source: the company register of the party's stated country",
  },
  registerDetail: {
    id: "quotes.party.lookup.registerDetail",
    defaultMessage: "Registered and active, and who may sign for it",
    description: "What the company register answers",
  },
  sanctions: { id: "quotes.party.lookup.sanctions", defaultMessage: "Sanctions lists", description: "Outside source: sanctions lists" },
  sanctionsDetail: {
    id: "quotes.party.lookup.sanctionsDetail",
    defaultMessage: "EU, UN and US lists",
    description: "Which sanctions lists the lookup would cover",
  },
  web: { id: "quotes.party.lookup.web", defaultMessage: "Web and news", description: "Outside source: a web and news search" },
  webDetail: {
    id: "quotes.party.lookup.webDetail",
    defaultMessage: "The name and city in a web search",
    description: "What the web lookup would search for",
  },
  privacy: {
    id: "quotes.party.lookup.privacy",
    defaultMessage: "Once connected, a lookup opens only when you click it and sends that service the party's name and country.",
    description: "What a connected lookup will share with the outside service, and when",
  },
});

export function PartyLookup({ name, country }: { name: string; country?: string }) {
  const intl = useIntl();
  const sources = [
    {
      key: "register",
      icon: Building2,
      label:
        country === undefined
          ? intl.formatMessage(messages.register)
          : intl.formatMessage(messages.registerIn, { country: countryName(country, intl.locale) }),
      detail: intl.formatMessage(messages.registerDetail),
    },
    {
      key: "sanctions",
      icon: ShieldAlert,
      label: intl.formatMessage(messages.sanctions),
      detail: intl.formatMessage(messages.sanctionsDetail),
    },
    { key: "web", icon: Globe, label: intl.formatMessage(messages.web), detail: intl.formatMessage(messages.webDetail) },
  ];
  return (
    <Popover>
      <PopoverTrigger className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2">
        <Search className="size-3" aria-hidden="true" />
        {intl.formatMessage(messages.trigger)}
        <ChevronDown className="size-3" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 border border-border p-0 text-sm" data-party-lookup="">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <p className="min-w-0 font-medium break-words">{intl.formatMessage(messages.title, { name })}</p>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
            {intl.formatMessage(messages.notConnected)}
          </span>
        </div>
        <ul className="py-1">
          {sources.map(({ key, icon: Icon, label, detail }) => (
            <li key={key} aria-disabled="true" className="flex cursor-not-allowed gap-3 px-4 py-2 opacity-60">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block">{label}</span>
                <span className="block text-xs text-muted-foreground">{detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{intl.formatMessage(messages.privacy)}</p>
      </PopoverContent>
    </Popover>
  );
}
