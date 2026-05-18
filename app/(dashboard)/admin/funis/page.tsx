import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FunisTable } from "@/components/funis/funis-table";

export default function AdminFunisPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funis</h1>
          <p className="text-sm text-muted-foreground">
            Crie e gerencie os funis de cada equipe.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/funis/novo">
            <Plus className="h-4 w-4" />
            Novo funil
          </Link>
        </Button>
      </div>

      <FunisTable />
    </div>
  );
}
