import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { connection } from "next/server";
import { origemPublica } from "@/lib/documento";
import { CLINICA } from "@/lib/nav";
import "./globals.css";

/* Uma família só para toda a interface, como no mockup. */
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-sans",
  display: "swap",
});

/**
 * A prévia de link (`og:image`, de `opengraph-image.png`) precisa de endereço
 * absoluto. A base é a mesma origem do link de assinatura (`ORIGEM_PUBLICA`,
 * AGENTS.md §3), que é o link que a clínica manda pelo WhatsApp. Sem ela
 * (desenvolvimento, build da CI), o localhost — o mesmo que o Next usaria,
 * mas dito aqui, sem o aviso no meio do build.
 */
function baseDaPrevia(): URL {
  const origem = origemPublica({ configurada: process.env.ORIGEM_PUBLICA, host: null, protocolo: null, producao: true });
  return new URL(origem.ok ? origem.origem : "http://localhost:3000");
}

export const metadata: Metadata = {
  metadataBase: baseDaPrevia(),
  applicationName: "Cockpit",
  title: {
    default: "Cockpit · Consultório Dra. Érika Passos",
    template: "%s · Cockpit",
  },
  description:
    "Centro de operação da clínica: agenda, pacientes, prontuários, financeiro e relacionamento em um só lugar. Ambiente de demonstração com dados fictícios.",
  appleWebApp: {
    capable: true,
    title: "Cockpit",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: CLINICA.nome,
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light",
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();

  return (
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
