import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Fallback static imports for when DB has no images yet
import promoRastreio from "@/assets/promo-rastreio.png";
import promoCartao from "@/assets/promo-cartao.png";
import promoRedes from "@/assets/promo-redes.png";

interface PromoPanel {
  id: string;
  image_url: string;
  alt_text: string;
  link: string | null;
  sort_order: number;
}

const fallbackPanels: PromoPanel[] = [
  { id: "f1", image_url: promoRastreio, alt_text: "Rastreie seu pedido", link: "/rastreamento", sort_order: 0 },
  { id: "f2", image_url: promoCartao, alt_text: "Pague pelo cartão com segurança", link: null, sort_order: 1 },
  { id: "f3", image_url: promoRedes, alt_text: "Siga nossas redes sociais", link: null, sort_order: 2 },
];

function PromoCard({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative group rounded-xl p-[1.5px] overflow-hidden hover:-translate-y-1 transition-transform duration-300">
      <div
        className="absolute inset-0 rounded-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: "conic-gradient(from var(--border-angle, 0deg), hsl(var(--accent)), hsl(var(--primary)), hsl(var(--accent)), hsl(var(--muted)), hsl(var(--accent)))",
          animation: "spin-border 4s linear infinite",
        }}
      />
      <div className="relative rounded-[10px] overflow-hidden">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover block"
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

export default function PromoTriplePanel() {
  const [panels, setPanels] = useState<PromoPanel[]>(fallbackPanels);

  useEffect(() => {
    supabase
      .from("promo_panels")
      .select("id, image_url, alt_text, link, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          // Only use DB panels that have images uploaded
          const withImages = data.filter((p) => p.image_url);
          if (withImages.length > 0) setPanels(withImages);
        }
      });
  }, []);

  if (panels.length === 0) return null;

  return (
    <section className="container px-4 py-8 md:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {panels.map((p) => {
          const card = <PromoCard src={p.image_url} alt={p.alt_text} />;
          return p.link ? (
            <Link key={p.id} to={p.link}>{card}</Link>
          ) : (
            <div key={p.id}>{card}</div>
          );
        })}
      </div>
    </section>
  );
}
