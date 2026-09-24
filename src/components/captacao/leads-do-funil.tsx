"use client";

import {
  CalendarPlus2,
  CircleAlert,
  Clock3,
  History,
  Link2,
  LoaderCircle,
  MessageCircle,
  Plus,
  Route,
  UserCheck,
  UserRoundPlus,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { FiltrosLeads } from "@/components/captacao/filtros-leads";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { Campo, classeDeAreaDeTexto, classeDeEntrada } from "@/components/ui/field";
import { Paginacao } from "@/components/ui/paginacao";
import { ACAO_INICIAL } from "@/lib/acao";
import { ETAPAS_FUNIL, ORIGENS_CAPTACAO, ROTULO_ETAPA } from "@/lib/captacao";
import { formatarData, formatarHora } from "@/lib/format";
import { formatarTelefone, linkWhatsapp } from "@/lib/paciente";
import {
  criarLead,
  mudarEtapaLead,
  vincularPacienteLead,
  type EstadoLead,
} from "@/server/acoes/captacao";
import type {
  FiltroEtapaLead,
  LeadDaCarteira,
} from "@/server/consultas/captacao-leads";
import type { Procedimento } from "@/server/consultas/procedimentos";

const INICIAL: EstadoLead = { erros: {} };

function BotaoAdicionar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
    >
      {pending ? <LoaderCircle aria-hidden="true" size={16} className="animate-spin" /> : <Plus aria-hidden="true" size={16} />}
      {pending ? "Adicionando…" : "Adicionar ao funil"}
    </button>
  );
}

function NovoLead({ procedimentos }: { procedimentos: Procedimento[] }) {
  const [estado, acao] = useActionState(criarLead, INICIAL);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) formulario.current?.reset();
  }, [estado]);

  return (
    <Card>
      <CardCabecalho
        titulo="Entrada rápida de lead"
        descricao="Registre o contato antes de transformá-lo em paciente."
      />
      <CardCorpo>
        <form ref={formulario} action={acao} noValidate className="grid gap-4 lg:grid-cols-12">
          <Campo id="lead-nome" rotulo="Nome" obrigatorio erro={estado.erros.nome} className="lg:col-span-4">
            <input id="lead-nome" name="nome" defaultValue={estado.valores?.nome ?? ""} className={classeDeEntrada()} autoComplete="name" />
          </Campo>
          <Campo id="lead-telefone" rotulo="Telefone" erro={estado.erros.telefone} className="lg:col-span-3">
            <input id="lead-telefone" name="telefone" defaultValue={estado.valores?.telefone ?? ""} className={classeDeEntrada()} inputMode="tel" autoComplete="tel" />
          </Campo>
          <Campo id="lead-email" rotulo="E-mail" erro={estado.erros.email} className="lg:col-span-5">
            <input id="lead-email" name="email" defaultValue={estado.valores?.email ?? ""} className={classeDeEntrada()} type="email" autoComplete="email" />
          </Campo>

          <Campo id="lead-origem" rotulo="Origem" obrigatorio erro={estado.erros.origem} className="lg:col-span-3">
            <select id="lead-origem" name="origem" defaultValue={estado.valores?.origem ?? "Instagram"} className={classeDeEntrada()}>
              {ORIGENS_CAPTACAO.map((origem) => <option key={origem} value={origem}>{origem}</option>)}
            </select>
          </Campo>
          <Campo id="lead-campanha" rotulo="Campanha" erro={estado.erros.campanha} className="lg:col-span-3">
            <input id="lead-campanha" name="campanha" defaultValue={estado.valores?.campanha ?? ""} className={classeDeEntrada()} placeholder="Ex.: Botox setembro" />
          </Campo>
          <Campo id="lead-procedimento" rotulo="Procedimento de interesse" erro={estado.erros.procedimento_interesse_id} className="lg:col-span-6">
            <select id="lead-procedimento" name="procedimento_interesse_id" defaultValue={estado.valores?.procedimento_interesse_id ?? ""} className={classeDeEntrada()}>
              <option value="">Ainda não definido</option>
              {procedimentos.filter((p) => p.ativo).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>

          <Campo id="lead-observacoes" rotulo="Observações" erro={estado.erros.observacoes} className="lg:col-span-12">
            <textarea id="lead-observacoes" name="observacoes" defaultValue={estado.valores?.observacoes ?? ""} className={classeDeAreaDeTexto({ altura: "curta" })} />
          </Campo>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-12">
            <BotaoAdicionar />
            {estado.erros.geral ? (
              <p role="alert" className="flex items-start gap-2 text-xs leading-5 text-negativo">
                <CircleAlert aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
                {estado.erros.geral}
              </p>
            ) : null}
            {estado.sucesso ? <p role="status" className="text-xs font-medium text-positivo">{estado.sucesso}</p> : null}
          </div>
        </form>
      </CardCorpo>
    </Card>
  );
}

function BotaoMover({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || desabilitado}
      className="h-9 rounded-[var(--radius-controle)] border border-borda-controle bg-surface px-3 text-xs font-semibold text-primary transition-colors hover:bg-selecao disabled:cursor-not-allowed disabled:border-card-border disabled:bg-surface-container-low disabled:text-outline"
    >
      {pending ? "Movendo…" : "Mover"}
    </button>
  );
}

function MoverLead({ lead }: { lead: LeadDaCarteira }) {
  const [estado, executar] = useActionState(mudarEtapaLead, ACAO_INICIAL);
  const [para, setPara] = useState(lead.etapa);

  useEffect(() => {
    setPara(lead.etapa);
  }, [lead.etapa]);

  return (
    <form action={executar} className="flex min-w-0 flex-col gap-2 lg:items-end">
      <input type="hidden" name="id" value={lead.id} />
      <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:justify-end">
        <select
          name="para"
          aria-label={`Mover ${lead.nome} para outra etapa`}
          value={para}
          onChange={(evento) => setPara(evento.target.value as typeof para)}
          className={classeDeEntrada({ altura: "compacta", largura: "auto", texto: "xs" })}
        >
          {ETAPAS_FUNIL.map((etapa) => <option key={etapa} value={etapa}>{ROTULO_ETAPA[etapa]}</option>)}
        </select>
        <BotaoMover desabilitado={para === lead.etapa} />
      </div>
      {para === "perdido" ? (
        <input
          name="motivo"
          required
          placeholder="Motivo da perda"
          aria-label={`Motivo da perda de ${lead.nome}`}
          className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
        />
      ) : <input type="hidden" name="motivo" value="" />}
      {!estado.ok && estado.mensagem ? <p role="alert" className="max-w-xs text-xs leading-5 text-negativo">{estado.mensagem}</p> : null}
    </form>
  );
}

function BotaoVincular({ desabilitado }: { desabilitado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || desabilitado}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] bg-primary-container px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
    >
      {pending ? <LoaderCircle aria-hidden="true" size={14} className="animate-spin" /> : <Link2 aria-hidden="true" size={14} />}
      {pending ? "Vinculando…" : "Confirmar vínculo"}
    </button>
  );
}

function VincularPaciente({ lead }: { lead: LeadDaCarteira }) {
  const [estado, executar] = useActionState(vincularPacienteLead, ACAO_INICIAL);
  const [selecionada, setSelecionada] = useState(false);

  return (
    <details className="group w-full rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3 py-2.5 lg:max-w-[22rem]">
      <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
        <span className="inline-flex items-center gap-1.5">
          <Link2 aria-hidden="true" size={14} />
          {lead.pacienteId ? "Trocar paciente vinculada" : "Vincular a uma paciente"}
        </span>
        <span aria-hidden="true" className="text-outline transition-transform group-open:rotate-45">+</span>
      </summary>

      <form action={executar} className="mt-3 flex flex-col gap-3 border-t border-card-border pt-3">
        <input type="hidden" name="id" value={lead.id} />
        <SeletorPaciente
          inicial={null}
          idPrefix={`paciente-lead-${lead.id}`}
          aoEscolher={(paciente) => setSelecionada(Boolean(paciente))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <BotaoVincular desabilitado={!selecionada} />
          {!estado.ok && estado.mensagem ? (
            <p role="alert" className="text-xs leading-5 text-negativo">{estado.mensagem}</p>
          ) : null}
          {estado.ok && estado.mensagem ? (
            <p role="status" className="text-xs leading-5 text-positivo">{estado.mensagem}</p>
          ) : null}
        </div>
        <p className="text-[0.68rem] leading-5 text-outline">
          Depois do vínculo, agendamento e venda desta paciente avançam o funil automaticamente.
        </p>
      </form>
    </details>
  );
}

function AcoesDaPaciente({ lead, podeEditar }: { lead: LeadDaCarteira; podeEditar: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2 lg:items-end">
      {lead.pacienteId ? (
        <div className="flex w-full flex-wrap items-center gap-2 lg:justify-end">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] border border-positivo-borda bg-positivo-fundo px-2.5 text-xs font-semibold text-positivo">
            <UserCheck aria-hidden="true" size={14} />
            Paciente vinculada
          </span>
          <Link
            href={`/pacientes/${lead.pacienteId}`}
            className="inline-flex h-8 items-center rounded-[var(--radius-controle)] border border-card-border bg-surface px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-selecao"
          >
            Abrir ficha
          </Link>
          <Link
            href={`/agenda/novo?paciente=${lead.pacienteId}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed"
          >
            <CalendarPlus2 aria-hidden="true" size={14} />
            Agendar
          </Link>
        </div>
      ) : podeEditar ? (
        <div className="w-full lg:max-w-[22rem]">
          <p className="mb-2 text-[0.68rem] leading-5 text-outline">
            Ainda não existe cadastro clínico ligado a esta oportunidade.
          </p>
        </div>
      ) : null}

      {podeEditar ? <VincularPaciente lead={lead} /> : null}
    </div>
  );
}

function HistoricoDoLead({ lead }: { lead: LeadDaCarteira }) {
  if (lead.historico.length === 0) return null;

  return (
    <details className="group mt-3 max-w-xl rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3 py-2">
      <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-primary">
        <History aria-hidden="true" size={14} />
        Histórico do funil
        <span className="font-normal text-outline">· {lead.historico.length}</span>
      </summary>
      <ol className="mt-2 border-t border-card-border pt-2">
        {lead.historico.slice(0, 8).map((passo, indice) => (
          <li key={`${passo.em.toISOString()}-${indice}`} className="flex gap-2 border-b border-card-border py-2 text-xs last:border-0">
            <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-container" />
            <span className="min-w-0 flex-1 text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                {passo.de ? `${ROTULO_ETAPA[passo.de]} → ` : "Entrada → "}
                {ROTULO_ETAPA[passo.para]}
              </span>
              <span className="ml-2 whitespace-nowrap text-outline">
                {formatarData(passo.em)} · {formatarHora(passo.em)}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function LinhaLead({ lead, podeEditar }: { lead: LeadDaCarteira; podeEditar: boolean }) {
  const whatsapp = linkWhatsapp(lead.telefone);
  const parado = lead.diasSemMovimento >= 3 && lead.etapa !== "ganho" && lead.etapa !== "perdido";

  return (
    <li className="premium-interactive grid gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm text-on-surface">{lead.nome}</strong>
          <span className="rounded-[var(--radius-tag)] border border-informativo-borda bg-informativo-fundo px-2 py-0.5 text-[0.68rem] font-semibold text-informativo-texto">
            {ROTULO_ETAPA[lead.etapa]}
          </span>
          {parado ? (
            <span className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] border border-atencao-borda bg-atencao-fundo px-2 py-0.5 text-[0.68rem] font-semibold text-atencao">
              <Clock3 aria-hidden="true" size={12} />
              {lead.diasSemMovimento === 1 ? "1 dia sem movimento" : `${lead.diasSemMovimento} dias sem movimento`}
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 text-xs leading-5 text-outline">
          {lead.origem}{lead.campanha ? ` · ${lead.campanha}` : ""}{lead.procedimento ? ` · ${lead.procedimento}` : ""} · {formatarData(lead.criadoEm)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-on-surface-variant">
          {lead.telefone ? <span className="tabular">{formatarTelefone(lead.telefone)}</span> : null}
          {lead.email ? <span>{lead.email}</span> : null}
          {whatsapp ? (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-positivo hover:underline">
              <MessageCircle aria-hidden="true" size={13} /> WhatsApp
              <span className="sr-only"> de {lead.nome} (abre em nova aba)</span>
            </a>
          ) : null}
        </div>

        {lead.motivoPerda ? (
          <p className="mt-3 max-w-xl rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3 py-2 text-xs leading-5 text-negativo">
            <strong>Motivo da perda:</strong> {lead.motivoPerda}
          </p>
        ) : null}

        <HistoricoDoLead lead={lead} />
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-t border-card-border pt-3 lg:border-t-0 lg:pt-0">
        <AcoesDaPaciente lead={lead} podeEditar={podeEditar} />
        {podeEditar ? <MoverLead lead={lead} /> : null}
      </div>
    </li>
  );
}

export function LeadsDoFunil({
  leads,
  procedimentos,
  podeEditar,
  total,
  pagina,
  paginas,
  busca,
  etapa,
  parametrosPaginacao,
}: {
  leads: LeadDaCarteira[];
  procedimentos: Procedimento[];
  podeEditar: boolean;
  total: number;
  pagina: number;
  paginas: number;
  busca: string;
  etapa: FiltroEtapaLead;
  parametrosPaginacao: Record<string, string>;
}) {
  const filtrado = Boolean(busca) || etapa !== "todos";

  return (
    <div className="flex flex-col gap-5">
      {podeEditar ? <NovoLead procedimentos={procedimentos} /> : null}

      <Card>
        <CardCabecalho
          titulo="Carteira comercial"
          descricao="Busque toda a carteira do período, vincule o cadastro clínico e acompanhe o avanço até agenda e venda sem perder o histórico do lead."
          acao={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Route aria-hidden="true" size={15} /> {total} no recorte</span>}
        />
        <CardCorpo className="flex flex-col gap-4">
          <FiltrosLeads busca={busca} etapa={etapa} total={total} />

          {leads.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {leads.map((lead) => <LinhaLead key={lead.id} lead={lead} podeEditar={podeEditar} />)}
            </ul>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-cartao)] border border-dashed border-card-border px-5 text-center">
              <UserRoundPlus aria-hidden="true" size={24} className="text-outline" />
              <p className="mt-3 text-sm font-semibold text-on-surface">
                {filtrado ? "Nenhum lead corresponde a este filtro." : "O funil ainda está vazio neste período."}
              </p>
              <p className="mt-1 max-w-md text-xs leading-5 text-outline">
                {filtrado
                  ? "Limpe a busca ou troque a etapa para voltar a enxergar a carteira do mês."
                  : "O primeiro contato registrado já aparece aqui e alimenta automaticamente os indicadores."}
              </p>
            </div>
          )}

          <Paginacao
            pagina={pagina}
            paginas={paginas}
            parametros={parametrosPaginacao}
            caminho="/captacao"
            rotulo="Paginação da carteira de leads"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
