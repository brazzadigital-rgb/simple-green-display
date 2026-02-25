import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { Copy, Link2, QrCode, ExternalLink, MousePointerClick, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerLinks() {
  const { sellerId } = useAuth();
  const { getSetting } = useStoreSettings();
  const [seller, setSeller] = useState<any>(null);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    const load = async () => {
      const [s, c] = await Promise.all([
        supabase.from("sellers").select("referral_code, name").eq("id", sellerId).maybeSingle(),
        supabase.from("seller_link_clicks").select("*").eq("seller_id", sellerId).order("created_at", { ascending: false }).limit(100),
      ]);
      setSeller(s.data);
      setClicks((c.data as any[]) || []);
      setLoading(false);
    };
    load();
  }, [sellerId]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;
  if (!seller) return null;

  const storeDomain = getSetting("store_domain", "").replace(/\/+$/, "");
  const baseUrl = storeDomain || window.location.origin;
  const mainLink = `${baseUrl}/?ref=${seller.referral_code}`;
  const totalClicks = clicks.length;
  const conversions = clicks.filter(c => c.converted).length;

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copiado!" }); };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Meus Links</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">Gerencie seus links de indicação</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <MousePointerClick className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold font-display">{totalClicks}</p>
          <p className="text-xs text-muted-foreground">Cliques</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <ArrowRight className="w-5 h-5 mx-auto mb-2 text-emerald-600" />
          <p className="text-2xl font-bold font-display">{conversions}</p>
          <p className="text-xs text-muted-foreground">Conversões</p>
        </CardContent></Card>
        <Card className="border-0 shadow-sm rounded-2xl"><CardContent className="p-4 text-center">
          <span className="text-2xl font-bold font-display">{totalClicks > 0 ? ((conversions / totalClicks) * 100).toFixed(1) : 0}%</span>
          <p className="text-xs text-muted-foreground mt-1">Taxa</p>
        </CardContent></Card>
      </div>

      {/* Main link */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Link principal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input value={mainLink} readOnly className="text-xs rounded-xl h-9 font-sans bg-muted/50 flex-1" />
            <Button variant="outline" size="sm" onClick={() => copy(mainLink)} className="rounded-xl shrink-0 gap-1">
              <Copy className="w-3 h-3" /> Copiar
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-sans">Código:</span>
            <Badge variant="outline" className="font-mono text-xs cursor-pointer" onClick={() => copy(seller.referral_code)}>
              {seller.referral_code}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Recent clicks */}
      <Card className="border-0 shadow-sm rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-sans font-medium">Últimos cliques</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clicks.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm font-sans">Nenhum clique registrado</p>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {clicks.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-xs font-sans">{c.source || "Direto"} · {c.device || "—"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                  </div>
                  <Badge variant={c.converted ? "default" : "secondary"} className="text-xs">
                    {c.converted ? "Convertido" : "Clique"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
