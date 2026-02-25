import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { UserCircle, Save } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerProfile() {
  const { sellerId } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", whatsapp: "", pix_key: "", instagram: "" });

  useEffect(() => {
    if (!sellerId) return;
    supabase.from("sellers").select("*").eq("id", sellerId).maybeSingle()
      .then(({ data }) => {
        setSeller(data);
        if (data) setForm({ name: (data as any).name || "", whatsapp: (data as any).whatsapp || "", pix_key: (data as any).pix_key || "", instagram: (data as any).instagram || "" });
        setLoading(false);
      });
  }, [sellerId]);

  const handleSave = async () => {
    if (!sellerId) return;
    setSaving(true);
    const { error } = await supabase.from("sellers").update({
      name: form.name,
      whatsapp: form.whatsapp,
      pix_key: form.pix_key,
      instagram: form.instagram,
    }).eq("id", sellerId);
    if (error) toast({ title: "Erro ao salvar", variant: "destructive" });
    else toast({ title: "Perfil atualizado!" });
    setSaving(false);
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-60 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Perfil</h1>
      </motion.div>

      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans font-medium flex items-center gap-2">
            <UserCircle className="w-4 h-4" /> Dados editáveis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-sans font-medium">Nome público</label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-sm font-sans font-medium">WhatsApp</label>
            <Input value={form.whatsapp} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-sm font-sans font-medium">Chave PIX</label>
            <Input value={form.pix_key} onChange={e => setForm(p => ({ ...p, pix_key: e.target.value }))} className="rounded-xl mt-1" />
          </div>
          <div>
            <label className="text-sm font-sans font-medium">Instagram</label>
            <Input value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))} className="rounded-xl mt-1" placeholder="@usuario" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl gap-2">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>

      {/* Read-only info */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans font-medium">Informações do sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm font-sans">
          <div className="flex justify-between"><span className="text-muted-foreground">E-mail</span><span>{seller?.email || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{(seller as any)?.seller_status || seller?.status || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Comissão</span><span>{seller?.commission_rate || 0}%</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Código</span><span className="font-mono">{seller?.referral_code || "—"}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
