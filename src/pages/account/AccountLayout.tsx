import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Heart, MapPin, User, LogOut, Bell } from "lucide-react";
import { NotificationProvider } from "@/hooks/useNotifications";

const accountLinks = [
  { label: "Meus Pedidos", to: "/conta/pedidos", icon: Package },
  { label: "Favoritos", to: "/conta/favoritos", icon: Heart },
  { label: "Endereços", to: "/conta/enderecos", icon: MapPin },
  { label: "Notificações", to: "/conta/notificacoes", icon: Bell },
  { label: "Meus Dados", to: "/conta/dados", icon: User },
];

export default function AccountLayout() {
  const { user, isLoading, signOut } = useAuth();
  const location = useLocation();

  if (isLoading) return <div className="container py-12"><Skeleton className="h-64 w-full" /></div>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <NotificationProvider>
      <div className="container px-4 md:px-6 py-6 md:py-12">
        <h1 className="font-display text-2xl md:text-3xl font-bold mb-6 md:mb-8">Minha Conta</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {/* Mobile: horizontal scroll nav */}
          <nav className="md:hidden">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 snap-x snap-mandatory">
              {accountLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm whitespace-nowrap shrink-0 snap-center transition-all ${
                    location.pathname === link.to
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <link.icon className="w-4 h-4" />
                  {link.label}
                </Link>
              ))}
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-sans text-sm whitespace-nowrap shrink-0 bg-muted text-muted-foreground hover:text-destructive transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          </nav>

          {/* Desktop: sidebar */}
          <nav className="hidden md:block space-y-1">
            {accountLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm transition-all ${
                  location.pathname === link.to
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-sans text-sm text-muted-foreground hover:text-destructive hover:bg-muted transition-all w-full"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </nav>

          {/* Content */}
          <div className="md:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </NotificationProvider>
  );
}
