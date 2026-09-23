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
  // A única cor fora do globals.css: meta tag não lê variável de CSS. É o
  // `--color-surface`.
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Extensões podem acrescentar atributos ao <html> antes da hidratação.
    //
    // `--fonte-sans` vai no <html>, não no <body>: o Tailwind declara
    // `--font-sans: var(--fonte-sans), …` em `:root`, e a variável se resolve
    // onde é declarada. No <body>, `:root` não a enxergava, `--font-sans`
    // inteira ficava inválida e a interface caía na fonte do sistema.
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
