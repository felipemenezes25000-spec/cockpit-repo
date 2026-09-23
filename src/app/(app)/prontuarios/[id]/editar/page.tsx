import { FilePenLine, History } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { EstruturaPendenteProntuario } from "@/components/prontuarios/estrutura-pendente";
import { FormularioProntuario } from "@/components/prontuarios/formulario-prontuario";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { formatarData, formatarHora } from "@/lib/format";
import { registrarNovaVersao } from "@/server/acoes/prontuarios";
import {
  EstruturaProntuarioPendenteError,
  prontuarioPorId,
} from "@/server/consultas/prontuarios";

export const metadata: Metadata = {
  title: "Nova versão do prontuário",
  description: "Atualização versionada do prontuário clínico.",
};

export default async function PaginaEditarProntuario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const administradora = await ehAdministradora();

  if (!administradora) {
    return <AcessoRestritoProntuario />;
  }

  const { id } = await params;
  const prontuario = await prontuarioPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return undefined;
    throw erro;
  });
  if (prontuario === undefined) return <EstruturaPendenteProntuario />;
  if (!prontuario) notFound();

  const atual = prontuario.versaoAtual;
  const paciente = {
    id: prontuario.pacienteId,
    nome: prontuario.paciente,
    detalhe: prontuario.pacienteContato ?? "sem contato cadastrado",
  };
  const atendimento = prontuario.atendimento
    ? {
        id: prontuario.atendimento.id,
        pacienteId: prontuario.pacienteId,
        paciente,
        detalhe: `${formatarData(prontuario.atendimento.inicio)} às ${formatarHora(prontuario.atendimento.inicio)} · ${prontuario.atendimento.procedimento ?? "Atendimento"}`,
        tituloSugerido: prontuario.titulo,
        dataRegistro: prontuario.dataRegistroCampo,
      }
    : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href={`/prontuarios/${prontuario.id}`}>Voltar para o prontuário</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FilePenLine}
        rotulo="Prontuário clínico"
        titulo="Registrar nova versão"
        descricao={`Atualize o prontuário de ${prontuario.paciente} sem sobrescrever o registro anterior. A versão atual permanece preservada na trilha clínica.`}
        meta={
          <>
            <SeloHero tom="informativo">
              <History aria-hidden="true" size={13} strokeWidth={1.75} />
              {atual ? `Versão atual ${atual.numero}` : "Sem versão registrada"}
            </SeloHero>
            <SeloHero>Nova versão imutável</SeloHero>
            {atendimento ? <SeloHero tom="positivo">Atendimento vinculado</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Conteúdo da nova versão"
          descricao="O formulário parte do conteúdo atual para facilitar a atualização; ao salvar, nasce uma nova versão em vez de editar a anterior."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioProntuario
            acao={registrarNovaVersao}
            modo="versao"
            prontuarioId={prontuario.id}
            pacienteInicial={paciente}
            atendimentoInicial={atendimento}
            dataPadrao={prontuario.dataRegistroCampo}
            cancelarPara={`/prontuarios/${prontuario.id}`}
            rotuloSalvar="Salvar nova versão"
            inicial={{
              paciente_id: prontuario.pacienteId,
              atendimento_id: prontuario.atendimento?.id ?? "",
              data_registro: prontuario.dataRegistroCampo,
              titulo: prontuario.titulo,
              queixa: atual?.queixa ?? "",
              avaliacao: atual?.avaliacao ?? "",
              conduta: atual?.conduta ?? "",
              evolucao: atual?.evolucao ?? "",
              orientacoes: atual?.orientacoes ?? "",
              observacoes: atual?.observacoes ?? "",
            }}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
