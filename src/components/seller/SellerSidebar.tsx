import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Link2, ShoppingBag, Users, Coins, Wallet,
  Tag, FolderOpen, UserCircle, HelpCircle, LogOut, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { NavLink } from "react-router-dom";
import { SellerSidebarWidget } from "./SellerSidebarWidget";

const mainMenu = [
  { title: "Dashboard", url: "/vendedor", icon: LayoutDashboard },
  { title: "Meus Links", url: "/vendedor/links", icon: Link2 },
  { title: "Minhas Vendas", url: "/vendedor/vendas", icon: ShoppingBag },
  { title: "Meus Clientes", url: "/vendedor/clientes", icon: Users },
];

const financialMenu = [
  { title: "Comissões", url: "/vendedor/comissoes", icon: Coins },
  { title: "Saques", url: "/vendedor/saques", icon: Wallet },
  { title: "Cupons", url: "/vendedor/cupons", icon: Tag },
];

const accountMenu = [
  { title: "Materiais", url: "/vendedor/materiais", icon: FolderOpen },
  { title: "Perfil", url: "/vendedor/perfil", icon: UserCircle },
  { title: "Suporte", url: "/vendedor/suporte", icon: HelpCircle },
];

type MenuItem = { title: string; url: string; icon: any };

function SidebarSection({ label, items }: { label: string; items: MenuItem[] }) {
  return (
    <div className="mb-1">
      <p className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <nav className="space-y-0.5 px-2">
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/vendedor"}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
              isActive
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span className="flex-1 truncate">{item.title}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function SellerSidebar() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-slate-200/80 bg-white">
      <SidebarHeader className="px-5 py-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-slate-800 truncate">Painel Vendedor</span>
            <span className="text-[10px] text-slate-400 font-medium">Área do Parceiro</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto flex-1">
        <SidebarSection label="Principal" items={mainMenu} />
        <SidebarSection label="Financeiro" items={financialMenu} />
        <SidebarSection label="Conta" items={accountMenu} />

        <div className="mt-auto pt-4">
          <SellerSidebarWidget />
        </div>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1 border-t border-slate-100">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">
              {(user?.email?.charAt(0) || "V").toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-700 truncate">{user?.email?.split("@")[0] || "Vendedor"}</span>
            <span className="text-[10px] text-slate-400 truncate">{user?.email || ""}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Store link */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 w-full text-[13px] font-medium"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Ver Loja</span>
          <ExternalLink className="w-3 h-3 ml-auto" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
