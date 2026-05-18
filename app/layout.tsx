import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "sonner";

import { Providers } from "@/components/shared/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gestão 4.0",
  description: "SaaS interno Bethel — Social Selling e Closer Scheduling",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="pt-BR"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>
          {children}
          <Toaster
            closeButton
            position="bottom-right"
            duration={3000}
            toastOptions={{
              classNames: {
                toast:
                  "glass !rounded-md !border-0 !text-text-primary",
                title: "!text-[13px] !font-semibold",
                description: "!text-[12px] !text-text-secondary",
                actionButton: "!bg-navy !text-white",
                success: "[&_[data-icon]]:!text-success",
                error: "[&_[data-icon]]:!text-danger",
                info: "[&_[data-icon]]:!text-navy",
                warning: "[&_[data-icon]]:!text-warning",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
