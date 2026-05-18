const WA_JID_SUFFIX = "@s.whatsapp.net";

export function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

// Normaliza um número BR para o formato JID do WhatsApp (5511…@s.whatsapp.net).
// Aceita entrada com/sem +55, com/sem máscara. Retorna null se inválido.
export function phoneToJid(raw: string): string | null {
  if (!raw) return null;
  const digits = digitsOnly(raw);
  if (digits.length < 10 || digits.length > 15) return null;
  const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
  return `${withCountry}${WA_JID_SUFFIX}`;
}

// Extrai os dígitos de um JID. Retorna null se não for JID de usuário.
export function jidToPhone(jid: string): string | null {
  if (!jid || !jid.includes("@")) return null;
  if (jid.endsWith("@g.us")) return null; // grupo
  const [user] = jid.split("@");
  if (!user) return null;
  const digits = digitsOnly(user);
  return digits.length >= 10 ? digits : null;
}

export function isGroupJid(jid: string): boolean {
  return typeof jid === "string" && jid.endsWith("@g.us");
}

// Gera variantes BR (com/sem 9 móvel) para tentar match contra leads.telefone.
// Útil quando o banco grava o telefone sem padrão fixo.
export function phoneVariantsBR(digits: string): string[] {
  const out = new Set<string>();
  if (!digits) return [];
  out.add(digits);
  if (digits.startsWith("55") && digits.length >= 12) {
    const rest = digits.slice(2);
    out.add(rest);
    if (rest.length === 11 && rest[2] === "9") {
      out.add(rest.slice(0, 2) + rest.slice(3));
      out.add("55" + rest.slice(0, 2) + rest.slice(3));
    } else if (rest.length === 10) {
      out.add(rest.slice(0, 2) + "9" + rest.slice(2));
      out.add("55" + rest.slice(0, 2) + "9" + rest.slice(2));
    }
  }
  return Array.from(out);
}
