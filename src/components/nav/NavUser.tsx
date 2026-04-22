import { BadgeCheck, Bell, ChevronsUpDown, LogOut } from "lucide-react";
import { useIntl } from "react-intl";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@bitcredit/ui-library";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

export function NavUser({
  user,
}: {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
}) {
  const { isMobile } = useSidebar();
  const intl = useIntl();

  const initials = user.name.length > 0 ? user.name[0].toUpperCase() : "";
  const unknownUser = intl.formatMessage({
    id: "nav.user.unknown",
    defaultMessage: "Unknown User",
  });
  const initialsFallback = intl.formatMessage({
    id: "nav.user.initials.fallback",
    defaultMessage: "U",
  });
  const tooltipLabel = user.name || unknownUser;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="cursor-pointer">
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              tooltip={tooltipLabel}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm bg-[#f59e0b]">
                  {initials || initialsFallback}
                </div>
              </Avatar>

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{tooltipLabel}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {intl.formatMessage({
                      id: "nav.user.avatarFallback",
                      defaultMessage: "CN",
                    })}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{tooltipLabel}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>
                <BadgeCheck />
                {intl.formatMessage({
                  id: "nav.user.account",
                  defaultMessage: "Account",
                })}
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Bell />
                {intl.formatMessage({
                  id: "nav.user.notifications",
                  defaultMessage: "Notifications",
                })}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <LogOut />
              {intl.formatMessage({
                id: "nav.user.logout",
                defaultMessage: "Log out",
              })}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
