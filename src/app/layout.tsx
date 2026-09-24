import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

/* Uma família só para toda a interface, como no mockup. */
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fonte-sans",
  display: "swap",
});

export const metadata: Metadata = {
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
