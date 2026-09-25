import {
  CalendarDays,
  FileText,
  History,
  PencilLine,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { CardCorpo } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { formatarData, formatarHora } from "@/lib/format";
import type { FotosDoProntuario } from "@/server/consultas/prontuario-imagens";
import type {
  ProntuarioCompleto,
  VersaoDoProntuario,
} from "@/server/consultas/prontuarios";
import { FotosDeEvolucao } from "./fotos-evolucao";

function Metadado({
  icone: Icone,
  rotulo,
  valor,
}: {
  icone: typeof CalendarDays;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
        <Icone aria-hidden="true" size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <dt className="rotulo text-[0.65rem] text-outline">{rotulo}</dt>
        <dd className="mt-1 text-sm leading-5 break-words text-on-surface">{valor}</dd>
      </div>
    </div>
  );
}

function BlocoClinico({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor.trim()) return null;

  return (
    <section className="relative rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-4 sm:px-5 sm:py-5">
      <span aria-hidden="true" className="absolute inset-y-4 left-0 w-0.5 rounded-full bg-primary-fixed-dim" />
      <h3 className="rotulo pl-1 text-[0.67rem] text-outline">{rotulo}</h3>
      <p className="mt-2 pl-1 whitespace-pre-wrap text-sm leading-7 text-on-surface">
        {valor}
      </p>
    </section>
  );
}

function ConteudoClinico({ versao }: { versao: VersaoDoProntuario }) {
  return (
    <div className="grid gap-3">
      <BlocoClinico rotulo="Queixa e anamnese" valor={versao.queixa} />
      <BlocoClinico rotulo="Avaliação" valor={versao.avaliacao} />
      <BlocoClinico rotulo="Conduta" valor={versao.conduta} />
      <BlocoClinico rotulo="Evolução" valor={versao.evolucao} />
      <BlocoClinico rotulo="Orientações" valor={versao.orientacoes} />
      <BlocoClinico rotulo="Observações clínicas" valor={versao.observacoes} />
    </div>
  );
}

function VersaoHistorico({ versao }: { versao: VersaoDoProntuario }) {
  return (
    <details className="group rounded-[var(--radius-cartao)] border border-card-border bg-surface open:bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5">
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
            <span className="flex size-7 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-[0.7rem] font-bold text-primary">
              v{versao.numero}
            </span>
            Versão {versao.numero}
          </span>
          <span className="mt-1 block truncate text-xs text-outline">
            {versao.motivo} · {formatarData(versao.criadoEm)} às {formatarHora(versao.criadoEm)}
            {versao.criadoPor ? ` · ${versao.criadoPor}` : ""}
          </span>
        </span>
        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-medium text-primary transition-colors group-open:bg-primary-fixed">
          <span className="group-open:hidden">Abrir</span>
          <span className="hidden group-open:inline">Fechar</span>
        </span>
      </summary>

      <div className="border-t border-card-border p-4">
        <ConteudoClinico versao={versao} />
      </div>
    </details>
  );
}

export function DetalheProntuario({
  prontuario,
  fotos,
  hojeNaClinica,
}: {
  prontuario: ProntuarioCompleto;
  fotos: FotosDoProntuario;
  hojeNaClinica: string;
}) {
  const versaoAtual = prontuario.versaoAtual;

  return (
    <div className="flex flex-col gap-6">
      <LinkDeVoltar href="/prontuarios">Voltar para prontuários</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FileText}
        rotulo="Prontuário clínico"
        titulo={prontuario.titulo}
        descricao={
          <>
            Registro versionado de <span className="font-medium text-on-surface">{prontuario.paciente}</span>. O conteúdo clínico permanece legível e cada atualização nasce como uma nova versão.
          </>
        }
        acoes={
          <BotaoLink
            href={`/prontuarios/${prontuario.id}/editar`}
            variante="primaria"
            tamanho="sm"
          >
            <PencilLine aria-hidden="true" size={16} strokeWidth={1.75} />
            Nova versão
          </BotaoLink>
        }
        meta={
          <>
            {versaoAtual ? <SeloHero tom="informativo">Versão atual: {versaoAtual.numero}</SeloHero> : null}
            <SeloHero>{formatarData(prontuario.dataRegistro)}</SeloHero>
            {prontuario.atendimento ? <SeloHero tom="positivo">Vinculado a atendimento</SeloHero> : null}
            {prontuario.exemplo ? <SeloHero tom="atencao">Dado demonstrativo</SeloHero> : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <CardRecolhivel id="pront-registro-atual"
            titulo="Registro atual"
            descricao={
              versaoAtual
                ? `${versaoAtual.motivo} · ${formatarData(versaoAtual.criadoEm)} às ${formatarHora(versaoAtual.criadoEm)}${versaoAtual.criadoPor ? ` · ${versaoAtual.criadoPor}` : ""}`
                : "Este prontuário ainda não tem versão registrada."
            }
        >
          <CardCorpo>
            {versaoAtual ? (
              <div className="flex flex-col gap-5">
                <div className="flex flex-wrap items-center gap-2">
                  <SeloHero tom="informativo">Versão {versaoAtual.numero}</SeloHero>
                  <span className="text-xs text-outline">Conteúdo clínico atual</span>
                </div>
                <ConteudoClinico versao={versaoAtual} />
              </div>
            ) : (
              <p className="text-sm text-outline">Este prontuário ainda não tem versão registrada.</p>
            )}
          </CardCorpo>
        </CardRecolhivel>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-28 xl:self-start">
          <CardRecolhivel id="pront-resumo" as="div" titulo="Resumo"
          >
            <CardCorpo>
              <dl className="grid gap-3">
                <Metadado icone={UserRound} rotulo="Paciente" valor={prontuario.paciente} />
                <Metadado
                  icone={CalendarDays}
                  rotulo="Data do registro"
                  valor={formatarData(prontuario.dataRegistro)}
                />
                <Metadado
                  icone={History}
                  rotulo="Atualizado"
                  valor={`${formatarData(prontuario.atualizadoEm)} às ${formatarHora(prontuario.atualizadoEm)}`}
                />
              </dl>

              {prontuario.pacienteContato ? (
                <p className="mt-4 rounded-[var(--radius-controle)] bg-surface-container-low px-3 py-2 text-sm text-outline">
                  {prontuario.pacienteContato}
                </p>
              ) : null}

              <Link
                href={`/pacientes/${prontuario.pacienteId}`}
                className="mt-4 inline-flex min-h-9 items-center rounded-[var(--radius-controle)] px-3 text-sm font-medium text-primary transition-colors hover:bg-selecao"
              >
                Abrir ficha da paciente
              </Link>
            </CardCorpo>
          </CardRecolhivel>

          {prontuario.atendimento ? (
            <CardRecolhivel id="pront-atendimento-de-origem" as="div" titulo="Atendimento de origem"
            >
              <CardCorpo>
                <p className="text-sm font-semibold text-on-surface">
                  {prontuario.atendimento.procedimento ?? "Atendimento"}
                </p>
                <p className="mt-1.5 text-sm text-outline">
                  {formatarData(prontuario.atendimento.inicio)} às {formatarHora(prontuario.atendimento.inicio)}
                </p>
                {prontuario.atendimento.profissional ? (
                  <p className="mt-1 text-sm text-outline">{prontuario.atendimento.profissional}</p>
                ) : null}
              </CardCorpo>
            </CardRecolhivel>
          ) : null}

          <CardRecolhivel id="pront-historico-de-versoes" as="div" titulo="Histórico de versões"
          >
            <CardCorpo>
              {prontuario.versoes.length > 0 ? (
                <div className="flex flex-col gap-2.5">
                  {prontuario.versoes.map((versao) => (
                    <VersaoHistorico key={versao.id} versao={versao} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-outline">Nenhuma versão registrada.</p>
              )}
            </CardCorpo>
          </CardRecolhivel>
        </aside>
      </div>

      <FotosDeEvolucao
        fotos={fotos}
        prontuarioId={prontuario.id}
        dataSugerida={prontuario.dataRegistroCampo}
        hojeNaClinica={hojeNaClinica}
      />
    </div>
  );
}
