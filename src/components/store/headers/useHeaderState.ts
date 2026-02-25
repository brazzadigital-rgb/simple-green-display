import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCart } from "@/hooks/useCart";

export const NAV_LINKS = [
  { label: "Início", to: "/" },
  { label: "Catálogo", to: "/produtos" },
  { label: "Ofertas", to: "/ofertas" },
  { label: "Contato", to: "/contato" },
];

export function useHeaderState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, isAdmin } = useAuth();
  const { getSetting, isEnabled } = useStoreSettings();
  const { setIsOpen, itemCount } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/busca?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const logoUrl = getSetting("logo_url", "");
  const logoMobileUrl = getSetting("logo_mobile_url", "") || logoUrl;
  const storeName = getSetting("store_name", "STORE");
  const accountEnabled = getSetting("header_account_enabled", "true") === "true";
  const trackEnabled = getSetting("header_track_enabled", "true") === "true";
  const cartEnabled = getSetting("header_cart_enabled", "true") === "true";
  const topbarEnabled = isEnabled("topbar_enabled");
  const topbarText = getSetting("topbar_text", "✈️ Frete Grátis para todo Brasil");
  const topbarBgColor = getSetting("header_topbar_bg_color", "");
  const topbarTextColor = getSetting("header_topbar_text_color", "");
  const accountLink = user ? (isAdmin ? "/admin" : "/conta") : "/auth";

  return {
    searchQuery, setSearchQuery,
    mobileMenuOpen, setMobileMenuOpen,
    scrolled,
    user, isAdmin,
    handleSearch,
    logoUrl, logoMobileUrl, storeName,
    accountEnabled, trackEnabled, cartEnabled,
    topbarEnabled, topbarText, topbarBgColor, topbarTextColor,
    accountLink,
    setIsOpen, itemCount,
    location, navigate,
  };
}
