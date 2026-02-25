import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumToggle3D } from "@/components/ui/premium-toggle-3d";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/store/ImageUpload";
import { toast } from "@/hooks/use-toast";
import { Save, Palette, Type, ImageIcon, Gem, Eye, Sparkles, ShoppingCart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useIsDemo } from "@/hooks/useIsDemo";

interface SettingsMap { [key: string]: string; }

const colorSettings = [
  { key: "color_primary", label: "Cor Principal", description: "Header, títulos, destaques" },
  { key: "color_secondary", label: "Cor Secundária", description: "Fundos suaves, bordas" },
  { key: "color_buttons", label: "Cor dos Botões", description: "CTAs de compra" },
  { key: "color_background", label: "Cor de Fundo", description: "Fundo principal do site" },
  { key: "color_text", label: "Cor dos Textos", description: "Corpo de texto" },
  { key: "color_links", label: "Cor dos Links", description: "Links e hover" },
  { key: "color_promotions", label: "Cor de Promoções", description: "Badges de desconto" },
];

const fontSettings = [
  { key: "font_headings", label: "Fonte dos Títulos" },
  { key: "font_body", label: "Fonte dos Textos" },
  { key: "font_weight", label: "Peso da Fonte (400-900)" },
  { key: "font_size_base", label: "Tamanho Base (px)" },
];

const themePresets: { name: string; icon: string; colors: Record<string, string>; fonts?: Record<string, string> }[] = [
  {
    name: "Zenith Sport",
    icon: "🔥",
    colors: {
      color_primary: "16 100% 50%",
      color_secondary: "0 0% 10%",
      color_buttons: "16 100% 50%",
      color_background: "0 0% 100%",
      color_text: "0 0% 7%",
      color_links: "16 100% 45%",
      color_promotions: "0 75% 50%",
    },
    fonts: {
      font_headings: "Orbitron",
      font_body: "Exo 2",
      font_weight: "700",
      font_size_base: "16",
    },
  },
  {
    name: "Bordô Luxo",
    icon: "🍷",
    colors: {
      color_primary: "345 45% 25%",
      color_secondary: "30 30% 88%",
      color_buttons: "345 45% 25%",
      color_background: "30 15% 97%",
      color_text: "345 15% 15%",
      color_links: "345 45% 30%",
      color_promotions: "0 65% 48%",
    },
    fonts: {
      font_headings: "Playfair Display",
      font_body: "Lato",
      font_weight: "600",
      font_size_base: "16",
    },
  },
  {
    name: "Rosé Gold",
    icon: "🌸",
    colors: {
      color_primary: "350 40% 55%",
      color_secondary: "20 30% 90%",
      color_buttons: "350 40% 50%",
      color_background: "20 15% 97%",
      color_text: "350 15% 18%",
      color_links: "350 40% 45%",
      color_promotions: "0 60% 50%",
    },
  },
  {
    name: "Champagne",
    icon: "🥂",
    colors: {
      color_primary: "38 35% 42%",
      color_secondary: "35 25% 90%",
      color_buttons: "38 40% 38%",
      color_background: "35 15% 97%",
      color_text: "35 12% 15%",
      color_links: "38 35% 35%",
      color_promotions: "0 55% 50%",
    },
  },
];

// Convert HSL string "H S% L%" to hex for the color picker
function hslToHex(hsl: string): string {
  if (!hsl || hsl.length < 5) return "#6b2030";
  const parts = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  if (parts.length < 3) return "#6b2030";
  const [h, s, l] = parts;
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Convert hex to HSL string "H S% L%"
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/* ─── Live Preview Component ─── */
function ThemePreview({ settings }: { settings: SettingsMap }) {
  const primary = settings.color_primary || "16 100% 50%";
  const secondary = settings.color_secondary || "0 0% 10%";
  const buttons = settings.color_buttons || primary;
  const bg = settings.color_background || "0 0% 100%";
  const text = settings.color_text || "0 0% 7%";

  return (
    <div className="rounded-2xl overflow-hidden border border-border shadow-premium" style={{ backgroundColor: `hsl(${bg})` }}>
      {/* Mini header */}
      <div className="h-12 flex items-center px-4 gap-3" style={{ backgroundColor: `hsl(${primary})` }}>
        <div className="w-16 h-5 rounded bg-white/20" />
        <div className="flex-1" />
        <div className="flex gap-2">
          <div className="w-6 h-6 rounded-full bg-white/15" />
          <div className="w-6 h-6 rounded-full bg-white/15" />
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="space-y-1">
          <p className="font-display text-sm font-bold uppercase tracking-wide" style={{ color: `hsl(${text})` }}>
            Anel Solitário Diamante
          </p>
          <p className="text-xs" style={{ color: `hsl(${text} / 0.55)` }}>
            Ouro 18k com brilhante central
          </p>
        </div>

        {/* Product card preview */}
        <div className="flex gap-3">
          <div className="w-20 h-20 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `hsl(${secondary})` }}>
            💍
          </div>
          <div className="flex-1 space-y-2">
            <p className="font-sans text-lg font-bold" style={{ color: `hsl(${text})` }}>R$ 4.299,00</p>
            <p className="text-[10px]" style={{ color: `hsl(${text} / 0.5)` }}>12x de R$ 358,25 s/ juros</p>
            <button
              className="h-8 px-4 rounded-lg text-xs font-bold flex items-center gap-1.5 min-h-[unset]"
              style={{
                backgroundColor: `hsl(${buttons})`,
                color: `hsl(${bg})`,
              }}
            >
              <ShoppingCart className="w-3 h-3" /> Comprar
            </button>
          </div>
        </div>

        {/* Badge samples */}
        <div className="flex gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `hsl(${primary} / 0.12)`, color: `hsl(${primary})` }}>
            NOVO
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-destructive/10 text-destructive">
            -30% OFF
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: `hsl(${secondary})`, color: `hsl(${text} / 0.7)` }}>
            Frete Grátis
          </span>
        </div>
      </div>
    </div>
  );
}

const VISUAL_DEFAULTS: SettingsMap = {
  color_primary: "16 100% 50%",
  color_secondary: "0 0% 10%",
  color_buttons: "16 100% 50%",
  color_background: "0 0% 100%",
  color_text: "0 0% 7%",
  color_links: "16 100% 45%",
  color_promotions: "0 75% 50%",
  font_headings: "Orbitron",
  font_body: "Exo 2",
  font_weight: "700",
  font_size_base: "16",
  logo_url: "",
  logo_mobile_url: "",
  favicon_url: "",
  jewel_enabled: "false",
  jewel_color: "gold",
  jewel_reflex_intensity: "medium",
  jewel_reflex_frequency: "normal",
  jewel_shine_tap: "true",
  jewel_active_highlight: "true",
};

export default function AdminVisualIdentity() {
  const [settings, setSettings] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const { blockIfDemo } = useIsDemo();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("store_settings").select("key, value");
      const map: SettingsMap = { ...VISUAL_DEFAULTS };
      data?.forEach((s: any) => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    };
    fetch();
  }, []);

  const update = (key: string, value: string) => setSettings((p) => ({ ...p, [key]: value }));

  const applyPreset = (preset: typeof themePresets[0]) => {
    setSettings((prev) => ({ ...prev, ...preset.colors, ...(preset.fonts || {}) }));
    toast({ title: `Preset "${preset.name}" aplicado`, description: "Clique em Salvar para confirmar." });
  };

  const handleSave = async () => {
    if (blockIfDemo()) return;
    setSaving(true);
    const promises = Object.entries(settings).map(([key, value]) =>
      supabase.from("store_settings").upsert({ key, value }, { onConflict: "key" })
    );
    await Promise.all(promises);
    queryClient.invalidateQueries({ queryKey: ["store-settings"] });
    toast({ title: "Identidade visual salva!", description: "As mudanças serão aplicadas imediatamente." });
    setSaving(false);
  };

  if (loading) return <div className="space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identidade Visual</h1>
          <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>Personalize a aparência da sua loja</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>

      {/* Logos */}
      <div className="admin-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-accent" /> Logos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="font-sans text-sm">Logo Principal</Label>
              <ImageUpload value={settings.logo_url || ""} onChange={(v) => update("logo_url", v)} folder="logos" label="Upload Logo" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-sm">Logo Mobile</Label>
              <ImageUpload value={settings.logo_mobile_url || ""} onChange={(v) => update("logo_mobile_url", v)} folder="logos" label="Upload Mobile" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-sm">Favicon</Label>
              <ImageUpload value={settings.favicon_url || ""} onChange={(v) => update("favicon_url", v)} folder="logos" label="Upload Favicon" />
            </div>
            <div className="space-y-2">
              <Label className="font-sans text-sm">Imagem da Tela de Login</Label>
              <p className="text-[10px] text-muted-foreground">Exibida ao lado do formulário de login/cadastro</p>
              <ImageUpload value={settings.auth_hero_image || ""} onChange={(v) => update("auth_hero_image", v)} folder="auth" label="Upload Imagem Login" />
            </div>
          </div>
        </CardContent>
      </div>

      {/* Theme Presets */}
      <div className="admin-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /> Presets de Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {themePresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-border hover:border-accent/40 hover:shadow-md transition-all group min-h-[unset]"
              >
                <div className="flex gap-1.5">
                  {Object.entries(preset.colors).slice(0, 4).map(([k, v]) => (
                    <div
                      key={k}
                      className="w-7 h-7 rounded-full border border-foreground/10 group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: `hsl(${v})` }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="font-sans text-sm font-bold">{preset.icon} {preset.name}</p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colors */}
        <div className="admin-card lg:col-span-2">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg flex items-center gap-2"><Palette className="w-5 h-5 text-accent" /> Cores do Tema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {colorSettings.map((c) => (
                <div key={c.key} className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(settings[c.key] || "")}
                    onChange={(e) => update(c.key, hexToHsl(e.target.value))}
                    className="w-10 h-10 rounded-xl border border-border cursor-pointer shrink-0 min-h-[unset] min-w-[unset]"
                  />
                  <div className="flex-1">
                    <Label className="font-sans text-xs font-semibold">{c.label}</Label>
                    <p className="text-[10px] text-muted-foreground">{c.description}</p>
                    <Input
                      value={settings[c.key] || ""}
                      onChange={(e) => update(c.key, e.target.value)}
                      className="h-7 rounded-lg text-xs font-mono mt-1"
                      placeholder="H S% L%"
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </div>

        {/* Live Preview */}
        <div className="admin-card">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg flex items-center gap-2"><Eye className="w-5 h-5 text-accent" /> Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <ThemePreview settings={settings} />
          </CardContent>
        </div>
      </div>

      {/* Typography */}
      <div className="admin-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg flex items-center gap-2"><Type className="w-5 h-5 text-accent" /> Tipografia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fontSettings.map((f) => (
              <div key={f.key} className="grid gap-2">
                <Label className="font-sans text-sm">{f.label}</Label>
                <Input
                  value={settings[f.key] || ""}
                  onChange={(e) => update(f.key, e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </div>

      {/* Jewel Ring Categories */}
      <div className="admin-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-lg flex items-center gap-2"><Gem className="w-5 h-5 text-accent" /> Categorias — Reflexo de Estúdio</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Reflexo de Estúdio</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Anel metálico com reflexo de softbox premium</p>
            </div>
            <PremiumToggle3D
              size="sm"
              checked={settings.jewel_enabled === "true"}
              onCheckedChange={(v) => update("jewel_enabled", v ? "true" : "false")}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label className="font-sans text-sm">Cor Metálica</Label>
              <Select value={settings.jewel_color || "gold"} onValueChange={(v) => update("jewel_color", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Dourado</SelectItem>
                  <SelectItem value="rose">Rosé Gold</SelectItem>
                  <SelectItem value="silver">Prata</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="font-sans text-sm">Intensidade do Reflexo</Label>
              <Select value={settings.jewel_reflex_intensity || "medium"} onValueChange={(v) => update("jewel_reflex_intensity", v)}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="font-sans text-sm">Frequência</Label>
            <Select value={settings.jewel_reflex_frequency || "normal"} onValueChange={(v) => update("jewel_reflex_frequency", v)}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rare">Raro (a cada ~10s)</SelectItem>
                <SelectItem value="normal">Normal (a cada ~7s)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Shine ao Toque</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Reflexo imediato ao tocar no mobile</p>
            </div>
            <PremiumToggle3D
              size="sm"
              checked={settings.jewel_shine_tap !== "false"}
              onCheckedChange={(v) => update("jewel_shine_tap", v ? "true" : "false")}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="font-sans text-sm font-medium">Realçar Categoria Ativa</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Glow mais forte na categoria selecionada</p>
            </div>
            <PremiumToggle3D
              size="sm"
              checked={settings.jewel_active_highlight !== "false"}
              onCheckedChange={(v) => update("jewel_active_highlight", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </div>
    </div>
  );
}
