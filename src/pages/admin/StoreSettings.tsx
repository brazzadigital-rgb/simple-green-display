import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { useIsDemo } from "@/hooks/useIsDemo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, Settings, Flame, CreditCard, Package, MessageCircle, Phone, Truck, Store, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SettingsMap {
  [key: string]: string;
}

const settingsGroups = [
  {
    id: "geral",
    title: "Geral",
    icon: Settings,
    description: "Nome, recursos e funcionalidades básicas",
    settings: [
      { key: "store_name", label: "Nome da Loja", type: "text" },
      { key: "topbar_enabled", label: "Ativar TopBar", type: "toggle" },
      { key: "topbar_text", label: "Texto da TopBar", type: "text" },
      { key: "newsletter_enabled", label: "Ativar Newsletter", type: "toggle" },
      { key: "drawer_cart_enabled", label: "Ativar Drawer Cart", type: "toggle" },
      { key: "wishlist_enabled", label: "Ativar Wishlist", type: "toggle" },
      { key: "reviews_enabled", label: "Ativar Reviews", type: "toggle" },
      { key: "sold_count_enabled", label: "Mostrar 'X vendidos'", type: "toggle" },
      { key: "verified_badge_enabled", label: "Selo Verificado", type: "toggle" },
      { key: "sku_enabled", label: "Mostrar SKU", type: "toggle" },
    ],
  },
  {
    id: "promocoes",
    title: "Promoções",
    icon: Flame,
    description: "Black Friday, Natal e queima de estoque",
    settings: [
      { key: "black_friday_enabled", label: "Ativar Black Friday", type: "toggle" },
      { key: "black_friday_text", label: "Texto Black Friday", type: "text" },
      { key: "clearance_enabled", label: "Ativar Queima de Estoque", type: "toggle" },
      { key: "christmas_enabled", label: "Ativar Promoção de Natal", type: "toggle" },
    ],
  },
  {
    id: "pagamento",
    title: "Pagamento",
    icon: CreditCard,
    description: "Pix, parcelamento e bandeiras",
    settings: [
      { key: "pix_enabled", label: "Ativar Pix", type: "toggle" },
      { key: "pix_discount_percent", label: "Desconto Pix (%)", type: "number" },
      { key: "installments_enabled", label: "Ativar Parcelamento", type: "toggle" },
      { key: "max_installments", label: "Máx. Parcelas", type: "number" },
      { key: "payment_badges_enabled", label: "Mostrar Bandeiras", type: "toggle" },
    ],
  },
  {
    id: "estoque",
    title: "Estoque & Urgência",
    icon: Package,
    description: "Avisos de estoque e urgência",
    settings: [
      { key: "stock_warning_enabled", label: "Aviso 'Apenas X restantes'", type: "toggle" },
      { key: "stock_warning_threshold", label: "Limite para aviso", type: "number" },
      { key: "stock_status_enabled", label: "Mostrar 'Disponível em estoque'", type: "toggle" },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp",
    icon: MessageCircle,
    description: "Botão e mensagem padrão",
    settings: [
      { key: "whatsapp_enabled", label: "Botão WhatsApp no produto", type: "toggle" },
      { key: "whatsapp_number", label: "Número WhatsApp", type: "text" },
      { key: "whatsapp_message", label: "Mensagem padrão", type: "text" },
    ],
  },
  {
    id: "contato",
    title: "Contato",
    icon: Phone,
    description: "Dados da empresa e redes sociais",
    settings: [
      { key: "contact_cnpj", label: "CNPJ da Empresa", type: "text" },
      { key: "contact_email", label: "E-mail de contato", type: "text" },
      { key: "contact_phone", label: "Telefone", type: "text" },
      { key: "contact_address", label: "Endereço", type: "text" },
      { key: "contact_hours_weekday", label: "Horário Seg-Sex", type: "text" },
      { key: "contact_hours_saturday", label: "Horário Sábado", type: "text" },
      { key: "contact_hours_sunday", label: "Horário Dom/Feriado", type: "text" },
      { key: "contact_instagram", label: "Link Instagram", type: "text" },
      { key: "contact_facebook", label: "Link Facebook", type: "text" },
    ],
  },
  {
    id: "frete",
    title: "Frete",
    icon: Truck,
    description: "Frete grátis e prazos",
    settings: [
      { key: "shipping_enabled", label: "Bloco Frete no produto", type: "toggle" },
      { key: "free_shipping_min_value", label: "Frete grátis acima de (R$)", type: "number" },
      { key: "free_shipping_text", label: "Texto frete grátis", type: "text" },
      { key: "shipping_default_days", label: "Prazo padrão (dias)", type: "number" },
    ],
  },
  {
    id: "vendido-por",
    title: "Vendido por",
    icon: Store,
    description: "Informações do vendedor",
    settings: [
      { key: "sold_by_enabled", label: "Mostrar 'Vendido e enviado por'", type: "toggle" },
      { key: "sold_by_name", label: "Nome do vendedor", type: "text" },
    ],
  },
  {
    id: "demo",
    title: "Modo Demo",
    icon: Monitor,
    description: "Ative o modo demonstração para compradores testarem o painel",
    settings: [
      { key: "demo_enabled", label: "Ativar Modo Demo", type: "toggle" },
      { key: "demo_email", label: "Email do Demo", type: "text" },
      { key: "demo_password", label: "Senha do Demo", type: "text" },
    ],
  },
];

// Build default values from all settings groups
const STORE_DEFAULTS: SettingsMap = {};
settingsGroups.forEach(group => {
  group.settings.forEach(s => {
    STORE_DEFAULTS[s.key] = s.type === "toggle" ? "false" : "";
  });
});

export default function StoreSettings() {
  const { blockIfDemo } = useIsDemo();
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("geral");

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("key, value");
      const map: SettingsMap = { ...STORE_DEFAULTS };
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const queryClient = useQueryClient();

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    const promises = Object.entries(settings).map(([key, value]) =>
      supabase.from("store_settings").upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    toast({ title: "Configurações salvas!" });
    setSaving(false);
  };

  const activeGroup = settingsGroups.find(g => g.id === activeTab)!;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Configurações da Loja</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Controle todos os recursos da loja</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar navigation */}
        <nav className="lg:w-56 shrink-0">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {settingsGroups.map((group) => {
              const Icon = group.icon;
              const isActive = activeTab === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveTab(group.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all text-left",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md font-medium"
                      : "hover:bg-muted/50 font-normal"
                  )}
                  style={!isActive ? { color: `hsl(var(--admin-text-secondary))` } : {}}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{group.title}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="admin-card flex-1 min-w-0 p-5 sm:p-6"
        >
          <div className="mb-5">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <activeGroup.icon className="w-5 h-5 text-primary" />
              {activeGroup.title}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: `hsl(var(--admin-text-secondary))` }}>{activeGroup.description}</p>
          </div>

          <div className="divide-y" style={{ borderColor: `hsl(var(--admin-border-subtle))` }}>
            {activeGroup.settings.map((s) => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 py-4 first:pt-0 last:pb-0">
                <Label className="text-sm">{s.label}</Label>
                {s.type === "toggle" ? (
                  <PremiumToggle3D
                    size="sm"
                    checked={settings[s.key] === "true"}
                    onCheckedChange={(v) => updateSetting(s.key, v ? "true" : "false")}
                  />
                ) : (
                  <Input
                    type={s.type === "number" ? "number" : "text"}
                    value={settings[s.key] || ""}
                    onChange={(e) => updateSetting(s.key, e.target.value)}
                    className="h-10 rounded-xl w-full sm:max-w-xs border-0 bg-muted/30"
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
