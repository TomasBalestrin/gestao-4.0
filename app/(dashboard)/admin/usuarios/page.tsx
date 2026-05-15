import { UsersTable } from "@/components/users/users-table";
import { NewUserModal } from "@/components/users/new-user-modal";

export default function AdminUsuariosPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie acessos, roles e status.
          </p>
        </div>
        <NewUserModal />
      </div>
      <UsersTable />
    </div>
  );
}
