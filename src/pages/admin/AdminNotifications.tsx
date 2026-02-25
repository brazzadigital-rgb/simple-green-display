import { useState, useEffect } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCheck, Trash2, Search, Package, CreditCard, Truck, AlertTriangle, BellRing, Volume2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

const FILTERS = [
  { id: "all", label: "Todas", icon: Bell },
  { id: "unread", label: "Não lidas", icon: Bell },
  { id: "orders", label: "Pedidos", icon: Package },
  { id: "payments", label: "Pagamentos", icon: CreditCard },
  { id: "shipping", label: "Entregas", icon: Truck },
  { id: "system", label: "Sistema", icon: AlertTriangle },
];

const TYPE_LABELS: Record<string, string> = {
  order_new: "Novo Pedido", order_created: "Pedido Criado", payment_paid: "Pagamento",
  order_shipped: "Enviado", order_delivered: "Entregue", order_canceled: "Cancelado",
  refund: "Reembolso", stock_low: "Estoque Baixo", system: "Sistema", marketing: "Marketing",
};

const FILTER_TYPES: Record<string, string[]> = {
  orders: ["order_new", "order_created", "order_canceled"],
  payments: ["payment_paid", "refund"],
  shipping: ["order_shipped", "order_delivered"],
  system: ["system", "stock_low", "marketing"],
};

export default function AdminNotifications() {
  const { notifications, unreadCount, preferences, markAsRead, markAllAsRead, deleteNotification, fetchMore, updatePreferences, playSound } = useNotifications();
  const push = usePushSubscription();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [allNotifs, setAllNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");
  const navigate = useNavigate();

  useEffect(() => { setAllNotifs(notifications); }, [notifications]);

  const loadMore = async () => {
    if (allNotifs.length === 0) return;
    setLoading(true);
    const last = allNotifs[allNotifs.length - 1];
    const more = await fetchMore(last.created_at);
    setAllNotifs(prev => [...prev, ...more]);
    setLoading(false);
  };

  const filtered = allNotifs.filter(n => {
    if (filter === "unread" && n.is_read) return false;
    if (FILTER_TYPES[filter] && !FILTER_TYPES[filter].includes(n.type)) return false;
    if (search) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    }
    return true;
  });

  const handleClick = (n: Notification) => {
    if (!n.is_read) markAsRead([n.id]);
    if (n.entity_type === "order" && n.entity_id) navigate(`/admin/pedidos/${n.entity_id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-3">
            <Bell className="w-6 h-6 text-emerald-600" />
            Notificações
            {unreadCount > 0 && <span className="bg-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount}</span>}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Central de notificações e configurações</p>
        </div>
        <div className="flex gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <Button variant="ghost" size="sm" onClick={() => setActiveTab("inbox")} className={cn("rounded-lg gap-1.5 text-xs font-medium", activeTab === "inbox" ? "bg-slate-100 text-slate-900" : "text-slate-500")}>
            <Bell className="w-3.5 h-3.5" /> Inbox
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveTab("settings")} className={cn("rounded-lg gap-1.5 text-xs font-medium", activeTab === "settings" ? "bg-slate-100 text-slate-900" : "text-slate-500")}>
            <Volume2 className="w-3.5 h-3.5" /> Configurações
          </Button>
        </div>
      </div>

      {activeTab === "settings" ? (
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="admin-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <BellRing className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display font-bold text-lg text-slate-800">Push Notifications</h3>
              </div>
              {!push.isSupported ? (
                <p className="text-sm text-slate-400">Seu navegador não suporta push notifications.</p>
              ) : push.permission === "denied" ? (
                <p className="text-sm text-red-500">Push bloqueado pelo navegador.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Ativar Push</span>
                    <PremiumToggle3D size="sm" checked={push.isSubscribed} onCheckedChange={async (v) => {
                      if (v) { const ok = await push.subscribe(); if (ok) updatePreferences({ enable_push: true }); }
                      else { await push.unsubscribe(); updatePreferences({ enable_push: false }); }
                    }} />
                  </div>
                  {!push.vapidPublicKey && <p className="text-xs text-amber-600">⚠️ Chaves VAPID não configuradas.</p>}
                  <p className="text-xs text-slate-400">{push.isSubscribed ? "✅ Recebendo notificações." : "Ative para receber alertas."}</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="admin-card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display font-bold text-lg text-slate-800">Sons & Alertas</h3>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Ativar som</span>
                  <PremiumToggle3D size="sm" checked={preferences.enable_sound} onCheckedChange={(v) => updatePreferences({ enable_sound: v })} />
                </div>
                {preferences.enable_sound && (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400">Volume</span>
                        <span className="text-xs font-mono text-slate-600">{preferences.sound_volume}%</span>
                      </div>
                      <Slider value={[preferences.sound_volume]} onValueChange={([v]) => updatePreferences({ sound_volume: v })} max={100} step={5} />
                    </div>
                    <Button variant="outline" size="sm" onClick={playSound} className="w-full rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">🔊 Testar som</Button>
                  </>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-sm font-medium text-slate-700">Horário silencioso</span>
                  <PremiumToggle3D size="sm" checked={preferences.quiet_hours_enabled} onCheckedChange={(v) => updatePreferences({ quiet_hours_enabled: v })} />
                </div>
                {preferences.quiet_hours_enabled && (
                  <div className="flex items-center gap-2 text-sm">
                    <Input type="time" value={preferences.quiet_from} onChange={e => updatePreferences({ quiet_from: e.target.value })} className="h-9 rounded-xl w-28 border-0 bg-slate-100 text-slate-800" />
                    <span className="text-slate-400">até</span>
                    <Input type="time" value={preferences.quiet_to} onChange={e => updatePreferences({ quiet_to: e.target.value })} className="h-9 rounded-xl w-28 border-0 bg-slate-100 text-slate-800" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      ) : (
        <>
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50">
                <CheckCheck className="w-4 h-4" /> Marcar todas como lidas
              </Button>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border",
                  filter === f.id ? "bg-emerald-50 border-emerald-100 text-emerald-700 shadow-sm" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50"
                )}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Buscar notificações..." value={search} onChange={e => setSearch(e.target.value)} className="admin-input pl-10" />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="admin-card p-12 text-center flex flex-col items-center">
                <Bell className="w-12 h-12 mb-4 text-slate-200" />
                <p className="text-slate-500 font-medium">Nenhuma notificação encontrada</p>
              </div>
            ) : (
              filtered.map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <div
                    className={cn("admin-card p-4 cursor-pointer hover:border-emerald-200 transition-all duration-200 group flex items-start gap-4 relative overflow-hidden", !n.is_read && "bg-emerald-50/30 border-emerald-100")}
                    onClick={() => handleClick(n)}
                  >
                    {!n.is_read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0", n.priority === "high" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-600")}>
                      {n.type === "order_new" ? "🛒" : n.type === "payment_paid" ? "💰" : n.type === "order_shipped" ? "📦" : n.type === "order_delivered" ? "🎉" : n.type === "order_canceled" ? "❌" : n.type === "refund" ? "↩️" : n.type === "stock_low" ? "⚠️" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={cn("text-sm", !n.is_read ? "font-bold text-slate-800" : "font-medium text-slate-600")}>{n.title}</p>
                        <span className="admin-status-pill admin-status-muted ml-auto text-[10px]">{TYPE_LABELS[n.type] || n.type}</span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-2 -mt-2 h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg" onClick={e => { e.stopPropagation(); deleteNotification(n.id); }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {filtered.length >= 20 && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={loadMore} disabled={loading} className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                {loading ? "Carregando..." : "Carregar mais"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}