import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Financeiro" };

export default function PaginaFinanceiro() {
  return <ModuloEmConstrucao href="/financeiro" />;
}
