import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Formulários e Termos" };

export default function PaginaFormularios() {
  return <ModuloEmConstrucao href="/formularios" />;
}
