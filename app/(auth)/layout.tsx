interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="dark flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="brand-mark mb-3 h-10 w-10 rounded-lg" />
          <h1 className="font-serif text-3xl font-medium tracking-tight">
            Gestão 4.0
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Bethel Educação</p>
        </div>
        {children}
      </div>
    </div>
  );
}
