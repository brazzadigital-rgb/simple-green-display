import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL, exportToCsv } from "@/lib/exportCsv";
import { ArrowDownCircle, AlertTriangle, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function FinancialRefunds() {
  const filters = useFinancialFilters("30d");
  const { toast } = useToast();
  const [refunds, setRefunds] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ order_id: "", amount: "", reason: "", refund_type: "full", method: "pix", is_chargeback: false, notes: "" });

  const fetchData = async () => {
    const { from, to } = filters.dateRange;
    const { data } = await supabase.from("refunds").select("*, orders(order_number)").gte("created_at", from).lte("created_at", to).order("created_at", { ascending: false });
    setRefunds(data || []);
  };

  useEffect(() => { fetchData(); }, [filters.dateRange]);

  const totalRefunds = refunds.filter(r => !r.is_chargeback).reduce((s, r) => s + Number(r.amount), 0);
  const totalChargebacks = refunds.filter(r => r.is_chargeback).reduce((s, r) => s + Number(r.amount), 0);

  const inputClass = "rounded-xl border-0 bg-muted/30";

  const handleCreate = async () => {
    if (!form.order_id || !form.amount) {
      toast({ title: "Preencha pedido e valor", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("refunds").insert({
      order_id: form.order_id, amount: Number(form.amount), reason: form.reason,
      refund_type: form.refund_type, method: form.method, is_chargeback: form.is_chargeback, notes: form.notes,
    });
    if (error) {
      toast({ title: "Erro ao registrar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Reembolso registrado", variant: "default" });
      setOpen(false);
      setForm({ order_id: "", amount: "", reason: "", refund_type: "full", method: "pix", is_chargeback: false, notes: "" });
      fetchData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Reembolsos e Chargebacks</h1>
          <p className="text-muted-foreground text-sm">Controle de devoluções e disputas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl"><Plus className="w-4 h-4 mr-1" />Registrar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">Novo Reembolso</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID do Pedido (UUID)</Label>
                  <Input value={form.order_id} onChange={e => setForm({ ...form, order_id: e.target.value })} placeholder="cole o ID do pedido" className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                  <Select value={form.refund_type} onValueChange={v => setForm({ ...form, refund_type: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">Total</SelectItem>
                      <SelectItem value="partial">Parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Método</Label>
                  <Select value={form.method} onValueChange={v => setForm({ ...form, method: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2.5">
                  <Checkbox checked={form.is_chargeback} onCheckedChange={v => setForm({ ...form, is_chargeback: !!v })} />
                  <Label className="text-sm">É chargeback</Label>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Motivo</Label>
                  <Textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} className="rounded-xl border-0 bg-muted/30" />
                </div>
                <Button className="w-full rounded-xl" onClick={handleCreate}>Registrar</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => exportToCsv("reembolsos", refunds.map(r => ({
            Data: format(new Date(r.created_at), "dd/MM/yyyy"),
            Pedido: (r as any).orders?.order_number || r.order_id,
            Valor: Number(r.amount).toFixed(2),
            Tipo: r.refund_type, Método: r.method,
            Chargeback: r.is_chargeback ? "Sim" : "Não",
            Status: r.status, Motivo: r.reason || "",
          })))}><Download className="w-4 h-4 mr-1" />CSV</Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Reembolsos" value={formatBRL(totalRefunds)} subtitle={`${refunds.filter(r => !r.is_chargeback).length} registros`} icon={ArrowDownCircle} color="text-amber-600" index={0} />
        <KpiCard title="Chargebacks" value={formatBRL(totalChargebacks)} subtitle={`${refunds.filter(r => r.is_chargeback).length} registros`} icon={AlertTriangle} color="text-destructive" index={1} />
        <KpiCard title="Total Perdas" value={formatBRL(totalRefunds + totalChargebacks)} icon={ArrowDownCircle} color="text-destructive" index={2} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Pedido</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Valor</th>
                    <th className="text-center p-3 font-sans font-medium text-muted-foreground">Tipo</th>
                    <th className="text-center p-3 font-sans font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map(r => (
                    <tr key={r.id} className="border-b hover:bg-muted/10">
                      <td className="p-3">{format(new Date(r.created_at), "dd/MM/yy")}</td>
                      <td className="p-3 font-mono text-xs">#{(r as any).orders?.order_number || "-"}</td>
                      <td className="p-3 text-right font-semibold text-destructive">{formatBRL(Number(r.amount))}</td>
                      <td className="p-3 text-center">
                        <span className={`admin-status-pill ${r.is_chargeback ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {r.is_chargeback ? "Chargeback" : r.refund_type}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`admin-status-pill ${r.status === "paid" ? "bg-emerald-100 text-emerald-700" : r.status === "approved" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs max-w-[200px] truncate">{r.reason || "-"}</td>
                    </tr>
                  ))}
                  {refunds.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum reembolso no período</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
