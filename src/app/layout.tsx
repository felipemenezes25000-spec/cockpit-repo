import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import "./globals.css";

/* Uma família só para toda a interface, como no mockup. */
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Cockpit · Consultório Dra. Érika Passos",
    template: "%s · Cockpit",
  },
  description:
    "Centro de operação da clínica: agenda, pacientes, prontuários, financeiro e relacionamento em um só lugar. Ambiente de demonstração com dados fictícios.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Extensões podem acrescentar atributos ao <html> antes da hidratação.
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={sans.variable}>{children}</body>
    </html>
  );
}
