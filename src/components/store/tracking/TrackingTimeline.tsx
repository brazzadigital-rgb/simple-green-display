import { motion } from "framer-motion";
import { Truck, MapPin, CheckCircle2, Clock } from "lucide-react";

interface TrackingEvent {
  id: string;
  status: string;
  description: string | null;
  location: string | null;
  event_date: string;
}

interface Props {
  events: TrackingEvent[];
}

export default function TrackingTimeline({ events }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-2xl border border-[hsl(30,20%,90%)] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.06)] p-5 md:p-7"
    >
      <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(30,30%,55%)] mb-6">
        Histórico de rastreamento
      </h3>

      {events.length === 0 ? (
        <div className="text-center py-10">
          <Clock className="w-10 h-10 text-[hsl(30,20%,85%)] mx-auto mb-3" />
          <p className="font-sans text-sm text-muted-foreground">
            Aguardando atualizações de rastreamento
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[15px] top-3 bottom-3 w-px bg-[hsl(30,20%,88%)]" />

          <div className="space-y-0">
            {events.map((evt, i) => {
              const isFirst = i === 0;
              return (
                <motion.div
                  key={evt.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06, duration: 0.35 }}
                  className={`relative flex gap-4 py-3 ${
                    isFirst
                      ? "bg-gradient-to-r from-[hsl(30,30%,96%)] to-transparent rounded-xl -mx-2 px-2"
                      : ""
                  }`}
                >
                  {/* Dot */}
                  <div
                    className={`relative z-10 w-[31px] h-[31px] rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isFirst
                        ? "bg-[hsl(30,30%,25%)] text-[hsl(36,40%,95%)] shadow-[0_0_0_4px_hsl(30,30%,92%)]"
                        : "bg-[hsl(30,20%,93%)] border border-[hsl(30,20%,88%)]"
                    }`}
                  >
                    {isFirst ? (
                      <Truck className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[hsl(30,20%,75%)]" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-1 min-w-0">
                    <p
                      className={`font-sans text-sm font-semibold ${
                        isFirst ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {evt.description || evt.status}
                    </p>
                    {evt.location && (
                      <p className="font-sans text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {evt.location}
                      </p>
                    )}
                    <p className="font-sans text-[11px] text-muted-foreground/50 mt-0.5">
                      {new Date(evt.event_date).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
