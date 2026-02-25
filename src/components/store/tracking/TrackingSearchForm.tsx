import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Loader2, RotateCcw } from "lucide-react";

interface Props {
  loading: boolean;
  onSearch: (mode: "order" | "tracking", data: { orderNumber?: string; email?: string; trackingCode?: string }) => void;
}

const LS_KEY = "tracking_last_search";

export default function TrackingSearchForm({ loading, onSearch }: Props) {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [trackingCode, setTrackingCode] = useState("");
  const [lastSearch, setLastSearch] = useState<{ mode: string; label: string } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) setLastSearch(JSON.parse(saved));
    } catch {}
  }, []);

  const saveAndSearch = (mode: "order" | "tracking") => {
    const label = mode === "tracking" ? trackingCode : orderNumber;
    localStorage.setItem(LS_KEY, JSON.stringify({ mode, label }));
    setLastSearch({ mode, label });
    onSearch(
      mode,
      mode === "tracking"
        ? { trackingCode: trackingCode.trim() }
        : { orderNumber: orderNumber.trim(), email: email.trim() }
    );
  };

  const retrack = () => {
    if (!lastSearch) return;
    if (lastSearch.mode === "tracking") {
      setTrackingCode(lastSearch.label);
      onSearch("tracking", { trackingCode: lastSearch.label });
    } else {
      setOrderNumber(lastSearch.label);
      // email won't be saved for privacy
      onSearch("order", { orderNumber: lastSearch.label, email: "" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-xl mx-auto"
    >
      <div className="bg-card rounded-2xl border border-[hsl(30,20%,90%)] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)] p-5 md:p-7">
        <Tabs defaultValue="order" className="w-full">
          <TabsList className="w-full mb-5 rounded-xl bg-[hsl(30,20%,95%)] p-1">
            <TabsTrigger
              value="order"
              className="flex-1 rounded-lg font-sans text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Nº do Pedido
            </TabsTrigger>
            <TabsTrigger
              value="tracking"
              className="flex-1 rounded-lg font-sans text-xs font-semibold data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              Código de Rastreio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="order" className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Número do pedido
              </Label>
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="ORD-XXXXXX"
                className="h-12 rounded-xl bg-[hsl(30,15%,97%)] border-[hsl(30,20%,90%)] focus:border-[hsl(30,40%,70%)] focus:ring-[hsl(30,40%,70%)]/20 font-sans font-medium tracking-wide transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                E-mail cadastrado
              </Label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                type="email"
                className="h-12 rounded-xl bg-[hsl(30,15%,97%)] border-[hsl(30,20%,90%)] focus:border-[hsl(30,40%,70%)] focus:ring-[hsl(30,40%,70%)]/20 font-sans transition-colors"
              />
            </div>
            <Button
              onClick={() => saveAndSearch("order")}
              disabled={loading || !orderNumber || !email}
              className="w-full h-12 rounded-xl font-sans font-bold text-sm gap-2 bg-[hsl(30,30%,25%)] text-[hsl(36,40%,95%)] hover:bg-[hsl(30,30%,20%)] active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rastrear agora
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-sans text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Código de rastreio
              </Label>
              <Input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder="Ex: BR123456789XX"
                className="h-12 rounded-xl bg-[hsl(30,15%,97%)] border-[hsl(30,20%,90%)] focus:border-[hsl(30,40%,70%)] focus:ring-[hsl(30,40%,70%)]/20 font-sans font-medium tracking-wide transition-colors"
              />
            </div>
            <Button
              onClick={() => saveAndSearch("tracking")}
              disabled={loading || !trackingCode}
              className="w-full h-12 rounded-xl font-sans font-bold text-sm gap-2 bg-[hsl(30,30%,25%)] text-[hsl(36,40%,95%)] hover:bg-[hsl(30,30%,20%)] active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" /> Rastrear agora
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>

        {/* Re-track suggestion */}
        {lastSearch && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={retrack}
            className="flex items-center gap-2 mx-auto mt-4 px-4 py-2 rounded-full bg-[hsl(30,20%,95%)] text-muted-foreground hover:text-foreground font-sans text-xs font-medium transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Rastrear novamente: <span className="font-semibold text-foreground">{lastSearch.label}</span>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
