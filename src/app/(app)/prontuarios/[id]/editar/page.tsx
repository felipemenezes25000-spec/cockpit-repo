import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { EstruturaPendenteProntuario } from "@/components/prontuarios/estrutura-pendente";
import { FormularioProntuario } from "@/components/prontuarios/formulario-prontuario";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
    return (
      <div>
        <AcessoRestritoProntuario />
      </div>
    );
  }

  const { id } = await params;
  const prontuario = await prontuarioPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return undefined;
    throw erro;
  });
  if (prontuario === undefined) {
    return (
      <div>
        <EstruturaPendenteProntuario />
      </div>
    );
  }
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
        detalhe: `${formatarData(prontuario.atendimento.inicio)} às ${formatarHora(
          prontuario.atendimento.inicio,
        )} · ${prontuario.atendimento.procedimento ?? "Atendimento"}`,
        tituloSugerido: prontuario.titulo,
        dataRegistro: prontuario.dataRegistroCampo,
      }
    : null;

  return (
    <div>

      <div className="mb-4">
        <BotaoLink
          href={`/prontuarios/${prontuario.id}`}
          variante="contorno"
          tamanho="sm"
        >
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          Prontuário
        </BotaoLink>
      </div>

      <Card>
        <CardCabecalho
          titulo="Nova versão do prontuário"
          descricao={`${prontuario.paciente} · versão atual ${
            atual ? atual.numero : 0
          }`}
        />
        <CardCorpo>
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
