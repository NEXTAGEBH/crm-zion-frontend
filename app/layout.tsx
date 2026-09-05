import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar"; // O @ já resolve o caminho certo!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CRM Zion",
  description: "Central comercial simples e poderosa para WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="flex min-h-screen bg-slate-50">
          <Sidebar />
          {/* Área de conteúdo - ml-64 empurra o conteúdo para o lado da sidebar */}
          <main className="flex-1 ml-64 p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}