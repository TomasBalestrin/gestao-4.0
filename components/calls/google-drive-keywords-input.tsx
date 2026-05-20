"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function GoogleDriveKeywordsInput({ value, onChange }: Props) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (value.includes(trimmed)) {
      setInput("");
      return;
    }
    if (value.length >= 10) return;
    onChange([...value, trimmed]);
    setInput("");
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
    if (e.key === "Backspace" && input.length === 0 && value.length > 0) {
      remove(value.length - 1);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {value.map((kw, idx) => (
          <span
            key={`${kw}-${idx}`}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs"
          >
            {kw}
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-text-muted transition-colors hover:text-foreground"
              aria-label={`Remover ${kw}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            value.length >= 10
              ? "Máximo de 10 palavras-chave"
              : "Digite e Enter (ou vírgula)"
          }
          disabled={value.length >= 10}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={add}
          disabled={!input.trim() || value.length >= 10}
        >
          Adicionar
        </Button>
      </div>
    </div>
  );
}
