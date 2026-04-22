import { ChevronRight, type LucideIcon } from "lucide-react";
import { Heading, Separator, Text } from "@bitcredit/ui-library";
import { Fragment } from "react";
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
      <SidebarGroupLabel asChild>
        <Heading as="h2" variant="section">
          {intl.formatMessage({
            id: "nav.dashboard",
            defaultMessage: "Dashboard",
          })}
        </Heading>
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item, index) => {
          const title = intl.formatMessage(item.title);

          return (
            <Fragment key={item.title.id}>
              {(item.items ?? []).length === 0 || state === "collapsed" ? (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={title} disabled={item.disabled}>
                    {item.disabled === true ? (
                      <>
                        {item.icon && <item.icon />}
                        <Text as="span" variant="titleSm">
                          {title}
                        </Text>
                      </>
                    ) : (
                      <NavLink to={item.url}>
                        {item.icon && <item.icon />}
                        <Text as="span" variant="titleSm">
                          {title}
                        </Text>
                      </NavLink>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : (
                <Collapsible asChild defaultOpen={item.isActive} className="group/collapsible">
                  <SidebarMenuItem>
                    <div className="relative flex items-center">
                      <SidebarMenuButton asChild tooltip={title} className="flex-1 pr-8">
                        <NavLink to={item.url}>
                          {item.icon && <item.icon />}
                          <Text as="span" variant="titleSm">
                            {title}
                          </Text>
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
                                  <Text as="span" variant="caption">
                                    {subTitle}
                                  </Text>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}
              {index < items.length - 1 ? <Separator className="bg-divider-75 my-1" /> : null}
            </Fragment>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
