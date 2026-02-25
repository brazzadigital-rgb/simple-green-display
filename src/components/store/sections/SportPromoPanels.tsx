import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import mascotImg from "@/assets/mascot-sport.png";

interface PromoPanel {
  id: string;
  title: string;
  subtitle: string;
  cta_text: string;
  link: string | null;
  gradient: string;
  image_url: string;
  bg_image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const fallbackPanels: PromoPanel[] = [
  {
    id: "1",
    title: "ACESSÓRIOS CERTOS",
    subtitle: "TREINO SEM LIMITES",
    cta_text: "APROVEITE!",
    link: "/produtos",
    gradient: "from-gray-900 via-gray-800 to-gray-900",
    image_url: "",
    bg_image_url: "/promo-panels/bg-acessorios.jpg",
    sort_order: 0,
    is_active: true,
  },
  {
    id: "2",
    title: "SIGA-NOS NAS",
    subtitle: "REDES SOCIAIS",
    cta_text: "SEGUIR!",
    link: "#",
    gradient: "from-sport-orange/90 via-sport-orange to-red-600",
    image_url: "",
    bg_image_url: "/promo-panels/bg-redes-sociais.jpg",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "3",
    title: "RASTREIE SEU",
    subtitle: "PEDIDO",
    cta_text: "RASTREAR!",
    link: "/rastreamento",
    gradient: "from-gray-800 via-gray-700 to-gray-900",
    image_url: "",
    bg_image_url: "/promo-panels/bg-rastreio.jpg",
    sort_order: 2,
    is_active: true,
  },
];

export function SportPromoPanels() {
  const { data: panels } = useQuery({
    queryKey: ["promo-panels"],
    queryFn: async () => {
      const { data } = await supabase
        .from("promo_panels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return (data as PromoPanel[]) || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const displayPanels = panels && panels.length > 0 ? panels : fallbackPanels;

  return (
    <section className="container px-4 py-10 md:py-14">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayPanels.map((panel, i) => (
          <motion.div
            key={panel.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <Link to={panel.link || "#"} className="block group">
              <div
                className={`relative overflow-hidden rounded-2xl ${!panel.bg_image_url ? `bg-gradient-to-br ${panel.gradient}` : ""} p-6 min-h-[200px] flex flex-col justify-between border border-white/10 sport-card-glow`}
              >
                {/* Background image */}
                {panel.bg_image_url && (
                  <>
                    <img
                      src={panel.bg_image_url}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40" />
                  </>
                )}

                {/* Decorative image (only if panel has a custom image) */}
                {panel.image_url && panel.image_url !== "placeholder" && panel.image_url !== "" && (
                  <img
                    src={panel.image_url}
                    alt=""
                    className="absolute right-0 bottom-0 h-[160px] opacity-20 group-hover:opacity-30 transition-opacity"
                  />
                )}

                <div className="relative z-10">
                  <h3 className="font-display text-lg font-black text-white leading-tight">
                    {panel.title}
                  </h3>
                  <p className={`font-display text-xl font-black italic ${panel.gradient.includes("orange") || panel.gradient.includes("red") ? "text-white/90" : "text-accent"}`}>
                    {panel.subtitle}
                  </p>
                </div>

                <div className="relative z-10 mt-4">
                  <span className="inline-flex items-center gap-2 btn-neon px-5 py-2.5 rounded-lg text-white text-xs">
                    {panel.cta_text || "VER MAIS"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
