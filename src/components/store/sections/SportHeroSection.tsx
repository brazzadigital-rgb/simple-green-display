import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight } from "lucide-react";
import heroBg from "@/assets/hero-sport-bg.jpg";

export function SportHeroSection() {
  return (
    <section className="relative w-full min-h-[600px] md:min-h-[700px] overflow-hidden flex items-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-60"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      {/* Radial glow overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div
        className="absolute top-1/2 right-1/3 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(17 100% 50% / 0.4), transparent 70%)" }}
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-accent/40 pointer-events-none"
          style={{
            left: `${20 + i * 12}%`,
            top: `${30 + (i % 3) * 20}%`,
            animation: `float-particle ${3 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}

      <div className="container relative z-10 px-4 md:px-6 flex flex-col md:flex-row items-center gap-8 py-16">
        {/* Text content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="flex-1 max-w-xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 mb-6">
            <ShieldCheck className="w-4 h-4 text-accent" />
            <span className="text-xs font-bold text-accent uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              Proteção Garantida
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] text-white mb-4" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            COMPRA <span className="text-gradient-primary">100% SEGURA</span> E{" "}
            <span className="italic">GARANTIDA</span>
          </h1>

          <p className="text-white/70 text-base md:text-lg mb-8 max-w-md" style={{ fontFamily: "'Exo 2', sans-serif" }}>
            Equipamentos esportivos premium com entrega rastreada e blindagem digital em todas as transações.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/produtos">
              <button className="btn-neon h-12 px-8 rounded-lg text-white flex items-center gap-2">
                COMPRAR AGORA
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link to="/colecoes">
              <button className="btn-neon-outline h-12 px-8 rounded-lg flex items-center gap-2 text-white border-white/30 hover:bg-white/10">
                VER COLEÇÃO
              </button>
            </Link>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
