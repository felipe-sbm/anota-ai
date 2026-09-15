import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.scss";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Anota Aí - Você vai baixar agora, não é?",
  description:
    "Transforme reuniões de desenvolvimento em resumos estruturados e tarefas no GitHub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geist.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white text-ink">
        {children}
      </body>
    </html>
  );
}
