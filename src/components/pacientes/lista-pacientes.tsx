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
        "dashboard-stagger premium-interactive group relative isolate flex items-center gap-4 overflow-hidden rounded-[18px] border p-4 shadow-[var(--shadow-cartao)] focus-within:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary sm:p-5",
        paciente.ativo
          ? "border-card-border/85 bg-linear-to-br from-white/95 to-primary-fixed/10"
          : "border-card-border/68 bg-surface-container-low/48",
      )}
    >
      <span aria-hidden="true" className={cn("pointer-events-none absolute -top-12 -right-10 -z-10 size-28 rounded-full blur-2xl", paciente.ativo ? "bg-primary-fixed/32" : "bg-surface-container-high/55")} />
      {paciente.ativo ? <span aria-hidden="true" className="absolute inset-y-4 left-0 w-[3px] rounded-r-full bg-primary-fixed-dim/75 transition-colors duration-200 group-hover:bg-primary-container" /> : null}

      <div className="relative z-[1] shrink-0 pl-0.5">
        <Avatar nome={paciente.exibicao} tom={paciente.ativo ? "marca" : "neutro"} />
      </div>

      <div className="relative z-[1] min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <Link
            href={`/pacientes/${paciente.id}`}
            className="inline-flex min-h-6 items-center text-[0.95rem] font-semibold text-on-surface outline-none after:absolute after:inset-0 after:content-[''] hover:text-primary"
          >
            {paciente.exibicao}
          </Link>

          {paciente.nomeSocial ? (
            <span className="rounded-full border border-card-border/75 bg-surface/70 px-2 py-0.5 text-[0.68rem] text-outline">
              registro: {paciente.nome}
            </span>
          ) : null}

          {!paciente.ativo ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-card-border/80 bg-white/62 px-2 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
              Arquivada
            </span>
          ) : null}

          {paciente.exemplo ? (
            <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.6875rem] text-outline">exemplo</span>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-outline">
          {telefone ? (
            <span className="inline-flex items-center gap-1.5">
              <Phone aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary/70" />
              <span className="tabular">{telefone}</span>
            </span>
          ) : null}

          {paciente.email ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Mail aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary/70" />
              <span className="truncate">{paciente.email}</span>
            </span>
          ) : null}

          {paciente.dataNascimento ? (
            <span className="inline-flex items-center gap-1.5">
              <Cake aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary/70" />
              <span className="tabular">{formatarDiaMes(paciente.dataNascimento)} · {idadeEm(paciente.dataNascimento)} anos</span>
            </span>
          ) : null}

          {!telefone && !paciente.email && !paciente.dataNascimento ? <span>Sem contato cadastrado</span> : null}
        </div>
      </div>

      <span className="relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-xl border border-card-border/75 bg-surface/75 text-outline-variant shadow-[var(--shadow-cartao)] transition-[transform,color,border-color,background-color,box-shadow] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-primary-fixed/35 group-hover:text-primary group-hover:shadow-[var(--shadow-realce)]">
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
    <ul aria-label="Pacientes" className="flex flex-col gap-3.5">
      {pacientes.map((paciente, indice) => <LinhaPaciente key={paciente.id} paciente={paciente} indice={indice} />)}
    </ul>
  );
}
