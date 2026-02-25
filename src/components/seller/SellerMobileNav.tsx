import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Link2, ShoppingBag, Users, Coins, Wallet,
  Tag, FolderOpen, UserCircle, HelpCircle, LogOut, Menu, ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const mainMenu = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/vendedor" },
  { label: "Meus Links", icon: Link2, path: "/vendedor/links" },
  { label: "Minhas Vendas", icon: ShoppingBag, path: "/vendedor/vendas" },
  { label: "Meus Clientes", icon: Users, path: "/vendedor/clientes" },
];

const financialMenu = [
  { label: "Comissões", icon: Coins, path: "/vendedor/comissoes" },
  { label: "Saques", icon: Wallet, path: "/vendedor/saques" },
  { label: "Cupons", icon: Tag, path: "/vendedor/cupons" },
];

const accountMenu = [
  { label: "Materiais", icon: FolderOpen, path: "/vendedor/materiais" },
  { label: "Perfil", icon: UserCircle, path: "/vendedor/perfil" },
  { label: "Suporte", icon: HelpCircle, path: "/vendedor/suporte" },
];

function NavSection({ label, items, isActive, onNavigate }: { label: string; items: typeof mainMenu; isActive: (p: string) => boolean; onNavigate: (p: string) => void }) {
  return (
    <div>
      <p className="px-4 pt-5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <nav className="space-y-0.5 px-2">
        {items.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150",
                active
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function SellerMobileNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/vendedor") return location.pathname === "/vendedor";
    return location.pathname.startsWith(path);
  };

  const go = (path: string) => { navigate(path); setOpen(false); };

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
          <ShoppingBag className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-bold text-sm text-slate-800">Painel Vendedor</span>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 text-slate-500 hover:bg-slate-100">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-white">
          <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-100">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-800">Painel Vendedor</span>
          </div>

          <div className="overflow-y-auto flex-1">
            <NavSection label="Principal" items={mainMenu} isActive={isActive} onNavigate={go} />
            <NavSection label="Financeiro" items={financialMenu} isActive={isActive} onNavigate={go} />
            <NavSection label="Conta" items={accountMenu} isActive={isActive} onNavigate={go} />
          </div>

          <div className="border-t border-slate-100 p-3 space-y-1 mt-auto">
            {/* User info */}
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {(user?.email?.charAt(0) || "V").toUpperCase()}
                </span>
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-slate-700 truncate">{user?.email?.split("@")[0] || "Vendedor"}</span>
              </div>
            </div>

            <button
              onClick={() => go("/")}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all duration-150 w-full text-[13px] font-medium"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Loja</span>
              <ExternalLink className="w-3 h-3 ml-auto" />
            </button>
            <button
              onClick={() => { signOut(); setOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all duration-150 w-full text-[13px] font-medium"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
