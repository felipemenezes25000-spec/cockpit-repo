import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioPaciente } from "@/components/pacientes/formulario-paciente";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import type { ValoresPaciente } from "@/lib/paciente";
import { atualizarPaciente } from "@/server/acoes/pacientes";
import { pacientePorId } from "@/server/consultas/pacientes";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const paciente = await pacientePorId(id);

  return {
    title: paciente ? `Editar ${paciente.exibicao}` : "Paciente não encontrada",
  };
}

export default async function PaginaEditarPaciente({ params }: Props) {
  const { id } = await params;
  const paciente = await pacientePorId(id);

  if (!paciente) notFound();

  const inicial: ValoresPaciente = {
    nome: paciente.nome,
    nome_social: paciente.nomeSocial ?? "",
    cpf: paciente.cpf ?? "",
    data_nascimento: paciente.dataNascimento ?? "",
    telefone: paciente.telefone ?? "",
    email: paciente.email ?? "",
    origem: paciente.origem ?? "",
    observacoes: paciente.observacoes ?? "",
    ...paciente.endereco,
  };

  const ficha = `/pacientes/${paciente.id}`;

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href={ficha}
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a ficha
      </Link>

      <Card>
        <CardCabecalho
          titulo="Editar cadastro"
          descricao={paciente.exibicao}
        />
        <CardCorpo className="py-8">
          <FormularioPaciente
            acao={atualizarPaciente}
            inicial={inicial}
            pacienteId={paciente.id}
            cancelarPara={ficha}
            rotuloSalvar="Salvar alterações"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
