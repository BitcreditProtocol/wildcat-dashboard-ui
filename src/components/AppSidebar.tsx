import { Bitcoin, Globe, Home, Inbox, Key, AlignVerticalJustifyCenterIcon } from "lucide-react";
import { useContext } from "react";
import { DecimalSeparator, DisplayCurrency, LanguagePreference, MenuOption, Separator, Theme } from "@bitcredit/ui-library";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail, SidebarSeparator } from "@/components/ui/sidebar";
// import { NavUser } from "./nav/NavUser"
import { NavMain } from "./nav/NavMain";
// import { useKeycloak } from "../lib/keycloak-user"
import { LanguageContext } from "@/context/language/LanguageContext";
import { usePreferences } from "@/context/preferences/PreferencesContext";
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
  const currentLocaleLabel = intl.formatMessage(
    localeMessages[locale as keyof typeof localeMessages] ?? { id: `locale.${locale}`, defaultMessage: locale }
  );

  return (
    <LanguagePreference value={locale} values={locales} onChange={setLocale}>
      <MenuOption
        icon={<Globe className="h-5 w-5 text-muted-foreground" />}
        label={intl.formatMessage({
          id: "language.label",
          defaultMessage: "Language",
        })}
        defaultValue={currentLocaleLabel}
      />
    </LanguagePreference>
  );
}

export function AppSidebar() {
  // const { user, isLoading } = useKeycloak()
  const { decimalFormat, setDecimalFormat } = usePreferences();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarSeparator className="my-2" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-4">
          <Theme />
          <Separator className="bg-sidebar-border mx-2 w-auto" />
          <DisplayCurrency />
          <Separator className="bg-sidebar-border mx-2 w-auto" />
          <DecimalSeparator value={decimalFormat} onChange={setDecimalFormat}>
            <MenuOption icon={<AlignVerticalJustifyCenterIcon className="h-5 w-5 text-muted-foreground" />} label="Decimals" defaultValue={decimalFormat} />
          </DecimalSeparator>
          <Separator className="bg-sidebar-border mx-2 w-auto" />
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
