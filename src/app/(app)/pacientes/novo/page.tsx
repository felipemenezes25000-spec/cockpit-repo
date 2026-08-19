import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioPaciente } from "@/components/pacientes/formulario-paciente";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { cadastrarPaciente } from "@/server/acoes/pacientes";

export const metadata: Metadata = {
  title: "Nova paciente",
  description: "Cadastro de uma nova paciente da clínica.",
};

export default function PaginaNovaPaciente() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/pacientes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a lista
      </Link>

      <Card>
        <CardCabecalho
          titulo="Nova paciente"
          descricao="Só o nome é obrigatório. O restante pode ser completado depois, na ficha."
        />
        <CardCorpo className="py-8">
          <FormularioPaciente
            acao={cadastrarPaciente}
            cancelarPara="/pacientes"
            rotuloSalvar="Cadastrar paciente"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
