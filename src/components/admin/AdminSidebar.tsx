import { useState, useEffect } from "react";
import {
  LayoutDashboard, Package, FolderOpen, ShoppingCart, Users, Tag, Image, Settings, LogOut, ShoppingBag,
  Truck, UserCheck, Shield, Percent, TrendingUp, Columns3, Layout, CalendarRange,
  DollarSign, BarChart3, ArrowDownCircle, CreditCard, Wallet, FileSpreadsheet, Wrench, Activity, Bell, Layers,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { SidebarPlanWidget } from "@/components/admin/SidebarPlanWidget";

const mainMenu = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Pedidos", url: "/admin/pedidos", icon: ShoppingCart, badgeKey: "orders" as const },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Cupons", url: "/admin/cupons", icon: Tag },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell, badgeKey: "notifications" as const },
  { title: "Pagamentos", url: "/admin/pagamentos", icon: CreditCard },
];

const productMenu = [
  { title: "Produtos", url: "/admin/produtos", icon: Package },
  { title: "Templates Variações", url: "/admin/templates-variacoes", icon: Layers },
  { title: "Coleções", url: "/admin/colecoes", icon: FolderOpen },
  { title: "Seções da Home", url: "/admin/secoes", icon: Image },
];

const financialMenu = [
  { title: "Visão Geral", url: "/admin/financeiro", icon: DollarSign },
  { title: "Vendas", url: "/admin/financeiro/vendas", icon: ShoppingCart },
  { title: "Produtos", url: "/admin/financeiro/produtos", icon: Package },
  { title: "Custos e Margem", url: "/admin/financeiro/custos", icon: BarChart3 },
  { title: "Comissões", url: "/admin/financeiro/comissoes", icon: Percent },
  { title: "Reembolsos", url: "/admin/financeiro/reembolsos", icon: ArrowDownCircle },
  { title: "Conciliação", url: "/admin/financeiro/conciliacao", icon: CreditCard },
  { title: "Fluxo de Caixa", url: "/admin/financeiro/fluxo-caixa", icon: Wallet },
  { title: "Relatórios", url: "/admin/financeiro/relatorios", icon: FileSpreadsheet },
  { title: "Configurações", url: "/admin/financeiro/configuracoes", icon: Wrench },
];

const appearanceMenu = [
  { title: "Home Templates", url: "/admin/home-templates", icon: Layout },
  { title: "Estilos de Header", url: "/admin/header-styles", icon: Settings },
  { title: "Header", url: "/admin/header", icon: Settings },
  { title: "Banners", url: "/admin/banners", icon: Image },
  { title: "Painéis Promo", url: "/admin/paineis-promo", icon: Columns3 },
  { title: "Identidade Visual", url: "/admin/aparencia", icon: Settings },
];

const marketingMenu = [
  { title: "Vitrines & Temporadas", url: "/admin/vitrines", icon: CalendarRange },
  { title: "Rastreamento", url: "/admin/rastreamento", icon: Activity },
];

const adminMenu = [
  { title: "Vendedores", url: "/admin/vendedores", icon: UserCheck },
  { title: "Fornecedores", url: "/admin/fornecedores", icon: Truck },
  { title: "Logística", url: "/admin/logistica", icon: Truck },
  { title: "Funções e Permissões", url: "/admin/funcoes", icon: Shield },
  { title: "Comissões", url: "/admin/comissoes", icon: Percent },
  { title: "Relatórios", url: "/admin/relatorios", icon: TrendingUp },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
  { title: "Assinatura", url: "/admin/assinatura", icon: DollarSign },
];

type MenuItem = { title: string; url: string; icon: any; badgeKey?: "orders" | "notifications" };

function SidebarSection({ label, items, badges }: { label: string; items: MenuItem[]; badges?: Record<string, number> }) {
  return (
    <div className="mb-1">
      <p className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <nav className="space-y-0.5 px-2">
        {items.map((item) => {
          const count = item.badgeKey && badges ? badges[item.badgeKey] || 0 : 0;
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/admin"}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/60 hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
              <span className="flex-1 truncate">{item.title}</span>
              {count > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center rounded-full bg-white/20 text-[10px] font-bold leading-none">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export function AdminSidebar() {
  const { user, signOut } = useAuth();
  const { getSetting } = useStoreSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const [pendingOrders, setPendingOrders] = useState(0);
  const [seenOrders, setSeenOrders] = useState(false);

  useEffect(() => {
    const fetchPending = async () => {
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingOrders(count || 0);
    };
    fetchPending();

    const channel = supabase
      .channel("sidebar-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchPending();
        if (!location.pathname.startsWith("/admin/pedidos")) {
          setSeenOrders(false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [location.pathname]);

  useEffect(() => {
    if (location.pathname.startsWith("/admin/pedidos")) {
      setSeenOrders(true);
    }
  }, [location.pathname]);

  const badges = { orders: seenOrders ? 0 : pendingOrders, notifications: unreadCount };
  const logoUrl = getSetting("logo_url");
  const storeName = getSetting("store_name") || "Admin";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar className="border-r border-border bg-card">
      {/* Header */}
      <SidebarHeader className="px-5 py-5 pb-3">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                {storeName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-foreground truncate">{storeName}</span>
            <span className="text-[10px] text-muted-foreground font-medium">Painel de Gestão</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="overflow-y-auto flex-1">
        <SidebarSection label="Menu Principal" items={mainMenu} badges={badges} />
        <SidebarSection label="Produto" items={productMenu} />
        <SidebarSection label="Financeiro" items={financialMenu} />
        <SidebarSection label="Marketing" items={marketingMenu} />
        <SidebarSection label="Aparência" items={appearanceMenu} />
        <SidebarSection label="Admin" items={adminMenu} />
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 space-y-1 border-t border-border">
        <SidebarPlanWidget />

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground text-xs font-bold">
              {(user?.email?.charAt(0) || "A").toUpperCase()}
            </span>
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-foreground truncate">{user?.email?.split("@")[0] || "Admin"}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user?.email || ""}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Store link */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-150 w-full text-[13px] font-medium"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Ver Loja</span>
          <ExternalLink className="w-3 h-3 ml-auto" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
