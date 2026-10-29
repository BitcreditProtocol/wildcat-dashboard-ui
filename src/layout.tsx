import { useTheme } from "@bitcredit/ui-library";
import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MintCommandBar } from "@/components/operator/MintCommandBar";
import { Outlet } from "react-router";

function ApplyTheme() {
  useTheme();
  return null;
}

/**
 * The sidebar's Theme control is what applies the stored theme to the page. On phones the sidebar
 * is a sheet that is not rendered while closed, so the page would stay light; the same hook runs
 * here exactly while the sidebar is hidden, so one instance owns the theme at a time.
 */
function ThemeWhileSidebarHidden() {
  const { isMobile, openMobile } = useSidebar();
  return isMobile && !openMobile ? <ApplyTheme /> : null;
}

export default function Layout() {
  return (
    <SidebarProvider className="h-svh">
      <ThemeWhileSidebarHidden />
      <AppSidebar />
      <main className="cockpit-main flex-1 flex flex-col overflow-y-auto min-h-0">
        <MintCommandBar />
        <SidebarTrigger className="cursor-pointer md:hidden" />
        <div className="cockpit-page flex flex-col">
          <Outlet />
        </div>
      </main>
    </SidebarProvider>
  );
}
