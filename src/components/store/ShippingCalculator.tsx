import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Loader2, Check, Package } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShippingQuote {
  id: string;
  name: string;
  price: number;
  delivery_min: number;
  delivery_max: number;
  company: string;
  service_code: string;
}

interface ShippingItem {
  weight: number;
  width: number;
  height: number;
  length: number;
  quantity: number;
  price: number;
}

interface ShippingCalculatorProps {
  items: ShippingItem[];
  onSelect?: (quote: ShippingQuote) => void;
  selectedId?: string | null;
  compact?: boolean;
}

export default function ShippingCalculator({ items, onSelect, selectedId, compact }: ShippingCalculatorProps) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [error, setError] = useState("");
  const [calculated, setCalculated] = useState(false);

  const formatCep = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    return digits;
  };

  const itemsHash = useCallback(() => {
    const sorted = [...items].sort((a, b) => a.price - b.price);
    return btoa(JSON.stringify(sorted.map(i => ({
      w: i.weight, wi: i.width, h: i.height, l: i.length, q: i.quantity, p: i.price,
    }))));
  }, [items]);

  const calculate = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) {
      setError("CEP inválido");
      return;
    }
    setError("");
    setLoading(true);
    setQuotes([]);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("calculate-shipping", {
        body: { customer_cep: clean, items, items_hash: itemsHash() },
      });

      if (fnError) throw fnError;
      if (data?.error) {
        setError(data.error);
      } else {
        setQuotes(data.quotes || []);
        setCalculated(true);
        // Auto-select cheapest
        if (data.quotes?.length && onSelect && !selectedId) {
          onSelect(data.quotes[0]);
        }
      }
    } catch (e) {
      console.error(e);
      setError("Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Truck className="w-4 h-4 text-muted-foreground" />
        <span className="font-sans text-sm font-semibold">Calcular frete</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={cep}
          onChange={(e) => { setCep(formatCep(e.target.value)); setCalculated(false); }}
          placeholder="00000-000"
          className="rounded-xl h-10 font-sans text-sm flex-1 max-w-[180px]"
          onKeyDown={(e) => e.key === "Enter" && calculate()}
        />
        <Button
          onClick={calculate}
          disabled={loading || cep.replace(/\D/g, "").length < 8}
          variant="outline"
          className="rounded-xl h-10 font-sans text-sm shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive font-sans">{error}</p>}

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      )}

      <AnimatePresence>
        {calculated && quotes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {quotes.map((q) => {
              const isSelected = selectedId === q.id;
              return (
                <motion.button
                  key={q.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => onSelect?.(q)}
                  className={`w-full text-left p-3 rounded-xl border transition-all font-sans text-sm flex items-center justify-between gap-3 ${
                    isSelected
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      q.price === 0 ? "bg-success/10" : "bg-muted"
                    }`}>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-accent" />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{q.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.delivery_min === q.delivery_max
                          ? `${q.delivery_min} dias úteis`
                          : `${q.delivery_min}-${q.delivery_max} dias úteis`}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold shrink-0 ${q.price === 0 ? "text-success" : ""}`}>
                    {q.price === 0 ? "Grátis" : `R$ ${q.price.toFixed(2)}`}
                  </span>
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {calculated && quotes.length === 0 && !loading && !error && (
        <p className="text-xs text-muted-foreground font-sans">
          Nenhuma opção de frete disponível para este CEP.
        </p>
      )}
    </div>
  );
}
