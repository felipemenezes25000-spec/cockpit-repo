import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Relatórios" };

export default function PaginaRelatorios() {
  return <ModuloEmConstrucao href="/relatorios" />;
}
