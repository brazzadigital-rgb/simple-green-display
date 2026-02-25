import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsDemo } from "@/hooks/useIsDemo";
import { Card, CardContent } from "@/components/ui/card";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Save, CreditCard, Shield, Eye, EyeOff, Loader2, Settings, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GatewayConfig {
  id: string;
  provider: string;
  is_active: boolean;
  is_default: boolean;
  environment: string;
  config: any;
  sort_order: number;
}

const PROVIDER_LABELS: Record<string, string> = {
  asaas: "Asaas",
  mercadopago: "Mercado Pago",
  pagseguro: "PagSeguro",
  stripe: "Stripe",
  sicredi: "Sicredi",
};

const PROVIDER_ICONS: Record<string, string> = {
  asaas: "💳",
  mercadopago: "🟡",
  pagseguro: "🟢",
  stripe: "🟣",
  sicredi: "🏦",
};

const PROVIDER_SECRET_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  asaas: [
    { key: "api_key", label: "API Key", placeholder: "$aact_..." },
    { key: "webhook_token", label: "Webhook Token", placeholder: "Token de webhook" },
  ],
  mercadopago: [
    { key: "access_token", label: "Access Token", placeholder: "APP_USR-..." },
    { key: "public_key", label: "Public Key", placeholder: "APP_USR-..." },
    { key: "webhook_secret", label: "Webhook Secret", placeholder: "Assinatura webhook" },
  ],
  pagseguro: [
    { key: "token", label: "Token", placeholder: "Token PagSeguro" },
    { key: "email", label: "Email da conta", placeholder: "email@pagseguro.com" },
    { key: "app_key", label: "App Key (v4)", placeholder: "Chave da aplicação" },
    { key: "webhook_token", label: "Webhook Token", placeholder: "Token de webhook" },
  ],
  stripe: [
    { key: "publishable_key", label: "Publishable Key", placeholder: "pk_..." },
    { key: "secret_key", label: "Secret Key", placeholder: "sk_..." },
    { key: "webhook_signing_secret", label: "Webhook Signing Secret", placeholder: "whsec_..." },
  ],
  sicredi: [
    { key: "client_id", label: "Client ID", placeholder: "Client ID do Sicredi" },
    { key: "client_secret", label: "Client Secret", placeholder: "Client Secret" },
    { key: "chave_pix", label: "Chave PIX", placeholder: "CPF/CNPJ/email/celular/aleatória" },
    { key: "cooperativa", label: "Cooperativa", placeholder: "Ex: 0100" },
    { key: "agencia", label: "Agência", placeholder: "Ex: 0001" },
    { key: "conta", label: "Conta", placeholder: "Ex: 12345-6" },
    { key: "certificado_pem", label: "Certificado (.crt / PEM)", placeholder: "Cole o conteúdo do certificado" },
    { key: "chave_privada_pem", label: "Chave Privada (.key / PEM)", placeholder: "Cole o conteúdo da chave privada" },
    { key: "webhook_token", label: "Token de Webhook", placeholder: "Token para validação do webhook" },
  ],
};

export default function AdminPaymentSettings() {
  const { blockIfDemo } = useIsDemo();
  const [gateways, setGateways] = useState<GatewayConfig[]>([]);
  const [secrets, setSecrets] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("geral");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [configRes, secretsRes] = await Promise.all([
      supabase.from("payment_gateway_configs").select("*").order("sort_order"),
      supabase.from("payment_gateway_secrets").select("*"),
    ]);
    setGateways((configRes.data as GatewayConfig[]) || []);
    const secretMap: Record<string, Record<string, string>> = {};
    (secretsRes.data || []).forEach((s: any) => {
      if (!secretMap[s.provider]) secretMap[s.provider] = {};
      secretMap[s.provider][s.secret_key] = s.secret_value;
    });
    setSecrets(secretMap);
    setLoading(false);
  };

  const updateGateway = (provider: string, updates: Partial<GatewayConfig>) => {
    setGateways(prev => prev.map(g => g.provider === provider ? { ...g, ...updates } : g));
  };

  const updateGatewayConfig = (provider: string, key: string, value: any) => {
    setGateways(prev =>
      prev.map(g => g.provider === provider ? { ...g, config: { ...g.config, [key]: value } } : g)
    );
  };

  const updateGatewayMethod = (provider: string, method: string, enabled: boolean) => {
    setGateways(prev =>
      prev.map(g =>
        g.provider === provider
          ? { ...g, config: { ...g.config, methods: { ...g.config.methods, [method]: enabled } } }
          : g
      )
    );
  };

  const updateSecret = (provider: string, key: string, value: string) => {
    setSecrets(prev => ({ ...prev, [provider]: { ...(prev[provider] || {}), [key]: value } }));
  };

  const setDefaultGateway = (provider: string) => {
    setGateways(prev => prev.map(g => ({ ...g, is_default: g.provider === provider })));
  };

  const toggleSecretVisibility = (key: string) => {
    setVisibleSecrets(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    try {
      const configPromises = gateways.map(g =>
        supabase.from("payment_gateway_configs").update({
          is_active: g.is_active, is_default: g.is_default, environment: g.environment,
          config: g.config, sort_order: g.sort_order,
        }).eq("id", g.id)
      );
      const secretPromises: PromiseLike<any>[] = [];
      Object.entries(secrets).forEach(([provider, keys]) => {
        Object.entries(keys).forEach(([key, value]) => {
          if (value) {
            secretPromises.push(
              supabase.from("payment_gateway_secrets")
                .upsert({ provider, secret_key: key, secret_value: value }, { onConflict: "provider,secret_key" })
                .select().then(() => {})
            );
          }
        });
      });
      await Promise.all([...configPromises, ...secretPromises]);
      toast({ title: "Configurações de pagamento salvas! ✅" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-2xl" />
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
      </div>
    );
  }

  const defaultGateway = gateways.find(g => g.is_default)?.provider || "asaas";

  const navItems = [
    { id: "geral", label: "Visão Geral", icon: Settings, description: "Gateway padrão e status" },
    ...gateways.map(g => ({
      id: g.provider,
      label: PROVIDER_LABELS[g.provider],
      icon: Wallet,
      description: g.is_active ? "Ativo" : "Inativo",
      emoji: PROVIDER_ICONS[g.provider],
      isActive: g.is_active,
    })),
  ];

  const activeGateway = gateways.find(g => g.provider === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-display flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-600" /> Pagamentos
          </h1>
          <p className="text-slate-400 font-sans mt-1 text-sm">Configure os gateways de pagamento da loja</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="admin-btn-primary w-full sm:w-auto">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <nav className="lg:w-60 shrink-0">
          <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {navItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-sm font-sans whitespace-nowrap transition-all text-left w-full border",
                    isSelected
                      ? "bg-white border-emerald-200 text-slate-800 shadow-sm font-semibold"
                      : "bg-transparent border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  {"emoji" in item ? (
                    <span className="text-base shrink-0">{item.emoji}</span>
                  ) : (
                    <item.icon className="w-4 h-4 shrink-0 text-slate-400" />
                  )}
                  <span className="flex-1">{item.label}</span>
                  {"isActive" in item && (
                    <span className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      item.isActive ? "bg-emerald-500" : "bg-slate-300"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* General tab */}
          {activeTab === "geral" && (
            <div className="admin-card p-6">
              <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" /> Visão Geral
                </h2>
                <p className="text-slate-400 text-sm mt-0.5">Gateway padrão e status dos provedores</p>
              </div>

              <div className="divide-y divide-slate-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 first:pt-0">
                  <Label className="text-slate-700 font-medium">Gateway padrão</Label>
                  <Select value={defaultGateway} onValueChange={setDefaultGateway}>
                    <SelectTrigger className="w-full sm:max-w-xs admin-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gateways.filter(g => g.is_active).map(g => (
                        <SelectItem key={g.provider} value={g.provider}>
                          {PROVIDER_LABELS[g.provider]}
                        </SelectItem>
                      ))}
                      {gateways.filter(g => g.is_active).length === 0 && (
                        <SelectItem value="none" disabled>Nenhum gateway ativo</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4">
                  <Label className="text-slate-700 font-medium">Moeda</Label>
                  <Input value="BRL" disabled className="admin-input w-full sm:max-w-xs" />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 mt-2">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Status dos Gateways</h3>
                <div className="grid gap-3">
                  {gateways.map(g => (
                    <div key={g.provider} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{PROVIDER_ICONS[g.provider]}</span>
                        <span className="font-semibold text-slate-700 text-sm">{PROVIDER_LABELS[g.provider]}</span>
                        <Badge variant={g.is_active ? "default" : "secondary"} className={g.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200" : "bg-slate-200 text-slate-600 hover:bg-slate-300"}>
                          {g.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                        {g.is_default && (
                          <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Padrão</Badge>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 font-medium capitalize">{g.environment}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Provider tabs */}
          {activeGateway && (
            <>
              {/* Activation & Environment */}
              <div className="admin-card p-6">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xl">{PROVIDER_ICONS[activeGateway.provider]}</span>
                    {PROVIDER_LABELS[activeGateway.provider]}
                    {activeGateway.is_active && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 ml-2">Ativo</Badge>}
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">Ativação e ambiente</p>
                </div>

                <div className="divide-y divide-slate-50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 first:pt-0">
                    <Label className="text-slate-700 font-medium">Ativar gateway</Label>
                    <PremiumToggle3D
                      size="sm"
                      checked={activeGateway.is_active}
                      onCheckedChange={v => updateGateway(activeGateway.provider, { is_active: v })}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4">
                    <Label className="text-slate-700 font-medium">Ambiente</Label>
                    <Select
                      value={activeGateway.environment}
                      onValueChange={v => updateGateway(activeGateway.provider, { environment: v })}
                    >
                      <SelectTrigger className="w-full sm:max-w-xs admin-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">🧪 Sandbox (testes)</SelectItem>
                        <SelectItem value="production">🚀 Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Credentials */}
              <div className="admin-card p-6">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-emerald-600" /> Credenciais
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">Chaves de API e tokens de autenticação</p>
                </div>

                <div className="space-y-5">
                  {PROVIDER_SECRET_FIELDS[activeGateway.provider]?.map(field => {
                    const secretKey = `${activeGateway.provider}_${field.key}`;
                    const isVisible = visibleSecrets[secretKey];
                    return (
                      <div key={field.key} className="space-y-1.5">
                        <Label className="text-slate-700 text-sm font-medium">{field.label}</Label>
                        <div className="relative">
                          <Input
                            type={isVisible ? "text" : "password"}
                            value={secrets[activeGateway.provider]?.[field.key] || ""}
                            onChange={e => updateSecret(activeGateway.provider, field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="admin-input pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecretVisibility(secretKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 pt-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    Credenciais criptografadas e armazenadas com segurança no backend
                  </p>
                </div>
              </div>

              {/* Webhook URL for Sicredi */}
              {activeGateway.provider === "sicredi" && (
                <div className="admin-card p-6">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      🔗 Webhook
                    </h2>
                    <p className="text-slate-400 text-sm mt-0.5">Cadastre esta URL no painel do Sicredi para receber notificações de pagamento</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 text-sm font-medium">Webhook URL (somente leitura)</Label>
                    <div className="flex gap-2">
                      <Input
                        value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-sicredi`}
                        readOnly
                        className="admin-input text-xs font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 rounded-xl"
                        onClick={() => {
                          navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webhook-sicredi`);
                          toast({ title: "URL copiada! 📋" });
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Methods */}
              <div className="admin-card p-6">
                <div className="mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" /> Métodos de Pagamento
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">Selecione quais métodos este gateway processará</p>
                </div>

                <div className="divide-y divide-slate-50">
                  {["pix", "card", "boleto"].map(method => (
                    <div key={method} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-4 first:pt-0 last:pb-0">
                      <Label className="text-slate-700 font-medium">
                        {method === "card" ? "Cartão de Crédito" : method === "pix" ? "PIX" : "Boleto"}
                      </Label>
                      <PremiumToggle3D
                        size="sm"
                        checked={activeGateway.config?.methods?.[method] ?? false}
                        onCheckedChange={v => updateGatewayMethod(activeGateway.provider, method, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}