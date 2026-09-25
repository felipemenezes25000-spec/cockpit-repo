import { History, PencilLine, ShieldCheck, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioProcedimento } from "@/components/configuracoes/formulario-procedimento";
import {
  EXPLICACAO_PROCEDIMENTOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { valorParaCampo } from "@/lib/procedimento";
import { atualizarProcedimento } from "@/server/acoes/procedimentos";
import { procedimentoPorId } from "@/server/consultas/procedimentos";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const procedimento = await procedimentoPorId(id);
  return { title: procedimento ? `Editar ${procedimento.nome}` : "Procedimento" };
}

export default async function PaginaEditarProcedimento({ params }: Props) {
  if (!(await ehAdministradora())) {
    return (
      <SomenteAdministradora
        voltarPara="/configuracoes/procedimentos"
        explicacao={EXPLICACAO_PROCEDIMENTOS}
      />
    );
  }

  const { id } = await params;
  const procedimento = await procedimentoPorId(id);
  if (!procedimento) notFound();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href="/configuracoes/procedimentos">Voltar para procedimentos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Procedimento"
        titulo={procedimento.nome}
        descricao={
          procedimento.usos > 0
            ? `Este procedimento já foi usado em ${procedimento.usos} ${procedimento.usos === 1 ? "atendimento" : "atendimentos"}. As alterações abaixo passam a valer como padrão para novas marcações e não reescrevem o passado.`
            : "Este procedimento ainda não foi usado em atendimentos. Ajuste os padrões antes de colocá-lo em operação."
        }
        meta={
          <>
            <SeloHero tom={procedimento.ativo ? "positivo" : "neutro"}>{procedimento.ativo ? "Ativo na agenda" : "Fora da agenda"}</SeloHero>
            <SeloHero>{procedimento.usos} {procedimento.usos === 1 ? "uso registrado" : "usos registrados"}</SeloHero>
            <SeloHero tom="informativo">
              <Stethoscope aria-hidden="true" size={13} strokeWidth={1.7} />
              Padrão operacional
            </SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Editar padrões"
          descricao="Ajuste nome, duração, valor e retorno sugerido. O histórico dos atendimentos já registrados permanece intacto."
        />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioProcedimento
                acao={atualizarProcedimento}
                procedimentoId={procedimento.id}
                inicial={{
                  nome: procedimento.nome,
                  duracao_min: String(procedimento.duracaoMin),
                  valor_padrao: valorParaCampo(procedimento.valorPadrao),
                  retorno_sugerido_dias: procedimento.retornoSugeridoDias
                    ? String(procedimento.retornoSugeridoDias)
                    : "",
                }}
                rotuloSalvar="Salvar alterações"
                cancelarPara="/configuracoes/procedimentos"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <History aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Histórico preservado</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Mude o padrão, não o passado</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">{procedimento.usos} {procedimento.usos === 1 ? "atendimento já usa" : "atendimentos já usam"} este cadastro</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Esses registros continuam com os dados que foram gravados em cada atendimento.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Novas marcações</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Duração, valor e retorno atualizados passam a ser as sugestões daqui para frente.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Disponibilidade</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">{procedimento.ativo ? "Ativo: aparece em novas marcações na Agenda." : "Fora da agenda: histórico preservado, mas indisponível para novas marcações."}</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
