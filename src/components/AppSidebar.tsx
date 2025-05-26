import { Bitcoin, Home, Inbox, Settings, LifeBuoy, Send } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar"
import { NavUser } from "./nav/NavUser"
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
    // {
    //   title: "Earnings",
    //   url: "/earnings",
    //   icon: TrendingUpIcon,
    // },
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
        /*{
          title: "Expired",
          url: "/quotes/expired",
        },*/
      ],
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
    // {
    //   title: "Info",
    //   url: "/info",
    //   icon: InfoIcon,
    // },
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
            avatar: "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
