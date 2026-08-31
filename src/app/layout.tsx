import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proactive Lead Engine — Inteligência de Prospecção em Tempo Real",
  description: "Descubra empresas recém-abertas no Brasil, aplique filtros de ICP, enriqueça dados e gere leads comerciais automaticamente.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
