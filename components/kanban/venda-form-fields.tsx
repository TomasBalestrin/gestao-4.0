"use client";

import { useQuery } from "@tanstack/react-query";

import { PRODUTO_OFERTADO_OPTIONS } from "@/lib/constants/lead-options";
import {
  ESTADO_CIVIL_LABELS,
  ESTADO_CIVIL_OPTIONS,
} from "@/lib/constants/estado-civil";
import {
  formatCEP,
  formatCNPJ,
  formatCPF,
  formatInstagram,
  formatPhone,
} from "@/lib/utils/formatters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface VendaFormState {
  produto: string;
  nome_completo: string;
  nacionalidade: string;
  estado_civil: string;
  cpf: string;
  rg: string;
  cnpj: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  instagram: string;
  email: string;
  whatsapp: string;
  data_nascimento: string;
  valor: string;
  forma_pagamento: string;
  vigencia: string;
  data_venda: string;
  funil_id: string;
  sdr_id: string;
}

export const EMPTY_VENDA: VendaFormState = {
  produto: "",
  nome_completo: "",
  nacionalidade: "",
  estado_civil: "",
  cpf: "",
  rg: "",
  cnpj: "",
  endereco: "",
  bairro: "",
  cidade: "",
  cep: "",
  instagram: "",
  email: "",
  whatsapp: "",
  data_nascimento: "",
  valor: "",
  forma_pagamento: "",
  vigencia: "",
  data_venda: "",
  funil_id: "",
  sdr_id: "",
};

interface FunilOption {
  id: string;
  nome: string;
}
interface UserOption {
  id: string;
  nome: string;
}

async function fetchFunis(): Promise<FunilOption[]> {
  const res = await fetch("/api/funis");
  const body = (await res.json().catch(() => null)) as
    | { data?: FunilOption[] }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? [];
}

async function fetchSdrs(): Promise<UserOption[]> {
  const res = await fetch("/api/users/sdrs");
  const body = (await res.json().catch(() => null)) as
    | { data?: UserOption[] }
    | null;
  if (!res.ok) throw new Error(`Erro ${res.status}`);
  return body?.data ?? [];
}

interface VendaFormFieldsProps {
  value: VendaFormState;
  onChange: (patch: Partial<VendaFormState>) => void;
  disabled?: boolean;
}

export function VendaFormFields({
  value,
  onChange,
  disabled,
}: VendaFormFieldsProps) {
  const funisQuery = useQuery({
    queryKey: ["funis"],
    queryFn: fetchFunis,
    staleTime: 60_000,
  });
  const sdrsQuery = useQuery({
    queryKey: ["sdrs"],
    queryFn: fetchSdrs,
    staleTime: 60_000,
  });

  function patch<K extends keyof VendaFormState>(
    key: K,
    v: VendaFormState[K]
  ) {
    onChange({ [key]: v } as Partial<VendaFormState>);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Produto e contrato
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Produto</Label>
            <Select
              value={value.produto || undefined}
              onValueChange={(v) => patch("produto", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {PRODUTO_OFERTADO_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-valor">Valor (R$) *</Label>
            <Input
              id="venda-valor"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={value.valor}
              disabled={disabled}
              onChange={(e) => patch("valor", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-vigencia">Vigência</Label>
            <Input
              id="venda-vigencia"
              placeholder="ex: 12 meses"
              value={value.vigencia}
              disabled={disabled}
              onChange={(e) => patch("vigencia", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-data">Data</Label>
            <Input
              id="venda-data"
              type="date"
              value={value.data_venda}
              disabled={disabled}
              onChange={(e) => patch("data_venda", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="venda-pagamento">Forma de pagamento</Label>
            <Textarea
              id="venda-pagamento"
              rows={3}
              value={value.forma_pagamento}
              disabled={disabled}
              onChange={(e) => patch("forma_pagamento", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Identificação
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="venda-nome">Nome completo *</Label>
            <Input
              id="venda-nome"
              value={value.nome_completo}
              disabled={disabled}
              onChange={(e) => patch("nome_completo", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-nacionalidade">Nacionalidade</Label>
            <Input
              id="venda-nacionalidade"
              placeholder="ex: Brasileira"
              value={value.nacionalidade}
              disabled={disabled}
              onChange={(e) => patch("nacionalidade", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado civil</Label>
            <Select
              value={value.estado_civil || undefined}
              onValueChange={(v) => patch("estado_civil", v)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESTADO_CIVIL_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {ESTADO_CIVIL_LABELS[opt]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-cpf">CPF</Label>
            <Input
              id="venda-cpf"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={value.cpf}
              disabled={disabled}
              onChange={(e) => patch("cpf", formatCPF(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-rg">RG</Label>
            <Input
              id="venda-rg"
              value={value.rg}
              disabled={disabled}
              onChange={(e) => patch("rg", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-cnpj">CNPJ</Label>
            <Input
              id="venda-cnpj"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              value={value.cnpj}
              disabled={disabled}
              onChange={(e) => patch("cnpj", formatCNPJ(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-nascimento">Data de nascimento</Label>
            <Input
              id="venda-nascimento"
              type="date"
              value={value.data_nascimento}
              disabled={disabled}
              onChange={(e) => patch("data_nascimento", e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Endereço
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="venda-endereco">Endereço</Label>
            <Input
              id="venda-endereco"
              placeholder="Rua, número, complemento"
              value={value.endereco}
              disabled={disabled}
              onChange={(e) => patch("endereco", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-bairro">Bairro</Label>
            <Input
              id="venda-bairro"
              value={value.bairro}
              disabled={disabled}
              onChange={(e) => patch("bairro", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-cidade">Cidade</Label>
            <Input
              id="venda-cidade"
              value={value.cidade}
              disabled={disabled}
              onChange={(e) => patch("cidade", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-cep">CEP</Label>
            <Input
              id="venda-cep"
              inputMode="numeric"
              placeholder="00000-000"
              value={value.cep}
              disabled={disabled}
              onChange={(e) => patch("cep", formatCEP(e.target.value))}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Contato e atribuição
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="venda-whatsapp">WhatsApp</Label>
            <Input
              id="venda-whatsapp"
              placeholder="(99) 99999-9999"
              value={value.whatsapp}
              disabled={disabled}
              onChange={(e) => patch("whatsapp", formatPhone(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venda-email">E-mail</Label>
            <Input
              id="venda-email"
              type="email"
              value={value.email}
              disabled={disabled}
              onChange={(e) => patch("email", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="venda-instagram">@ do Instagram</Label>
            <Input
              id="venda-instagram"
              placeholder="@usuario"
              value={value.instagram}
              disabled={disabled}
              onBlur={(e) =>
                patch("instagram", formatInstagram(e.target.value))
              }
              onChange={(e) => patch("instagram", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Funil *</Label>
            <Select
              value={value.funil_id || undefined}
              onValueChange={(v) => patch("funil_id", v)}
              disabled={disabled || funisQuery.isLoading}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    funisQuery.isLoading ? "Carregando..." : "Selecione"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {(funisQuery.data ?? []).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SDR *</Label>
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
                {(sdrsQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </div>
  );
}
