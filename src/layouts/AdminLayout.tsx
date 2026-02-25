import { useState, useEffect } from "react";
import { Outlet, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Search, Settings, Monitor } from "lucide-react";
import { NotificationProvider } from "@/hooks/useNotifications";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { motion, AnimatePresence } from "framer-motion";
import { useSystemSuspension } from "@/hooks/useSystemSuspension";
import { SystemSuspendedFullPage, SystemSuspendedTopBanner } from "@/components/owner/SystemSuspendedBanner";
import { useNavigate } from "react-router-dom";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { useIsDemo } from "@/hooks/useIsDemo";

const routeTitles: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/produtos": "Produtos",
  "/admin/colecoes": "Coleções",
  "/admin/pedidos": "Pedidos",
  "/admin/clientes": "Clientes",
  "/admin/cupons": "Cupons",
  "/admin/notificacoes": "Notificações",
  "/admin/secoes": "Seções da Home",
  "/admin/pagamentos": "Pagamentos",
  "/admin/configuracoes": "Configurações",
  "/admin/banners": "Banners",
  "/admin/aparencia": "Identidade Visual",
  "/admin/header": "Header",
  "/admin/header-styles": "Estilos de Header",
  "/admin/home-templates": "Home Templates",
  "/admin/paineis-promo": "Painéis Promo",
  "/admin/vitrines": "Vitrines & Temporadas",
  "/admin/rastreamento": "Rastreamento",
  "/admin/templates-variacoes": "Templates de Variações",
  "/admin/vendedores": "Vendedores",
  "/admin/fornecedores": "Fornecedores",
  "/admin/logistica": "Logística",
  "/admin/funcoes": "Funções e Permissões",
  "/admin/comissoes": "Comissões",
  "/admin/relatorios": "Relatórios",
  "/admin/financeiro": "Financeiro",
  "/admin/financeiro/vendas": "Vendas",
  "/admin/financeiro/produtos": "Produtos Financeiro",
  "/admin/financeiro/custos": "Custos e Margem",
  "/admin/financeiro/comissoes": "Comissões Financeiro",
  "/admin/financeiro/reembolsos": "Reembolsos",
  "/admin/financeiro/conciliacao": "Conciliação",
  "/admin/financeiro/fluxo-caixa": "Fluxo de Caixa",
  "/admin/financeiro/relatorios": "Relatórios Financeiro",
  "/admin/financeiro/configuracoes": "Config. Financeiro",
  "/admin/planos": "Planos e Assinatura",
  "/admin/assinatura": "Assinatura",
};

// Routes that remain accessible even when suspended
const ALLOWED_SUSPENDED_ROUTES = ["/admin/planos", "/admin/assinatura"];

export default function AdminLayout() {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => localStorage.getItem("admin-theme") === "dark");
  const location = useLocation();
  const { isSuspended } = useSystemSuspension();
  const { isDemo } = useIsDemo();
  useDynamicTheme();

  useEffect(() => {
    localStorage.setItem("admin-theme", isDark ? "dark" : "light");
  }, [isDark]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const isOnAllowedRoute = ALLOWED_SUSPENDED_ROUTES.some(r => location.pathname.startsWith(r));
  const showSuspendedContent = isSuspended && !isOnAllowedRoute;

  const pageTitle = routeTitles[location.pathname] || "Admin";

  return (
    <div className={`admin-panel ${isDark ? "dark" : ""} text-foreground`}>
      <NotificationProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full overflow-x-hidden bg-muted/30">
            <AdminSidebar />
            <SidebarInset className="flex-1 min-w-0 flex flex-col bg-transparent">
              {/* Demo banner */}
              {isDemo && (
                <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 md:px-8 py-2 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    <strong>Modo Demo</strong> — Você está visualizando o painel em modo demonstração. Alterações estão desativadas.
                  </p>
                </div>
              )}
              {/* Suspended top banner */}
              {isSuspended && <SystemSuspendedTopBanner />}

              {/* Premium Topbar */}
              <header
                className="h-16 flex items-center justify-between gap-4 px-4 md:px-8 sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border/60"
              >
                <div className="flex items-center gap-3">
                  <SidebarTrigger className="text-muted-foreground min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-muted transition-colors" />
                  <h1 className="font-semibold text-lg text-foreground">{pageTitle}</h1>
                </div>

                {/* Center search */}
                <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar dados, pedidos ou produtos..."
                      className="w-full h-10 pl-10 pr-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
                      disabled={isSuspended}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <NotificationBell isAdmin />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsDark(d => !d)}
                    className="text-muted-foreground rounded-xl h-10 w-10 hover:bg-muted"
                    aria-label="Alternar tema"
                  >
                    {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
                  </Button>
                  <button
                    onClick={() => navigate("/admin/configuracoes")}
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="w-[18px] h-[18px]" />
                  </button>
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center ml-1">
                    <span className="text-primary-foreground text-sm font-bold">
                      {(user?.email?.charAt(0) || "A").toUpperCase()}
                    </span>
                  </div>
                </div>
              </header>
              
              {/* Main Content */}
              <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[1600px] mx-auto"
                  >
                    {showSuspendedContent ? <Navigate to="/admin/planos" replace /> : <Outlet />}
                  </motion.div>
                </AnimatePresence>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </NotificationProvider>
    </div>
  );
}
