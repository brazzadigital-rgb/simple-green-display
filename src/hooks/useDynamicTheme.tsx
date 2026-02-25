import { useEffect, useState } from "react";
import { useStoreSettings } from "./useStoreSettings";

/**
 * Parse "H S% L%" → { h, s, l }
 */
function parseHSL(val: string): { h: number; s: number; l: number } | null {
  if (!val || val.length < 5) return null;
  const parts = val.replace(/%/g, "").split(/\s+/).map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return null;
  return { h: parts[0], s: parts[1], l: parts[2] };
}

function hsl(h: number, s: number, l: number) {
  return `${Math.round(h)} ${Math.round(Math.max(0, Math.min(100, s)))}% ${Math.round(Math.max(0, Math.min(100, l)))}%`;
}

/**
 * Auto-derive shade tokens from a base color.
 */
function deriveShades(base: { h: number; s: number; l: number }) {
  return {
    dark: hsl(base.h, base.s + 5, Math.max(base.l - 8, 5)),
    light: hsl(base.h, Math.max(base.s - 10, 0), Math.min(base.l + 15, 90)),
    foreground: base.l < 50 ? hsl(base.h, 20, 95) : hsl(base.h, 20, 10),
  };
}

function deriveSecondaryShades(base: { h: number; s: number; l: number }) {
  return {
    light: hsl(base.h, Math.max(base.s - 5, 0), Math.min(base.l + 5, 96)),
    soft: hsl(base.h, Math.max(base.s - 12, 0), Math.min(base.l + 8, 98)),
    foreground: hsl(base.h, Math.min(base.s + 15, 50), Math.max(base.l - 60, 12)),
  };
}

export function useDynamicTheme(): boolean {
  const { settings, loading } = useStoreSettings();
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (loading) return;

    const root = document.documentElement;

    // ─── Primary color ───
    const primaryParsed = parseHSL(settings.color_primary);
    if (primaryParsed) {
      const val = settings.color_primary;
      const shades = deriveShades(primaryParsed);
      root.style.setProperty("--primary", val);
      root.style.setProperty("--primary-dark", shades.dark);
      root.style.setProperty("--primary-light", shades.light);
      root.style.setProperty("--primary-foreground", shades.foreground);
      root.style.setProperty("--accent", val);
      root.style.setProperty("--accent-foreground", shades.foreground);
      root.style.setProperty("--ring", val);
      root.style.setProperty("--link", hsl(primaryParsed.h, primaryParsed.s, Math.min(primaryParsed.l + 5, 50)));
      root.style.setProperty("--sidebar-primary", val);
      root.style.setProperty("--sidebar-ring", val);
      // Glow effects
      root.style.setProperty("--glow-primary", `0 0 20px hsla(${primaryParsed.h}, ${primaryParsed.s}%, ${primaryParsed.l}%, 0.2)`);
      root.style.setProperty("--glow-primary-lg", `0 0 40px hsla(${primaryParsed.h}, ${primaryParsed.s}%, ${primaryParsed.l}%, 0.15), 0 0 80px hsla(${primaryParsed.h}, ${primaryParsed.s}%, ${primaryParsed.l}%, 0.08)`);

      // ─── Header colors (derived from primary) ───
      root.style.setProperty("--header-bg", shades.dark);
      root.style.setProperty("--header-text", shades.foreground);
      root.style.setProperty("--header-bg-hover", hsl(primaryParsed.h, primaryParsed.s + 3, Math.max(primaryParsed.l - 12, 3)));
    }

    // ─── Secondary color ───
    const secondaryParsed = parseHSL(settings.color_secondary);
    if (secondaryParsed) {
      const val = settings.color_secondary;
      const shades = deriveSecondaryShades(secondaryParsed);
      root.style.setProperty("--secondary", val);
      root.style.setProperty("--secondary-light", shades.light);
      root.style.setProperty("--secondary-soft", shades.soft);
      root.style.setProperty("--secondary-foreground", shades.foreground);
      root.style.setProperty("--muted", shades.light);
      root.style.setProperty("--border", hsl(secondaryParsed.h, Math.max(secondaryParsed.s - 15, 0), Math.min(secondaryParsed.l - 1, 90)));
      root.style.setProperty("--input", hsl(secondaryParsed.h, Math.max(secondaryParsed.s - 15, 0), Math.min(secondaryParsed.l - 1, 90)));
      root.style.setProperty("--sidebar-border", hsl(secondaryParsed.h, Math.max(secondaryParsed.s - 15, 0), Math.min(secondaryParsed.l - 1, 90)));
      root.style.setProperty("--sidebar-accent", shades.soft);
    }

    // ─── Background ───
    const bgParsed = parseHSL(settings.color_background);
    if (bgParsed) {
      const val = settings.color_background;
      root.style.setProperty("--background", val);
      root.style.setProperty("--card", hsl(bgParsed.h, bgParsed.s, Math.min(bgParsed.l + 2, 100)));
      root.style.setProperty("--popover", hsl(bgParsed.h, bgParsed.s, Math.min(bgParsed.l + 2, 100)));
      root.style.setProperty("--sidebar-background", hsl(bgParsed.h, bgParsed.s, Math.min(bgParsed.l + 2, 100)));
    }

    // ─── Text ───
    const textParsed = parseHSL(settings.color_text);
    if (textParsed) {
      const val = settings.color_text;
      root.style.setProperty("--foreground", val);
      root.style.setProperty("--card-foreground", val);
      root.style.setProperty("--popover-foreground", val);
      root.style.setProperty("--sidebar-foreground", val);
      root.style.setProperty("--muted-foreground", hsl(textParsed.h, Math.max(textParsed.s - 7, 0), Math.min(textParsed.l + 30, 60)));
    }

    // ─── Buttons (independent of primary) ───
    const buttonsParsed = parseHSL(settings.color_buttons);
    if (buttonsParsed) {
      root.style.setProperty("--buttons", settings.color_buttons);
      const btnShades = deriveShades(buttonsParsed);
      root.style.setProperty("--buttons-foreground", btnShades.foreground);
    } else if (primaryParsed) {
      root.style.setProperty("--buttons", settings.color_primary);
      root.style.setProperty("--buttons-foreground", deriveShades(primaryParsed).foreground);
    }

    // ─── Promotions ───
    if (settings.color_promotions && settings.color_promotions.length > 3) {
      root.style.setProperty("--destructive", settings.color_promotions);
    }

    // ─── Links color ───
    if (settings.color_links && settings.color_links.length > 3) {
      root.style.setProperty("--link", settings.color_links);
    }

    // ─── Typography ───
    if (settings.font_headings) {
      root.style.setProperty("--font-display", `'${settings.font_headings}', sans-serif`);
    }
    if (settings.font_body) {
      root.style.setProperty("--font-body", `'${settings.font_body}', sans-serif`);
    }

    // Favicon
    if (settings.favicon_url) {
      const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (link) link.href = settings.favicon_url;
    }

    setApplied(true);
  }, [settings, loading]);

  return applied || !loading;
}
