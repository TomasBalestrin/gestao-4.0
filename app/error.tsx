"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algo deu errado
        </h1>
        <p className="text-sm text-muted-foreground">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70">
            ref: {error.digest}
          </p>
        )}
      </div>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
