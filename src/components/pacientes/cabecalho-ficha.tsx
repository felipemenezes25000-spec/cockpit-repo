import { Archive, Cake, ClipboardPlus, Pencil } from "lucide-react";
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
    <div className="mb-8 flex flex-col gap-5">
      <LinkDeVoltar href="/pacientes">Voltar para pacientes</LinkDeVoltar>

      <section aria-labelledby="nome-da-paciente" className="cabine px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4 sm:gap-5">
            <Avatar
              nome={paciente.exibicao}
              tom="cabine"
              tamanho="lg"
            />

            <div className="min-w-0 pt-0.5">
              <p className="rotulo">Ficha da paciente</p>
              <h1 id="nome-da-paciente" className="mt-2 text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-tight font-semibold tracking-[-0.03em] break-words text-cabine-texto">
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
                className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-texto bg-cabine-texto px-3.5 text-sm font-semibold text-cabine-profunda transition-colors hover:border-selecao hover:bg-selecao"
              >
                <ClipboardPlus aria-hidden="true" size={16} strokeWidth={1.9} />
                Novo prontuário
              </Link>
            ) : null}

            <Link
              href={`/pacientes/${paciente.id}/editar`}
              className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-texto px-3.5 text-sm font-semibold text-cabine-texto transition-colors hover:bg-cabine-profunda"
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
