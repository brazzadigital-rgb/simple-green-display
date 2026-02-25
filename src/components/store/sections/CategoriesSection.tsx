import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
}

interface JewelConfig {
  enabled: boolean;
  color: "gold" | "rose" | "silver";
  reflexIntensity: "low" | "medium" | "high";
  reflexFrequency: "rare" | "normal";
  shineTap: boolean;
  activeHighlight: boolean;
}

const defaultJewelConfig: JewelConfig = {
  enabled: true,
  color: "gold",
  reflexIntensity: "medium",
  reflexFrequency: "normal",
  shineTap: true,
  activeHighlight: true,
};

const colorPalettes = {
  gold: {
    ring: "linear-gradient(135deg, hsl(40,60%,70%) 0%, hsl(38,80%,85%) 20%, hsl(35,50%,60%) 40%, hsl(42,70%,80%) 60%, hsl(30,55%,65%) 80%, hsl(40,60%,75%) 100%)",
    glow: "hsla(40,70%,70%,0.3)",
    reflex: "hsla(45,80%,97%,VAR)",
    facet: "hsla(45,100%,95%,1)",
  },
  rose: {
    ring: "linear-gradient(135deg, hsl(350,50%,75%) 0%, hsl(340,60%,85%) 20%, hsl(355,40%,65%) 40%, hsl(345,55%,80%) 60%, hsl(350,45%,70%) 80%, hsl(340,50%,78%) 100%)",
    glow: "hsla(350,60%,75%,0.3)",
    reflex: "hsla(340,70%,97%,VAR)",
    facet: "hsla(345,100%,95%,1)",
  },
  silver: {
    ring: "linear-gradient(135deg, hsl(220,10%,75%) 0%, hsl(210,15%,88%) 20%, hsl(215,8%,65%) 40%, hsl(220,12%,82%) 60%, hsl(210,10%,70%) 80%, hsl(220,10%,78%) 100%)",
    glow: "hsla(220,15%,75%,0.3)",
    reflex: "hsla(210,40%,98%,VAR)",
    facet: "hsla(215,50%,96%,1)",
  },
};

const intensityMap = { low: 0.35, medium: 0.55, high: 0.75 };
const frequencyMap = { rare: 10000, normal: 7000 };

function StudioReflexOverlay({
  config,
  index,
  triggerShine,
}: {
  config: JewelConfig;
  index: number;
  triggerShine: number;
}) {
  const [animating, setAnimating] = useState(false);
  const [facets, setFacets] = useState<{ x: number; y: number; id: number }[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const facetIdRef = useRef(0);
  const palette = colorPalettes[config.color];
  const opacity = intensityMap[config.reflexIntensity];
  const interval = frequencyMap[config.reflexFrequency];

  const runShine = useCallback(() => {
    setAnimating(true);
    // Spawn 2-3 micro facets during the shine
    const numFacets = 3 + Math.floor(Math.random() * 3);
    const newFacets = Array.from({ length: numFacets }, () => ({
      x: 15 + Math.random() * 70,
      y: 8 + Math.random() * 50,
      id: facetIdRef.current++,
    }));
    setFacets(newFacets);

    setTimeout(() => {
      setAnimating(false);
      setFacets([]);
    }, 1500);
  }, []);

  // Idle cycle
  useEffect(() => {
    if (!config.enabled) return;
    // Stagger start per index
    const initialDelay = index * 1200 + Math.random() * 2000;
    const startTimer = setTimeout(() => {
      runShine();
      timerRef.current = setInterval(() => {
        runShine();
      }, interval + Math.random() * 3000);
    }, initialDelay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [config.enabled, interval, index, runShine]);

  // Tap-triggered shine
  useEffect(() => {
    if (triggerShine > 0 && config.shineTap) {
      runShine();
    }
  }, [triggerShine, config.shineTap, runShine]);

  if (!config.enabled) return null;

  const reflexColor = palette.reflex.replace("VAR", String(opacity));

  return (
    <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none studio-reflex-container">
      {/* Crescent highlight — the "softbox" reflex */}
      <div
        className={`absolute inset-0 rounded-full ${animating ? "studio-reflex-sweep" : "opacity-0"}`}
        style={{
          background: `radial-gradient(ellipse 80% 50% at 30% 25%, ${reflexColor} 0%, transparent 65%)`,
          mixBlendMode: "soft-light",
        }}
      />

      {/* Micro facet sparkles */}
      {facets.map((f) => (
        <span
          key={f.id}
          className="absolute studio-facet-flash"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: 5,
            height: 5,
            background: palette.facet,
            borderRadius: "50%",
            boxShadow: `0 0 6px 3px ${palette.facet}`,
          }}
        />
      ))}
    </div>
  );
}

function JewelRing({
  children,
  index,
  config,
  isActive,
}: {
  children: React.ReactNode;
  index: number;
  config: JewelConfig;
  isActive: boolean;
}) {
  const [tapCount, setTapCount] = useState(0);
  const [tapped, setTapped] = useState(false);
  const palette = colorPalettes[config.color];

  const handleTap = useCallback(() => {
    if (!config.shineTap) return;
    setTapCount((c) => c + 1);
    setTapped(true);
    setTimeout(() => setTapped(false), 800);
  }, [config.shineTap]);

  if (!config.enabled) {
    return (
      <div className="relative rounded-full p-[2px] bg-gradient-to-br from-border to-border">
        <div className="rounded-full p-[1px] bg-transparent">{children}</div>
      </div>
    );
  }

  const glowOpacity = tapped ? 0.85 : isActive && config.activeHighlight ? 0.7 : 0.45;

  return (
    <motion.div
      className="relative"
      whileTap={config.shineTap ? { scale: 0.985 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onTapStart={handleTap}
    >
      {/* Outer glow */}
      <div
        className="absolute inset-[-3px] rounded-full transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle, ${palette.glow} 60%, transparent 70%)`,
          filter: "blur(4px)",
          opacity: glowOpacity,
        }}
      />

      {/* Metallic gradient ring */}
      <div
        className="relative rounded-full p-[3px]"
        style={{
          background: palette.ring,
          backgroundSize: "200% 200%",
          animation: "jewel-shimmer 4s ease-in-out infinite",
        }}
      >
        {/* Inner separator */}
        <div className="rounded-full p-[1px] bg-gradient-to-b from-white/30 to-transparent relative">
          {children}
          {/* Studio reflex overlay — on top of image */}
          <StudioReflexOverlay config={config} index={index} triggerShine={tapCount} />
        </div>
      </div>
    </motion.div>
  );
}

export function CategoriesSection() {
  const [collections, setCollections] = useState<Category[]>([]);
  const [jewelConfig, setJewelConfig] = useState<JewelConfig>(defaultJewelConfig);
  const location = useLocation();

  useEffect(() => {
    const fetchData = async () => {
      const [collectionsRes, settingsRes] = await Promise.all([
        supabase
          .from("collections")
          .select("id, name, slug, image_url")
          .eq("is_active", true)
          .order("sort_order")
          .limit(12),
        supabase
          .from("store_settings")
          .select("key, value")
          .in("key", [
            "jewel_enabled",
            "jewel_color",
            "jewel_reflex_intensity",
            "jewel_reflex_frequency",
            "jewel_shine_tap",
            "jewel_active_highlight",
          ]),
      ]);

      setCollections((collectionsRes.data as Category[]) || []);

      if (settingsRes.data) {
        const map: Record<string, string> = {};
        settingsRes.data.forEach((s: any) => {
          map[s.key] = s.value;
        });
        setJewelConfig({
          enabled: map.jewel_enabled !== "false",
          color: (map.jewel_color as JewelConfig["color"]) || "gold",
          reflexIntensity: (map.jewel_reflex_intensity as JewelConfig["reflexIntensity"]) || "medium",
          reflexFrequency: (map.jewel_reflex_frequency as JewelConfig["reflexFrequency"]) || "normal",
          shineTap: map.jewel_shine_tap !== "false",
          activeHighlight: map.jewel_active_highlight !== "false",
        });
      }
    };
    fetchData();
  }, []);

  const activeSlug = useMemo(() => {
    const match = location.pathname.match(/^\/colecao\/(.+)/);
    return match ? match[1] : null;
  }, [location.pathname]);

  if (collections.length === 0) return null;

  return (
    <section className="py-8 md:py-16 bg-background">
      <div className="md:container">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center font-display text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-foreground mb-10 md:mb-12"
        >
          Categorias
        </motion.h3>

        <div
          className="flex gap-3 px-3 overflow-x-auto no-scrollbar snap-x snap-mandatory justify-start sm:justify-center sm:flex-wrap sm:px-2 sm:gap-4 md:gap-8"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {collections.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.05,
                type: "spring",
                stiffness: 260,
                damping: 20,
              }}
              className="flex-shrink-0 snap-center"
            >
              <Link
                to={`/colecao/${cat.slug}`}
                className="flex flex-col items-center gap-2 sm:gap-3 group"
              >
                <JewelRing
                  index={i}
                  config={jewelConfig}
                  isActive={activeSlug === cat.slug}
                >
                  <div className="w-[75px] h-[75px] sm:w-[90px] sm:h-[90px] md:w-[130px] md:h-[130px] lg:w-[150px] lg:h-[150px] rounded-full overflow-hidden bg-card">
                    {cat.image_url ? (
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-110"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </div>
                </JewelRing>
                <span className="font-sans text-[9px] sm:text-[10px] md:text-sm font-bold uppercase tracking-[0.1em] text-foreground/70 group-hover:text-accent transition-colors duration-300 text-center leading-tight max-w-[80px] sm:max-w-[100px] md:max-w-[140px]">
                  {cat.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
