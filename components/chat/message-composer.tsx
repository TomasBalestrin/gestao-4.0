"use client";

import { useRef, useState } from "react";
import { Paperclip, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notifyError } from "@/lib/utils/notify";
import { useSendMessage } from "@/hooks/useChat";

interface MessageComposerProps {
  leadId: string;
  disabled?: boolean;
  disabledHint?: string;
}

const MAX_TEXT = 4096;

export function MessageComposer({
  leadId,
  disabled,
  disabledHint,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const send = useSendMessage(leadId);

  if (disabled) {
    return (
      <div className="border-t bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground">
        {disabledHint ?? "Composer desabilitado."}
      </div>
    );
  }

  async function handleSendText() {
    const t = text.trim();
    if (!t || pending) return;
    setPending(true);
    try {
      await send.mutateAsync({ text: t });
      setText("");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Falha ao enviar");
    } finally {
      setPending(false);
    }
  }

  async function handleFile(file: File) {
    setPending(true);
    try {
      await send.mutateAsync({ file, caption: text.trim() || undefined });
      setText("");
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Falha ao enviar arquivo");
    } finally {
      setPending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          aria-label="Anexar imagem"
          title="Anexar imagem (NextTrack só envia imagem)"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          value={text}
          maxLength={MAX_TEXT}
          rows={2}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSendText();
            }
          }}
          placeholder="Mensagem… (Enter envia, Shift+Enter quebra linha)"
          className="min-h-[44px] flex-1 resize-none"
          disabled={pending}
        />
        <Button
          type="button"
          size="icon"
          onClick={handleSendText}
          disabled={pending || text.trim().length === 0}
          aria-label="Enviar mensagem"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
