import { Link } from "react-router-dom";
import { ShoppingBag, Search, User, MapPin, Menu, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useHeaderState, NAV_LINKS } from "./useHeaderState";

/**
 * Mobile drawer shared across all header variants.
 */
export function MobileDrawer({
  open,
  onClose,
  logoUrl,
  storeName,
  accountEnabled,
  trackEnabled,
  accountLink,
}: {
  open: boolean;
  onClose: () => void;
  logoUrl: string;
  storeName: string;
  accountEnabled: boolean;
  trackEnabled: boolean;
  accountLink: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] z-50 md:hidden bg-background overflow-y-auto shadow-2xl"
          >
            {/* Header */}
            <div className="p-5 border-b border-border flex items-center justify-between">
              <Link to="/" onClick={onClose} className="shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-8 max-w-[120px] object-contain" />
                ) : (
                  <span className="font-display text-lg font-bold uppercase text-foreground">{storeName}</span>
                )}
              </Link>
              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full min-h-[unset] min-w-[unset]" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick actions */}
            <div className="px-4 pt-4 space-y-2">
              {accountEnabled && (
                <Link to={accountLink} onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <User className="w-5 h-5 text-accent shrink-0" />
                  <span className="text-sm font-sans font-semibold text-foreground">Minha conta</span>
                </Link>
              )}
              {trackEnabled && (
                <Link to="/rastreamento" onClick={onClose} className="flex items-center gap-3 p-3.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <MapPin className="w-5 h-5 text-accent shrink-0" />
                  <span className="text-sm font-sans font-semibold text-foreground">Rastrear pedido</span>
                </Link>
              )}
            </div>

            {/* Nav links */}
            <nav className="p-4 flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className="flex items-center justify-between py-3.5 px-4 rounded-xl font-sans text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  {link.label}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * Topbar component.
 */
export function Topbar({ text, variant = "accent", bgColor, textColor }: { text: string; variant?: "accent" | "white"; bgColor?: string; textColor?: string }) {
  const hasBg = bgColor && bgColor.length > 3;
  const hasText = textColor && textColor.length > 3;

  return (
    <div
      className={!hasBg ? (variant === "white" ? "bg-white" : "bg-accent") : undefined}
      style={hasBg ? { backgroundColor: `hsl(${bgColor})` } : undefined}
    >
      <div className="container flex items-center justify-center h-8">
        <p
          className={`text-[11px] font-sans font-medium tracking-widest uppercase truncate text-center ${
            !hasText ? (variant === "white" ? "text-primary" : "text-accent-foreground/90") : ""
          }`}
          style={hasText ? { color: `hsl(${textColor})` } : undefined}
        >
          {text}
        </p>
      </div>
    </div>
  );
}

/**
 * Logo component.
 */
export function HeaderLogo({
  logoUrl,
  storeName,
  height = 40,
  maxWidth = 140,
  textColor,
}: {
  logoUrl: string;
  storeName: string;
  height?: number;
  maxWidth?: number;
  textColor?: string;
}) {
  return (
    <Link to="/" className="shrink-0 flex items-center">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={storeName}
          className="object-contain"
          style={{ height, maxWidth }}
        />
      ) : (
        <span
          className="font-display text-xl font-bold uppercase tracking-tight"
          style={{ color: textColor || "hsl(var(--foreground))" }}
        >
          {storeName}
        </span>
      )}
    </Link>
  );
}

/**
 * Desktop nav bar.
 */
export function DesktopNav({
  currentPath,
  textColor,
  borderClass = "border-t border-border/30",
}: {
  currentPath: string;
  textColor?: string;
  borderClass?: string;
}) {
  return (
    <nav className={`hidden md:block ${borderClass}`}>
      <div className="container flex items-center justify-center gap-8 h-10">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`relative font-sans text-[12px] font-semibold uppercase tracking-[0.12em] transition-colors duration-200 ${
              currentPath === link.to ? "opacity-100" : "opacity-60 hover:opacity-100"
            }`}
            style={{ color: textColor || (currentPath === link.to ? "hsl(var(--accent))" : "hsl(var(--foreground))") }}
          >
            {link.label}
            {currentPath === link.to && (
              <motion.div
                layoutId="header-nav-indicator"
                className="absolute -bottom-px left-0 right-0 h-[2px] bg-accent rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/**
 * Search bar component.
 */
export function SearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = "O que está buscando?",
  className = "",
  inputClassName = "",
  buttonClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  buttonClassName?: string;
}) {
  return (
    <form onSubmit={onSubmit} className={className}>
      <div className="relative w-full">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-11 rounded-full text-sm font-sans pl-5 pr-12 focus:outline-none transition-all duration-300 ${inputClassName}`}
        />
        <button
          type="submit"
          className={`absolute right-1.5 top-1.5 w-8 h-8 rounded-full bg-accent hover:bg-accent/90 flex items-center justify-center min-h-[unset] min-w-[unset] transition-colors ${buttonClassName}`}
        >
          <Search className="w-4 h-4 text-accent-foreground" />
        </button>
      </div>
    </form>
  );
}

/**
 * Icon action button with optional badge.
 */
export function IconAction({
  icon: Icon,
  badge,
  onClick,
  href,
  color,
  className = "",
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: number;
  onClick?: () => void;
  href?: string;
  color?: string;
  className?: string;
}) {
  const style = color ? { color } : undefined;
  const inner = (
    <>
      <Icon className="w-[18px] h-[18px]" style={style} />
      {badge !== undefined && badge > 0 && (
        <motion.span
          key={badge}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="absolute -top-1 -right-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold w-[16px] h-[16px] flex items-center justify-center font-sans min-h-[unset] min-w-[unset]"
        >
          {badge}
        </motion.span>
      )}
    </>
  );

  const cls = `relative w-9 h-9 flex items-center justify-center rounded-full transition-colors duration-200 min-h-[unset] min-w-[unset] ${className}`;

  if (href) {
    return <Link to={href} className={cls}>{inner}</Link>;
  }
  return <button onClick={onClick} className={cls}>{inner}</button>;
}
