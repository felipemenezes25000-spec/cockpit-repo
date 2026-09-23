import { PencilLine, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioPaciente } from "@/components/pacientes/formulario-paciente";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href={ficha}>Voltar para a ficha</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Paciente"
        titulo={`Editar ${paciente.exibicao}`}
        descricao="Atualize os dados cadastrais sem perder o contexto da ficha. Histórico clínico, atendimentos e documentos continuam vinculados à mesma paciente."
        meta={
          <>
            <SeloHero tom={paciente.ativo ? "positivo" : "neutro"}>{paciente.ativo ? "Cadastro ativo" : "Cadastro arquivado"}</SeloHero>
            <SeloHero tom="informativo">
              <UserRound aria-hidden="true" size={13} strokeWidth={1.7} />
              Mesmo registro
            </SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Dados cadastrais"
          descricao="Revise identidade, contato, endereço e observações. O histórico da paciente não é recriado por esta edição."
        />
        <CardCorpo className="py-7 sm:py-8">
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
