import { createIntl } from "react-intl";
import { expect, it, vi } from "vitest";
import { messagesByLocale, source } from "./messages";
import { cockpitMessages } from "@/pages/home/cockpit-copy";
import { networkMessages } from "@/pages/network/network-copy";
import { capacityLabels, capacityDetails } from "@/pages/home/capacity-copy";

it("provides authored Spanish for every sidebar, cockpit, capacity and federation message", () => {
  const sourceMessages: Record<string, string> = source;
  const ids = [
    ...Object.keys(source).filter((id) => id.startsWith("nav.") || id.startsWith("agentic.")),
    "language.label",
    "settings.decimals",
    "ui.currencySelector.menuLabel",
    "ui.theme.menuLabel",
    ...Object.values(cockpitMessages).map((m) => m.id),
    ...Object.values(networkMessages).map((m) => m.id),
    ...Object.values(capacityLabels).map((m) => m.id),
    ...Object.values(capacityDetails).map((m) => m.id),
  ];
  for (const locale of ["es-ES", "es-AR"])
    for (const id of ids) {
      expect(messagesByLocale[locale][id], `${locale}: ${id}`).toBeTruthy();
      // Amount templates and literal fallback initials have no English words to translate.
      if (
        ![
          "cockpit.cap",
          "cockpit.capacityBytes",
          "cockpit.capacityValue",
          "nav.user.avatarFallback",
          "nav.user.initials.fallback",
        ].includes(id)
      )
        expect(messagesByLocale[locale][id], `${locale}: ${id}`).not.toBe(sourceMessages[id]);
    }
  for (const locale of ["en-GB", "en-US", "es-ES", "es-AR"]) {
    const onError = vi.fn();
    const intl = createIntl({ locale, messages: messagesByLocale[locale], onError });
    intl.formatMessage(cockpitMessages.actionContext, { buyer: "Synthetic", amount: "10", maturity: "2030-01-01" });
    expect(onError).not.toHaveBeenCalled();
  }
});
