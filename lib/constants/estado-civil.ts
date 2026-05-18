// Estado civil: lista fixa usada como CHECK na coluna vendas.estado_civil
// e em selects da UI.

export const ESTADO_CIVIL_OPTIONS = [
  "solteiro",
  "casado",
  "divorciado",
  "viuvo",
  "uniao_estavel",
] as const;
export type EstadoCivil = (typeof ESTADO_CIVIL_OPTIONS)[number];

export const ESTADO_CIVIL_LABELS: Record<EstadoCivil, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};
