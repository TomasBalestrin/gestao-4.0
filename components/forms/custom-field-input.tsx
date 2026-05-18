"use client";

import type { CustomFieldConfig } from "@/lib/schemas/custom-fields";
import { customFieldsSchemaSchema } from "@/lib/schemas/custom-fields";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function parseCustomFieldsConfig(value: unknown): CustomFieldConfig[] {
  const parsed = customFieldsSchemaSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

interface CustomFieldInputProps {
  field: CustomFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  id?: string;
}

export function CustomFieldInput({
  field,
  value,
  onChange,
  disabled,
  id,
}: CustomFieldInputProps) {
  switch (field.tipo) {
    case "textarea":
      return (
        <Textarea
          id={id}
          rows={3}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
    case "currency":
      return (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
        />
      );

    case "date":
      return (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ""}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );

    case "email":
      return (
        <Input
          id={id}
          type="email"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "phone":
      return (
        <Input
          id={id}
          type="tel"
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "select":
      return (
        <Select
          value={(value as string) || undefined}
          onValueChange={(v) => onChange(v)}
          disabled={disabled}
        >
          <SelectTrigger id={id}>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {(field.opcoes ?? []).map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case "multi_select": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1">
          {(field.opcoes ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={arr.includes(opt)}
                disabled={disabled}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...arr, opt]
                      : arr.filter((x) => x !== opt)
                  )
                }
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case "text":
    default:
      return (
        <Input
          id={id}
          value={(value as string) ?? ""}
          placeholder={field.placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}
