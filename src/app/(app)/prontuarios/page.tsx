import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Prontuários" };

export default function PaginaProntuarios() {
  return <ModuloEmConstrucao href="/prontuarios" />;
}
