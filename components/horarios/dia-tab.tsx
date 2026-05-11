"use client";

import { BUFFERS, SLOT_DURATIONS } from "@/lib/schemas/horario";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlocoEditor, type Bloco } from "@/components/horarios/bloco-editor";

export interface DiaConfig {
  dia_semana:
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday";
  ativo: boolean;
  slot_duration_min: number;
  buffer_min: number;
  blocos: Bloco[];
}

interface DiaTabProps {
  config: DiaConfig;
  onChange: (next: DiaConfig) => void;
}

export function DiaTab({ config, onChange }: DiaTabProps) {
  const disabled = !config.ativo;
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={config.ativo}
          onChange={(e) => onChange({ ...config, ativo: e.target.checked })}
        />
        Atende neste dia
      </label>

      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Duração do slot</Label>
          <Select
            value={String(config.slot_duration_min)}
            onValueChange={(v) =>
              onChange({ ...config, slot_duration_min: Number(v) })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOT_DURATIONS.map((d) => (
                <SelectItem key={d} value={String(d)}>
                  {d} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Buffer entre slots</Label>
          <Select
            value={String(config.buffer_min)}
            onValueChange={(v) =>
              onChange({ ...config, buffer_min: Number(v) })
            }
            disabled={disabled}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUFFERS.map((b) => (
                <SelectItem key={b} value={String(b)}>
                  {b} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Blocos de horário</Label>
        <BlocoEditor
          value={config.blocos}
          disabled={disabled}
          onChange={(blocos) => onChange({ ...config, blocos })}
        />
      </div>
    </div>
  );
}
