// Mascaras de input puras (sem dependencia externa). Cada formatter aceita
// uma string suja (com ou sem mascara) e devolve a string formatada. Use
// `onlyDigits` antes de enviar pro banco quando quiser persistir sem mascara.

export function onlyDigits(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D+/g, "");
}

// === Telefone / WhatsApp ===
// Heuristica: se a string original comeca com `+` ou tem mais de 11 digitos,
// trata como internacional (preserva DDI). Senao aplica mascara brasileira:
// (99) 99999-9999 com 11 digitos, (99) 9999-9999 com 10 digitos.
export function formatPhone(value: string | null | undefined): string {
  if (!value) return "";
  const startsPlus = value.trim().startsWith("+");
  const digits = onlyDigits(value);
  if (!digits) return startsPlus ? "+" : "";

  if (startsPlus || digits.length > 11) {
    // Internacional. Sem mascara fina: mostra +DDI nro.
    // Se digitos = 13 (BR completo) usamos +55 (99) 99999-9999.
    if (digits.length >= 12 && digits.length <= 13 && digits.startsWith("55")) {
      const cc = digits.slice(0, 2);
      const ddd = digits.slice(2, 4);
      const rest = digits.slice(4);
      if (rest.length === 9) {
        return `+${cc} (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
      }
      if (rest.length === 8) {
        return `+${cc} (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
      }
      return `+${cc} (${ddd}) ${rest}`;
    }
    // Fallback intl generico.
    return `+${digits}`;
  }

  // Brasil sem DDI.
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// === CPF: 000.000.000-00 ===
export function formatCPF(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  }
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

// === CNPJ: 00.000.000/0000-00 ===
export function formatCNPJ(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  }
  if (d.length <= 12) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  }
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
    8,
    12
  )}-${d.slice(12, 14)}`;
}

// === CEP: 00000-000 ===
export function formatCEP(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// === Instagram: garante prefixo @ ===
export function formatInstagram(value: string | null | undefined): string {
  if (!value) return "";
  const trimmed = value.replace(/\s+/g, "").replace(/^@+/, "");
  return trimmed ? `@${trimmed}` : "";
}

// === Moeda BR ===
export function formatCurrencyBR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// Para inputs digitados como texto (ex: "1234,56" ou "R$ 1.234,56"),
// extrai um number. Retorna null quando vazio ou invalido.
export function parseCurrencyBR(masked: string | null | undefined): number | null {
  if (!masked) return null;
  const cleaned = masked.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
