import { Archive, Cake, ClipboardPlus, Pencil } from "lucide-react";
import { BotaoArquivar } from "./botao-arquivar";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { descreverPrazo, formatarData } from "@/lib/format";
import { diasAteAniversario, idadeEm } from "@/lib/paciente";
import type { PacienteCompleto } from "@/server/consultas/pacientes";

export function CabecalhoFicha({
  paciente,
  podeProntuario = false,
}: {
  paciente: PacienteCompleto;
  podeProntuario?: boolean;
}) {
  const diasAte = paciente.nascimento
    ? diasAteAniversario(paciente.nascimento)
    : null;

  return (
    <div className="mb-8 flex flex-col gap-5">
      <LinkDeVoltar href="/pacientes">Voltar para pacientes</LinkDeVoltar>

      <section className="premium-panel relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+6px)] border px-5 py-6 sm:px-7 sm:py-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-12 -z-10 size-72 rounded-full bg-primary-fixed/60 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 left-1/4 -z-10 h-48 w-96 rounded-full bg-secondary-fixed/28 blur-3xl"
        />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-white/95" />

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <div aria-hidden="true" className="absolute -inset-2 rounded-[1.4rem] bg-primary-fixed/35 blur-xl" />
              <Avatar
                nome={paciente.exibicao}
                tom={paciente.ativo ? "marca" : "neutro"}
                className="relative size-16 border-2 border-white/90 text-lg shadow-[var(--shadow-realce)] sm:size-[4.5rem] sm:text-xl"
              />
            </div>

            <div className="min-w-0 pt-0.5">
              <p className="rotulo text-primary/80">Ficha da paciente</p>
              <h2 className="mt-2 text-[clamp(1.9rem,4vw,3rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-on-surface">
                {paciente.exibicao}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <SeloHero tom={paciente.ativo ? "positivo" : "neutro"}>
                  {paciente.ativo ? "Cadastro ativo" : "Cadastro arquivado"}
                </SeloHero>

                {paciente.nascimento ? (
                  <SeloHero>
                    <Cake aria-hidden="true" size={13} strokeWidth={1.8} />
                    <span className="tabular">
                      {idadeEm(paciente.nascimento)} anos · {formatarData(paciente.nascimento)}
                    </span>
                  </SeloHero>
                ) : null}

                {diasAte !== null && diasAte <= 30 ? (
                  <SeloHero tom="informativo">Aniversário {descreverPrazo(diasAte)}</SeloHero>
                ) : null}
              </div>

              <div className="mt-4 flex flex-col gap-1.5 text-sm leading-6 text-on-surface-variant">
                {paciente.nomeSocial ? (
                  <p>Nome de registro: <span className="font-medium text-on-surface">{paciente.nome}</span></p>
                ) : null}
                {paciente.origem ? <p>Origem do relacionamento: <span className="font-medium text-on-surface">{paciente.origem}</span></p> : null}
              </div>

              {!paciente.ativo ? (
                <p className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-controle)] border border-card-border/80 bg-surface/70 px-3 py-2 text-xs font-medium text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                  <Archive aria-hidden="true" size={14} strokeWidth={1.75} />
                  O histórico continua disponível mesmo com o cadastro arquivado.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end">
            {podeProntuario ? (
              <BotaoLink
                href={`/prontuarios/novo?paciente=${paciente.id}`}
                variante="primaria"
                tamanho="sm"
              >
                <ClipboardPlus aria-hidden="true" size={16} strokeWidth={1.75} />
                Novo prontuário
              </BotaoLink>
            ) : null}

            <BotaoLink
              href={`/pacientes/${paciente.id}/editar`}
              variante="secundaria"
              tamanho="sm"
            >
              <Pencil aria-hidden="true" size={16} strokeWidth={1.75} />
              Editar cadastro
            </BotaoLink>

            <BotaoArquivar
              pacienteId={paciente.id}
              arquivada={!paciente.ativo}
              nome={paciente.exibicao}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
