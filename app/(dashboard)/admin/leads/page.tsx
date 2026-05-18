import { redirect } from "next/navigation";

import { requireAuth } from "@/server/auth";
import { LeadsTable } from "@/components/admin/leads-table";

export default async function AdminLeadsPage() {
  const { profile } = await requireAuth();
  if (profile.role !== "admin") {
    redirect("/crm");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground">
            Base completa de leads. Filtre, pesquise e exclua quando necessário.
          </p>
        </div>
      </div>
      <LeadsTable />
    </div>
  );
}
