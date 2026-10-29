import {
  Settings2,
  AlignVerticalJustifyCenterIcon,
  Ban,
  Bitcoin,
  ChartNoAxesColumn,
  BookUser,
  Globe,
  Home,
  Network,
  Info,
  TrendingUp,
  Inbox,
  Key,
  LifeBuoy,
  Lightbulb,
  ReceiptText,
  Scale,
  Wand2Icon,
} from "lucide-react";
import { useContext, useState } from "react";
import {
  AppIcon,
  DateFormat,
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
import { TimeZonePreference } from "./TimeZonePreference";
// import { useKeycloak } from "../lib/keycloak-user"
import { LanguageContext, CROWDIN_PSEUDO_LOCALE, DEFAULT_LOCALE_PROD, isInContextToolAvailable } from "@/context/language/LanguageContext";
import { usePreferences } from "@/context/preferences/PreferencesContext";
import { defineMessages, useIntl } from "react-intl";
import { LIVE_TRANSLATIONS_KEY } from "@/constants/storageKeys";

import { cockpit } from "@/components/operator/cockpit-messages";

const navMessages = defineMessages({
  work: { id: "nav.work", defaultMessage: "Work", description: "Operator dashboard nav: work" },
  reference: { id: "nav.reference", defaultMessage: "Reference", description: "Operator dashboard nav: reference" },
  reports: { id: "nav.reports", defaultMessage: "Reports", description: "Operator dashboard nav: reports" },
  system: { id: "nav.system", defaultMessage: "Mint / System", description: "Operator dashboard nav: system" },
  network: { id: "nav.network", defaultMessage: "Network", description: "Operator dashboard nav: network" },
  info: { id: "nav.info", defaultMessage: "Info", description: "Operator dashboard nav: info" },
  earnings: { id: "nav.earnings", defaultMessage: "Earnings", description: "Operator dashboard nav: earnings" },
  home: { id: "nav.home", defaultMessage: "Home" },
  balances: { id: "nav.balances", defaultMessage: "Balances" },
  deniedMeltRequests: {
    id: "nav.deniedMeltRequests",
    defaultMessage: "Melt requests",
  },
  quotes: { id: "nav.quotes", defaultMessage: "Quotes", description: "Operator dashboard nav: quotes" },
  facilities: { id: "nav.facilities", defaultMessage: "Facilities", description: "Pre-bill facility applications" },
  intelligence: {
    id: "nav.intelligenceAsk",
    defaultMessage: "Intelligence + Ask the Mint",
    description: "The Mint's own notes on its regions, industries and the macro economy",
  },
  policy: { id: "nav.policy", defaultMessage: "Policy", description: "The Mint's reviewed credit programmes and policy packs, read-only" },
  directory: { id: "nav.directory", defaultMessage: "Directory", description: "Mint-local participant directory" },
  helpRequests: { id: "nav.helpRequests", defaultMessage: "Help requests", description: "Applicants' questions to the Mint's people" },
  outcomes: { id: "nav.outcomes", defaultMessage: "Outcomes", description: "PRD outcome measures over the current cases" },
  bills: { id: "nav.bills", defaultMessage: "Bills" },
  keysets: { id: "nav.keysets", defaultMessage: "Keysets" },
});

const decimalMessages = defineMessages({
  comma: { id: "ui.decimalSeparator.comma", defaultMessage: "Comma", description: "Decimal separator" },
  point: { id: "ui.decimalSeparator.point", defaultMessage: "Point", description: "Decimal separator" },
  space: { id: "ui.decimalSeparator.space", defaultMessage: "Space", description: "Decimal separator" },
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
    { title: navMessages.network, url: "/network", icon: Network },
    { title: navMessages.info, url: "/info", icon: Info },
    { title: navMessages.earnings, url: "/earnings", icon: TrendingUp },
    {
      title: navMessages.home,
      url: "/",
      icon: Home,
    },
    // The Mint's knowledge of its environment and its policy sit right below Home on purpose.
    { title: navMessages.intelligence, url: "/intelligence", icon: Lightbulb },
    { title: navMessages.policy, url: "/policy", icon: Scale },
    { title: navMessages.outcomes, url: "/outcomes", icon: ChartNoAxesColumn },
    {
      title: navMessages.balances,
      url: "/balances",
      icon: Bitcoin,
    },
    {
      title: navMessages.quotes,
      url: "/quotes",
      icon: Inbox,
    },
    { title: navMessages.facilities, url: "/facilities", icon: ReceiptText },
    { title: navMessages.helpRequests, url: "/help-requests", icon: LifeBuoy },
    { title: navMessages.directory, url: "/directory", icon: BookUser },
    {
      title: navMessages.bills,
      url: "/bills",
      icon: ReceiptText,
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
  const intl = useIntl();
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
          {intl.formatMessage({
            id: "settings.liveTranslations",
            defaultMessage: "Live translations",
            description: "Enable in-context translations",
          })}
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
  const intl = useIntl();
  // const { user, isLoading } = useKeycloak()
  const { decimalFormat, setDecimalFormat } = usePreferences();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {[
          { title: navMessages.work, urls: ["/", "/quotes", "/facilities", "/help-requests"] },
          { title: navMessages.reference, urls: ["/intelligence", "/policy", "/directory"] },
          { title: navMessages.reports, urls: ["/outcomes"] },
          { title: navMessages.system, urls: ["/balances", "/earnings", "/bills", "/keysets", "/melt-requests", "/network", "/info"] },
        ].map((group) => (
          <div key={group.title.id}>
            {group.title === navMessages.system ? (
              <details className="system-navigation">
                <summary className="px-4 py-2 text-xs text-muted-foreground">{intl.formatMessage(group.title)}</summary>
                <NavMain items={group.urls.flatMap((url) => data.navMain.filter((item) => item.url === url))} />
              </details>
            ) : (
              <NavMain
                key={group.title.id}
                groupTitle={group.title}
                items={group.urls.flatMap((url) => data.navMain.filter((item) => item.url === url))}
              />
            )}
          </div>
        ))}
      </SidebarContent>
      <Separator className="bg-divider-75 w-auto mb-2" />
      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <details className="display-settings">
          <summary className="disclosure-row flex gap-2 rounded-lg px-3 py-2 text-xs">
            <Settings2 className="size-4" />
            {intl.formatMessage(cockpit.settings)}
          </summary>
          <div className="flex flex-col gap-3 p-3">
            <LanguageSelector />
            <Separator className="bg-divider-75 w-auto" />
            <DisplayCurrency />
            <Separator className="bg-divider-75 w-auto" />
            <DecimalSeparator value={decimalFormat} onChange={setDecimalFormat}>
              <MenuOption
                icon={<AppIcon icon={AlignVerticalJustifyCenterIcon} size="md" className="text-muted-foreground" />}
                label={intl.formatMessage({
                  id: "settings.decimals",
                  defaultMessage: "Decimals",
                  description: "Sidebar number formatting setting",
                })}
                defaultValue={intl.formatMessage(decimalMessages[decimalFormat])}
              />
            </DecimalSeparator>
            <Separator className="bg-divider-75 w-auto" />
            <DateFormat />
            <Separator className="bg-divider-75 w-auto" />
            <TimeZonePreference />
            <Separator className="bg-divider-75 w-auto" />
            <Theme />
            {isInContextToolAvailable && (
              <>
                <Separator className="bg-divider-75 w-auto" />
                <LiveTranslationsToggle />
              </>
            )}
          </div>
        </details>
      </SidebarFooter>
      {/* https://github.com/BitcreditProtocol/wildcat-dashboard-ui/issues/131
        <SidebarFooter>{!isLoading && user && <NavUser user={user} />}</SidebarFooter>
      */}
      <SidebarRail />
    </Sidebar>
  );
}
