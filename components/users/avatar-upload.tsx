"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_DIMENSION = 256;

interface AvatarUploadProps {
  userId: string;
  nome: string;
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

// Redimensiona/comprime a imagem para no máx. 256px e exporta como JPEG.
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(
        1,
        MAX_DIMENSION / Math.max(img.width, img.height)
      );
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas indisponível"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao processar imagem"));
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Imagem inválida"));
    };
    img.src = url;
  });
}

function initials(nome: string): string {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AvatarUpload({
  userId,
  nome,
  currentUrl,
  onUploaded,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_MIME.includes(file.type)) {
      setError("Formato não suportado (use JPG, PNG, WEBP ou GIF).");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Arquivo maior que 2MB.");
      return;
    }
    setUploading(true);
    try {
      const blob = await compressImage(file);
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const busted = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(busted);
      onUploaded(busted);
    } catch (err) {
      setError(`Falha no upload: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          {preview && <AvatarImage src={preview} alt={nome} />}
          <AvatarFallback>{initials(nome)}</AvatarFallback>
        </Avatar>
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Enviando..." : "Trocar foto"}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            JPG, PNG, WEBP ou GIF · até 2MB.
          </p>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
