import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const headerStyles = [
  {
    id: "default",
    name: "Padrão Atual",
    description: "Header premium com fundo escuro, busca central em pill, ícones com separadores.",
    colors: "bg-primary",
  },
  {
    id: "boutique_clean",
    name: "Boutique Clean",
    description: "Fundo claro porcelana, linha fina separadora, busca central elegante.",
    colors: "bg-muted",
  },
  {
    id: "vinho_premium",
    name: "Vinho Premium",
    description: "Fundo bordô intenso (cor primária), ícones claros, busca em pill caramelo.",
    colors: "bg-primary",
  },
  {
    id: "glass_luxury",
    name: "Glass Luxury",
    description: "Efeito glass suave (blur leve), flutua sobre banner, sombra delicada.",
    colors: "bg-white/60 backdrop-blur",
  },
  {
    id: "editorial_minimal",
    name: "Editorial Minimal",
    description: "Menu em linha fina + tipografia editorial, logo central, ícones nas laterais.",
    colors: "bg-background",
  },
  {
    id: "compact_sticky",
    name: "Compact Sticky Pro",
    description: "Header compacto + sticky, no scroll diminui (shrink), busca abre via drawer.",
    colors: "bg-foreground",
  },
];

export default function AdminHeaderStyles() {
  const { getSetting } = useStoreSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewStyle, setPreviewStyle] = useState("");

  const currentStyle = getSetting("header_style", "default");

  const applyStyle = async (styleId: string) => {
    setSaving(true);
    try {
      await supabase
        .from("store_settings")
        .upsert({ key: "header_style", value: styleId }, { onConflict: "key" });

      await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      await queryClient.refetchQueries({ queryKey: ["store-settings"] });
      toast.success("Estilo de header aplicado!");
    } catch {
      toast.error("Erro ao aplicar estilo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estilos de Header</h1>
        <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>
          Escolha entre 5 estilos premium. Todas as informações (logo, busca, conta, rastreio, carrinho) são mantidas.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {headerStyles.map((s) => {
          const isActive = currentStyle === s.id;
          return (
            <Card
              key={s.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isActive ? "ring-2 ring-accent shadow-premium-lg" : "hover:shadow-premium"
              }`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-accent-foreground" />
                </div>
              )}

              <CardHeader className="pb-2">
                {/* Mini color preview bar */}
                <div className={`w-full h-8 rounded-lg mb-3 border border-border/30 ${s.colors}`} />
                <CardTitle className="text-sm font-sans">{s.name}</CardTitle>
                {isActive && (
                  <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-wider">
                    Ativo
                  </span>
                )}
                <CardDescription className="font-sans text-xs leading-relaxed">
                  {s.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 font-sans text-xs"
                    onClick={() => {
                      setPreviewStyle(s.id);
                      setPreviewOpen(true);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Prévia
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 font-sans text-xs"
                    disabled={isActive || saving}
                    onClick={() => applyStyle(s.id)}
                  >
                    {isActive ? "Ativo" : "Aplicar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-sans">
              Prévia: {headerStyles.find((s) => s.id === previewStyle)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <iframe
              src={`/?preview_header=${previewStyle}`}
              className="w-full h-[500px] border-0"
              title="Preview"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="font-sans">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                applyStyle(previewStyle);
                setPreviewOpen(false);
              }}
              disabled={saving}
              className="font-sans"
            >
              Aplicar este estilo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
