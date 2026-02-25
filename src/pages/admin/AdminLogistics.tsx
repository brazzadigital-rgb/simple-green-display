import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsDemo } from "@/hooks/useIsDemo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Save, Truck, MapPin, Package, Settings } from "lucide-react";
import { motion } from "framer-motion";

interface SettingsMap { [key: string]: string; }

const MELHOR_ENVIO_KEYS = [
  "melhor_envio_enabled", "melhor_envio_environment",
  "melhor_envio_access_token", "melhor_envio_refresh_token",
  "shipping_margin", "shipping_margin_type",
  "free_shipping_min_value", "extra_prep_days",
  "flat_shipping_rate", "shipping_default_days",
];

const ORIGIN_KEYS = [
  "origin_cep", "origin_name", "origin_phone",
  "origin_address", "origin_number", "origin_complement",
  "origin_district", "origin_city", "origin_state",
];

const DEFAULT_KEYS = [
  "default_shipping_weight", "default_shipping_width",
  "default_shipping_height", "default_shipping_length",
];

const ALL_KEYS = [...MELHOR_ENVIO_KEYS, ...ORIGIN_KEYS, ...DEFAULT_KEYS];

export default function AdminLogistics() {
  const { blockIfDemo } = useIsDemo();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("key, value").in("key", ALL_KEYS);
      const map: SettingsMap = {};
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    const upserts = Object.entries(settings).map(([key, value]) => ({
      key, value: value || "", updated_at: new Date().toISOString(),
    }));
    for (const item of upserts) {
      const { data: existing } = await supabase.from("store_settings").select("id").eq("key", item.key).maybeSingle();
      if (existing) {
        await supabase.from("store_settings").update({ value: item.value }).eq("key", item.key);
      } else {
        await supabase.from("store_settings").insert(item);
      }
    }
    toast({ title: "Configurações de logística salvas!" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  const Field = ({ k, label, type = "text", placeholder }: { k: string; label: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <Input
        type={type}
        value={settings[k] || ""}
        onChange={(e) => update(k, e.target.value)}
        placeholder={placeholder}
        className="rounded-xl h-10 border-0 bg-muted/30"
      />
    </div>
  );

  const Toggle = ({ k, label }: { k: string; label: string }) => (
    <div className="flex items-center justify-between gap-4 py-1">
      <Label className="text-sm flex-1">{label}</Label>
      <PremiumToggle3D size="sm" checked={settings[k] === "true"} onCheckedChange={(v) => update(k, v ? "true" : "false")} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Truck className="w-6 h-6 text-primary" /> Logística
          </h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Frete, rastreamento e configurações de envio</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <Tabs defaultValue="melhor-envio" className="w-full">
        <TabsList className="admin-card p-1 mb-4 h-auto gap-1 bg-muted/50">
          <TabsTrigger value="melhor-envio" className="rounded-lg text-sm gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4" /> Melhor Envio
          </TabsTrigger>
          <TabsTrigger value="origin" className="rounded-lg text-sm gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <MapPin className="w-4 h-4" /> Origem
          </TabsTrigger>
          <TabsTrigger value="defaults" className="rounded-lg text-sm gap-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            <Package className="w-4 h-4" /> Padrões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="melhor-envio">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="admin-card">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg">Integração Melhor Envio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Toggle k="melhor_envio_enabled" label="Ativar integração Melhor Envio" />
                <div className="space-y-1.5">
                  <Label className="text-sm">Ambiente</Label>
                  <Select value={settings["melhor_envio_environment"] || "sandbox"} onValueChange={(v) => update("melhor_envio_environment", v)}>
                    <SelectTrigger className="rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox (teste)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field k="melhor_envio_access_token" label="Access Token" placeholder="Cole o token aqui" />
                <Field k="melhor_envio_refresh_token" label="Refresh Token (opcional)" placeholder="Refresh token" />
                <div className="border-t border-border/50 pt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Regras de frete</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field k="shipping_margin" label="Margem de frete" type="number" placeholder="0" />
                    <div className="space-y-1.5">
                      <Label className="text-sm">Tipo da margem</Label>
                      <Select value={settings["shipping_margin_type"] || "fixed"} onValueChange={(v) => update("shipping_margin_type", v)}>
                        <SelectTrigger className="rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">R$ (fixo)</SelectItem>
                          <SelectItem value="percentage">% (percentual)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Field k="free_shipping_min_value" label="Frete grátis acima de (R$)" type="number" placeholder="199" />
                  <Field k="extra_prep_days" label="Prazo extra de preparo (dias)" type="number" placeholder="1" />
                </div>
                <div className="border-t border-border/50 pt-4 space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground">Fallback (sem Melhor Envio)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field k="flat_shipping_rate" label="Frete fixo (R$)" type="number" placeholder="15" />
                    <Field k="shipping_default_days" label="Prazo padrão (dias)" type="number" placeholder="7" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="origin">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="admin-card">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg">Endereço de Origem</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field k="origin_cep" label="CEP de origem" placeholder="00000-000" />
                  <Field k="origin_name" label="Nome do remetente" placeholder="Minha Loja" />
                  <Field k="origin_phone" label="Telefone" placeholder="(11) 99999-9999" />
                  <Field k="origin_address" label="Endereço" placeholder="Rua, Avenida..." />
                  <Field k="origin_number" label="Número" placeholder="123" />
                  <Field k="origin_complement" label="Complemento" placeholder="Sala 1" />
                  <Field k="origin_district" label="Bairro" placeholder="Centro" />
                  <Field k="origin_city" label="Cidade" placeholder="São Paulo" />
                  <Field k="origin_state" label="Estado" placeholder="SP" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="defaults">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="admin-card">
              <CardHeader className="pb-4">
                <CardTitle className="font-display text-lg">Dimensões Padrão do Produto</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Usado quando o produto não tem dimensões cadastradas.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field k="default_shipping_weight" label="Peso padrão (kg)" type="number" placeholder="0.3" />
                  <Field k="default_shipping_width" label="Largura padrão (cm)" type="number" placeholder="11" />
                  <Field k="default_shipping_height" label="Altura padrão (cm)" type="number" placeholder="2" />
                  <Field k="default_shipping_length" label="Comprimento padrão (cm)" type="number" placeholder="16" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
