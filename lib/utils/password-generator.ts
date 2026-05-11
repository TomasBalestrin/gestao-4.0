// Gera uma senha temporária forte para o primeiro acesso.
// Garante ≥ 1 letra e ≥ 1 número (política em security.md §1).
// Caracteres ambíguos (0/O, 1/l/I) omitidos para facilitar a comunicação.

const ALPHA = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGITS = "23456789";
const SYMBOLS = "!@#$%&*";
const ALL = ALPHA + DIGITS + SYMBOLS;

function randomInt(maxExclusive: number): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0]! % maxExclusive;
}

function pick(charset: string): string {
  return charset[randomInt(charset.length)]!;
}

export function generateTemporaryPassword(length = 14): string {
  const len = Math.max(8, length);
  const chars: string[] = [pick(ALPHA), pick(DIGITS)];
  while (chars.length < len) chars.push(pick(ALL));

  // Fisher–Yates shuffle.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars.join("");
}
