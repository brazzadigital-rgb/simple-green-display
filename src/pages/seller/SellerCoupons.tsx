import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "lucide-react";
import { motion } from "framer-motion";

export default function SellerCoupons() {
  const { sellerId } = useAuth();
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sellerId) return;
    supabase.from("sellers").select("referral_code, commission_rate, name").eq("id", sellerId).maybeSingle()
      .then(({ data }) => { setSeller(data); setLoading(false); });
  }, [sellerId]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-40 rounded-2xl" /></div>;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-display font-bold">Cupons</h1>
        <p className="text-sm text-muted-foreground font-sans mt-1">Seu cupom exclusivo de vendedor</p>
      </motion.div>

      <Card className="border-0 shadow-sm rounded-2xl">
        <CardContent className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Tag className="w-7 h-7 text-primary" />
          </div>
          <div>
            <Badge variant="outline" className="font-mono text-lg px-4 py-2">
              {seller?.referral_code || "—"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground font-sans">
            Compartilhe seu código com clientes. Comissão: <strong>{seller?.commission_rate || 0}%</strong> sobre cada venda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
