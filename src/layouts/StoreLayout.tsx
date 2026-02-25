import { Outlet } from "react-router-dom";
import { StoreHeaderRouter } from "@/components/store/StoreHeaderRouter";
import { StoreFooter } from "@/components/store/StoreFooter";
import { CartDrawer } from "@/components/store/CartDrawer";
import { BottomPromoBanner } from "@/components/store/BottomPromoBanner";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";
import { TrackingProvider } from "@/hooks/useTracking";
import { CookieConsentBanner } from "@/components/store/CookieConsentBanner";
import { useTrackingSettings } from "@/hooks/useTrackingSettings";
import { NotificationProvider } from "@/hooks/useNotifications";
import { useSystemSuspension } from "@/hooks/useSystemSuspension";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

function StoreInner() {
  const { config } = useTrackingSettings();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <StoreHeaderRouter />
      <main className="flex-1">
        <Outlet />
      </main>
      <BottomPromoBanner />
      <StoreFooter />
      <CartDrawer />
      <CookieConsentBanner
        bannerText={config.lgpd_banner_text}
        policyLink={config.lgpd_policy_link}
      />
    </div>
  );
}

function SuspendedPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Loja em Manutenção</h1>
        <p className="text-muted-foreground">
          Esta loja está temporariamente indisponível. Por favor, tente novamente mais tarde.
        </p>
        {user && isAdmin ? (
          <Button onClick={() => navigate("/admin/planos")} className="mt-4">
            Regularizar Assinatura
          </Button>
        ) : !user ? (
          <Button variant="outline" onClick={() => navigate("/auth")} className="mt-4">
            <LogIn className="w-4 h-4 mr-2" /> Entrar como administrador
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function StoreLayout() {
  const themeReady = useDynamicTheme();
  const { isSuspended } = useSystemSuspension();

  if (!themeReady) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isSuspended) {
    return <SuspendedPage />;
  }

  return (
    <TrackingProvider>
      <NotificationProvider>
        <StoreInner />
      </NotificationProvider>
    </TrackingProvider>
  );
}