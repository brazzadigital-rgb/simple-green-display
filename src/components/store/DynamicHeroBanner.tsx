import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  link: string | null;
  overlay_opacity: number;
  show_text: boolean;
  content_position: string;
  height: string | null;
  updated_at: string;
}

/** Append cache-bust param based on updated_at */
function cacheBust(url: string | null, updatedAt: string): string {
  if (!url) return "";
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${new Date(updatedAt).getTime()}`;
}

/** Preload an image and resolve when ready */
function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!src) { resolve(); return; }
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject();
    img.src = src;
  });
}

const SLIDE_DURATION = 5000;

function SliderProgressBar({ count, current, onSelect }: { count: number; current: number; onSelect: (i: number) => void }) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setProgress(0);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      setProgress(Math.min(elapsed / SLIDE_DURATION, 1));
      if (elapsed < SLIDE_DURATION) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [current]);

  if (count <= 1) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 flex gap-1 px-4 md:px-8 pb-4">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/25 transition-all min-h-[unset] min-w-[unset] hover:bg-white/35 cursor-pointer"
        >
          <div
            className="h-full rounded-full bg-white"
            style={{
              width: i === current ? `${progress * 100}%` : i < current ? "100%" : "0%",
              transition: i === current ? "none" : "width 0.3s ease",
            }}
          />
        </button>
      ))}
    </div>
  );
}

export function DynamicHeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [current, setCurrent] = useState(0);
  const [imagesReady, setImagesReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAndPreload = useCallback(async () => {
    setLoading(true);
    setImagesReady(false);

    const { data } = await supabase
      .from("banners")
      .select("*")
      .eq("location", "hero")
      .eq("is_active", true)
      .order("sort_order");

    const list = (data as Banner[]) || [];
    setBanners(list);

    if (list.length === 0) {
      setLoading(false);
      return;
    }

    // Preload first banner's images before showing
    const first = list[0];
    const desktopSrc = cacheBust(first.desktop_image_url, first.updated_at);
    const mobileSrc = cacheBust(first.mobile_image_url || first.desktop_image_url, first.updated_at);

    try {
      await Promise.all([preloadImage(desktopSrc), preloadImage(mobileSrc)]);
    } catch {
      // Even if preload fails, still show the banner
    }

    setImagesReady(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndPreload();
  }, [fetchAndPreload]);

  // Auto-rotate
  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % banners.length), SLIDE_DURATION);
    return () => clearInterval(timer);
  }, [banners.length]);

  // Show skeleton while loading or images not ready
  if (loading || !imagesReady) {
    return (
      <section className="relative w-full overflow-hidden">
        <Skeleton className="w-full h-[280px] md:h-[480px] lg:h-[540px]" />
      </section>
    );
  }

  if (banners.length === 0) return null;

  const b = banners[current];
  const desktopImg = cacheBust(b.desktop_image_url, b.updated_at);
  const mobileImg = cacheBust(b.mobile_image_url || b.desktop_image_url, b.updated_at);
  const heightStyle = b.height && b.height !== "adaptive" ? { minHeight: `${b.height}px` } : {};

  const positionClass = {
    left: "items-start text-left",
    center: "items-center text-center",
    right: "items-end text-right",
  }[b.content_position] || "items-start text-left";

  return (
    <section className="relative w-full overflow-hidden">
      {/* Mobile */}
      <div className="md:hidden relative w-full">
        {/* Use a stable first image to hold layout height */}
        <img
          src={cacheBust(banners[0].mobile_image_url || banners[0].desktop_image_url, banners[0].updated_at) || cacheBust(banners[0].desktop_image_url, banners[0].updated_at)}
          alt=""
          className="w-full h-auto block invisible"
          aria-hidden="true"
        />
        <AnimatePresence initial={false}>
          <motion.img
            key={b.id + "-mobile"}
            src={mobileImg || desktopImg}
            alt={b.title || ""}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, rgba(0,0,0,${b.overlay_opacity / 100 * 1.2}), rgba(0,0,0,${b.overlay_opacity / 100 * 0.4}), transparent)`,
          }}
        />
        {b.show_text && (
          <AnimatePresence mode="wait">
            <motion.div
              key={b.id + "-mobile-text"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`absolute bottom-0 left-0 right-0 z-10 p-5 sm:p-8 max-w-lg flex flex-col ${positionClass}`}
            >
              {b.title && <h2 className="font-display text-2xl sm:text-3xl font-bold leading-tight text-white mb-2">{b.title}</h2>}
              {b.subtitle && <p className="text-xs sm:text-sm text-white/70 font-sans mb-4 leading-relaxed">{b.subtitle}</p>}
              {b.cta_text && b.link && (
                <Link to={b.link}>
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full shine font-sans h-11 px-6 text-xs font-bold uppercase tracking-[0.15em] glow-orange transition-all duration-300 w-full sm:w-auto">
                    {b.cta_text} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        )}
        <SliderProgressBar count={banners.length} current={current} onSelect={setCurrent} />
      </div>

      {/* Desktop */}
      <div className="relative w-full hidden md:block" style={heightStyle}>
        {/* Stable layout holder */}
        <img
          src={cacheBust(banners[0].desktop_image_url, banners[0].updated_at)}
          alt=""
          className="w-full h-auto block invisible"
          aria-hidden="true"
        />
        <AnimatePresence initial={false}>
          <motion.img
            key={b.id + "-desktop"}
            src={desktopImg}
            alt={b.title || ""}
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </AnimatePresence>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, rgba(0,0,0,${b.overlay_opacity / 100 * 1.2}), rgba(0,0,0,${b.overlay_opacity / 100 * 0.4}), transparent)`,
          }}
        />
        {b.show_text && (
          <AnimatePresence mode="wait">
            <motion.div
              key={b.id + "-desktop-text"}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`absolute inset-0 z-10 p-5 sm:p-8 md:p-12 lg:p-16 max-w-lg flex flex-col justify-center ${positionClass}`}
            >
              {b.title && <h2 className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-white mb-2 md:mb-3">{b.title}</h2>}
              {b.subtitle && <p className="text-xs sm:text-sm md:text-base text-white/70 font-sans mb-4 md:mb-6 leading-relaxed">{b.subtitle}</p>}
              {b.cta_text && b.link && (
                <Link to={b.link}>
                  <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-full shine font-sans h-11 md:h-12 px-6 md:px-10 text-xs md:text-sm font-bold uppercase tracking-[0.15em] glow-orange transition-all duration-300 hover:glow-orange-lg w-full sm:w-auto">
                    {b.cta_text} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              )}
            </motion.div>
          </AnimatePresence>
        )}
        <SliderProgressBar count={banners.length} current={current} onSelect={setCurrent} />
      </div>
    </section>
  );
}
