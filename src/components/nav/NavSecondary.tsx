import * as React from "react";
import { type LucideIcon } from "lucide-react";

import { AppIcon } from "@bitcredit/ui-library";
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link } from "react-router";
import type { MessageDescriptor } from "react-intl";
import { useIntl } from "react-intl";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title?: string;
    titleMessage?: MessageDescriptor;
    url: string;
    icon: LucideIcon;
  }[];
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const intl = useIntl();
  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const title = item.titleMessage ? intl.formatMessage(item.titleMessage) : (item.title ?? "");

            return (
              <SidebarMenuItem key={item.titleMessage?.id ?? item.title}>
                <SidebarMenuButton asChild size="sm" tooltip={title}>
                  <Link to={item.url}>
                    <AppIcon icon={item.icon} />
                    <span>{title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
