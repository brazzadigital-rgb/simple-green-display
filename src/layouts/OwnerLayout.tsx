import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { OwnerSidebar } from "@/components/owner/OwnerSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Bell, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const routeTitles: Record<string, string> = {
  "/owner": "Dashboard",
  "/owner/subscription": "Assinatura",
  "/owner/plans": "Planos",
  "/owner/invoices": "Faturas",
  "/owner/admins": "Administradores",
  "/owner/audit": "Auditoria",
  "/owner/settings": "Configurações",
};

export default function OwnerLayout() {
  const { user, isOwner, isLoading } = useOwnerAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/owner/login" replace />;
  if (!isOwner) return <Navigate to="/owner/login" replace />;

  const pageTitle = routeTitles[location.pathname] || "Owner";

  return (
    <div className="text-slate-800">
      <SidebarProvider>
        <div className="min-h-screen flex w-full overflow-x-hidden bg-[#f4f5f7]">
          <OwnerSidebar />
          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Executive header bar */}
            <header className="h-16 flex items-center justify-between gap-4 px-4 md:px-8 sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-slate-400 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors lg:hidden" />
                <h1 className="font-semibold text-lg text-slate-800">{pageTitle}</h1>
              </div>

              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="hidden md:flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 text-sm text-slate-400 w-64 border border-slate-100">
                  <Search className="w-4 h-4" />
                  <span>Buscar...</span>
                </div>
                {/* Bell */}
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors relative">
                  <Bell className="w-[18px] h-[18px]" />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                </button>
                {/* Settings */}
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors">
                  <Settings className="w-[18px] h-[18px]" />
                </button>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold ml-1 shadow-sm">
                  {user?.email?.charAt(0).toUpperCase() || "O"}
                </div>
              </div>
            </header>

            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                  className="max-w-[1400px] mx-auto"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
}
