import { FilePenLine, History, Layers3, ShieldCheck } from "lucide-react";
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
    <div className="mx-auto flex max-w-7xl flex-col gap-5">
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
          <div className="grid items-start gap-7 2xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0">
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
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 2xl:sticky 2xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <Layers3 aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Versionamento clínico</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">O passado não é reescrito</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Base atual</p>
                  <p className="mt-1 text-xs leading-5 text-outline">{atual ? `O formulário começa com o conteúdo da versão ${atual.numero} para facilitar a evolução.` : "Não há versão anterior para usar como base."}</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <History aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Motivo obrigatório</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-outline">A nova versão registra por que o prontuário foi atualizado, junto de autor e momento da gravação.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Imutabilidade</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">Salvar cria outro registro versionado. A versão anterior permanece disponível e intacta.</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
