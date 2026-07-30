import { AlignVerticalJustifyCenterIcon, Ban, Bitcoin, Globe, Home, Inbox, Key, Wand2Icon } from "lucide-react";
import { useContext, useState } from "react";
import {
  AppIcon,
  DecimalSeparator,
  DisplayCurrency,
  LanguagePreference,
  MenuOption,
  Separator,
  Switch,
  Text,
  Theme,
} from "@bitcredit/ui-library";
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
// import { NavUser } from "./nav/NavUser"
import { NavMain } from "./nav/NavMain";
// import { useKeycloak } from "../lib/keycloak-user"
import { LanguageContext, CROWDIN_PSEUDO_LOCALE, DEFAULT_LOCALE_PROD, isInContextToolAvailable } from "@/context/language/LanguageContext";
import { usePreferences } from "@/context/preferences/PreferencesContext";
import { defineMessages, useIntl } from "react-intl";
import { LIVE_TRANSLATIONS_KEY } from "@/constants/storageKeys";

const navMessages = defineMessages({
  home: { id: "nav.home", defaultMessage: "Home" },
  balances: { id: "nav.balances", defaultMessage: "Balances" },
  deniedMeltRequests: { id: "nav.deniedMeltRequests", defaultMessage: "Melt requests" },
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
  "zu-ZA": { id: "locale.zu-ZA", defaultMessage: "Crowdin (in-context)" },
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
    {
      title: navMessages.deniedMeltRequests,
      url: "/melt-requests",
      icon: Ban,
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
        icon={<AppIcon icon={Globe} size="md" className="text-muted-foreground" />}
        label={intl.formatMessage({
          id: "language.label",
          defaultMessage: "Language",
        })}
        defaultValue={currentLocaleLabel}
      />
    </LanguagePreference>
  );
}

function LiveTranslationsToggle() {
  const { setLocale } = useContext(LanguageContext);
  const [isActive, setIsActive] = useState(() => window.localStorage.getItem(LIVE_TRANSLATIONS_KEY) === "enabled");

  if (!isInContextToolAvailable) {
    return null;
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AppIcon icon={Wand2Icon} size="md" className="text-muted-foreground" />
        <Text variant="titleSm" as="span" className="text-text-300">
          Live translations
        </Text>
      </div>
      <Switch
        checked={isActive}
        onCheckedChange={(checked) => {
          window.localStorage.setItem(LIVE_TRANSLATIONS_KEY, checked ? "enabled" : "disabled");
          setLocale(checked ? CROWDIN_PSEUDO_LOCALE : DEFAULT_LOCALE_PROD);
          setIsActive(checked);
          window.location.reload();
        }}
      />
    </div>
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
      <Separator className="bg-divider-75 w-auto mb-2" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-4">
          <LanguageSelector />
          <Separator className="bg-divider-75 w-auto" />
          <DisplayCurrency />
          <Separator className="bg-divider-75 w-auto" />
          <DecimalSeparator value={decimalFormat} onChange={setDecimalFormat}>
            <MenuOption
              icon={<AppIcon icon={AlignVerticalJustifyCenterIcon} size="md" className="text-muted-foreground" />}
              label="Decimals"
              defaultValue={decimalFormat}
            />
          </DecimalSeparator>
          <Separator className="bg-divider-75 w-auto" />
          <Theme />
          {isInContextToolAvailable && (
            <>
              <Separator className="bg-divider-75 w-auto" />
              <LiveTranslationsToggle />
            </>
          )}
        </div>
      </SidebarFooter>
      {/* https://github.com/BitcreditProtocol/wildcat-dashboard-ui/issues/131
        <SidebarFooter>{!isLoading && user && <NavUser user={user} />}</SidebarFooter>
      */}
      <SidebarRail />
    </Sidebar>
  );
}
