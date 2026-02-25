import { motion } from "framer-motion";
import { Truck, ShieldCheck, CreditCard, Star } from "lucide-react";

const benefits = [
  { icon: Truck, title: "Frete Rápido", desc: "Entrega para todo o Brasil" },
  { icon: ShieldCheck, title: "Compra Segura", desc: "Blindagem digital total" },
  { icon: CreditCard, title: "Pagamento Facilitado", desc: "Até 12x sem juros" },
  { icon: Star, title: "Produtos Premium", desc: "Qualidade garantida" },
];

export function SportBenefitsSection() {
  return (
    <section className="relative py-12 md:py-16 luminous-line">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {benefits.map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border/50 sport-card-glow group"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <b.icon className="w-6 h-6 text-accent" />
              </div>
              <h4 className="font-display text-sm font-bold text-foreground mb-1">{b.title}</h4>
              <p className="text-xs text-muted-foreground font-sans">{b.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
