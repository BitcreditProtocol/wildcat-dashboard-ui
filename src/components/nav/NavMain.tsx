import { ChevronRight, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIntl, type MessageDescriptor } from "react-intl";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type NavMessageDescriptor = MessageDescriptor & { id: string };

export function NavMain({
  items,
}: {
  items: {
    title: NavMessageDescriptor;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    disabled?: boolean;
    items?: {
      title: NavMessageDescriptor;
      url: string;
      disabled?: boolean;
    }[];
  }[];
}) {
  const { state } = useSidebar();
  const intl = useIntl();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        {intl.formatMessage({
          id: "nav.dashboard",
          defaultMessage: "Dashboard",
        })}
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const title = intl.formatMessage(item.title);

          return (item.items ?? []).length === 0 || state === "collapsed" ? (
            <SidebarMenuItem key={item.title.id}>
              <SidebarMenuButton asChild tooltip={title} disabled={item.disabled}>
                {item.disabled === true ? (
                  <>
                    {item.icon && <item.icon />}
                    <span>{title}</span>
                  </>
                ) : (
                  <NavLink to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{title}</span>
                  </NavLink>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            <Collapsible key={item.title.id} asChild defaultOpen={item.isActive} className="group/collapsible">
              <SidebarMenuItem>
                <div className="relative flex items-center">
                  <SidebarMenuButton asChild tooltip={title} className="flex-1 pr-8">
                    <NavLink to={item.url}>
                      {item.icon && <item.icon />}
                      <span>{title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  <CollapsibleTrigger asChild>
                    <button
                      className="absolute cursor-pointer right-1 flex h-6 w-6 items-center justify-center rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      aria-label={intl.formatMessage(
                        {
                          id: "nav.toggleSubmenu",
                          defaultMessage: "Toggle {title} submenu",
                        },
                        { title }
                      )}
                    >
                      <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </button>
                  </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map((subItem) => {
                      const subTitle = intl.formatMessage(subItem.title);

                      return (
                        <SidebarMenuSubItem key={subItem.title.id}>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to={subItem.url}
                              onClick={subItem.disabled ? (e) => e.preventDefault() : undefined}
                              className={cn({
                                "opacity-50": subItem.disabled,
                                "cursor-not-allowed": subItem.disabled,
                              })}
                            >
                              <span>{subTitle}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
