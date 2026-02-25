import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, ExternalLink } from "lucide-react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  order_new: { icon: "🛒", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  order_created: { icon: "✅", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  payment_paid: { icon: "💰", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
  order_shipped: { icon: "📦", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" },
  order_delivered: { icon: "🎉", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
  order_canceled: { icon: "❌", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  refund: { icon: "↩️", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
  stock_low: { icon: "⚠️", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  system: { icon: "🔔", color: "bg-muted text-muted-foreground" },
  marketing: { icon: "📢", color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300" },
};

function getEntityLink(n: Notification, isAdmin: boolean): string | null {
  if (n.entity_type === "order" && n.entity_id) {
    return isAdmin ? `/admin/pedidos/${n.entity_id}` : `/conta/pedidos/${n.entity_id}`;
  }
  return null;
}

function NotificationItem({ n, isAdmin, onNavigate }: { n: Notification; isAdmin: boolean; onNavigate: (path: string) => void }) {
  const { markAsRead } = useNotifications();
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
  const link = getEntityLink(n, isAdmin);

  const handleClick = () => {
    if (!n.is_read) markAsRead([n.id]);
    if (link) onNavigate(link);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full text-left p-3 rounded-xl transition-all duration-200 hover:bg-accent/5 group flex gap-3 items-start",
        !n.is_read && "bg-accent/5 border border-accent/10"
      )}
    >
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0", config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm truncate", !n.is_read ? "font-semibold text-foreground" : "text-muted-foreground")}>
            {n.title}
          </p>
          {!n.is_read && <div className="w-2 h-2 rounded-full bg-accent shrink-0" />}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{n.body}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
      {link && (
        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      )}
    </button>
  );
}

function NotificationList({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const recent = notifications.slice(0, 10);

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="flex flex-col max-h-[70vh]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <h3 className="font-display text-sm font-bold">Notificações</h3>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 gap-1 text-accent">
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {recent.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Nenhuma notificação
          </div>
        ) : (
          recent.map(n => (
            <NotificationItem key={n.id} n={n} isAdmin={isAdmin} onNavigate={handleNavigate} />
          ))
        )}
      </div>

      <div className="border-t border-border/50 p-2">
        <Button
          variant="ghost"
          className="w-full text-xs text-accent hover:text-accent"
          onClick={() => handleNavigate(isAdmin ? "/admin/notificacoes" : "/conta/notificacoes")}
        >
          Ver todas as notificações
        </Button>
      </div>
    </div>
  );
}

export function NotificationBell({ isAdmin = false }: { isAdmin?: boolean }) {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const bellButton = (
    <button className="relative p-2 rounded-xl hover:bg-accent/10 transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center">
      <Bell className={cn("w-5 h-5 text-muted-foreground transition-all", unreadCount > 0 && "text-foreground animate-[shake_0.5s_ease-in-out]")} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent text-[10px] font-bold text-white flex items-center justify-center px-1 animate-in zoom-in-50">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{bellButton}</SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notificações</SheetTitle>
          </SheetHeader>
          <NotificationList isAdmin={isAdmin} onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>
      <PopoverContent className="w-96 p-0 rounded-2xl shadow-xl border-border/50" align="end" sideOffset={8}>
        <NotificationList isAdmin={isAdmin} onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}
