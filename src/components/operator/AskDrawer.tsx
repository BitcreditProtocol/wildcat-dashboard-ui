import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Sparkles } from "lucide-react";
import { useIntl } from "react-intl";
import { cockpit as m } from "./cockpit-messages";
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
            {intl.formatMessage(m.command)}
          </SheetTitle>
          <SheetDescription>{intl.formatMessage(caseScoped ? m.caseScope : m.actors)}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
