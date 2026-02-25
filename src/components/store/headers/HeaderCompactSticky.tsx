import { ShoppingBag, Search, User, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useHeaderState, NAV_LINKS } from "./useHeaderState";
import { Topbar, HeaderLogo, IconAction, MobileDrawer } from "./HeaderShared";

/**
 * Compact Sticky Pro — Shrinks on scroll, inline nav, dark theme, search via drawer.
 */
export function HeaderCompactSticky() {
  const h = useHeaderState();
  const [searchOpen, setSearchOpen] = useState(false);

  const bgColor = "hsl(var(--header-bg))";
  const txtColor = "hsl(var(--header-text))";

  const handleSearchSubmit = (e: React.FormEvent) => {
    h.handleSearch(e);
    setSearchOpen(false);
  };

  return (
    <>
      {h.topbarEnabled && !h.scrolled && <Topbar text={h.topbarText} variant="white" bgColor={h.topbarBgColor} textColor={h.topbarTextColor} />}

      <header
        className="sticky top-0 z-50 transition-all duration-500"
        style={{
          backgroundColor: bgColor,
          boxShadow: h.scrolled ? "0 2px 20px rgba(0,0,0,0.15)" : "none",
        }}
      >
        <div
          className="container flex items-center justify-between gap-4 transition-all duration-300"
          style={{ height: h.scrolled ? 52 : 64 }}
        >
          {/* Left: menu + logo */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-9 h-9 min-h-[unset] min-w-[unset]"
              style={{ color: txtColor }}
              onClick={() => h.setMobileMenuOpen(!h.mobileMenuOpen)}
            >
              {h.mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </Button>
            <HeaderLogo
              logoUrl={h.logoUrl}
              storeName={h.storeName}
              height={h.scrolled ? 28 : 34}
              maxWidth={130}
              textColor={txtColor}
            />
          </div>

          {/* Desktop nav inline */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative font-sans text-[11px] font-semibold uppercase tracking-[0.12em] transition-opacity duration-200 ${
                  h.location.pathname === link.to ? "opacity-100" : "opacity-55 hover:opacity-100"
                }`}
                style={{ color: txtColor }}
              >
                {link.label}
                {h.location.pathname === link.to && (
                  <motion.div
                    layoutId="compact-nav-pill"
                    className="absolute -bottom-1 left-0 right-0 h-[2px] bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <IconAction
              icon={Search}
              onClick={() => setSearchOpen(!searchOpen)}
              color={txtColor}
              className="hover:bg-white/10"
            />
            {h.accountEnabled && (
              <IconAction icon={User} href={h.accountLink} color={txtColor} className="hidden md:flex hover:bg-white/10" />
            )}
            {h.trackEnabled && (
              <IconAction icon={MapPin} href="/rastreamento" color={txtColor} className="hidden md:flex hover:bg-white/10" />
            )}
            {h.cartEnabled && (
              <IconAction icon={ShoppingBag} badge={h.itemCount} onClick={() => h.setIsOpen(true)} color={txtColor} className="hover:bg-white/10" />
            )}
          </div>
        </div>

        {/* Search drawer */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              style={{ backgroundColor: bgColor }}
            >
              <form onSubmit={handleSearchSubmit} className="container py-3">
                <div className="relative max-w-xl mx-auto">
                  <input
                    type="text"
                    value={h.searchQuery}
                    onChange={(e) => h.setSearchQuery(e.target.value)}
                    placeholder="O que está buscando?"
                    autoFocus
                    className="w-full h-10 rounded-full border-0 bg-white/15 text-sm font-sans pl-5 pr-12 focus:outline-none focus:ring-2 focus:ring-accent/30 placeholder:text-white/50"
                    style={{ color: txtColor }}
                  />
                  <button
                    type="submit"
                    className="absolute right-1.5 top-1 w-8 h-8 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center min-h-[unset] min-w-[unset] transition-colors"
                  >
                    <Search className="w-4 h-4 text-accent-foreground" />
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile drawer */}
        <MobileDrawer
          open={h.mobileMenuOpen}
          onClose={() => h.setMobileMenuOpen(false)}
          logoUrl={h.logoUrl}
          storeName={h.storeName}
          accountEnabled={h.accountEnabled}
          trackEnabled={h.trackEnabled}
          accountLink={h.accountLink}
        />
      </header>
    </>
  );
}
