import {
  LayoutDashboard, CreditCard, FileText, Receipt, Shield, Settings, LogOut,
  Activity, Lock, Users
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";

const financialMenu = [
  { title: "Dashboard", url: "/owner", icon: LayoutDashboard },
  { title: "Assinatura", url: "/owner/subscription", icon: CreditCard },
  { title: "Planos", url: "/owner/plans", icon: FileText },
  { title: "Faturas", url: "/owner/invoices", icon: Receipt },
  { title: "Administradores", url: "/owner/admins", icon: Users },
];

const systemMenu = [
  { title: "Auditoria", url: "/owner/audit", icon: Shield },
  { title: "Configurações", url: "/owner/settings", icon: Settings },
];

export function OwnerSidebar() {
  const { signOut, user } = useOwnerAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate("/owner/login");
  };

  const isActive = (url: string) =>
    url === "/owner" ? location.pathname === "/owner" : location.pathname.startsWith(url);

  const renderItem = (item: typeof financialMenu[0]) => (
    <SidebarMenuItem key={item.title}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.url}
          end={item.url === "/owner"}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            isActive(item.url)
              ? "bg-emerald-50 text-emerald-700 font-semibold"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          }`}
          activeClassName="bg-emerald-50 text-emerald-700 font-semibold"
        >
          <item.icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.8} />
          <span className="truncate">{item.title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar
      className="border-r-0 bg-white"
      style={{ borderRight: "1px solid #eef0f3" }}
    >
      <SidebarHeader className="p-5 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-slate-800 tracking-wide">Owner</span>
            <span className="text-[10px] text-slate-400 font-medium">Painel de Controle</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-1 space-y-5 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-[0.15em] font-bold px-3 mb-1">
            Financeiro
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {financialMenu.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-slate-400 uppercase text-[10px] tracking-[0.15em] font-bold px-3 mb-1">
            Sistema
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {systemMenu.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-2" style={{ borderTop: "1px solid #eef0f3" }}>
        {/* User info */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
            {user?.email?.charAt(0).toUpperCase() || "O"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-700 truncate">{user?.email?.split("@")[0] || "Owner"}</span>
            <span className="text-[10px] text-slate-400 truncate">{user?.email || ""}</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 w-full text-[13px] font-medium"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} />
          <span>Sair</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
