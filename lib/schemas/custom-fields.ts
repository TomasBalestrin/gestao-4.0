import { z } from "zod";

// Tipos de custom field (espelha o enum custom_field_type do banco).
export const customFieldTypes = [
  "text",
  "number",
  "date",
  "select",
  "multi_select",
  "currency",
  "phone",
  "email",
  "textarea",
] as const;
export const customFieldTypeSchema = z.enum(customFieldTypes);
export type CustomFieldType = z.infer<typeof customFieldTypeSchema>;

// Config de um custom field, armazenada em funis.custom_fields_schema (JSONB array).
export const customFieldConfigSchema = z
  .object({
    id: z.string().min(1),
    nome: z.string().min(1, "Nome obrigatório").max(80),
    tipo: customFieldTypeSchema,
    obrigatorio: z.boolean().default(false),
    opcoes: z.array(z.string().min(1)).optional(),
    placeholder: z.string().max(120).optional(),
  })
  .superRefine((field, ctx) => {
    if (
      (field.tipo === "select" || field.tipo === "multi_select") &&
      (!field.opcoes || field.opcoes.length === 0)
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Campos select precisam de ao menos 1 opção",
        path: ["opcoes"],
      });
    }
  });
export type CustomFieldConfig = z.infer<typeof customFieldConfigSchema>;

export const customFieldsSchemaSchema = z.array(customFieldConfigSchema);
export type CustomFieldsSchema = z.infer<typeof customFieldsSchemaSchema>;

// Constrói, em runtime, um schema Zod para validar card.custom_fields a partir
// da config do funil. O resultado valida um objeto { [fieldId]: valor }.
export function buildCustomFieldsSchema(config: CustomFieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of config) {
    let base: z.ZodTypeAny;

    switch (field.tipo) {
      case "number":
      case "currency":
        base = z.number();
        break;
      case "date":
        base = z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
          message: "Data inválida",
        });
        break;
      case "email":
        base = z.string().email("Email inválido");
        break;
      case "phone":
        base = z.string().min(8, "Telefone inválido");
        break;
      case "select":
        base = z.enum(
          (field.opcoes ?? [""]) as [string, ...string[]]
        );
        break;
      case "multi_select":
        base = z.array(
          z.enum((field.opcoes ?? [""]) as [string, ...string[]])
        );
        break;
      case "text":
      case "textarea":
      default:
        base = z.string();
        break;
    }

    shape[field.id] = field.obrigatorio
      ? field.tipo === "text" || field.tipo === "textarea"
        ? (base as z.ZodString).min(1, "Campo obrigatório")
        : base
      : base.optional().nullable();
  }

  // catchall preserva chaves extras (campos ad-hoc adicionados direto no card).
  return z.object(shape).catchall(z.unknown());
}
