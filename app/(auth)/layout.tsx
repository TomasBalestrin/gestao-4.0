interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="dark flex min-h-screen items-center justify-center px-4 text-foreground"
      style={{
        background:
          "radial-gradient(ellipse at top left, var(--bg-grad-1) 0%, var(--bg-grad-2) 60%)",
      }}
    >
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="brand-mark mb-3 size-11 text-[18px]">G</div>
          <h1 className="text-[28px] font-semibold tracking-tighter text-foreground">
            Gestão 4.0
          </h1>
          <p className="mt-1 text-[13px] text-text-secondary">Bethel Educação</p>
        </div>
        {children}
      </div>
    </div>
  );
}
