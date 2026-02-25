import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useIsDemo } from "@/hooks/useIsDemo";
import {
  ArrowLeft, User, MapPin, Package, CreditCard, Truck, Clock,
  Copy, Check, Printer, Save, ShoppingCart, Link2
} from "lucide-react";
import { formatBRL } from "@/lib/exportCsv";
import { getMetalColor } from "@/lib/metalColors";

const ORDER_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "confirmed", label: "Confirmado" },
  { value: "processing", label: "Em Separação" },
  { value: "shipped", label: "Enviado" },
  { value: "delivered", label: "Entregue" },
  { value: "cancelled", label: "Cancelado" },
];

const PAYMENT_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "failed", label: "Falhou" },
  { value: "refunded", label: "Reembolsado" },
];

const SHIPMENT_STATUSES = [
  { value: "pending", label: "Aguardando" },
  { value: "created", label: "Criado" },
  { value: "posted", label: "Postado" },
  { value: "in_transit", label: "Em Trânsito" },
  { value: "delivered", label: "Entregue" },
];

const CARRIERS = [
  { value: "correios", label: "Correios" },
  { value: "melhor_envio", label: "Melhor Envio" },
  { value: "jadlog", label: "Jadlog" },
  { value: "outro", label: "Outro" },
];

function statusColor(status: string) {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    confirmed: "bg-primary/10 text-primary",
    processing: "bg-accent/10 text-accent",
    shipped: "bg-accent/10 text-accent",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    cancelled: "bg-destructive/10 text-destructive",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    failed: "bg-destructive/10 text-destructive",
    refunded: "bg-muted text-muted-foreground",
  };
  return map[status] || "bg-muted text-muted-foreground";
}

export default function AdminOrderDetail() {
  const { blockIfDemo } = useIsDemo();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable fields
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [shippingProvider, setShippingProvider] = useState("");
  const [shippingService, setShippingService] = useState("");
  const [notesAdmin, setNotesAdmin] = useState("");

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      const [o, i, e] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*, products:product_id(slug)").eq("order_id", id),
        supabase.from("order_events").select("*").eq("order_id", id).order("created_at", { ascending: false }),
      ]);
      if (o.data) {
        setOrder(o.data);
        setStatus(o.data.status || "pending");
        setPaymentStatus(o.data.payment_status || "pending");
        setShipmentStatus(o.data.shipment_status || "pending");
        setTrackingCode(o.data.tracking_code || "");
        setShippingProvider(o.data.shipping_provider || "");
        setShippingService(o.data.shipping_service || "");
        setNotesAdmin(o.data.notes_admin || "");
      }
      setItems(i.data || []);
      setEvents(e.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [id]);

  const addEvent = async (type: string, description: string) => {
    await supabase.from("order_events").insert({
      order_id: id!,
      event_type: type,
      description,
      created_by: user?.id || null,
    });
  };

  const handleSave = async () => {
    if (blockIfDemo()) return;
    if (!order) return;
    setSaving(true);

    const changes: string[] = [];
    const updates: any = {};

    if (status !== order.status) {
      updates.status = status;
      changes.push(`Status alterado para "${ORDER_STATUSES.find(s => s.value === status)?.label}"`);
    }
    if (paymentStatus !== order.payment_status) {
      updates.payment_status = paymentStatus;
      changes.push(`Pagamento alterado para "${PAYMENT_STATUSES.find(s => s.value === paymentStatus)?.label}"`);
      if (paymentStatus === "paid" && !order.paid_at) updates.paid_at = new Date().toISOString();
    }
    if (shipmentStatus !== (order.shipment_status || "pending")) {
      updates.shipment_status = shipmentStatus;
      changes.push(`Envio alterado para "${SHIPMENT_STATUSES.find(s => s.value === shipmentStatus)?.label}"`);
      if (shipmentStatus === "delivered" && !order.delivered_at) updates.delivered_at = new Date().toISOString();
    }
    if (trackingCode !== (order.tracking_code || "")) {
      updates.tracking_code = trackingCode || null;
      if (trackingCode) changes.push(`Código de rastreio adicionado: ${trackingCode}`);
      else changes.push("Código de rastreio removido");
    }
    if (shippingProvider !== (order.shipping_provider || "")) {
      updates.shipping_provider = shippingProvider || null;
    }
    if (shippingService !== (order.shipping_service || "")) {
      updates.shipping_service = shippingService || null;
    }
    if (notesAdmin !== (order.notes_admin || "")) {
      updates.notes_admin = notesAdmin || null;
    }

    // Auto-generate tracking URL for Correios
    if (trackingCode && shippingProvider === "correios") {
      updates.tracking_url = `https://www.linkcorreios.com.br/?id=${trackingCode}`;
    }

    // Auto-set shipment status to posted when tracking added
    if (trackingCode && !order.tracking_code && shipmentStatus === "pending") {
      updates.shipment_status = "posted";
      updates.shipped_at = new Date().toISOString();
      setShipmentStatus("posted");
      changes.push('Status de envio alterado para "Postado"');
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: "Nenhuma alteração detectada" });
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("orders").update(updates).eq("id", id!);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      // Record events
      for (const desc of changes) {
        await addEvent("status_change", desc);
      }
      toast({ title: "Pedido atualizado!" });
      // Refresh data
      const { data: refreshed } = await supabase.from("orders").select("*").eq("id", id!).maybeSingle();
      if (refreshed) setOrder(refreshed);
      const { data: evts } = await supabase.from("order_events").select("*").eq("order_id", id!).order("created_at", { ascending: false });
      setEvents(evts || []);
    }
    setSaving(false);
  };

  const copyTracking = () => {
    if (trackingCode) {
      navigator.clipboard.writeText(trackingCode);
      setCopied(true);
      toast({ title: "Código copiado!" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return <div className="space-y-4 p-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;
  if (!order) return <div className="text-center py-12"><p className="font-sans text-muted-foreground">Pedido não encontrado</p></div>;

  const addr = order.shipping_address as any;
  const billingAddr = order.billing_address as any;

  const sectionContent = [
    // A) RESUMO
    {
      id: "summary",
      title: "Resumo do Pedido",
      icon: <ShoppingCart className="w-4 h-4" />,
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="font-sans text-xs text-muted-foreground">Status do Pedido</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans text-xs text-muted-foreground">Status do Pagamento</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans text-xs text-muted-foreground">Status do Envio</Label>
              <Select value={shipmentStatus} onValueChange={setShipmentStatus}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHIPMENT_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-sans text-sm">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold">{formatBRL(Number(order.subtotal))}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Frete</p>
              <p className="font-semibold">{formatBRL(Number(order.shipping_cost || order.shipping_price || 0))}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Desconto</p>
              <p className="font-semibold text-destructive">-{formatBRL(Number(order.discount || 0))}</p>
            </div>
            <div className="bg-accent/10 rounded-xl p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-bold text-lg">{formatBRL(Number(order.total))}</p>
            </div>
          </div>
        </div>
      ),
    },
    // B) CLIENTE
    {
      id: "client",
      title: "Dados do Cliente",
      icon: <User className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-sm">
          <div><p className="text-xs text-muted-foreground">Nome</p><p className="font-medium">{order.customer_name || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{order.customer_email || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Telefone</p><p className="font-medium">{order.customer_phone || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Método de Pagamento</p><p className="font-medium">{order.payment_method || "—"}</p></div>
        </div>
      ),
    },
    // C) ENDEREÇO
    {
      id: "address",
      title: "Endereço de Entrega",
      icon: <MapPin className="w-4 h-4" />,
      content: addr ? (
        <div className="font-sans text-sm space-y-1">
          <p className="font-medium">{addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ""}</p>
          <p>{addr.neighborhood} - {addr.city}/{addr.state}</p>
          <p>CEP: {addr.zip_code}</p>
          <Button variant="ghost" size="sm" className="mt-2 rounded-lg font-sans text-xs gap-1" onClick={() => {
            const full = `${addr.street}, ${addr.number}${addr.complement ? ` - ${addr.complement}` : ""}, ${addr.neighborhood} - ${addr.city}/${addr.state} - CEP ${addr.zip_code}`;
            navigator.clipboard.writeText(full);
            toast({ title: "Endereço copiado!" });
          }}>
            <Copy className="w-3 h-3" /> Copiar endereço
          </Button>
        </div>
      ) : <p className="font-sans text-sm text-muted-foreground">Endereço não informado</p>,
    },
    // D) ITENS
    {
      id: "items",
      title: `Itens do Pedido (${items.length})`,
      icon: <Package className="w-4 h-4" />,
      content: (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-xl font-sans text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.product_name}</p>
                {item.variants_detail_json && Array.isArray(item.variants_detail_json) ? (
                  <div className="space-y-0.5 mt-1">
                     {(item.variants_detail_json as any[]).map((vd: any, idx: number) => {
                      const colorHex = vd.color_hex || getMetalColor(vd.name);
                      return (
                        <p key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {vd.group}:
                          {colorHex && (
                            <span
                              className="inline-block w-3 h-3 rounded-full border border-border shrink-0"
                              style={{ backgroundColor: colorHex }}
                            />
                          )}
                          <span className="text-foreground">{vd.name}</span>
                          {vd.price != null && <span className="ml-1 text-accent">{formatBRL(Number(vd.price))}</span>}
                        </p>
                      );
                    })}
                  </div>
                ) : (
                  item.variant_name && <p className="text-xs text-muted-foreground">{item.variant_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">Qtd: {item.quantity} × {formatBRL(Number(item.unit_price))}</p>
              </div>
              <span className="font-semibold shrink-0 ml-3">{formatBRL(Number(item.total_price))}</span>
            </div>
          ))}
        </div>
      ),
    },
    // E) PAGAMENTO
    {
      id: "payment",
      title: "Pagamento",
      icon: <CreditCard className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans text-sm">
          <div><p className="text-xs text-muted-foreground">Gateway</p><p className="font-medium">{order.payment_provider || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Método</p><p className="font-medium">{order.payment_method || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Transaction ID</p><p className="font-medium font-mono text-xs break-all">{order.transaction_id || "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Pago em</p><p className="font-medium">{order.paid_at ? new Date(order.paid_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p></div>
        </div>
      ),
    },
    // F) ENVIO / RASTREAMENTO
    {
      id: "shipping",
      title: "Envio / Rastreamento",
      icon: <Truck className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="font-sans text-xs text-muted-foreground">Transportadora</Label>
              <Select value={shippingProvider} onValueChange={setShippingProvider}>
                <SelectTrigger className="mt-1 rounded-lg"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {CARRIERS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-sans text-xs text-muted-foreground">Serviço</Label>
              <Input className="mt-1 rounded-lg" value={shippingService} onChange={e => setShippingService(e.target.value)} placeholder="PAC, SEDEX..." />
            </div>
          </div>
          <div>
            <Label className="font-sans text-xs text-muted-foreground">Código de Rastreio</Label>
            <div className="flex gap-2 mt-1">
              <Input className="rounded-lg font-mono" value={trackingCode} onChange={e => setTrackingCode(e.target.value.toUpperCase())} placeholder="Ex: BR123456789BR" />
              {trackingCode && (
                <Button variant="outline" size="icon" className="shrink-0 rounded-lg" onClick={copyTracking}>
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>
          {order.shipping_method_name && (
            <p className="font-sans text-xs text-muted-foreground">Método selecionado pelo cliente: <strong>{order.shipping_method_name}</strong>{order.shipping_days ? ` • ${order.shipping_days} dias úteis` : ""}</p>
          )}
        </div>
      ),
    },
    // G) ATRIBUIÇÃO / UTM
    {
      id: "attribution",
      title: "Atribuição / UTM",
      icon: <Link2 className="w-4 h-4" />,
      content: (() => {
        const ft = order.tracking_first_touch_json as any;
        const lt = order.tracking_last_touch_json as any;
        const hasUtm = order.utm_source || ft || lt;
        if (!hasUtm) return <p className="font-sans text-sm text-muted-foreground">Sem dados de atribuição</p>;
        return (
          <div className="space-y-4">
            {/* Quick UTM summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-sans text-sm">
              {order.utm_source && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Source</p><p className="font-medium">{order.utm_source}</p></div>}
              {order.utm_medium && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Medium</p><p className="font-medium">{order.utm_medium}</p></div>}
              {order.utm_campaign && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Campaign</p><p className="font-medium">{order.utm_campaign}</p></div>}
              {order.fbclid && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">fbclid</p><p className="font-medium font-mono text-xs truncate">{order.fbclid}</p></div>}
              {order.gclid && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">gclid</p><p className="font-medium font-mono text-xs truncate">{order.gclid}</p></div>}
              {order.landing_page && <div className="bg-muted/50 rounded-xl p-3"><p className="text-xs text-muted-foreground">Landing Page</p><p className="font-medium text-xs truncate">{order.landing_page}</p></div>}
            </div>
            {/* First/Last touch details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ft && (
                <div>
                  <p className="font-sans text-sm font-medium mb-2">First Touch</p>
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                    {Object.entries(ft).filter(([, v]) => v).map(([k, v]) => (
                      <p key={k} className="font-sans text-xs"><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
                    ))}
                  </div>
                </div>
              )}
              {lt && (
                <div>
                  <p className="font-sans text-sm font-medium mb-2">Last Touch</p>
                  <div className="bg-muted/50 rounded-xl p-3 space-y-1">
                    {Object.entries(lt).filter(([, v]) => v).map(([k, v]) => (
                      <p key={k} className="font-sans text-xs"><span className="text-muted-foreground">{k}:</span> {String(v)}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })(),
    },
    // H) NOTAS ADMIN
    {
      id: "notes",
      title: "Observações Internas",
      icon: <Clock className="w-4 h-4" />,
      content: (
        <div>
          <Textarea className="rounded-lg font-sans min-h-[80px]" placeholder="Observações internas (não visíveis para o cliente)..." value={notesAdmin} onChange={e => setNotesAdmin(e.target.value)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/pedidos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-sans transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Voltar aos pedidos
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">#{order.order_number}</h1>
            <Badge className={`${statusColor(order.status)} border-0 text-xs`}>
              {ORDER_STATUSES.find(s => s.value === order.status)?.label || order.status}
            </Badge>
            <Badge className={`${statusColor(order.payment_status)} border-0 text-xs`}>
              {PAYMENT_STATUSES.find(s => s.value === order.payment_status)?.label || order.payment_status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-sans mt-1">
            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
          <button className="admin-btn-primary gap-1" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>

      {/* Desktop: Cards grid / Mobile: Accordion */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {sectionContent.map(section => (
          <div key={section.id} className={`admin-card ${section.id === "items" || section.id === "summary" ? "md:col-span-2" : ""}`}>
            <div className="p-5 pb-3">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                {section.icon} {section.title}
              </h3>
            </div>
            <div className="px-5 pb-5">{section.content}</div>
          </div>
        ))}
      </div>

      <div className="md:hidden">
        <Accordion type="multiple" defaultValue={["summary", "shipping"]} className="space-y-2">
          {sectionContent.map(section => (
            <AccordionItem key={section.id} value={section.id} className="admin-card overflow-hidden border-0">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2">{section.icon} {section.title}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">{section.content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-4">
          <Button className="w-full rounded-xl font-sans gap-2" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </div>

      {/* H) TIMELINE */}
      <div className="admin-card">
        <div className="p-5 pb-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Timeline do Pedido
          </h3>
        </div>
        <div className="px-5 pb-5">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground font-sans">Nenhum evento registrado ainda.</p>
          ) : (
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
              <div className="space-y-4">
                {events.map((evt: any, i: number) => (
                  <div key={evt.id} className="relative flex gap-4">
                    <div className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 ${
                      i === 0 ? "bg-accent text-accent-foreground" : "bg-muted border border-border"
                    }`}>
                      {i === 0 ? <Clock className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />}
                    </div>
                    <div className="pb-1 min-w-0">
                      <p className={`font-sans text-sm font-medium ${i === 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {evt.description}
                      </p>
                      <p className="font-sans text-xs text-muted-foreground/60 mt-0.5">
                        {new Date(evt.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
