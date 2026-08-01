import type { Metadata } from "next";
import { ModuloEmConstrucao } from "@/components/layout/module-placeholder";

export const metadata: Metadata = { title: "Pacientes" };

export default function PaginaPacientes() {
  return <ModuloEmConstrucao href="/pacientes" />;
}
