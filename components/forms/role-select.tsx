"use client";

import type { UserRoleValue } from "@/lib/schemas/funil";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_OPTIONS: { value: UserRoleValue; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "social_selling", label: "Social Selling" },
  { value: "closer", label: "Closer" },
  { value: "sdr", label: "SDR" },
  { value: "financeiro", label: "Financeiro" },
  { value: "lider", label: "Líder" },
];

interface RoleSelectProps {
  value?: UserRoleValue;
  onChange: (value: UserRoleValue) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
}

export function RoleSelect({
  value,
  onChange,
  disabled,
  placeholder = "Selecione uma role",
  id,
}: RoleSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as UserRoleValue)}
      disabled={disabled}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export { ROLE_OPTIONS };
