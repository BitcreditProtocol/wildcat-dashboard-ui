import { Bitcoin, Home, Inbox, Settings, InfoIcon, LifeBuoy, Send } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar"
import { NavUser } from "./nav/NavUser"
import { randomAvatar } from "@/utils/dev"
import { NavMain } from "./nav/NavMain"
import { NavSecondary } from "./nav/NavSecondary"

const data = {
  navMain: [
    {
      title: "Home",
      url: "/",
      icon: Home,
    },
    {
      title: "Balances",
      url: "/balances",
      icon: Bitcoin,
    },
    {
      title: "Quotes",
      url: "/quotes",
      icon: Inbox,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "General",
          url: "/settings",
        },
      ],
    },
    {
      title: "Info",
      url: "/info",
      icon: InfoIcon,
    },
  ],

  navSecondary: [
    {
      title: "Support",
      url: "/#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "/#",
      icon: Send,
    },
  ],
}

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: "Account",
            email: "",
            avatar: randomAvatar("men", ""),
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
