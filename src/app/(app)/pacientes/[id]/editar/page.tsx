import { History, PencilLine, ShieldCheck, UserRound } from "lucide-react";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioPaciente
                acao={atualizarPaciente}
                inicial={inicial}
                pacienteId={paciente.id}
                cancelarPara={ficha}
                rotuloSalvar="Salvar alterações"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <History aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Mesmo cadastro</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">A ficha não recomeça</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Identificador preservado</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Salvar alterações atualiza o cadastro existente; não cria uma nova paciente.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Histórico continua ligado</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Atendimentos, documentos, retornos e registros clínicos permanecem vinculados à mesma ficha.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Situação atual</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">{paciente.ativo ? "Cadastro ativo e disponível nos fluxos operacionais." : "Cadastro arquivado; o histórico continua preservado."}</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
