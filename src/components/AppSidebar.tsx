import { Bitcoin, Home, Inbox, Key } from "lucide-react";
import { useContext } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencySelector } from "@/components/CurrencySelector";
import { DecimalFormatSelector } from "@/components/DecimalFormatSelector";
import { ThemeSelector } from "@/components/ThemeSelector";
// import { NavUser } from "./nav/NavUser"
import { NavMain } from "./nav/NavMain";
// import { useKeycloak } from "../lib/keycloak-user"
import { LanguageContext } from "@/context/language/LanguageContext";
import { useIntl } from "react-intl";

const data = {
  navMain: [
    {
      titleId: "nav.home",
      titleDefaultMessage: "Home",
      url: "/",
      icon: Home,
    },
    {
      titleId: "nav.balances",
      titleDefaultMessage: "Balances",
      url: "/balances",
      icon: Bitcoin,
    },
    {
      titleId: "nav.quotes",
      titleDefaultMessage: "Quotes",
      url: "/quotes",
      icon: Inbox,
      items: [
        {
          titleId: "nav.quotes.pending",
          titleDefaultMessage: "Pending",
          url: "/quotes/pending",
        },
        {
          titleId: "nav.quotes.offered",
          titleDefaultMessage: "Offered",
          url: "/quotes/offered",
        },
        {
          titleId: "nav.quotes.offerExpired",
          titleDefaultMessage: "Offer expired",
          url: "/quotes/offerexpired",
        },
        {
          titleId: "nav.quotes.accepted",
          titleDefaultMessage: "Accepted",
          url: "/quotes/accepted",
        },
        {
          titleId: "nav.quotes.denied",
          titleDefaultMessage: "Denied",
          url: "/quotes/denied",
        },
        {
          titleId: "nav.quotes.rejected",
          titleDefaultMessage: "Rejected",
          url: "/quotes/rejected",
        },
        {
          titleId: "nav.quotes.canceled",
          titleDefaultMessage: "Canceled",
          url: "/quotes/canceled",
        },
      ],
    },
    {
      titleId: "nav.keysets",
      titleDefaultMessage: "Keysets",
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
      <Select
        value={locale}
        onValueChange={setLocale}
      >
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
            <SelectItem
              key={loc}
              value={loc}
            >
              {intl.formatMessage({
                id: `locale.${loc}`,
                defaultMessage: loc,
              })}
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
          <ThemeSelector className="flex flex-col gap-2" />
          <CurrencySelector className="flex flex-col gap-2" />
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
