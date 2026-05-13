import type { CustomFieldConfig } from "@/lib/schemas/custom-fields";

// Conjunto de campos "universais" oferecidos a qualquer funil. O admin escolhe,
// no form do funil, quais ficam habilitados (vai pra `custom_fields_schema`).
// Campos ad-hoc adicionados direto no card (nome + valor) vivem em
// card.custom_fields ao lado destes — o schema dinâmico aceita extras.
export const UNIVERSAL_FIELDS: readonly CustomFieldConfig[] = [
  { id: "valor", nome: "Valor", tipo: "currency", obrigatorio: false },
  { id: "closer", nome: "Closer", tipo: "text", obrigatorio: false },
  { id: "produto", nome: "Produto", tipo: "text", obrigatorio: false },
  {
    id: "origem_detalhada",
    nome: "Origem detalhada",
    tipo: "select",
    obrigatorio: false,
    opcoes: ["Indicação", "Instagram", "Anúncio", "Outro"],
  },
  {
    id: "data_fechamento",
    nome: "Data de fechamento",
    tipo: "date",
    obrigatorio: false,
  },
  { id: "observacoes", nome: "Observações", tipo: "textarea", obrigatorio: false },
];
