import {
  CalendarDays,
  FileText,
  History,
  PencilLine,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
    <div className="flex items-start gap-2">
      <Icone aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 text-outline" />
      <div>
        <dt className="text-xs font-medium uppercase text-outline">{rotulo}</dt>
        <dd className="mt-0.5 text-sm text-on-surface">{valor}</dd>
      </div>
    </div>
  );
}

function BlocoClinico({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor.trim()) return null;

  return (
    <section className="border-t border-card-border pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-xs font-medium uppercase text-outline">{rotulo}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
        {valor}
      </p>
    </section>
  );
}

function ConteudoClinico({ versao }: { versao: VersaoDoProntuario }) {
  return (
    <div className="flex flex-col gap-5">
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
    <details className="group border-t border-card-border py-4 first:border-t-0 first:pt-0 last:pb-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-sm font-medium text-on-surface">
            Versão {versao.numero}
          </span>
          <span className="block truncate text-xs text-outline">
            {versao.motivo} · {formatarData(versao.criadoEm)} às{" "}
            {formatarHora(versao.criadoEm)}
            {versao.criadoPor ? ` · ${versao.criadoPor}` : ""}
          </span>
        </span>
        <span className="text-xs font-medium text-primary group-open:hidden">Abrir</span>
        <span className="hidden text-xs font-medium text-primary group-open:inline">Fechar</span>
      </summary>

      <div className="mt-4 rounded-[var(--radius-cartao)] bg-surface px-4 py-4">
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BotaoLink href="/prontuarios" variante="contorno" tamanho="sm">
          <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
          Prontuários
        </BotaoLink>

        <BotaoLink
          href={`/prontuarios/${prontuario.id}/editar`}
          variante="primaria"
          tamanho="sm"
        >
          <PencilLine aria-hidden="true" size={16} strokeWidth={1.75} />
          Nova versão
        </BotaoLink>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardCabecalho
            titulo={prontuario.titulo}
            descricao={
              <>
                {prontuario.paciente}
                {prontuario.exemplo ? " · exemplo" : ""}
              </>
            }
          />
          <CardCorpo>
            {versaoAtual ? (
              <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-[var(--radius-tag)] bg-informativo-fundo px-2 py-1 text-xs font-medium text-informativo-texto">
                    Versão {versaoAtual.numero}
                  </span>
                  <span className="text-xs text-outline">
                    {versaoAtual.motivo} · {formatarData(versaoAtual.criadoEm)} às{" "}
                    {formatarHora(versaoAtual.criadoEm)}
                    {versaoAtual.criadoPor ? ` · ${versaoAtual.criadoPor}` : ""}
                  </span>
                </div>

                <ConteudoClinico versao={versaoAtual} />
              </div>
            ) : (
              <p className="text-sm text-outline">
                Este prontuário ainda não tem versão registrada.
              </p>
            )}
          </CardCorpo>
        </Card>

        <aside className="flex flex-col gap-6">
          <Card as="div">
            <CardCabecalho titulo="Resumo" />
            <CardCorpo>
              <dl className="flex flex-col gap-4">
                <Metadado
                  icone={UserRound}
                  rotulo="Paciente"
                  valor={prontuario.paciente}
                />
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
                <p className="mt-4 border-t border-card-border pt-4 text-sm text-outline">
                  {prontuario.pacienteContato}
                </p>
              ) : null}

              <Link
                href={`/pacientes/${prontuario.pacienteId}`}
                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Abrir ficha da paciente
              </Link>
            </CardCorpo>
          </Card>

          {prontuario.atendimento ? (
            <Card as="div">
              <CardCabecalho titulo="Atendimento" />
              <CardCorpo>
                <p className="text-sm font-medium text-on-surface">
                  {prontuario.atendimento.procedimento ?? "Atendimento"}
                </p>
                <p className="mt-1 text-sm text-outline">
                  {formatarData(prontuario.atendimento.inicio)} às{" "}
                  {formatarHora(prontuario.atendimento.inicio)}
                </p>
                {prontuario.atendimento.profissional ? (
                  <p className="mt-1 text-sm text-outline">
                    {prontuario.atendimento.profissional}
                  </p>
                ) : null}
              </CardCorpo>
            </Card>
          ) : null}

          <Card as="div">
            <CardCabecalho titulo="Versões" />
            <CardCorpo>
              {prontuario.versoes.length > 0 ? (
                <div>
                  {prontuario.versoes.map((versao) => (
                    <VersaoHistorico key={versao.id} versao={versao} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-outline">Nenhuma versão registrada.</p>
              )}
            </CardCorpo>
          </Card>
        </aside>
      </div>

      {/* Fora da grade de duas colunas de propósito: comparar antes e depois
          pede a largura inteira da página, não a coluna do texto. */}
      <FotosDeEvolucao
        fotos={fotos}
        prontuarioId={prontuario.id}
        dataSugerida={prontuario.dataRegistroCampo}
        hojeNaClinica={hojeNaClinica}
      />
    </div>
  );
}
