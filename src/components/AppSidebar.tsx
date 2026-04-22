import { Bitcoin, Home, Inbox, Key } from "lucide-react";
import { useContext } from "react";
import { DisplayCurrency, Theme } from "@bitcredit/ui-library";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail, SidebarSeparator } from "@/components/ui/sidebar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DecimalFormatSelector } from "@/components/DecimalFormatSelector";
// import { NavUser } from "./nav/NavUser"
import { NavMain } from "./nav/NavMain";
// import { useKeycloak } from "../lib/keycloak-user"
import { LanguageContext } from "@/context/language/LanguageContext";
import { defineMessages, useIntl } from "react-intl";

const navMessages = defineMessages({
  home: { id: "nav.home", defaultMessage: "Home" },
  balances: { id: "nav.balances", defaultMessage: "Balances" },
  quotes: { id: "nav.quotes", defaultMessage: "Quotes" },
  quotesPending: { id: "nav.quotes.pending", defaultMessage: "Pending" },
  quotesOffered: { id: "nav.quotes.offered", defaultMessage: "Offered" },
  quotesOfferExpired: { id: "nav.quotes.offerExpired", defaultMessage: "Offer expired" },
  quotesAccepted: { id: "nav.quotes.accepted", defaultMessage: "Accepted" },
  quotesDenied: { id: "nav.quotes.denied", defaultMessage: "Denied" },
  quotesRejected: { id: "nav.quotes.rejected", defaultMessage: "Rejected" },
  quotesCanceled: { id: "nav.quotes.canceled", defaultMessage: "Canceled" },
  keysets: { id: "nav.keysets", defaultMessage: "Keysets" },
});

const localeMessages = defineMessages({
  "en-US": { id: "locale.en-US", defaultMessage: "English (US)" },
  "en-GB": { id: "locale.en-GB", defaultMessage: "English (UK)" },
  "de-AT": { id: "locale.de-AT", defaultMessage: "Deutsch (AT)" },
  "de-DE": { id: "locale.de-DE", defaultMessage: "Deutsch (DE)" },
  "es-AR": { id: "locale.es-AR", defaultMessage: "Español (AR)" },
  "es-ES": { id: "locale.es-ES", defaultMessage: "Español (ES)" },
  "it-IT": { id: "locale.it-IT", defaultMessage: "Italiano (IT)" },
  "tr-TR": { id: "locale.tr-TR", defaultMessage: "Türkçe (TR)" },
  "ach-UG": { id: "locale.ach-UG", defaultMessage: "Acholi (UG)" },
});

const data = {
  navMain: [
    {
      title: navMessages.home,
      url: "/",
      icon: Home,
    },
    {
      title: navMessages.balances,
      url: "/balances",
      icon: Bitcoin,
    },
    {
      title: navMessages.quotes,
      url: "/quotes",
      icon: Inbox,
      items: [
        {
          title: navMessages.quotesPending,
          url: "/quotes/pending",
        },
        {
          title: navMessages.quotesOffered,
          url: "/quotes/offered",
        },
        {
          title: navMessages.quotesOfferExpired,
          url: "/quotes/offerexpired",
        },
        {
          title: navMessages.quotesAccepted,
          url: "/quotes/accepted",
        },
        {
          title: navMessages.quotesDenied,
          url: "/quotes/denied",
        },
        {
          title: navMessages.quotesRejected,
          url: "/quotes/rejected",
        },
        {
          title: navMessages.quotesCanceled,
          url: "/quotes/canceled",
        },
      ],
    },
    {
      title: navMessages.keysets,
      url: "/keysets",
      icon: Key,
    },
  ],
};

function LanguageSelector() {
  const intl = useIntl();
  const { locale, setLocale, availableLocales } = useContext(LanguageContext);
  const locales = availableLocales();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        {intl.formatMessage({
          id: "language.label",
          defaultMessage: "Language",
        })}
      </span>
      <Select value={locale} onValueChange={setLocale}>
        <SelectTrigger className="h-9">
          <SelectValue
            placeholder={intl.formatMessage({
              id: "language.select",
              defaultMessage: "Select language",
            })}
          />
        </SelectTrigger>
        <SelectContent>
          {locales.map((loc) => (
            <SelectItem key={loc} value={loc}>
              {intl.formatMessage(localeMessages[loc as keyof typeof localeMessages] ?? { id: `locale.${loc}`, defaultMessage: loc })}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function AppSidebar() {
  // const { user, isLoading } = useKeycloak()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarSeparator className="my-2" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-4">
          <Theme />
          <DisplayCurrency />
          <DecimalFormatSelector className="flex flex-col gap-2" />
          <LanguageSelector />
        </div>
      </SidebarFooter>
      {/* https://github.com/BitcreditProtocol/wildcat-dashboard-ui/issues/131
        <SidebarFooter>{!isLoading && user && <NavUser user={user} />}</SidebarFooter>
      */}
      <SidebarRail />
    </Sidebar>
  );
}
