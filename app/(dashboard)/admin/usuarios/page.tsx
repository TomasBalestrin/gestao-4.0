import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { UsersTable } from "@/components/users/users-table";

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie acessos, roles e status.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/usuarios/novo">
            <Plus className="h-4 w-4" />
            Novo usuário
          </Link>
        </Button>
      </div>
      <UsersTable />
    </div>
  );
}
