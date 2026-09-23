import { Archive, Cake, ChevronRight, Mail, Phone, UserRoundPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarDiaMes } from "@/lib/format";
import { formatarTelefone, idadeEm } from "@/lib/paciente";
import type { PacienteDaLista } from "@/server/consultas/pacientes";

/**
 * Uma linha por paciente, o cartão inteiro clicável.
 *
 * O link envolve o nome e um `::after` cobre o cartão: quem navega por teclado
 * para em um só ponto por linha, e quem usa o mouse pode clicar em qualquer
 * lugar dela.
 */
function LinhaPaciente({ paciente }: { paciente: PacienteDaLista }) {
  const telefone = paciente.telefone ? formatarTelefone(paciente.telefone) : null;

  return (
    <li className="relative flex items-center gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] transition-shadow focus-within:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary hover:shadow-[var(--shadow-realce)]">
      <Avatar nome={paciente.exibicao} tom={paciente.ativo ? "marca" : "neutro"} />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="inline-flex min-h-6 items-center font-medium text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
          >
            {paciente.exibicao}
          </Link>

          {paciente.nomeSocial ? (
            <span className="text-xs text-outline">registro: {paciente.nome}</span>
          ) : null}

          {!paciente.ativo ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-surface-container px-1.5 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant">
              <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
              Arquivada
            </span>
          ) : null}

          {paciente.exemplo ? (
            <span className="rounded-[var(--radius-tag)] border border-dashed border-outline-variant px-1.5 py-0.5 text-[0.6875rem] text-outline">
              exemplo
            </span>
          ) : null}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-outline">
          {telefone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden="true" size={12} strokeWidth={1.75} />
              <span className="tabular">{telefone}</span>
            </span>
          ) : null}

          {paciente.email ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden="true" size={12} strokeWidth={1.75} />
              <span className="truncate">{paciente.email}</span>
            </span>
          ) : null}

          {paciente.dataNascimento ? (
            <span className="inline-flex items-center gap-1.5">
              <Cake aria-hidden="true" size={12} strokeWidth={1.75} />
              <span className="tabular">
                {formatarDiaMes(paciente.dataNascimento)} ·{" "}
                {idadeEm(paciente.dataNascimento)} anos
              </span>
            </span>
          ) : null}

          {!telefone && !paciente.email && !paciente.dataNascimento ? (
            <span>Sem contato cadastrado</span>
          ) : null}
        </div>
      </div>

      <ChevronRight
        aria-hidden="true"
        size={18}
        strokeWidth={1.5}
        className="shrink-0 text-outline-variant"
      />
    </li>
  );
}

export function ListaPacientes({
  pacientes,
  busca,
}: {
  pacientes: PacienteDaLista[];
  busca: string;
}) {
  if (pacientes.length === 0) {
    return busca ? (
      <EstadoVazio
        icone={UsersRound}
        titulo="Nenhuma paciente encontrada"
        descricao={`Nada corresponde a "${busca}". Confira a escrita ou cadastre a paciente.`}
        acao={
          <BotaoLink href="/pacientes/novo" variante="secundaria" tamanho="sm">
            <UserRoundPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Cadastrar paciente
          </BotaoLink>
        }
      />
    ) : (
      <EstadoVazio
        icone={UsersRound}
        titulo="Nenhuma paciente cadastrada"
        descricao="Cadastre a primeira paciente para começar a marcar atendimentos."
        acao={
          <BotaoLink href="/pacientes/novo" variante="primaria" tamanho="sm">
            <UserRoundPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Cadastrar paciente
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul aria-label="Pacientes" className="flex flex-col gap-3">
      {pacientes.map((paciente) => (
        <LinhaPaciente key={paciente.id} paciente={paciente} />
      ))}
    </ul>
  );
}
