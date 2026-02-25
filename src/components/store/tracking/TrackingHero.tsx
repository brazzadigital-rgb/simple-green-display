import { motion } from "framer-motion";
import { ShieldCheck, Truck, Headphones } from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

const CHIPS = [
  { icon: ShieldCheck, label: "Compra segura" },
  { icon: Truck, label: "Envio rastreado" },
  { icon: Headphones, label: "Suporte rápido" },
];

export default function TrackingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Champagne glow gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(36,40%,95%)] via-[hsl(30,30%,97%)] to-[hsl(20,20%,96%)]" />
      {/* Subtle satin texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="container relative py-12 md:py-20 px-4">
        <motion.div {...fadeUp(0)} className="max-w-xl mx-auto text-center">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-[hsl(30,30%,55%)] mb-3">
            Acompanhamento
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-3">
            Rastreie seu pedido
          </h1>
          <p className="font-sans text-sm md:text-base text-muted-foreground leading-relaxed max-w-md mx-auto">
            Acompanhe o envio em tempo real com atualizações de entrega.
          </p>
        </motion.div>

        <motion.div
          {...fadeUp(0.15)}
          className="flex flex-wrap justify-center gap-2.5 mt-6"
        >
          {CHIPS.map((chip) => (
            <div
              key={chip.label}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-[hsl(30,20%,88%)] shadow-sm"
            >
              <chip.icon className="w-3.5 h-3.5 text-[hsl(30,40%,55%)]" />
              <span className="font-sans text-xs font-medium text-foreground/70">
                {chip.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
