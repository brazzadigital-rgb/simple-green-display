import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Save } from "lucide-react";

export default function ProfileData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) setForm({ full_name: data.full_name || "", phone: data.phone || "" });
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update(form).eq("user_id", user.id);
    toast({ title: "Dados atualizados!" });
    setSaving(false);
  };

  if (loading) return <Skeleton className="h-48 w-full rounded-xl" />;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Meus Dados</h2>
      <Card className="border-0 shadow-premium">
        <CardContent className="p-6 space-y-4">
          <div className="grid gap-2">
            <Label className="font-sans text-sm">Email</Label>
            <Input value={user?.email || ""} disabled className="h-11 rounded-xl bg-muted" />
          </div>
          <div className="grid gap-2">
            <Label className="font-sans text-sm">Nome completo</Label>
            <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="h-11 rounded-xl" />
          </div>
          <div className="grid gap-2">
            <Label className="font-sans text-sm">Telefone</Label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="h-11 rounded-xl" placeholder="(11) 99999-9999" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-xl font-sans gap-2">
            <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
