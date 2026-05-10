export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-12">
      <div className="max-w-xl space-y-4 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Gestão 4.0</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          SaaS interno Bethel — Social Selling e Closer Scheduling.
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Setup inicial concluído. Próximo passo: integrar Supabase e shadcn/ui.
        </p>
      </div>
    </main>
  );
}
