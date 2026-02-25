import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { FolderOpen, Download, Copy, Image, Video, FileText } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerMaterials() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("seller_materials").select("*").eq("is_active", true).order("sort_order")
      .then(({ data }) => { setMaterials((data as any[]) || []); setLoading(false); });
  }, []);

  const copyCaption = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Legenda copiada!" }); };

  const iconFor = (type: string) => {
    if (type === "video") return <Video className="w-5 h-5" />;
    if (type === "document") return <FileText className="w-5 h-5" />;
    return <Image className="w-5 h-5" />;
  };

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Materiais</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">Materiais de divulgação da loja</p>
      </motion.div>

      {materials.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-2xl">
          <CardContent className="py-16 text-center">
            <FolderOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground font-sans">Nenhum material disponível no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                {m.material_type === "image" && m.file_url && (
                  <img src={m.file_url} alt={m.title} className="w-full h-40 object-cover" />
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    {iconFor(m.material_type)}
                    <h3 className="text-sm font-semibold font-sans">{m.title}</h3>
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" size="sm" className="rounded-xl text-xs flex-1 gap-1" asChild>
                      <a href={m.file_url} target="_blank" rel="noopener noreferrer"><Download className="w-3 h-3" /> Baixar</a>
                    </Button>
                    {m.caption && (
                      <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1" onClick={() => copyCaption(m.caption)}>
                        <Copy className="w-3 h-3" /> Legenda
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
