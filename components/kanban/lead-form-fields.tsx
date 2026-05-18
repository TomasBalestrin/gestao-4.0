"use client";

import { useQuery } from "@tanstack/react-query";

import {
  FUNIL_ORIGEM_OPTIONS,
  PRODUTO_OFERTADO_OPTIONS,
} from "@/lib/constants/lead-options";
import type { CreateLeadInput } from "@/lib/schemas/lead";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Shape do form de lead: igual ao CreateLeadInput, mas com todos os campos
// concretos (strings vazias em vez de null) para o componente controlar inputs.
export interface LeadFormState {
  nome: string;
  telefone: string;
  email: string;
  instagram: string;
  empresa: string;
  nicho: string;
  faturamento_mensal: string;
  tem_socio: boolean;
  funil_origem: string;
  sdr_id: string;
  produto_ofertado: string;
  dor_principal: string;
  observacoes: string;
}

export const EMPTY_LEAD: LeadFormState = {
  nome: "",
  telefone: "",
  email: "",
  instagram: "",
  empresa: "",
  nicho: "",
  faturamento_mensal: "",
  tem_socio: false,
  funil_origem: "",
  sdr_id: "",
  produto_ofertado: "",
  dor_principal: "",
  observacoes: "",
};

// Converte o form state em payload tipado para a API (createLead/updateLead).
export function leadStateToPayload(s: LeadFormState): CreateLeadInput {
  const faturamento =
    s.faturamento_mensal.trim() === ""
      ? null
      : Number(s.faturamento_mensal.replace(",", "."));
  return {
    nome: s.nome,
    telefone: s.telefone || null,
    email: s.email || null,
    instagram: s.instagram || null,
    empresa: s.empresa || null,
    nicho: s.nicho || null,
    faturamento_mensal: Number.isFinite(faturamento)
      ? (faturamento as number)
      : null,
    tem_socio: s.tem_socio,
    funil_origem: (s.funil_origem ||
      null) as CreateLeadInput["funil_origem"],
    sdr_id: s.sdr_id || null,
    produto_ofertado: (s.produto_ofertado ||
      null) as CreateLeadInput["produto_ofertado"],
    dor_principal: s.dor_principal || null,
    observacoes: s.observacoes || null,
  };
}

interface SdrOption {
  id: string;
  nome: string;
}

async function fetchSdrs(): Promise<SdrOption[]> {
  const res = await fetch("/api/users/sdrs");
  const body = (await res.json().catch(() => null)) as
    | { data?: SdrOption[] }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? [];
}

interface LeadFormFieldsProps {
  value: LeadFormState;
  onChange: (patch: Partial<LeadFormState>) => void;
  disabled?: boolean;
  showNomeAsterisk?: boolean;
  // Modo compacto: mostra so a secao Contato com Nome e Telefone obrigatorios.
  // Usado no modal de criacao rapida do kanban; o resto e editado depois no
  // detalhe do card.
  compact?: boolean;
}

export function LeadFormFields({
  value,
  onChange,
  disabled,
  showNomeAsterisk = true,
  compact = false,
}: LeadFormFieldsProps) {
  const sdrsQuery = useQuery({
    queryKey: ["sdrs"],
    queryFn: fetchSdrs,
    staleTime: 60_000,
  });

  function patch(key: keyof LeadFormState, v: string | boolean) {
    onChange({ [key]: v } as Partial<LeadFormState>);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contato
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-nome">
              Nome{(showNomeAsterisk || compact) && " *"}
            </Label>
            <Input
              id="lead-nome"
              value={value.nome}
              disabled={disabled}
              onChange={(e) => patch("nome", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-telefone">
              Telefone{compact && " *"}
            </Label>
            <Input
              id="lead-telefone"
              value={value.telefone}
              disabled={disabled}
              onChange={(e) => patch("telefone", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-email">Email</Label>
            <Input
              id="lead-email"
              type="email"
              value={value.email}
              disabled={disabled}
              onChange={(e) => patch("email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-instagram">Instagram</Label>
            <Input
              id="lead-instagram"
              placeholder="@usuario"
              value={value.instagram}
              disabled={disabled}
              onChange={(e) => patch("instagram", e.target.value)}
            />
          </div>
        </div>
      </section>

      {!compact && (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Negócio
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="lead-empresa">Empresa</Label>
            <Input
              id="lead-empresa"
              value={value.empresa}
              disabled={disabled}
              onChange={(e) => patch("empresa", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-nicho">Nicho</Label>
            <Input
              id="lead-nicho"
              value={value.nicho}
              disabled={disabled}
              onChange={(e) => patch("nicho", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-faturamento">Faturamento Mensal (R$)</Label>
            <Input
              id="lead-faturamento"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={value.faturamento_mensal}
              disabled={disabled}
              onChange={(e) => patch("faturamento_mensal", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-tem-socio">Tem sócio</Label>
            <div className="flex h-9 items-center">
              <Switch
                id="lead-tem-socio"
                checked={value.tem_socio}
                disabled={disabled}
                onCheckedChange={(v) => patch("tem_socio", v)}
                aria-label="Tem sócio"
              />
            </div>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Funil de Origem</Label>
            <Select
              value={value.funil_origem || undefined}
              onValueChange={(v) => patch("funil_origem", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {FUNIL_ORIGEM_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SDR</Label>
            <Select
              value={value.sdr_id || undefined}
              onValueChange={(v) => patch("sdr_id", v)}
              disabled={disabled || sdrsQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    sdrsQuery.isLoading ? "Carregando..." : "Selecione"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(sdrsQuery.data ?? []).map((sdr) => (
                  <SelectItem key={sdr.id} value={sdr.id}>
                    {sdr.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Produto Ofertado</Label>
            <Select
              value={value.produto_ofertado || undefined}
              onValueChange={(v) => patch("produto_ofertado", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRODUTO_OFERTADO_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
      )}

      {!compact && (
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Informações Adicionais
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-dor">Dor Principal</Label>
            <Textarea
              id="lead-dor"
              rows={3}
              value={value.dor_principal}
              disabled={disabled}
              onChange={(e) => patch("dor_principal", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lead-obs">Observações</Label>
            <Textarea
              id="lead-obs"
              rows={3}
              value={value.observacoes}
              disabled={disabled}
              onChange={(e) => patch("observacoes", e.target.value)}
            />
          </div>
        </div>
      </section>
      )}
    </div>
  );
}

// Constroi o estado inicial a partir de um Lead salvo no banco.
export function leadToFormState(lead: {
  nome: string;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  empresa: string | null;
  nicho: string | null;
  faturamento_mensal: number | null;
  tem_socio: boolean | null;
  funil_origem: string | null;
  sdr_id: string | null;
  produto_ofertado: string | null;
  dor_principal: string | null;
  observacoes: string | null;
}): LeadFormState {
  return {
    nome: lead.nome ?? "",
    telefone: lead.telefone ?? "",
    email: lead.email ?? "",
    instagram: lead.instagram ?? "",
    empresa: lead.empresa ?? "",
    nicho: lead.nicho ?? "",
    faturamento_mensal:
      lead.faturamento_mensal === null ? "" : String(lead.faturamento_mensal),
    tem_socio: lead.tem_socio ?? false,
    funil_origem: lead.funil_origem ?? "",
    sdr_id: lead.sdr_id ?? "",
    produto_ofertado: lead.produto_ofertado ?? "",
    dor_principal: lead.dor_principal ?? "",
    observacoes: lead.observacoes ?? "",
  };
}
