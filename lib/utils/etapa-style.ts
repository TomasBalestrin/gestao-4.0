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

// Versão saturada/escura do hex pra usar como destaque (bolinha, ícone)
// quando a cor original é um pastel claro de baixo contraste. Mantém o
// matiz e força L≈0.45 com saturação alta.
export function strongerColor(hex: string): string {
  const n = normalizeHex(hex);
  if (!n) return hex;
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l0 = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l0 > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  const newS = Math.min(1, Math.max(s, 0.7));
  const newL = 0.45;
  function hue2rgb(p: number, q: number, t: number): number {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }
  let nr: number;
  let ng: number;
  let nb: number;
  if (newS === 0) {
    nr = ng = nb = newL;
  } else {
    const q = newL < 0.5 ? newL * (1 + newS) : newL + newS - newL * newS;
    const p = 2 * newL - q;
    nr = hue2rgb(p, q, h + 1 / 3);
    ng = hue2rgb(p, q, h);
    nb = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
}
