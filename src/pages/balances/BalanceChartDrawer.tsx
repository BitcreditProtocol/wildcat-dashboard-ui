import type { ReactNode } from "react";
import { Drawer, DrawerContent, DrawerTopBar, DrawerTrigger } from "@bitcredit/ui-library";

interface BalanceChartDrawerProps {
  title: ReactNode;
  trigger: ReactNode;
  children: ReactNode;
}

/**
 * A balance card's history, opened from the card itself. The drawer runs nearly the full
 * viewport rather than the library's default 430px sheet, because a chart read at phone
 * width tells the operator nothing.
 */
export function BalanceChartDrawer({ title, trigger, children }: BalanceChartDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent
        className="h-[94dvh] max-h-[94dvh] w-full max-w-full border-x-0"
        innerClassName="flex min-h-0 flex-1 flex-col gap-2 px-4 pt-2 pb-[env(safe-area-inset-bottom)]"
      >
        <DrawerTopBar title={title} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-6xl pb-4">{children}</div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
