import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { Outlet } from "react-router"

export default function Layout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 flex flex-col px-2 py-2">
        <div>
          <SidebarTrigger className="cursor-pointer" />
        </div>
        <div className="flex flex-col py-2">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  )
}
