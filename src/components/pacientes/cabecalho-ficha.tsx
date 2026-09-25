import { Archive, Cake, ClipboardPlus, Pencil, Sparkles } from "lucide-react";
import { BotaoArquivar } from "./botao-arquivar";
import { Avatar } from "@/components/ui/avatar";
import Link from "next/link";
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
    <div className="mb-6 flex flex-col gap-4 sm:mb-7">
      <LinkDeVoltar href="/pacientes">Voltar para pacientes</LinkDeVoltar>

      <section aria-labelledby="nome-da-paciente" className="cabine relative overflow-hidden px-5 py-6 sm:px-7 sm:py-7">
        <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full border border-white/10" />
        <span aria-hidden="true" className="pointer-events-none absolute -top-10 right-24 size-40 rounded-full border border-white/8" />

        <div className="relative z-[1] flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <Avatar
              nome={paciente.exibicao}
              tom="cabine"
              tamanho="lg"
              className="ring-4 ring-white/12 ring-offset-2 ring-offset-transparent shadow-[0_20px_42px_-28px_rgba(0,24,55,.85)]"
            />

            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="rotulo">Ficha da paciente</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-cabine-linha bg-white/8 px-2 py-0.5 text-[0.63rem] font-semibold tracking-wide text-cabine-texto-secundario uppercase">
                  <Sparkles aria-hidden="true" size={10} /> visão 360°
                </span>
              </div>
              <h1 id="nome-da-paciente" className="mt-2 text-[clamp(1.85rem,1.35rem+1.75vw,2.65rem)] leading-[1.04] font-bold tracking-[-0.045em] break-words text-cabine-texto">
                {paciente.exibicao}
              </h1>

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

              <div className="mt-4 flex flex-col gap-1.5 text-sm leading-6 text-cabine-texto-secundario">
                {paciente.nomeSocial ? (
                  <p>Nome de registro: <span className="font-semibold text-cabine-texto">{paciente.nome}</span></p>
                ) : null}
                {paciente.origem ? <p>Origem do relacionamento: <span className="font-semibold text-cabine-texto">{paciente.origem}</span></p> : null}
              </div>

              {!paciente.ativo ? (
                <p className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-linha bg-cabine-profunda px-3 py-2 text-xs font-medium text-cabine-texto">
                  <Archive aria-hidden="true" size={14} strokeWidth={1.75} />
                  O histórico continua disponível mesmo com o cadastro arquivado.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:max-w-sm xl:justify-end">
            {podeProntuario ? (
              <Link
                href={`/prontuarios/novo?paciente=${paciente.id}`}
                className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-texto bg-cabine-texto px-3.5 text-sm font-semibold text-cabine-profunda shadow-[0_14px_28px_-20px_rgba(0,28,63,.55)] transition-[transform,background-color,border-color] hover:-translate-y-px hover:border-selecao hover:bg-selecao"
              >
                <ClipboardPlus aria-hidden="true" size={16} strokeWidth={1.9} />
                Novo prontuário
              </Link>
            ) : null}

            <Link
              href={`/pacientes/${paciente.id}/editar`}
              className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-linha bg-white/8 px-3.5 text-sm font-semibold text-cabine-texto transition-[transform,background-color,border-color] hover:-translate-y-px hover:border-cabine-texto hover:bg-white/12"
            >
              <Pencil aria-hidden="true" size={16} strokeWidth={1.9} />
              Editar cadastro
            </Link>

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
