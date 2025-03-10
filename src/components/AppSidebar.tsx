import { Bitcoin, Home, Inbox, Settings, InfoIcon } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar"
import { NavUser } from "./nav/NavUser"
import { randomAvatar } from "@/utils/dev"
import { NavMain } from "./nav/NavMain"

const items = [
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
    url: "#",
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
]

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavMain items={items} />
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
