import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router";

export default function Layout() {
  return (
    <SidebarProvider className="h-svh">
      <AppSidebar />
      <main className="flex-1 flex flex-col px-2 py-2 overflow-y-auto min-h-0">
        <SidebarTrigger className="cursor-pointer md:hidden" />
        <div className="flex flex-col py-2">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
