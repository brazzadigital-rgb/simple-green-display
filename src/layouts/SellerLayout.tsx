import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Moon, Sun, Settings } from "lucide-react";
import SellerSidebar from "@/components/seller/SellerSidebar";
import SellerMobileNav from "@/components/seller/SellerMobileNav";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const routeTitles: Record<string, string> = {
  "/vendedor": "Dashboard",
  "/vendedor/links": "Meus Links",
  "/vendedor/vendas": "Minhas Vendas",
  "/vendedor/clientes": "Meus Clientes",
  "/vendedor/comissoes": "Comissões",
  "/vendedor/saques": "Saques",
  "/vendedor/cupons": "Cupons",
  "/vendedor/materiais": "Materiais",
  "/vendedor/perfil": "Perfil",
  "/vendedor/suporte": "Suporte",
  "/vendedor/pendente": "Cadastro Pendente",
};

export default function SellerLayout() {
  const { user, isSeller, isLoading, sellerId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sellerStatus, setSellerStatus] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/auth?redirect=/vendedor");
    } else if (!isSeller) {
      navigate("/");
    }
  }, [user, isSeller, isLoading, navigate]);

  useEffect(() => {
    if (!sellerId) { setCheckingStatus(false); return; }
    const check = async () => {
      const { data } = await supabase.from("sellers").select("seller_status").eq("id", sellerId).maybeSingle();
      setSellerStatus((data as any)?.seller_status || null);
      setCheckingStatus(false);
    };
    check();
  }, [sellerId]);

  useEffect(() => {
    if (checkingStatus || !sellerStatus) return;
    if (sellerStatus !== "approved" && location.pathname !== "/vendedor/pendente") {
      navigate("/vendedor/pendente");
    }
  }, [sellerStatus, checkingStatus, location.pathname, navigate]);

  if (isLoading || checkingStatus) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!user || !isSeller) return null;

  const pageTitle = routeTitles[location.pathname] || "Vendedor";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden bg-slate-50/70">
        <SellerSidebar />
        <SidebarInset className="flex-1 min-w-0 flex flex-col bg-transparent">
          {/* Mobile nav for small screens */}
          <div className="lg:hidden">
            <SellerMobileNav />
          </div>

          {/* Premium Topbar — desktop */}
          <header className="hidden lg:flex h-16 items-center justify-between gap-4 px-4 md:px-8 sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-slate-500 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl hover:bg-slate-100 transition-colors" />
              <h1 className="font-semibold text-lg text-slate-800">{pageTitle}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {(user?.email?.charAt(0) || "V").toUpperCase()}
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
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
