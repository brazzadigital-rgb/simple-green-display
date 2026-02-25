import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { exportToCsv, formatBRL } from "@/lib/exportCsv";
import {
  ShoppingCart, Eye, Filter, Search, Download, Copy, Check,
  Truck, CreditCard, Clock, QrCode, Banknote, Wallet
} from "lucide-react";
import { motion } from "framer-motion";

interface Order {
  id: string;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_provider: string | null;
  shipment_status: string | null;
  tracking_code: string | null;
  subtotal: number;
  shipping_cost: number;
  discount: number;
  total: number;
  created_at: string;
  seller_id: string | null;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "admin-status-warning" },
  confirmed: { label: "Confirmado", cls: "admin-status-info" },
  processing: { label: "Em Separação", cls: "admin-status-warning" },
  shipped: { label: "Enviado", cls: "admin-status-info" },
  delivered: { label: "Entregue", cls: "admin-status-success" },
  cancelled: { label: "Cancelado", cls: "admin-status-danger" },
  completed: { label: "Concluído", cls: "admin-status-success" },
};

const PAYMENT_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendente", cls: "admin-status-warning" },
  paid: { label: "Pago", cls: "admin-status-success" },
  failed: { label: "Falhou", cls: "admin-status-danger" },
  refunded: { label: "Reembolsado", cls: "admin-status-info" },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Order[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const filteredOrders = useMemo(() => {
    let result = orders;
    if (filterStatus !== "all") result = result.filter(o => o.status === filterStatus);
    if (filterPayment !== "all") result = result.filter(o => o.payment_status === filterPayment);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.customer_name?.toLowerCase().includes(q) ||
        o.customer_email?.toLowerCase().includes(q) ||
        o.tracking_code?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [orders, filterStatus, filterPayment, search]);

  const copyTracking = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast({ title: "Código copiado!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCsv = () => {
    const rows = filteredOrders.map(o => ({
      Pedido: o.order_number, Cliente: o.customer_name || "", Email: o.customer_email || "",
      Status: STATUS_LABELS[o.status]?.label || o.status, Pagamento: PAYMENT_LABELS[o.payment_status]?.label || o.payment_status,
      Total: Number(o.total).toFixed(2), Data: new Date(o.created_at).toLocaleDateString("pt-BR"),
    }));
    exportToCsv("pedidos", rows);
    toast({ title: "CSV exportado!" });
  };

  const PaymentIcon = ({ method }: { method: string | null }) => {
    if (method === "pix") return <QrCode className="w-3 h-3" />;
    if (method === "boleto") return <Banknote className="w-3 h-3" />;
    if (method === "credit_card" || method === "cartão") return <CreditCard className="w-3 h-3" />;
    return <Wallet className="w-3 h-3" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display">Pedidos</h1>
          <p className="text-sm mt-1 text-slate-400">{filteredOrders.length} pedido(s) encontrados</p>
        </div>
        <button onClick={handleExportCsv} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 rounded-xl flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all shadow-sm">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="admin-card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              className="admin-input pl-9" 
              placeholder="Buscar pedido, cliente, email, rastreio..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-10 w-full sm:w-[160px] rounded-xl border-0 bg-slate-50 text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/20">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="h-10 w-full sm:w-[150px] rounded-xl border-0 bg-slate-50 text-slate-600 text-sm focus:ring-2 focus:ring-emerald-500/20">
              <CreditCard className="w-3.5 h-3.5 mr-1.5 text-slate-400" /><SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Pagamento</SelectItem>
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="admin-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingCart className="w-12 h-12 mb-4 text-slate-200" />
            <p className="text-base font-medium text-slate-600">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100">
                    {["Pedido", "Data", "Cliente", "Total", "Pagamento", "Rastreio", "Status", ""].map(h => (
                      <TableHead key={h} className={`admin-table-th ${h === "Total" || h === "" ? "text-right" : ""}`}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                    const pt = PAYMENT_LABELS[order.payment_status] || PAYMENT_LABELS.pending;
                    return (
                      <TableRow key={order.id} className="transition-colors hover:bg-slate-50 border-b border-slate-50">
                        <TableCell className="text-sm font-semibold py-3.5 text-slate-700">#{order.order_number}</TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm text-slate-600">
                            {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <p className="text-sm font-medium text-slate-700 truncate max-w-[160px]">{order.customer_name || "—"}</p>
                          <p className="text-[11px] truncate max-w-[160px] text-slate-400">{order.customer_email || ""}</p>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-right py-3.5 text-slate-700">{formatBRL(Number(order.total))}</TableCell>
                        <TableCell className="py-3.5">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`admin-status-pill ${pt.cls}`}>{pt.label}</span>
                            {order.payment_method && (
                              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                                <PaymentIcon method={order.payment_method} /> {order.payment_method}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          {order.tracking_code ? (
                            <button onClick={() => copyTracking(order.tracking_code!, order.id)} className="inline-flex items-center gap-1.5 text-xs font-mono hover:text-emerald-600 transition-colors text-slate-500">
                              {copiedId === order.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              {order.tracking_code.slice(0, 13)}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3.5">
                          <span className={`admin-status-pill ${st.cls}`}>{st.label}</span>
                        </TableCell>
                        <TableCell className="text-right py-3.5">
                          <Link to={`/admin/pedidos/${order.id}`} className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
                            <Eye className="w-4 h-4" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredOrders.map(order => {
                const st = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
                const pt = PAYMENT_LABELS[order.payment_status] || PAYMENT_LABELS.pending;
                return (
                  <Link key={order.id} to={`/admin/pedidos/${order.id}`} className="block p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-slate-700">#{order.order_number}</span>
                      <span className="text-[11px] text-slate-400">{new Date(order.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm truncate max-w-[180px] text-slate-600">{order.customer_name || "—"}</p>
                      <span className="text-sm font-semibold text-slate-800">{formatBRL(Number(order.total))}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`admin-status-pill ${st.cls}`}>{st.label}</span>
                      <span className={`admin-status-pill ${pt.cls}`}>{pt.label}</span>
                      {order.tracking_code && (
                        <span className="admin-status-pill admin-status-info">
                          <Truck className="w-3 h-3 mr-1" /> Rastreio
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}