import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Truck, MapPin, Copy, Check, Clock, CheckCircle2, Package, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { getMetalColor } from "@/lib/metalColors";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendente", color: "bg-muted text-muted-foreground" },
  confirmed: { label: "Confirmado", color: "bg-primary/10 text-primary" },
  processing: { label: "Em preparo", color: "bg-primary/10 text-primary" },
  shipped: { label: "Enviado", color: "bg-accent/10 text-accent" },
  in_transit: { label: "Em trânsito", color: "bg-accent/10 text-accent" },
  delivered: { label: "Entregue", color: "bg-success/10 text-success" },
};

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    const fetch = async () => {
      const [o, i, e, oe] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).eq("user_id", user.id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
        supabase.from("tracking_events").select("*").eq("order_id", id).order("event_date", { ascending: false }),
        supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      ]);
      setOrder(o.data);
      setItems(i.data || []);
      // Merge tracking_events and order_events into a unified timeline
      const trackEvts = (e.data || []).map((t: any) => ({ ...t, source: "tracking" }));
      const orderEvts = (oe.data || []).map((t: any) => ({ ...t, event_date: t.created_at, source: "order" }));
      const merged = [...trackEvts, ...orderEvts].sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());
      setEvents(merged);
      setLoading(false);
    };
    fetch();
  }, [user, id]);

  const copyTracking = () => {
    if (order?.tracking_code) {
      navigator.clipboard.writeText(order.tracking_code);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!order) return <div className="text-center py-12"><p className="font-sans">Pedido não encontrado</p></div>;

  const addr = order.shipping_address as any;
  const shipStatus = STATUS_MAP[order.shipment_status || order.status] || STATUS_MAP.pending;

  return (
    <div className="space-y-6">
      <Link to="/conta/pedidos" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground font-sans transition-colors">
        <ArrowLeft className="w-4 h-4" /> Voltar aos pedidos
      </Link>

      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-display text-xl font-bold">{order.order_number}</h2>
        <Badge className={`${shipStatus.color} font-sans text-xs border-0`}>{shipStatus.label}</Badge>
      </div>

      {/* Shipping info */}
      <Card className="border-0 shadow-premium">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base flex items-center gap-2">
            <Truck className="w-4 h-4" /> Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.shipping_method_name && (
            <p className="font-sans text-sm">
              <span className="text-muted-foreground">Método:</span> {order.shipping_method_name}
              {order.shipping_days ? ` • ${order.shipping_days} dias úteis` : ""}
            </p>
          )}
          {order.tracking_code ? (
            <>
              <div className="p-3 rounded-xl bg-muted/50 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-sans text-xs text-muted-foreground">Código de rastreio</p>
                  <p className="font-sans text-sm font-bold font-mono truncate">{order.tracking_code}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={copyTracking} className="rounded-lg">
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              {order.tracking_url && (
                <Button variant="outline" size="sm" className="rounded-xl font-sans gap-2 w-full" asChild>
                  <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Rastrear Pedido
                  </a>
                </Button>
              )}
            </>
          ) : (
            <div className="p-4 rounded-xl bg-muted/30 text-center">
              <Package className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="font-sans text-sm font-medium text-muted-foreground">Aguardando postagem</p>
              <p className="font-sans text-xs text-muted-foreground/60 mt-1">O código de rastreio será disponibilizado assim que o pedido for enviado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {events.length > 0 && (
        <Card className="border-0 shadow-premium">
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base">Histórico do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map((evt: any, i: number) => (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative flex gap-4"
                  >
                    <div className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 ${
                      i === 0 ? "bg-accent text-accent-foreground" : "bg-muted border border-border"
                    }`}>
                      {i === 0 ? <Truck className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className={`font-sans text-sm font-semibold ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {evt.description || evt.status}
                      </p>
                      {evt.location && (
                        <p className="font-sans text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {evt.location}
                        </p>
                      )}
                      <p className="font-sans text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(evt.event_date).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-premium">
          <CardHeader><CardTitle className="font-display text-base">Dados do Cliente</CardTitle></CardHeader>
          <CardContent className="font-sans text-sm space-y-1">
            <p><strong>Nome:</strong> {order.customer_name}</p>
            <p><strong>Email:</strong> {order.customer_email}</p>
            <p><strong>Telefone:</strong> {order.customer_phone}</p>
          </CardContent>
        </Card>

        {addr && (
          <Card className="border-0 shadow-premium">
            <CardHeader><CardTitle className="font-display text-base">Endereço de Entrega</CardTitle></CardHeader>
            <CardContent className="font-sans text-sm space-y-1">
              <p>{addr.street}, {addr.number} {addr.complement && `- ${addr.complement}`}</p>
              <p>{addr.neighborhood} - {addr.city}/{addr.state}</p>
              <p>CEP: {addr.zip_code}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card className="border-0 shadow-premium">
        <CardHeader><CardTitle className="font-display text-base">Itens do Pedido</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {items.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="font-sans text-sm font-medium">{item.product_name}</p>
                  {item.variants_detail_json && Array.isArray(item.variants_detail_json) ? (
                    <div className="space-y-0.5 mt-1">
                      {(item.variants_detail_json as any[]).map((vd: any, idx: number) => {
                        const colorHex = vd.color_hex || getMetalColor(vd.name);
                        return (
                          <p key={idx} className="font-sans text-xs text-muted-foreground flex items-center gap-1.5">
                            {vd.group}:
                            {colorHex && (
                              <span
                                className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                                style={{ backgroundColor: colorHex }}
                              />
                            )}
                            <span className="text-foreground">{vd.name}</span>
                            {vd.price != null && <span className="ml-1 text-accent">R$ {Number(vd.price).toFixed(2).replace('.', ',')}</span>}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    item.variant_name && <p className="font-sans text-xs text-muted-foreground">{item.variant_name}</p>
                  )}
                  <p className="font-sans text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity} × R$ {Number(item.unit_price).toFixed(2)}</p>
                </div>
                <span className="font-sans text-sm font-bold">R$ {Number(item.total_price).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t space-y-1 font-sans text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>R$ {Number(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>R$ {Number(order.shipping_cost || order.shipping_price || 0).toFixed(2)}</span></div>
            {Number(order.discount) > 0 && <div className="flex justify-between text-success"><span>Desconto</span><span>-R$ {Number(order.discount).toFixed(2)}</span></div>}
            <div className="flex justify-between font-bold text-base pt-2"><span>Total</span><span>R$ {Number(order.total).toFixed(2)}</span></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
