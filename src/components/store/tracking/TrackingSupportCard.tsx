import { motion } from "framer-motion";
import { MessageCircle, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  whatsappEnabled: boolean;
  whatsappNumber: string;
  orderNumber?: string;
}

export default function TrackingSupportCard({ whatsappEnabled, whatsappNumber, orderNumber }: Props) {
  const msg = orderNumber
    ? `Olá! Gostaria de informações sobre meu pedido ${orderNumber}`
    : "Olá! Preciso de ajuda com meu pedido";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="bg-card rounded-2xl border border-[hsl(30,20%,90%)] shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)] p-5 md:p-6"
    >
      <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[hsl(30,30%,55%)] mb-3">
        Precisa de ajuda?
      </p>

      <div className="space-y-2">
        {whatsappEnabled && whatsappNumber && (
          <a
            href={`https://wa.me/${whatsappNumber.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-[hsl(142,50%,96%)] border border-[hsl(142,30%,88%)] hover:bg-[hsl(142,50%,94%)] active:scale-[0.98] transition-all group"
          >
            <div className="flex items-center gap-3">
              <MessageCircle className="w-4 h-4 text-[hsl(142,71%,40%)]" />
              <span className="font-sans text-sm font-medium text-foreground">Falar no WhatsApp</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
          </a>
        )}

        <Link
          to="/contato"
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-[hsl(30,20%,96%)] border border-[hsl(30,20%,90%)] hover:bg-[hsl(30,20%,94%)] active:scale-[0.98] transition-all group"
        >
          <span className="font-sans text-sm font-medium text-foreground">Contato</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>

        <Link
          to="/politicas"
          className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-[hsl(30,20%,96%)] border border-[hsl(30,20%,90%)] hover:bg-[hsl(30,20%,94%)] active:scale-[0.98] transition-all group"
        >
          <span className="font-sans text-sm font-medium text-foreground">Trocas e devoluções</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
}
