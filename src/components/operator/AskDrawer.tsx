import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { defineMessages, useIntl } from "react-intl";
import { cockpit as m } from "./cockpit-messages";

const drawer = defineMessages({
  title: { id: "agentic.ask.title", defaultMessage: "Ask the Mint", description: "Ask drawer title" },
  mint: { id: "agentic.ask.mint", defaultMessage: "Across your whole Mint", description: "Scope of a Mint-wide question" },
});
export function AskDrawer({
  open,
  onOpenChange,
  caseScoped,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseScoped?: boolean;
  children: ReactNode;
}) {
  const intl = useIntl();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="ask-drawer w-full gap-0 overflow-y-auto sm:max-w-[640px]">
        <SheetHeader className="border-b border-border p-5">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-sky-500" />
            {intl.formatMessage(drawer.title)}
          </SheetTitle>
          <SheetDescription>{intl.formatMessage(caseScoped ? m.caseScope : drawer.mint)}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
