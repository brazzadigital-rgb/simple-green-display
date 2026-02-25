import { ShoppingBag, Search, User, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useHeaderState, NAV_LINKS } from "./useHeaderState";
import { Topbar, HeaderLogo, IconAction, MobileDrawer, SearchBar } from "./HeaderShared";

/**
 * Editorial Minimal — Centered logo, icons on sides, search via drawer.
 */
export function HeaderEditorialMinimal() {
  const h = useHeaderState();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    h.handleSearch(e);
    setSearchOpen(false);
  };

  return (
    <>
      {h.topbarEnabled && <Topbar text={h.topbarText} variant="accent" bgColor={h.topbarBgColor} textColor={h.topbarTextColor} />}

      <header className="sticky top-0 z-50 bg-background transition-all duration-300 border-b border-border/30">
        {/* Main bar: LEFT actions — CENTER logo — RIGHT actions */}
        <div className="container relative flex items-center justify-between h-[68px]">
          {/* Left side */}
          <div className="flex items-center gap-1 w-[100px] md:w-[140px]">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-10 h-10 min-h-[unset] min-w-[unset]"
              onClick={() => h.setMobileMenuOpen(!h.mobileMenuOpen)}
            >
              {h.mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </Button>
            <IconAction
              icon={Search}
              onClick={() => setSearchOpen(!searchOpen)}
              className="hover:bg-muted/50 text-foreground/60 hover:text-accent"
            />
            {h.accountEnabled && (
              <IconAction icon={User} href={h.accountLink} className="hidden md:flex hover:bg-muted/50 text-foreground/60 hover:text-accent" />
            )}
          </div>

          {/* Center logo — absolutely positioned for true centering */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <HeaderLogo logoUrl={h.logoUrl} storeName={h.storeName} height={38} maxWidth={160} />
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 w-[100px] md:w-[140px] justify-end">
            {h.trackEnabled && (
              <IconAction icon={MapPin} href="/rastreamento" className="hidden md:flex hover:bg-muted/50 text-foreground/60 hover:text-accent" />
            )}
            {h.cartEnabled && (
              <IconAction icon={ShoppingBag} badge={h.itemCount} onClick={() => h.setIsOpen(true)} className="hover:bg-muted/50 text-foreground/60 hover:text-accent" />
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
              className="overflow-hidden border-t border-border/20"
            >
              <div className="container py-3">
                <SearchBar
                  value={h.searchQuery}
                  onChange={h.setSearchQuery}
                  onSubmit={handleSearchSubmit}
                  className="max-w-xl mx-auto"
                  inputClassName="border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop nav */}
        <nav className="hidden md:block border-t border-border/20">
          <div className="container flex items-center justify-center gap-10 h-10">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative font-sans text-[11px] font-semibold uppercase tracking-[0.15em] transition-colors duration-200 ${
                  h.location.pathname === link.to
                    ? "text-accent"
                    : "text-foreground/50 hover:text-foreground"
                }`}
              >
                {link.label}
                {h.location.pathname === link.to && (
                  <motion.div
                    layoutId="editorial-nav-pill"
                    className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </div>
        </nav>

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
