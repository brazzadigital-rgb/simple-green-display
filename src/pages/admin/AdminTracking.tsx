import { useState } from "react";
import { useTrackingSettings, type TrackingConfig } from "@/hooks/useTrackingSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Facebook, BarChart3, Link2, Shield, Wrench, Save, Loader2,
  CheckCircle2, XCircle, Activity, Eye
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminTracking() {
  const { config, isLoading, saveConfig, isSaving } = useTrackingSettings();
  const [local, setLocal] = useState<TrackingConfig | null>(null);

  const c = local || config;
  const set = (patch: Partial<TrackingConfig>) => setLocal({ ...c, ...patch });

  const handleSave = () => {
    if (local) saveConfig(local);
  };

  if (isLoading) return <div className="space-y-4 p-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rastreamento & Analytics</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Configure Meta Pixel, GA4, UTMs e consentimento LGPD</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving || !local}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>
      </div>

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-5 rounded-xl h-auto p-1">
          <TabsTrigger value="meta" className="rounded-lg text-xs py-2 gap-1.5">
            <Facebook className="w-3.5 h-3.5" /> Meta Pixel
          </TabsTrigger>
          <TabsTrigger value="ga4" className="rounded-lg text-xs py-2 gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> GA4
          </TabsTrigger>
          <TabsTrigger value="utm" className="rounded-lg text-xs py-2 gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> UTMify
          </TabsTrigger>
          <TabsTrigger value="lgpd" className="rounded-lg text-xs py-2 gap-1.5">
            <Shield className="w-3.5 h-3.5" /> LGPD
          </TabsTrigger>
          <TabsTrigger value="debug" className="rounded-lg text-xs py-2 gap-1.5">
            <Wrench className="w-3.5 h-3.5" /> Diagnóstico
          </TabsTrigger>
        </TabsList>

        {/* META PIXEL */}
        <TabsContent value="meta">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Facebook className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Meta Pixel (Facebook)</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Ativar Meta Pixel</Label>
                <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Carrega o script do Facebook Pixel</p>
              </div>
              <PremiumToggle3D size="sm" checked={c.meta_pixel_enabled} onCheckedChange={v => set({ meta_pixel_enabled: v })} />
            </div>

            {c.meta_pixel_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Pixel ID</Label>
                    <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" placeholder="123456789" value={c.meta_pixel_id} onChange={e => set({ meta_pixel_id: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm">Access Token (CAPI)</Label>
                    <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" placeholder="Opcional" value={c.meta_pixel_access_token} onChange={e => set({ meta_pixel_access_token: e.target.value })} type="password" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Deduplicação (event_id)</Label>
                    <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Envia event_id único para evitar contagem dupla</p>
                  </div>
                  <PremiumToggle3D size="sm" checked={c.meta_pixel_dedup} onCheckedChange={v => set({ meta_pixel_dedup: v })} />
                </div>

                <Separator />
                <h3 className="font-semibold text-sm">Advanced Matching</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "email", label: "Email (hash)" },
                    { key: "phone", label: "Telefone (hash)" },
                    { key: "name", label: "Nome" },
                    { key: "city_state_zip", label: "Cidade/Estado/CEP" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                      <Label className="text-sm">{item.label}</Label>
                      <PremiumToggle3D
                        size="sm"
                        checked={(c.meta_pixel_advanced_matching as any)[item.key]}
                        onCheckedChange={v => set({
                          meta_pixel_advanced_matching: { ...c.meta_pixel_advanced_matching, [item.key]: v }
                        })}
                      />
                    </div>
                  ))}
                </div>

                <Separator />
                <h3 className="font-semibold text-sm">Eventos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(c.meta_pixel_events).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                      <Label className="text-sm">{key}</Label>
                      <PremiumToggle3D
                        size="sm"
                        checked={val}
                        onCheckedChange={v => set({
                          meta_pixel_events: { ...c.meta_pixel_events, [key]: v }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* GA4 */}
        <TabsContent value="ga4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold">Google Analytics 4</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Ativar GA4</Label>
                <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Carrega o Google Analytics 4</p>
              </div>
              <PremiumToggle3D size="sm" checked={c.ga4_enabled} onCheckedChange={v => set({ ga4_enabled: v })} />
            </div>

            {c.ga4_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Measurement ID</Label>
                    <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" placeholder="G-XXXXXXXXXX" value={c.ga4_measurement_id} onChange={e => set({ ga4_measurement_id: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm">API Secret (Measurement Protocol)</Label>
                    <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" placeholder="Opcional" value={c.ga4_api_secret} onChange={e => set({ ga4_api_secret: e.target.value })} type="password" />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Enhanced Measurement</Label>
                    <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Scroll, outbound clicks, site search automático</p>
                  </div>
                  <PremiumToggle3D size="sm" checked={c.ga4_enhanced_measurement} onCheckedChange={v => set({ ga4_enhanced_measurement: v })} />
                </div>

                <Separator />
                <h3 className="font-semibold text-sm">Eventos E-commerce</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(c.ga4_events).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                      <Label className="text-sm">{key}</Label>
                      <PremiumToggle3D
                        size="sm"
                        checked={val}
                        onCheckedChange={v => set({
                          ga4_events: { ...c.ga4_events, [key]: v }
                        })}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* UTMify */}
        <TabsContent value="utm">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">UTMify (Captura & Atribuição)</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Ativar UTMify</Label>
                <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Captura UTMs, fbclid, gclid automaticamente</p>
              </div>
              <PremiumToggle3D size="sm" checked={c.utmify_enabled} onCheckedChange={v => set({ utmify_enabled: v })} />
            </div>

            {c.utmify_enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Janela de atribuição (dias)</Label>
                    <Select value={String(c.utmify_attribution_window)} onValueChange={v => set({ utmify_attribution_window: Number(v) })}>
                      <SelectTrigger className="mt-1 rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="60">60 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Modelo de atribuição</Label>
                    <Select value={c.utmify_model} onValueChange={v => set({ utmify_model: v as any })}>
                      <SelectTrigger className="mt-1 rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_click">First-click</SelectItem>
                        <SelectItem value="last_click">Last-click</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                    <Label className="text-sm">localStorage</Label>
                    <PremiumToggle3D size="sm" checked={c.utmify_use_localstorage} onCheckedChange={v => set({ utmify_use_localstorage: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                    <Label className="text-sm">Cookie</Label>
                    <PremiumToggle3D size="sm" checked={c.utmify_use_cookie} onCheckedChange={v => set({ utmify_use_cookie: v })} />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="font-medium">Normalização</Label>
                    <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Converte para lowercase e remove espaços</p>
                  </div>
                  <PremiumToggle3D size="sm" checked={c.utmify_normalize} onCheckedChange={v => set({ utmify_normalize: v })} />
                </div>

                <div>
                  <Label className="text-sm">Ignorar auto-referrals (domínios separados por vírgula)</Label>
                  <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" placeholder="meusite.com, meusite.com.br" value={c.utmify_ignore_domains} onChange={e => set({ utmify_ignore_domains: e.target.value })} />
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* LGPD */}
        <TabsContent value="lgpd">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-semibold">Consentimento LGPD</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">Ativar banner de consentimento</Label>
                <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Exibe cookie banner para visitantes</p>
              </div>
              <PremiumToggle3D size="sm" checked={c.lgpd_enabled} onCheckedChange={v => set({ lgpd_enabled: v })} />
            </div>

            {c.lgpd_enabled && (
              <>
                <div>
                  <Label className="text-sm">Texto do banner</Label>
                  <Textarea className="mt-1 rounded-xl min-h-[80px] border-0 bg-muted/30" value={c.lgpd_banner_text} onChange={e => set({ lgpd_banner_text: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Link da política de privacidade</Label>
                    <Input className="mt-1 rounded-xl h-10 border-0 bg-muted/30" value={c.lgpd_policy_link} onChange={e => set({ lgpd_policy_link: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-sm">Ação padrão</Label>
                    <Select value={c.lgpd_default_action} onValueChange={v => set({ lgpd_default_action: v as any })}>
                      <SelectTrigger className="mt-1 rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reject">Rejeitar (recomendado)</SelectItem>
                        <SelectItem value="accept">Aceitar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Categoria do UTM tracking</Label>
                  <Select value={c.lgpd_utm_category} onValueChange={v => set({ lgpd_utm_category: v as any })}>
                    <SelectTrigger className="mt-1 rounded-xl h-10 border-0 bg-muted/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </motion.div>
        </TabsContent>

        {/* DIAGNOSTICS */}
        <TabsContent value="debug">
          <DiagnosticsTab config={c} onToggleDebug={v => set({ debug_mode: v })} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiagnosticsTab({ config, onToggleDebug }: { config: TrackingConfig; onToggleDebug: (v: boolean) => void }) {
  const debugLogs = (() => {
    try {
      const raw = localStorage.getItem("tracking_debug_log");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  })();

  const firstTouch = (() => {
    try { return JSON.parse(localStorage.getItem("utm_first_touch") || "null"); } catch { return null; }
  })();
  const lastTouch = (() => {
    try { return JSON.parse(localStorage.getItem("utm_last_touch") || "null"); } catch { return null; }
  })();
  const visitorId = localStorage.getItem("utm_visitor_id") || "—";

  const StatusBadge = ({ active, label }: { active: boolean; label: string }) => (
    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `hsl(var(--admin-surface-hover))` }}>
      {active ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-muted-foreground" />}
      <span className="text-sm">{label}</span>
      <span className={`admin-status-pill text-[10px] ml-auto ${active ? "admin-status-success" : "admin-status-danger"}`}>
        {active ? "Ativo" : "Inativo"}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="admin-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Status</h2>
        </div>
        <div className="space-y-3">
          <StatusBadge active={config.meta_pixel_enabled && !!config.meta_pixel_id} label="Meta Pixel" />
          <StatusBadge active={config.ga4_enabled && !!config.ga4_measurement_id} label="Google Analytics 4" />
          <StatusBadge active={config.utmify_enabled} label="UTMify" />
          <StatusBadge active={config.lgpd_enabled} label="Consentimento LGPD" />
        </div>

        <Separator />
        <div className="flex items-center justify-between">
          <div>
            <Label className="font-medium">Modo Debug</Label>
            <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Registra todos os eventos no console e localStorage</p>
          </div>
          <PremiumToggle3D size="sm" checked={config.debug_mode} onCheckedChange={onToggleDebug} />
        </div>
      </motion.div>

      <div className="admin-card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="w-5 h-5" />
          <h2 className="text-lg font-semibold">UTMs Capturadas</h2>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Visitor ID</p>
          <code className="font-mono text-xs bg-muted/30 p-2 rounded-lg block">{visitorId}</code>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium mb-2">First Touch</p>
            {firstTouch ? (
              <div className="rounded-xl p-3 space-y-1" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                {Object.entries(firstTouch).filter(([, v]) => v).map(([k, v]) => (
                  <p key={k} className="text-xs"><span style={{ color: `hsl(var(--admin-text-secondary))` }}>{k}:</span> {String(v)}</p>
                ))}
              </div>
            ) : <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Nenhum dado capturado</p>}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Last Touch</p>
            {lastTouch ? (
              <div className="rounded-xl p-3 space-y-1" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                {Object.entries(lastTouch).filter(([, v]) => v).map(([k, v]) => (
                  <p key={k} className="text-xs"><span style={{ color: `hsl(var(--admin-text-secondary))` }}>{k}:</span> {String(v)}</p>
                ))}
              </div>
            ) : <p className="text-xs" style={{ color: `hsl(var(--admin-text-secondary))` }}>Nenhum dado capturado</p>}
          </div>
        </div>
      </div>

      {debugLogs.length > 0 && (
        <div className="admin-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Últimos Eventos ({debugLogs.length})</h2>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {debugLogs.map((log: any, i: number) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg text-xs font-mono" style={{ background: `hsl(var(--admin-surface-hover))` }}>
                <span className="admin-status-pill admin-status-info text-[9px] shrink-0">{log.platform}</span>
                <span className="shrink-0" style={{ color: `hsl(var(--admin-text-secondary))` }}>{new Date(log.ts).toLocaleTimeString("pt-BR")}</span>
                <span className="font-semibold">{log.event}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
