// Palette de 10 cores controladas, inspirada no Google Calendar.
// Hue distribuido pra cobrir o espectro sem cores adjacentes parecidas.
const HUES = [210, 265, 330, 5, 25, 45, 130, 165, 195, 290];

interface EventColor {
  bg: string;
  bgSoft: string;
  border: string;
  text: string;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function colorForUser(userId: string | null | undefined): EventColor {
  if (!userId) return FOLLOW_UP_COLOR;
  const idx = hashCode(userId) % HUES.length;
  const h = HUES[idx]!;
  return {
    bg: `hsl(${h}, 70%, 48%)`,
    bgSoft: `hsl(${h}, 70%, 48%, 0.14)`,
    border: `hsl(${h}, 70%, 40%)`,
    text: `hsl(${h}, 70%, 30%)`,
  };
}

export const FOLLOW_UP_COLOR: EventColor = {
  bg: "hsl(38, 92%, 50%)",
  bgSoft: "hsl(38, 92%, 50%, 0.16)",
  border: "hsl(38, 92%, 42%)",
  text: "hsl(38, 92%, 28%)",
};

export const COMPLETED_COLOR: EventColor = {
  bg: "hsl(160, 60%, 40%)",
  bgSoft: "hsl(160, 60%, 40%, 0.14)",
  border: "hsl(160, 60%, 32%)",
  text: "hsl(160, 60%, 24%)",
};

export const CANCELLED_COLOR: EventColor = {
  bg: "hsl(0, 0%, 60%)",
  bgSoft: "hsl(0, 0%, 60%, 0.14)",
  border: "hsl(0, 0%, 50%)",
  text: "hsl(0, 0%, 35%)",
};
