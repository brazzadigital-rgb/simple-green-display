import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useStoreSettings } from "@/hooks/useStoreSettings";

import TrackingHero from "@/components/store/tracking/TrackingHero";
import TrackingSearchForm from "@/components/store/tracking/TrackingSearchForm";
import TrackingLoadingSkeleton from "@/components/store/tracking/TrackingLoadingSkeleton";
import TrackingStatusCard from "@/components/store/tracking/TrackingStatusCard";
import TrackingTimeline from "@/components/store/tracking/TrackingTimeline";
import TrackingSupportCard from "@/components/store/tracking/TrackingSupportCard";

interface TrackingEvent {
  id: string;
  status: string;
  description: string | null;
  location: string | null;
  event_date: string;
}

interface OrderInfo {
  order_number: string;
  status: string;
  shipment_status: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipping_method: string | null;
  shipping_days: number | null;
  created_at: string;
  customer_name: string | null;
}

export default function TrackOrderPage() {
  const { getSetting, isEnabled } = useStoreSettings();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [error, setError] = useState("");

  const whatsappEnabled = isEnabled("whatsapp_enabled");
  const whatsappNumber = getSetting("whatsapp_number", "");

  const search = async (
    mode: "order" | "tracking",
    data: { orderNumber?: string; email?: string; trackingCode?: string }
  ) => {
    setLoading(true);
    setError("");
    setOrder(null);
    setEvents([]);

    try {
      const body =
        mode === "tracking"
          ? { tracking_code: data.trackingCode }
          : { order_number: data.orderNumber, email: data.email };

      const { data: res, error: fnError } = await supabase.functions.invoke(
        "track-order",
        { body }
      );

      if (fnError) throw fnError;
      if (res?.error) {
        setError(res.error);
      } else {
        setOrder(res.order);
        setEvents(res.events || []);
      }
    } catch {
      setError("Erro ao buscar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(30,15%,97%)]">
      <TrackingHero />

      <div className="container max-w-2xl px-4 -mt-2 pb-16">
        <TrackingSearchForm loading={loading} onSearch={search} />

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-10 mt-6"
          >
            <AlertCircle className="w-10 h-10 text-[hsl(30,20%,85%)] mx-auto mb-3" />
            <p className="font-sans text-sm text-muted-foreground">{error}</p>
          </motion.div>
        )}

        {/* Loading */}
        {loading && <TrackingLoadingSkeleton />}

        {/* Results */}
        <AnimatePresence>
          {order && !loading && (
            <div className="mt-6 space-y-4">
              <TrackingStatusCard order={order} />
              <TrackingTimeline events={events} />
              <TrackingSupportCard
                whatsappEnabled={whatsappEnabled}
                whatsappNumber={whatsappNumber}
                orderNumber={order.order_number}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile fixed WhatsApp button */}
      {whatsappEnabled && whatsappNumber && order && (
        <div className="fixed bottom-4 right-4 z-40 md:hidden">
          <a
            href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Olá! Preciso de ajuda com meu pedido ${order.order_number}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(142,71%,40%)] text-white shadow-lg hover:shadow-xl active:scale-95 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.524-1.478A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.764-6.152-2.054l-.43-.338-2.684.877.894-2.636-.37-.448A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
