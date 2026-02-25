import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Save, Settings } from "lucide-react";
import { useIsDemo } from "@/hooks/useIsDemo";
import { motion } from "framer-motion";

interface FinSettings {
  currency: string; pix_fee_percent: string; pix_fee_fixed: string;
  card_fee_percent: string; card_fee_fixed: string; default_packaging_cost: string;
  default_shipping_cost: string; target_margin: string; default_period: string;
}

const defaultSettings: FinSettings = {
  currency: "BRL", pix_fee_percent: "0", pix_fee_fixed: "0",
  card_fee_percent: "3.99", card_fee_fixed: "0.39", default_packaging_cost: "0",
  default_shipping_cost: "0", target_margin: "40", default_period: "30",
};

const fields: { key: keyof FinSettings; label: string; type?: string }[] = [
  { key: "currency", label: "Moeda padrão" },
  { key: "pix_fee_percent", label: "Taxa Pix (%)", type: "number" },
  { key: "pix_fee_fixed", label: "Taxa Pix fixa (R$)", type: "number" },
  { key: "card_fee_percent", label: "Taxa Cartão (%)", type: "number" },
  { key: "card_fee_fixed", label: "Taxa Cartão fixa (R$)", type: "number" },
  { key: "default_packaging_cost", label: "Custo embalagem padrão (R$)", type: "number" },
  { key: "default_shipping_cost", label: "Custo frete padrão (R$)", type: "number" },
  { key: "target_margin", label: "Margem alvo (%)", type: "number" },
  { key: "default_period", label: "Período padrão de filtros (dias)", type: "number" },
];

export default function FinancialSettingsPage() {
  const { blockIfDemo } = useIsDemo();
  const { toast } = useToast();
  const [settings, setSettings] = useState<FinSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("*").like("key", "fin_%");
      if (data) {
        const loaded = { ...defaultSettings };
        data.forEach(s => {
          const k = s.key.replace("fin_", "") as keyof FinSettings;
          if (k in loaded) (loaded as any)[k] = s.value;
        });
        setSettings(loaded);
      }
    };
    fetch();
  }, []);

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    for (const [key, value] of Object.entries(settings)) {
      const dbKey = `fin_${key}`;
      const { data: existing } = await supabase.from("store_settings").select("id").eq("key", dbKey).single();
      if (existing) {
        await supabase.from("store_settings").update({ value }).eq("key", dbKey);
      } else {
        await supabase.from("store_settings").insert({ key: dbKey, value });
      }
    }
    setSaving(false);
    toast({ title: "Configurações salvas", variant: "default" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold flex items-center gap-3">
          <Settings className="w-6 h-6 text-accent" /> Configurações Financeiras
        </h1>
        <p className="text-muted-foreground text-sm">Taxas, custos padrão e preferências</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="admin-card max-w-2xl">
          <CardContent className="p-6 space-y-5">
            {fields.map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-sm font-medium">{f.label}</Label>
                <Input
                  type={f.type || "text"}
                  value={settings[f.key]}
                  onChange={e => setSettings({ ...settings, [f.key]: e.target.value })}
                  className="max-w-xs rounded-xl border-0 bg-muted/30"
                />
              </div>
            ))}
            <Button onClick={handleSave} disabled={saving} className="mt-4 rounded-xl gap-2">
              <Save className="w-4 h-4" />{saving ? "Salvando…" : "Salvar Configurações"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
