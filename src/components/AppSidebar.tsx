import { Bitcoin, Home, Inbox } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar"
import { NavUser } from "./nav/NavUser"
import { NavMain } from "./nav/NavMain"
import { useKeycloak } from "../lib/keycloak-user"

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
      items: [
        {
          title: "Pending",
          url: "/quotes/pending",
        },
        {
          title: "Offered",
          url: "/quotes/offered",
        },
        {
          title: "Accepted",
          url: "/quotes/accepted",
        },
        {
          title: "Denied",
          url: "/quotes/denied",
        },
        {
          title: "Rejected",
          url: "/quotes/rejected",
        },
      ],
    },
  ],
}

export function AppSidebar() {
  const { user, isLoading } = useKeycloak()

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>{!isLoading && user && <NavUser user={user} />}</SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
