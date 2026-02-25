import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Wallet, Plus, CheckCircle, Clock, XCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerWithdrawals() {
  const { sellerId } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!sellerId) return;
    const [w, c] = await Promise.all([
      supabase.from("seller_withdrawals").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }),
      supabase.from("commissions").select("commission_amount, payment_status").eq("seller_id", sellerId),
    ]);
    setWithdrawals((w.data as any[]) || []);
    setCommissions((c.data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [sellerId]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalCommission = commissions.reduce((a, c) => a + Number(c.commission_amount), 0);
  const paidCommission = commissions.filter(c => c.payment_status === "paid").reduce((a, c) => a + Number(c.commission_amount), 0);
  const withdrawnTotal = withdrawals.filter(w => w.status === "paid").reduce((a, w) => a + Number(w.amount), 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status === "requested" || w.status === "approved").reduce((a, w) => a + Number(w.amount), 0);
  const available = totalCommission - paidCommission - withdrawnTotal - pendingWithdrawals;

  const handleSubmit = async () => {
    if (!sellerId || !amount || !pixKey) return;
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { toast({ title: "Valor inválido", variant: "destructive" }); return; }
    if (val > available) { toast({ title: "Saldo insuficiente", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("seller_withdrawals").insert({ seller_id: sellerId, amount: val, pix_key: pixKey, notes: notes || null });
    if (error) { toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Saque solicitado!" }); setOpen(false); setAmount(""); setPixKey(""); setNotes(""); load(); }
    setSubmitting(false);
  };

  const statusIcon = (s: string) => {
    if (s === "paid") return <CheckCircle className="w-3 h-3" />;
    if (s === "rejected") return <XCircle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };
  const statusLabel = (s: string) => ({ requested: "Solicitado", approved: "Aprovado", paid: "Pago", rejected: "Recusado" }[s] || s);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Saques</h1>
          <p className="text-sm text-muted-foreground font-sans mt-1">Disponível: <strong>{fmt(Math.max(available, 0))}</strong></p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl gap-2"><Plus className="w-4 h-4" /> Solicitar saque</Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader><DialogTitle className="font-display">Solicitar Saque</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-sans font-medium">Valor (R$)</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-sans font-medium">Chave PIX</label>
                <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave" className="rounded-xl mt-1" />
              </div>
              <div>
                <label className="text-sm font-sans font-medium">Observação (opcional)</label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="rounded-xl mt-1" rows={2} />
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-xl">
                {submitting ? "Enviando..." : "Solicitar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-sans font-medium">Histórico de saques</CardTitle></CardHeader>
        <CardContent className="p-0">
          {withdrawals.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Wallet className="w-10 h-10 mb-3 opacity-40" />
              <p className="text-sm font-sans">Nenhum saque solicitado</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {withdrawals.map(w => (
                <div key={w.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium font-sans">{fmt(Number(w.amount))}</p>
                    <p className="text-xs text-muted-foreground">PIX: {w.pix_key} · {new Date(w.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant={w.status === "paid" ? "default" : w.status === "rejected" ? "destructive" : "secondary"} className="text-xs gap-1">
                    {statusIcon(w.status)} {statusLabel(w.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
