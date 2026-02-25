import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Eye, Layout, Grid3X3 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const templates = [
  {
    id: "classic",
    name: "Clássico",
    description: "Layout padrão com seções configuráveis: Hero, Categorias circulares, Produtos em destaque, Coleções e Newsletter.",
    icon: Layout,
    preview: "Categorias em círculos com efeito joalheria, grid de produtos com cards premium.",
  },
  {
    id: "mosaic_collections_v1",
    name: "Mosaico de Coleções",
    description: "Grid mosaico editorial com coleções em cards de tamanhos variados, inspirado em joalherias premium.",
    icon: Grid3X3,
    preview: "Cards grandes e pequenos misturados em grid assimétrico, overlays elegantes, CTA com hover.",
  },
];

export default function AdminHomeTemplates() {
  const { getSetting } = useStoreSettings();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState("");

  const currentTemplate = getSetting("home_template", "classic");

  const applyTemplate = async (templateId: string) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .eq("key", "home_template")
        .maybeSingle();

      if (existing) {
        await supabase.from("store_settings").update({ value: templateId }).eq("key", "home_template");
      } else {
        await supabase.from("store_settings").insert({ key: "home_template", value: templateId });
      }

      await queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      toast.success("Template aplicado com sucesso!");
    } catch {
      toast.error("Erro ao aplicar template.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Templates da Home</h1>
        <p className="text-sm mt-1" style={{ color: `hsl(var(--admin-text-secondary))` }}>
          Escolha o layout da página inicial. A alteração é reversível a qualquer momento.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {templates.map((t) => {
          const isActive = currentTemplate === t.id;
          return (
            <Card
              key={t.id}
              className={`relative overflow-hidden transition-all duration-300 ${
                isActive ? "ring-2 ring-accent shadow-premium-lg" : "hover:shadow-premium"
              }`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                  <Check className="w-4 h-4 text-accent-foreground" />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <t.icon className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-sans">{t.name}</CardTitle>
                    {isActive && (
                      <span className="text-[10px] font-sans font-bold text-accent uppercase tracking-wider">
                        Ativo
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription className="font-sans text-xs leading-relaxed">
                  {t.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Mini preview illustration */}
                <div className="rounded-xl bg-muted/50 border border-border/50 p-4 mb-4 min-h-[100px] flex items-center justify-center">
                  <p className="text-xs text-muted-foreground font-sans text-center">{t.preview}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 font-sans text-xs"
                    onClick={() => {
                      setPreviewTemplate(t.id);
                      setPreviewOpen(true);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5" />
                    Pré-visualizar
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 font-sans text-xs"
                    disabled={isActive || saving}
                    onClick={() => applyTemplate(t.id)}
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
              Prévia: {templates.find((t) => t.id === previewTemplate)?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-xl border border-border overflow-hidden bg-background">
            <iframe
              src={`/?preview_template=${previewTemplate}`}
              className="w-full h-[600px] border-0"
              title="Preview"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="font-sans">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                applyTemplate(previewTemplate);
                setPreviewOpen(false);
              }}
              disabled={saving}
              className="font-sans"
            >
              Aplicar este template
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
