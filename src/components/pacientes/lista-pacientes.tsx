import { Archive, Cake, ChevronRight, Mail, Phone, UserRoundPlus, UsersRound } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatarDiaMes } from "@/lib/format";
import { formatarTelefone, idadeEm } from "@/lib/paciente";
import type { PacienteDaLista } from "@/server/consultas/pacientes";

function LinhaPaciente({ paciente, indice }: { paciente: PacienteDaLista; indice: number }) {
  const telefone = paciente.telefone ? formatarTelefone(paciente.telefone) : null;

  return (
    <li
      style={{ animationDelay: `${Math.min(indice * 42, 240)}ms` }}
      className={cn(
        "dashboard-stagger premium-interactive group relative isolate flex items-center gap-4 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border p-4 focus-within:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary sm:gap-5 sm:p-5",
        paciente.ativo
          ? "border-card-border bg-surface"
          : "border-card-border bg-surface-container-low",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors duration-200",
          paciente.ativo ? "bg-primary-fixed-dim group-hover:bg-primary-container" : "bg-outline-variant",
        )}
      />

      <div className="relative z-[1] shrink-0 pl-1">
        <Avatar
          nome={paciente.exibicao}
          tom={paciente.ativo ? "marca" : "neutro"}
          className={cn(
            "size-12 text-sm ring-2 ring-offset-2 ring-offset-surface sm:size-13",
            paciente.ativo ? "ring-primary-fixed" : "ring-card-border",
          )}
        />
      </div>

      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="inline-flex min-h-6 items-center text-[1rem] font-bold tracking-[-0.015em] text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
          >
            {paciente.exibicao}
          </Link>

          {paciente.ativo ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-positivo-borda bg-positivo-fundo px-2 py-0.5 text-[0.67rem] font-semibold text-positivo">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" />
              Ativa
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-card-border bg-surface px-2 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant">
              <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
              Arquivada
            </span>
          )}

          {paciente.nomeSocial ? (
            <span className="rounded-full border border-card-border bg-surface px-2 py-0.5 text-[0.68rem] text-outline">
              registro: {paciente.nome}
            </span>
          ) : null}

          {paciente.exemplo ? (
            <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.6875rem] text-outline">exemplo</span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-outline">
          {telefone ? (
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-card-border bg-surface-container-low px-2.5">
              <Phone aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
              <span className="tabular font-medium text-on-surface-variant">{telefone}</span>
            </span>
          ) : null}

          {paciente.email ? (
            <span className="inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-full border border-card-border bg-surface-container-low px-2.5">
              <Mail aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
              <span className="max-w-[18rem] truncate font-medium text-on-surface-variant">{paciente.email}</span>
            </span>
          ) : null}

          {paciente.dataNascimento ? (
            <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-card-border bg-surface-container-low px-2.5">
              <Cake aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
              <span className="tabular font-medium text-on-surface-variant">{formatarDiaMes(paciente.dataNascimento)} · {idadeEm(paciente.dataNascimento)} anos</span>
            </span>
          ) : null}

          {!telefone && !paciente.email && !paciente.dataNascimento ? (
            <span className="rounded-full border border-dashed border-outline-variant px-2.5 py-1 text-outline">Sem contato cadastrado</span>
          ) : null}
        </div>
      </div>

      <span className="relative z-[1] hidden shrink-0 items-center gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2 text-xs font-semibold text-on-surface-variant transition-[transform,color,border-color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary sm:inline-flex">
        Abrir ficha
        <ChevronRight aria-hidden="true" size={15} strokeWidth={1.7} />
      </span>
      <span className="relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline-variant transition-[transform,color,border-color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary sm:hidden">
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} />
      </span>
    </li>
  );
}

export function ListaPacientes({ pacientes, busca }: { pacientes: PacienteDaLista[]; busca: string }) {
  if (pacientes.length === 0) {
    return busca ? (
      <EstadoVazio
        icone={UsersRound}
        titulo="Nenhuma paciente encontrada"
        descricao={`Nada corresponde a "${busca}". Confira a escrita ou cadastre a paciente.`}
        acao={<BotaoLink href="/pacientes/novo" variante="secundaria" tamanho="sm"><UserRoundPlus aria-hidden="true" size={16} strokeWidth={1.75} />Cadastrar paciente</BotaoLink>}
      />
    ) : (
      <EstadoVazio
        icone={UsersRound}
        titulo="Nenhuma paciente cadastrada"
        descricao="Cadastre a primeira paciente para começar a marcar atendimentos."
        acao={<BotaoLink href="/pacientes/novo" variante="primaria" tamanho="sm"><UserRoundPlus aria-hidden="true" size={16} strokeWidth={1.75} />Cadastrar paciente</BotaoLink>}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="rotulo text-primary">Diretório</p>
        <p className="text-xs text-outline">Abra uma ficha para ver histórico, documentos e atendimentos.</p>
      </div>
      <ul aria-label="Pacientes" className="flex flex-col gap-3.5">
        {pacientes.map((paciente, indice) => <LinhaPaciente key={paciente.id} paciente={paciente} indice={indice} />)}
      </ul>
    </div>
  );
}
