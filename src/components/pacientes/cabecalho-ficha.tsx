import { Archive, ArrowLeft, Cake, ClipboardPlus, Pencil } from "lucide-react";
import Link from "next/link";
import { BotaoArquivar } from "./botao-arquivar";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
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
    <div className="mb-8">
      <Link
        href="/pacientes"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para a lista
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <Avatar
            nome={paciente.exibicao}
            tom={paciente.ativo ? "marca" : "neutro"}
            className="size-14 text-base"
          />

          <div className="min-w-0">
            <h2 className="t-display text-primary">{paciente.exibicao}</h2>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-outline">
              {paciente.nomeSocial ? (
                <span>Nome de registro: {paciente.nome}</span>
              ) : null}

              {paciente.nascimento ? (
                <span className="inline-flex items-center gap-1.5">
                  <Cake aria-hidden="true" size={14} strokeWidth={1.75} />
                  <span className="tabular">
                    {idadeEm(paciente.nascimento)} anos ·{" "}
                    {formatarData(paciente.nascimento)}
                  </span>
                  {diasAte !== null && diasAte <= 30 ? (
                    <span className="text-primary">
                      (faz anos {descreverPrazo(diasAte)})
                    </span>
                  ) : null}
                </span>
              ) : null}

              {paciente.origem ? <span>Veio por: {paciente.origem}</span> : null}
            </div>

            {!paciente.ativo ? (
              <p className="mt-3 inline-flex items-center gap-2 rounded-[var(--radius-cartao)] bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface-variant">
                <Archive aria-hidden="true" size={14} strokeWidth={1.75} />
                Paciente arquivada — o histórico continua disponível
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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
    </div>
  );
}
