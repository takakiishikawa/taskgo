import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DesignTokens, AppLayout, Toaster } from "@takaki/go-design-system";
import { TaskGoSidebar } from "@/components/layout/sidebar";
import { DarkModeInit } from "@/components/ui/dark-mode-init";
import { createClient } from "@/lib/supabase/server";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TaskGo",
  description: "PdMの設計貯金を守るツール",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html
      lang="ja"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <DarkModeInit />
        <DesignTokens primaryColor="#5E6AD2" primaryColorHover="#4F5BC0" />
      </head>
      <body className="min-h-full">
        {user ? (
          <AppLayout sidebar={<TaskGoSidebar />} mainClassName="overflow-auto">
            {children}
          </AppLayout>
        ) : (
          <main>{children}</main>
        )}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
