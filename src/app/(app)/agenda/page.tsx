import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Agenda" };

export default function PaginaAgenda() {
  return <ModuloEmConstrucao href="/agenda" />;
}
