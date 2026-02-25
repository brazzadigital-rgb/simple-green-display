import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NewsletterSectionProps {
  config: {
    title?: string;
    subtitle?: string;
  };
}

export function NewsletterSection({ config }: NewsletterSectionProps) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({ title: "Cadastro realizado!", description: "Você receberá nossas novidades." });
      setEmail("");
    }
  };

  return (
    <section className="py-20 md:py-28 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-accent/5 blur-3xl" />
      
      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-xl mx-auto text-center"
        >
          <Zap className="w-8 h-8 text-accent mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
            {config.title || "Fique por dentro"}
          </h2>
          <p className="text-muted-foreground font-sans text-sm mb-8">
            {config.subtitle || "Cadastre-se e ganhe 10% de desconto na primeira compra"}
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <Input
              type="email"
              placeholder="Seu melhor email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 sm:h-14 rounded-2xl font-sans flex-1 border-border/50 focus:border-accent"
            />
            <Button
              type="submit"
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-2xl shine h-12 sm:h-14 px-8 font-sans font-bold uppercase tracking-wider shrink-0 glow-orange w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-2" /> Enviar
            </Button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
