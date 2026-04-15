import * as React from "react";
import { type LucideIcon } from "lucide-react";

import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Link } from "react-router";
import { useIntl } from "react-intl";

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    titleId?: string;
    titleDefaultMessage?: string;
    title: string;
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
            const title = item.titleId
              ? intl.formatMessage({
                  id: item.titleId,
                  defaultMessage: item.titleDefaultMessage ?? item.title,
                })
              : item.title;

            return (
              <SidebarMenuItem key={item.titleId ?? item.title}>
                <SidebarMenuButton asChild size="sm" tooltip={title}>
                  <Link to={item.url}>
                    <item.icon />
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
