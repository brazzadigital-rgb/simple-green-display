/** Map of metal/color variant names to their visual hex colors */
const METAL_COLOR_MAP: Record<string, string> = {
  dourado: "#D4A017",
  ouro: "#D4A017",
  "ouro 18k": "#D4A017",
  "ouro amarelo": "#D4A017",
  prata: "#C0C0C0",
  "ródio branco": "#E8E8E8",
  "ródio negro": "#2C2C2C",
  rosé: "#B76E79",
  "rosé gold": "#B76E79",
  grafite: "#5A5A5A",
  negro: "#1A1A1A",
  bronze: "#CD7F32",
  cobre: "#B87333",
};

/** Returns a hex color for a metal/variant name, or null if not a known color */
export function getMetalColor(name: string): string | null {
  const normalized = name.trim().toLowerCase();
  return METAL_COLOR_MAP[normalized] ?? null;
}
