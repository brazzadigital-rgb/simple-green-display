import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCepLookup } from "@/hooks/useCepLookup";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Address {
  id: string;
  label: string;
  recipient_name: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zip_code: string;
  is_default: boolean;
}

const emptyAddr = { label: "Casa", recipient_name: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "", zip_code: "", is_default: false };

export default function Addresses() {
  const { user } = useAuth();
  const { lookup: lookupCep, loading: cepLoading } = useCepLookup();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyAddr);

  const fetch = async () => {
    if (!user) return;
    const { data } = await supabase.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setAddresses((data as Address[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user]);

  const handleSave = async () => {
    if (!user || !form.recipient_name || !form.street) { toast({ title: "Preencha os campos obrigatórios", variant: "destructive" }); return; }
    const payload = { ...form, user_id: user.id };

    if (editingId) {
      await supabase.from("customer_addresses").update(payload).eq("id", editingId);
      toast({ title: "Endereço atualizado!" });
    } else {
      await supabase.from("customer_addresses").insert(payload);
      toast({ title: "Endereço adicionado!" });
    }
    setDialogOpen(false);
    setEditingId(null);
    setForm(emptyAddr);
    fetch();
  };

  const handleEdit = (a: Address) => {
    setEditingId(a.id);
    setForm({ label: a.label, recipient_name: a.recipient_name, street: a.street, number: a.number, complement: a.complement || "", neighborhood: a.neighborhood, city: a.city, state: a.state, zip_code: a.zip_code, is_default: a.is_default });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_addresses").delete().eq("id", id);
    toast({ title: "Endereço removido" });
    fetch();
  };

  if (loading) return <div className="space-y-4">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Endereços</h2>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) { setEditingId(null); setForm(emptyAddr); } }}>
          <DialogTrigger asChild>
            <Button className="rounded-xl font-sans gap-2" size="sm"><Plus className="w-4 h-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display">{editingId ? "Editar" : "Novo"} Endereço</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label className="font-sans text-sm">Rótulo</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} className="h-10 rounded-xl" placeholder="Casa, Trabalho..." /></div>
                <div className="grid gap-2"><Label className="font-sans text-sm">Destinatário *</Label><Input value={form.recipient_name} onChange={e => setForm({ ...form, recipient_name: e.target.value })} className="h-10 rounded-xl" /></div>
              </div>
              <div className="grid gap-2"><Label className="font-sans text-sm">CEP *</Label><div className="relative"><Input value={form.zip_code} onChange={e => setForm({ ...form, zip_code: e.target.value })} onBlur={async () => { const r = await lookupCep(form.zip_code); if (r) setForm(f => ({ ...f, ...r })); }} className="h-10 rounded-xl" />{cepLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}</div></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 grid gap-2"><Label className="font-sans text-sm">Rua *</Label><Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} className="h-10 rounded-xl" /></div>
                <div className="grid gap-2"><Label className="font-sans text-sm">Nº *</Label><Input value={form.number} onChange={e => setForm({ ...form, number: e.target.value })} className="h-10 rounded-xl" /></div>
              </div>
              <div className="grid gap-2"><Label className="font-sans text-sm">Complemento</Label><Input value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} className="h-10 rounded-xl" /></div>
              <div className="grid gap-2"><Label className="font-sans text-sm">Bairro *</Label><Input value={form.neighborhood} onChange={e => setForm({ ...form, neighborhood: e.target.value })} className="h-10 rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2"><Label className="font-sans text-sm">Cidade *</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="h-10 rounded-xl" /></div>
                <div className="grid gap-2"><Label className="font-sans text-sm">Estado *</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} className="h-10 rounded-xl" maxLength={2} /></div>
              </div>
              <Button onClick={handleSave} className="h-11 rounded-xl shine font-sans">{editingId ? "Salvar" : "Adicionar"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-16">
          <MapPin className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
          <p className="font-display text-xl mb-1">Nenhum endereço</p>
          <p className="text-muted-foreground font-sans text-sm">Adicione um endereço de entrega</p>
        </div>
      ) : (
        addresses.map(a => (
          <Card key={a.id} className="border-0 shadow-premium">
            <CardContent className="p-5 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-sans text-sm font-bold">{a.label}</span>
                  {a.is_default && <Badge variant="outline" className="text-[10px] font-sans"><Star className="w-3 h-3 mr-0.5" /> Padrão</Badge>}
                </div>
                <p className="font-sans text-sm text-muted-foreground">{a.recipient_name}</p>
                <p className="font-sans text-sm text-muted-foreground">{a.street}, {a.number} {a.complement && `- ${a.complement}`}</p>
                <p className="font-sans text-sm text-muted-foreground">{a.neighborhood} - {a.city}/{a.state} - CEP: {a.zip_code}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!a.is_default && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-warning" title="Definir como padrão" onClick={async () => {
                    if (!user) return;
                    await supabase.from("customer_addresses").update({ is_default: false } as any).eq("user_id", user.id);
                    await supabase.from("customer_addresses").update({ is_default: true } as any).eq("id", a.id);
                    toast({ title: "Endereço definido como padrão!" });
                    fetch();
                  }}><Star className="w-4 h-4" /></Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(a)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
