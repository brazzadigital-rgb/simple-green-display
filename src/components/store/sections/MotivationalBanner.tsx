import { motion } from "framer-motion";
import motivBg from "@/assets/motivational-sport-bg.jpg";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function MotivationalBanner() {
  return (
    <section className="relative overflow-hidden my-8 md:my-12">
      <div className="container px-4 md:px-6">
        <div
          className="relative rounded-2xl overflow-hidden min-h-[200px] md:min-h-[280px] flex items-center justify-center"
          style={{ backgroundImage: `url(${motivBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        >
          <div className="absolute inset-0 bg-black/30" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative z-10 text-center px-6 py-10"
          >
            <h2 className="font-display text-3xl md:text-5xl font-black text-white mb-4">
              EVOLUA SEU <span className="text-gradient-primary">TREINO</span> HOJE
            </h2>
            <p className="text-white/70 font-sans text-sm md:text-base mb-6 max-w-md mx-auto">
              Equipamentos de alta performance para atletas que buscam resultados reais.
            </p>
            <Link to="/produtos">
              <button className="btn-neon h-12 px-8 rounded-lg text-white inline-flex items-center gap-2">
                EXPLORAR PRODUTOS
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
