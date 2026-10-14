import { useContext, useState } from "react";
import {
  AppIcon,
  cn,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTopBar,
  DrawerTrigger,
  MenuOption,
  Text,
} from "@bitcredit/ui-library";
import { Check, Clock } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { browserTimeZone, TimeZoneContext, type TimeZoneSetting } from "@/context/time-zone/TimeZoneContext";

const messages = defineMessages({
  label: { id: "settings.timeZone.label", defaultMessage: "Time zone" },
  title: { id: "settings.timeZone.title", defaultMessage: "Time zone" },
  description: {
    id: "settings.timeZone.description",
    defaultMessage: "Choose the clock dates and times are shown in. The mint records everything in UTC.",
  },
  utc: { id: "settings.timeZone.utc", defaultMessage: "UTC" },
  utcHint: { id: "settings.timeZone.utc.hint", defaultMessage: "The mint's own clock" },
  local: { id: "settings.timeZone.local", defaultMessage: "Local" },
});

const zoneMessages = defineMessages<{ localHint: { zone: string } }>({
  localHint: { id: "settings.timeZone.local.hint", defaultMessage: "Your browser: {zone}" },
});

const OPTIONS: TimeZoneSetting[] = ["utc", "local"];

/** The Settings row for the time zone, built like the ui-library's own preference pickers. */
export function TimeZonePreference() {
  const intl = useIntl();
  const { setting, setSetting } = useContext(TimeZoneContext);
  const [open, setOpen] = useState(false);
  const zone = browserTimeZone();

  const labelFor = (option: TimeZoneSetting) => intl.formatMessage(option === "utc" ? messages.utc : messages.local);
  const hintFor = (option: TimeZoneSetting) =>
    option === "utc" ? intl.formatMessage(messages.utcHint) : intl.formatMessage(zoneMessages.localHint, { zone });

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger className="!bg-transparent outline-none focus-visible:outline-none">
        <MenuOption
          icon={<AppIcon icon={Clock} size="md" className="text-muted-foreground" />}
          label={intl.formatMessage(messages.label)}
          defaultValue={setting === "utc" ? labelFor("utc") : zone}
        />
      </DrawerTrigger>
      <DrawerContent className="max-w-[430px] bg-elevation-50 mx-auto" innerClassName="flex flex-col gap-6 px-5 pt-4 pb-8">
        <DrawerTopBar title={intl.formatMessage(messages.title)} />
        <DrawerDescription>
          <Text variant="caption" as="span" className="text-text-200">
            {intl.formatMessage(messages.description)}
          </Text>
        </DrawerDescription>
        <div role="radiogroup" aria-label={intl.formatMessage(messages.title)} className="flex flex-col gap-2">
          {OPTIONS.map((option) => {
            const isActive = option === setting;

            return (
              <div
                key={option}
                role="radio"
                aria-checked={isActive}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  setSetting(option);
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSetting(option);
                    setOpen(false);
                  }
                }}
                className={cn("flex w-full items-center gap-3 rounded-xl outline-none cursor-pointer focus:ring-2 focus:ring-brand-200")}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Text variant="titleSm" as="span" className="leading-6">
                    {labelFor(option)}
                  </Text>
                  <Text variant="caption" as="span" className="text-text-200 leading-5">
                    {hintFor(option)}
                  </Text>
                </div>
                <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
                  {isActive ? <AppIcon icon={Check} className="text-text-300" size="lg" /> : null}
                </span>
              </div>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
