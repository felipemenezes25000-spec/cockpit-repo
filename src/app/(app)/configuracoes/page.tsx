import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Configurações" };

export default function PaginaConfiguracoes() {
  return <ModuloEmConstrucao href="/configuracoes" />;
}
