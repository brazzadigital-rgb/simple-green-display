import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useFinancialFilters } from "@/hooks/useFinancialFilters";
import { PeriodFilter } from "@/components/admin/financial/PeriodFilter";
import { KpiCard } from "@/components/admin/financial/KpiCard";
import { formatBRL } from "@/lib/exportCsv";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Plus, Trash2 } from "lucide-react";
import { useIsDemo } from "@/hooks/useIsDemo";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { format, eachDayOfInterval } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function FinancialCashflow() {
  const { blockIfDemo } = useIsDemo();
  const filters = useFinancialFilters("30d");
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ entry_type: "expense", category: "outros", description: "", amount: "", entry_date: format(new Date(), "yyyy-MM-dd"), notes: "" });

  const fetchData = async () => {
    const { from, to } = filters.dateRange;
    const { data } = await supabase.from("cashflow_entries").select("*").gte("entry_date", from.split("T")[0]).lte("entry_date", to.split("T")[0]).order("entry_date", { ascending: false });
    setEntries(data || []);
  };

  useEffect(() => { fetchData(); }, [filters.dateRange]);

  const totalIncome = entries.filter(e => e.entry_type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = entries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const balance = totalIncome - totalExpense;

  const chartData = (() => {
    const { fromDate, toDate } = filters.dateRange;
    const days = eachDayOfInterval({ start: fromDate, end: toDate });
    return days.map(d => {
      const key = format(d, "yyyy-MM-dd");
      const dayEntries = entries.filter(e => e.entry_date === key);
      return {
        date: format(d, "dd/MM"),
        entradas: dayEntries.filter(e => e.entry_type === "income").reduce((s, e) => s + Number(e.amount), 0),
        saidas: dayEntries.filter(e => e.entry_type === "expense").reduce((s, e) => s + Number(e.amount), 0),
      };
    });
  })();

  const handleCreate = async () => {
    if (blockIfDemo()) return;
    if (!form.description || !form.amount) {
      toast({ title: "Preencha descrição e valor", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("cashflow_entries").insert({
      entry_type: form.entry_type, category: form.category, description: form.description,
      amount: Number(form.amount), entry_date: form.entry_date, notes: form.notes, is_automatic: false,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lançamento criado", variant: "default" });
      setOpen(false);
      setForm({ entry_type: "expense", category: "outros", description: "", amount: "", entry_date: format(new Date(), "yyyy-MM-dd"), notes: "" });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (blockIfDemo()) return;
    await supabase.from("cashflow_entries").delete().eq("id", id);
    toast({ title: "Lançamento removido" });
    fetchData();
  };

  const categories = ["vendas", "marketing", "embalagem", "fornecedores", "reembolsos", "taxas", "folha", "aluguel", "outros"];

  const inputClass = "rounded-xl border-0 bg-muted/30";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Fluxo de Caixa</h1>
          <p className="text-muted-foreground text-sm">Entradas, saídas e saldo</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter {...filters} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl"><Plus className="w-4 h-4 mr-1" />Lançamento</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle className="font-display">Novo Lançamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</Label>
                  <Select value={form.entry_type} onValueChange={v => setForm({ ...form, entry_type: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                  <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                  <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</Label>
                  <Input type="date" value={form.entry_date} onChange={e => setForm({ ...form, entry_date: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="rounded-xl border-0 bg-muted/30" />
                </div>
                <Button className="w-full rounded-xl" onClick={handleCreate}>Salvar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <KpiCard title="Entradas" value={formatBRL(totalIncome)} icon={ArrowUpCircle} color="text-emerald-600" index={0} />
        <KpiCard title="Saídas" value={formatBRL(totalExpense)} icon={ArrowDownCircle} color="text-destructive" index={1} />
        <KpiCard title="Saldo" value={formatBRL(balance)} icon={Wallet} color={balance >= 0 ? "text-emerald-600" : "text-destructive"} index={2} />
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card">
          <CardHeader><CardTitle className="font-display text-lg">Entradas vs Saídas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} />
                  <Legend />
                  <Bar dataKey="entradas" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="admin-card">
          <CardHeader><CardTitle className="font-display text-lg">Lançamentos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Data</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Tipo</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Categoria</th>
                    <th className="text-left p-3 font-sans font-medium text-muted-foreground">Descrição</th>
                    <th className="text-right p-3 font-sans font-medium text-muted-foreground">Valor</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id} className="border-b hover:bg-muted/10">
                      <td className="p-3">{format(new Date(e.entry_date), "dd/MM/yy")}</td>
                      <td className="p-3">
                        <span className={`admin-status-pill ${e.entry_type === "income" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {e.entry_type === "income" ? "Entrada" : "Saída"}
                        </span>
                      </td>
                      <td className="p-3 capitalize">{e.category}</td>
                      <td className="p-3">{e.description}</td>
                      <td className={`p-3 text-right font-semibold ${e.entry_type === "income" ? "text-emerald-600" : "text-destructive"}`}>
                        {e.entry_type === "income" ? "+" : "-"}{formatBRL(Number(e.amount))}
                      </td>
                      <td className="p-3">
                        {!e.is_automatic && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)} className="text-destructive/50 hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum lançamento no período</td></tr>
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
