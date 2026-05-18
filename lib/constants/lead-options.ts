// Listas hardcoded usadas pelo schema fixo de lead. Espelham as CHECK
// constraints aplicadas em supabase/migrations/0015_lead_fixed_schema.sql.

export const FUNIL_ORIGEM_OPTIONS = [
  "50 scripts",
  "Teste dos Arquetipos",
  "MPM",
  "Implementacao de IA da Julia",
  "Social Selling Julia",
  "Social Selling Cleiton",
  "Social Selling Bethel",
  "Social Selling Kennedy",
  "Formulario Instagram Cleiton",
  "Formulario Instagram Julia",
  "Formulario Instagram Bethel",
  "Formulario Instagram Kennedy",
  "Formulario Youtube",
  "Indicacao de Aluno",
  "Indicacao de Mentorado",
  "Indicacao de Vendedor",
  "Indicacao Elite Premium",
  "Implementacao Comercial",
  "Implementacao Personalizada IA",
  "Mentoria Julia",
  "Elite Premium",
  "Bethel Club",
] as const;
export type FunilOrigem = (typeof FUNIL_ORIGEM_OPTIONS)[number];

export const PRODUTO_OFERTADO_OPTIONS = [
  "Mentoria Premium",
  "Mentoria Elite Premium",
  "Implementacao Comercial",
  "Bethel Club",
  "Intensivo da Alta Performance",
  "Implementacao de IA",
] as const;
export type ProdutoOfertado = (typeof PRODUTO_OFERTADO_OPTIONS)[number];
