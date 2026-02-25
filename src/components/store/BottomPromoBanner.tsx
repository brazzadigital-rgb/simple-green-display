import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface Banner {
  id: string;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  link: string | null;
  border_radius: string | null;
  full_width: boolean;
  is_active: boolean;
}

export function BottomPromoBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("banners")
        .select("*")
        .eq("location", "bottom")
        .eq("is_active", true)
        .order("sort_order");
      setBanners((data as Banner[]) || []);
    };
    fetch();
  }, []);

  if (banners.length === 0) return null;

  return (
    <section className="py-6 md:py-10">
      {banners.map((b) => {
        const desktopImg = b.desktop_image_url;
        const mobileImg = b.mobile_image_url || desktopImg;
        if (!desktopImg) return null;

        const radius = b.border_radius ? `${b.border_radius}px` : "0";
        const content = (
          <picture className="block w-full">
            <source media="(min-width: 768px)" srcSet={desktopImg} />
            <img
              src={mobileImg || desktopImg}
              alt=""
              className="w-full h-auto"
              style={{ borderRadius: radius }}
              loading="lazy"
            />
          </picture>
        );

        return (
          <div key={b.id} className={b.full_width ? "w-full" : "container"}>
            {b.link ? (
              <Link to={b.link} className="block hover:opacity-95 transition-opacity">
                {content}
              </Link>
            ) : content}
          </div>
        );
      })}
    </section>
  );
}
