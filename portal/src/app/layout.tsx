import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"] });
const body = Geist({ variable: "--font-body", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Garra — sua assistente de IA no Telegram",
  description:
    "Crie em minutos uma assistente pessoal de IA que conversa com você no Telegram, lembra das suas coisas e cuida da sua agenda.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
