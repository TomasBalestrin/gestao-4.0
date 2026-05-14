import {
  Coffee,
  Flag,
  Gift,
  Heart,
  MessageCircle,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

// Paleta pastel "Tailwind -100": soft o suficiente pra um background e
// reconhecível como cor distinta. Funciona em light/dark via alpha.
const PASTEL_PALETTE = [
  "#dbeafe", // blue-100
  "#dcfce7", // green-100
  "#fef3c7", // yellow-100
  "#f3e8ff", // purple-100
  "#fee2e2", // red-100
  "#cffafe", // cyan-100
  "#fed7aa", // orange-100
  "#fce7f3", // pink-100
  "#e0e7ff", // indigo-100
  "#d1fae5", // emerald-100
] as const;

export function randomPastel(): string {
  const i = Math.floor(Math.random() * PASTEL_PALETTE.length);
  return PASTEL_PALETTE[i]!;
}

export function pastelByIndex(index: number): string {
  return PASTEL_PALETTE[((index % PASTEL_PALETTE.length) + PASTEL_PALETTE.length) % PASTEL_PALETTE.length]!;
}

const ETAPA_ICONS: LucideIcon[] = [
  MessageCircle,
  Gift,
  Star,
  Zap,
  Heart,
  Coffee,
  Trophy,
  Flag,
  Target,
  Sparkles,
];

export function etapaIcon(index: number): LucideIcon {
  return ETAPA_ICONS[((index % ETAPA_ICONS.length) + ETAPA_ICONS.length) % ETAPA_ICONS.length]!;
}

function normalizeHex(hex: string): string | null {
  if (!hex || !hex.startsWith("#")) return null;
  if (hex.length === 4) {
    return "#" + hex.slice(1).split("").map((c) => c + c).join("");
  }
  if (hex.length === 7 || hex.length === 9) return hex.slice(0, 7);
  return null;
}

// Aplica um alpha (0–255) ao hex para usar como background "tingido".
export function tintBg(hex: string, alpha = 0x33): string | undefined {
  const normalized = normalizeHex(hex);
  if (!normalized) return undefined;
  return `${normalized}${alpha.toString(16).padStart(2, "0")}`;
}
