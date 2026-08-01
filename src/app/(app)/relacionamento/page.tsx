import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Relacionamento" };

export default function PaginaRelacionamento() {
  return <ModuloEmConstrucao href="/relacionamento" />;
}
