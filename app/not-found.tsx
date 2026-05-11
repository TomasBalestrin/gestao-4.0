import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          O endereço que você acessou não existe ou foi movido.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Voltar ao início</Link>
      </Button>
    </div>
  );
}
