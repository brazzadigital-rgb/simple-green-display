import { ShoppingBag, User, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeaderState } from "./useHeaderState";
import { Topbar, HeaderLogo, DesktopNav, SearchBar, IconAction, MobileDrawer } from "./HeaderShared";

/**
 * Boutique Clean — Light porcelain background, minimal borders, elegant search.
 */
export function HeaderBoutiqueClean() {
  const h = useHeaderState();

  return (
    <>
      {h.topbarEnabled && <Topbar text={h.topbarText} variant="accent" bgColor={h.topbarBgColor} textColor={h.topbarTextColor} />}

      <header className="sticky top-0 z-50 bg-background border-b border-border/40 transition-all duration-300">
        {/* Main bar */}
        <div className="container flex items-center justify-between gap-4 h-[68px]">
          {/* Mobile: menu + logo */}
          <div className="flex items-center gap-2 md:gap-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden w-10 h-10 min-h-[unset] min-w-[unset]"
              onClick={() => h.setMobileMenuOpen(!h.mobileMenuOpen)}
            >
              {h.mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </Button>
            <HeaderLogo logoUrl={h.logoUrl} storeName={h.storeName} height={38} maxWidth={140} />
          </div>

          {/* Desktop search */}
          <SearchBar
            value={h.searchQuery}
            onChange={h.setSearchQuery}
            onSubmit={h.handleSearch}
            className="hidden md:flex flex-1 max-w-xl mx-6"
            inputClassName="border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-accent/20"
          />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {h.accountEnabled && (
              <IconAction icon={User} href={h.accountLink} className="hidden md:flex hover:bg-muted/50 text-foreground/60 hover:text-accent" />
            )}
            {h.trackEnabled && (
              <IconAction icon={MapPin} href="/rastreamento" className="hidden md:flex hover:bg-muted/50 text-foreground/60 hover:text-accent" />
            )}
            {h.cartEnabled && (
              <IconAction icon={ShoppingBag} badge={h.itemCount} onClick={() => h.setIsOpen(true)} className="hover:bg-muted/50 text-foreground/60 hover:text-accent" />
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="md:hidden px-4 pb-3">
          <SearchBar
            value={h.searchQuery}
            onChange={h.setSearchQuery}
            onSubmit={h.handleSearch}
            inputClassName="border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground text-sm h-10 focus:ring-2 focus:ring-accent/20"
            className="w-full"
          />
        </div>

        {/* Desktop nav */}
        <DesktopNav currentPath={h.location.pathname} />

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
