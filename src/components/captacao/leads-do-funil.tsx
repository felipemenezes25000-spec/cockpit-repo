"use client";

import {
  BellRing,
  CalendarClock,
  CalendarOff,
  CalendarPlus2,
  CalendarX2,
  CircleAlert,
  Clock3,
  History,
  Link2,
  LoaderCircle,
  MessageCircle,
  MessageSquarePlus,
  NotebookPen,
  Plus,
  Route,
  UserCheck,
  UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { FiltrosLeads } from "@/components/captacao/filtros-leads";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { Campo, classeDeAreaDeTexto, classeDeEntrada } from "@/components/ui/field";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { Paginacao } from "@/components/ui/paginacao";
import { ACAO_INICIAL } from "@/lib/acao";
import {
  CANAIS_CONTATO,
  ETAPAS_FUNIL,
  leadAberto,
  LIMITE_OBSERVACAO_CONTATO,
  ORIGENS_CAPTACAO,
  ROTULO_CANAL,
  ROTULO_ETAPA,
  type FiltroAtencaoLead,
} from "@/lib/captacao";
import { cn } from "@/lib/cn";
import { partesDoDia } from "@/lib/dates";
import { formatarData, formatarDiaMes, formatarHora } from "@/lib/format";
import { formatarTelefone, linkWhatsapp } from "@/lib/paciente";
import {
  converterLeadEmPaciente,
  criarLead,
  mudarEtapaLead,
  registrarContatoLead,
  vincularPacienteLead,
  type EstadoContato,
  type EstadoLead,
} from "@/server/acoes/captacao";
import type {
  FiltroEtapaLead,
  LeadDaCarteira,
} from "@/server/consultas/captacao-leads";
import type { Procedimento } from "@/server/consultas/procedimentos";

const INICIAL: EstadoLead = { erros: {} };
const INICIAL_CONTATO: EstadoContato = { erros: {} };
const ETAPAS_MANUAIS = ETAPAS_FUNIL.filter((etapa) => etapa !== "ganho");

/** "24/09" no ano corrente; com o ano quando é de outro (o recorte de retorno alcança leads antigos). */
function diaCurto(data: Date): string {
  return partesDoDia(data).ano === partesDoDia().ano ? formatarDiaMes(data) : formatarData(data);
}

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
            <select key={`origem-${estado.valores?.origem ?? ""}`} id="lead-origem" name="origem" defaultValue={estado.valores?.origem ?? "Instagram"} className={classeDeEntrada()}>
              {ORIGENS_CAPTACAO.map((origem) => <option key={origem} value={origem}>{origem}</option>)}
            </select>
          </Campo>
          <Campo id="lead-campanha" rotulo="Campanha" erro={estado.erros.campanha} className="lg:col-span-3">
            <input id="lead-campanha" name="campanha" defaultValue={estado.valores?.campanha ?? ""} className={classeDeEntrada()} placeholder="Ex.: Botox setembro" />
          </Campo>
          <Campo id="lead-procedimento" rotulo="Procedimento de interesse" erro={estado.erros.procedimento_interesse_id} className="lg:col-span-6">
            <select key={`procedimento-${estado.valores?.procedimento_interesse_id ?? ""}`} id="lead-procedimento" name="procedimento_interesse_id" defaultValue={estado.valores?.procedimento_interesse_id ?? ""} className={classeDeEntrada()}>
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
  const [para, setPara] = useState(lead.etapa === "ganho" ? "novo" : lead.etapa);

  useEffect(() => {
    if (lead.etapa !== "ganho") setPara(lead.etapa);
  }, [lead.etapa]);

  if (lead.etapa === "ganho") {
    return (
      <div className="rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-3 py-2.5 text-xs leading-5 text-positivo lg:max-w-[22rem] lg:text-right">
        <strong>Venda comprovada pelo Financeiro.</strong> Esta etapa não é alterada manualmente pela Captação.
      </div>
    );
  }

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
          {ETAPAS_MANUAIS.map((etapa) => <option key={etapa} value={etapa}>{ROTULO_ETAPA[etapa]}</option>)}
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
          Use esta opção quando a pessoa já tiver cadastro. Agendamento e venda passam a avançar o lead automaticamente.
        </p>
      </form>
    </details>
  );
}

function CriarPacienteDoLead({ lead }: { lead: LeadDaCarteira }) {
  const perdido = lead.etapa === "perdido";
  return (
    <FormularioDeAcao
      acao={converterLeadEmPaciente}
      campos={{ id: lead.id }}
      confirmacao={`Criar uma nova paciente usando os dados de ${lead.nome}? Se ela já estiver cadastrada, cancele e use “Vincular a uma paciente”.`}
      alinhamento="fim"
      className="w-full lg:max-w-[22rem]"
    >
      <BotaoDeAcao
        tom="primario"
        tamanho="xs"
        icone={<UserRoundPlus />}
        rotuloPendente="Criando paciente…"
        indisponivel={perdido}
        motivoIndisponivel="Reabra o lead antes de criar a paciente."
        className="w-full"
      >
        Criar paciente com dados do lead
      </BotaoDeAcao>
    </FormularioDeAcao>
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
        <div className="flex w-full flex-col gap-2 lg:max-w-[22rem]">
          <p className="text-[0.68rem] leading-5 text-outline">
            Sem cadastro clínico. Crie um novo usando estes dados ou vincule se a paciente já existir.
          </p>
          <CriarPacienteDoLead lead={lead} />
        </div>
      ) : null}

      {podeEditar && lead.etapa !== "ganho" ? <VincularPaciente lead={lead} /> : null}
    </div>
  );
}

type TomDoSelo = "negativo" | "atencao" | "informativo" | "neutro";

const TOM_DO_SELO: Record<TomDoSelo, string> = {
  negativo: "border-negativo-borda bg-negativo-fundo text-negativo",
  atencao: "border-atencao-borda bg-atencao-fundo text-atencao",
  informativo: "border-informativo-borda bg-informativo-fundo text-informativo-texto",
  neutro: "border-card-border bg-surface-container-low text-on-surface-variant",
};

function Selo({ tom, icone: Icone, children }: { tom: TomDoSelo; icone: LucideIcon; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[var(--radius-tag)] border px-2 py-0.5 text-[0.68rem] font-semibold", TOM_DO_SELO[tom])}>
      <Icone aria-hidden="true" size={12} />
      {children}
    </span>
  );
}

/**
 * Onde está o próximo contato combinado. Vermelho só para o que já venceu,
 * laranja para o que é de hoje (AGENTS.md §7.3); o texto diz o estado, a cor
 * e o ícone reforçam. Lead encerrado não tem retorno — o banco limpa a data.
 */
function SeloRetorno({ lead }: { lead: LeadDaCarteira }) {
  if (!leadAberto(lead.etapa)) return null;
  if (lead.retornoAtrasado && lead.diasParaRetorno !== null) {
    const dias = Math.abs(lead.diasParaRetorno);
    return (
      <Selo tom="negativo" icone={CalendarX2}>
        {dias === 1 ? "Retorno atrasado há 1 dia" : `Retorno atrasado há ${dias} dias`}
      </Selo>
    );
  }
  if (lead.retornoHoje) return <Selo tom="atencao" icone={BellRing}>Retorno hoje</Selo>;
  if (lead.proximoContato) {
    return <Selo tom="informativo" icone={CalendarClock}>Próximo contato em {diaCurto(lead.proximoContato)}</Selo>;
  }
  return <Selo tom="neutro" icone={CalendarOff}>Sem retorno programado</Selo>;
}

function AcompanhamentoDoLead({ lead }: { lead: LeadDaCarteira }) {
  const aberto = leadAberto(lead.etapa);
  if (!aberto && !lead.ultimoContatoEm) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
      <SeloRetorno lead={lead} />
      <span className="text-outline">
        {lead.ultimoContatoEm
          ? `Último contato: ${diaCurto(lead.ultimoContatoEm)} às ${formatarHora(lead.ultimoContatoEm)}`
          : "Sem contato registrado"}
      </span>
    </div>
  );
}

function BotaoRegistrarContato() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] bg-primary-container px-3 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline"
    >
      {pending ? <LoaderCircle aria-hidden="true" size={14} className="animate-spin" /> : <MessageSquarePlus aria-hidden="true" size={14} />}
      {pending ? "Registrando…" : "Registrar contato"}
    </button>
  );
}

/**
 * O contato não muda a etapa: diz quando a equipe falou com o lead e o que
 * ficou combinado. Só aparece para lead aberto — a RLS e o banco (0031)
 * recusam contato em lead encerrado de qualquer forma.
 */
function RegistrarContato({ lead, hoje }: { lead: LeadDaCarteira; hoje: string }) {
  const [estado, acao] = useActionState(registrarContatoLead, INICIAL_CONTATO);
  const formulario = useRef<HTMLFormElement>(null);
  const prefixo = `contato-${lead.id}`;
  const digitado = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;

  // Recusado, o foco vai para o primeiro campo com erro (ou para o aviso
  // geral), como no formulário da Agenda: quem usa teclado ou leitor de tela
  // ouve o motivo sem procurar.
  useEffect(() => {
    if (estado.sucesso) {
      formulario.current?.reset();
      return;
    }
    if (Object.keys(estado.erros).length === 0) return;
    const alvo =
      formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      formulario.current?.querySelector<HTMLElement>("[data-erro-geral]");
    alvo?.focus();
  }, [estado]);

  return (
    <details className="group w-full rounded-[var(--radius-cartao)] border border-primary-fixed bg-selecao px-3 py-2.5 lg:max-w-[22rem]">
      <summary className="flex min-h-7 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold text-primary">
        <span className="inline-flex items-center gap-1.5">
          <MessageSquarePlus aria-hidden="true" size={14} />
          Registrar contato
        </span>
        <span aria-hidden="true" className="text-outline transition-transform group-open:rotate-45">+</span>
      </summary>

      <form ref={formulario} action={acao} noValidate className="mt-3 flex flex-col gap-3 border-t border-primary-fixed pt-3">
        <input type="hidden" name="lead_id" value={lead.id} />
        <Campo id={`${prefixo}-canal`} rotulo="Canal" obrigatorio erro={estado.erros.canal}>
          <select
            key={`canal-${digitado("canal")}`}
            id={`${prefixo}-canal`}
            name="canal"
            defaultValue={digitado("canal", "whatsapp")}
            className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
          >
            {CANAIS_CONTATO.map((canal) => <option key={canal} value={canal}>{ROTULO_CANAL[canal]}</option>)}
          </select>
        </Campo>
        <Campo
          id={`${prefixo}-observacao`}
          rotulo="Observação"
          dica="O que foi conversado e combinado. Informação clínica não entra aqui."
          erro={estado.erros.observacao}
        >
          <textarea
            id={`${prefixo}-observacao`}
            name="observacao"
            maxLength={LIMITE_OBSERVACAO_CONTATO}
            defaultValue={digitado("observacao")}
            className={classeDeAreaDeTexto({ altura: "curta" })}
          />
        </Campo>
        <Campo
          id={`${prefixo}-proximo`}
          rotulo="Próximo contato"
          dica="Deixe em branco se não ficou retorno combinado."
          erro={estado.erros.proximo_contato}
        >
          <input
            id={`${prefixo}-proximo`}
            type="date"
            name="proximo_contato"
            min={hoje}
            defaultValue={digitado("proximo_contato")}
            className={classeDeEntrada({ altura: "compacta", texto: "xs" })}
          />
        </Campo>
        <div className="flex flex-wrap items-center gap-2">
          <BotaoRegistrarContato />
        </div>
        {estado.erros.geral ? (
          <p role="alert" tabIndex={-1} data-erro-geral className="flex items-start gap-2 text-xs leading-5 text-negativo">
            <CircleAlert aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
            {estado.erros.geral}
          </p>
        ) : null}
        {/* Sempre no DOM: região viva que já existe antes do texto chegar é a que o leitor de tela anuncia. */}
        <p role="status" className="text-xs font-medium leading-5 text-positivo empty:hidden">
          {estado.sucesso ?? ""}
        </p>
      </form>
    </details>
  );
}

/** O que a equipe conversou com o lead — `lead_interacoes`, separado da trilha de etapas. */
function HistoricoComercial({ lead }: { lead: LeadDaCarteira }) {
  if (lead.totalInteracoes === 0) return null;

  return (
    <details className="group mt-3 max-w-xl rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3 py-2">
      <summary className="flex min-h-7 cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-primary">
        <NotebookPen aria-hidden="true" size={14} />
        Histórico comercial
        <span className="font-normal text-outline">· {lead.totalInteracoes}</span>
      </summary>
      <ol className="mt-2 border-t border-card-border pt-2">
        {lead.interacoes.map((contato) => (
          <li key={contato.id} className="border-b border-card-border py-2 text-xs last:border-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="whitespace-nowrap text-outline">
                {diaCurto(contato.em)} · {formatarHora(contato.em)}
              </span>
              <span className="font-semibold text-on-surface">{ROTULO_CANAL[contato.canal]}</span>
            </p>
            {contato.observacao ? (
              <p className="mt-1 leading-5 break-words whitespace-pre-line text-on-surface-variant">{contato.observacao}</p>
            ) : null}
            {contato.proximoContato ? (
              <p className="mt-1 inline-flex items-center gap-1 text-outline">
                <CalendarClock aria-hidden="true" size={12} />
                Próximo contato combinado: {diaCurto(contato.proximoContato)}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {lead.totalInteracoes > lead.interacoes.length ? (
        <p className="border-t border-card-border pt-2 text-[0.68rem] leading-5 text-outline">
          Mostrando os {lead.interacoes.length} contatos mais recentes de {lead.totalInteracoes}.
        </p>
      ) : null}
    </details>
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
            <span
              aria-hidden="true"
              className={`mt-1.5 size-1.5 shrink-0 rounded-full ${passo.para === "perdido" ? "bg-negativo" : "bg-primary-container"}`}
            />
            <span className="min-w-0 flex-1 text-on-surface-variant">
              <span className="font-semibold text-on-surface">
                {passo.de ? `${ROTULO_ETAPA[passo.de]} → ` : "Entrada → "}
                {ROTULO_ETAPA[passo.para]}
              </span>
              <span className="ml-2 whitespace-nowrap text-outline">
                {formatarData(passo.em)} · {formatarHora(passo.em)}
              </span>
              {passo.para === "perdido" && passo.motivo ? (
                <span className="mt-1.5 block rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-2.5 py-1.5 leading-5 text-negativo">
                  <strong>Motivo registrado:</strong> {passo.motivo}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}

function LinhaLead({ lead, podeEditar, hoje }: { lead: LeadDaCarteira; podeEditar: boolean; hoje: string }) {
  const whatsapp = linkWhatsapp(lead.telefone);
  const aberto = leadAberto(lead.etapa);
  const parado = lead.diasSemMovimento >= 3 && aberto;
  // A barrinha à esquerda marca o que pede contato hoje (AGENTS.md §7.3):
  // a linha continua branca, o estado vai no selo e na barra.
  const barra = lead.retornoAtrasado ? "bg-negativo" : lead.retornoHoje ? "bg-atencao-acento" : null;

  return (
    <li className="premium-interactive relative grid gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)] lg:items-start">
      {barra ? <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-[3px] rounded-r-full", barra)} /> : null}
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

        <AcompanhamentoDoLead lead={lead} />

        {lead.motivoPerda ? (
          <p className="mt-3 max-w-xl rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3 py-2 text-xs leading-5 text-negativo">
            <strong>Motivo da perda:</strong> {lead.motivoPerda}
          </p>
        ) : null}

        <HistoricoComercial lead={lead} />
        <HistoricoDoLead lead={lead} />
      </div>

      <div className="flex min-w-0 flex-col gap-3 border-t border-card-border pt-3 lg:border-t-0 lg:pt-0">
        {podeEditar && aberto ? <RegistrarContato lead={lead} hoje={hoje} /> : null}
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
  atencao,
  filtrosExtras,
  mesDoPeriodo,
  hoje,
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
  atencao: FiltroAtencaoLead;
  /** Origem ou campanha no recorte. */
  filtrosExtras: boolean;
  /** "setembro de 2026" — o mês de entrada da coorte. */
  mesDoPeriodo: string;
  /** "AAAA-MM-DD" do dia da clínica, calculado no servidor. */
  hoje: string;
  parametrosPaginacao: Record<string, string>;
}) {
  const filtrado = Boolean(busca) || etapa !== "todos" || atencao !== "todos" || filtrosExtras;
  const vazio =
    atencao === "retorno_hoje"
      ? {
          titulo: "Nenhum retorno combinado para hoje.",
          texto: "Quando um contato programar o retorno para hoje, o lead aparece aqui — de qualquer mês de entrada.",
        }
      : atencao === "retorno_atrasado"
        ? {
            titulo: "Nenhum retorno atrasado.",
            texto: "Todo retorno combinado ainda está no prazo ou já teve um novo contato registrado.",
          }
        : atencao === "parados"
          ? {
              titulo: `Nenhum lead de ${mesDoPeriodo} parado há 3+ dias.`,
              texto: "Todo lead aberto desta coorte teve movimento ou contato nos últimos dias.",
            }
          : filtrado
            ? {
                titulo: "Nenhum lead corresponde a este filtro.",
                texto: "Limpe a busca ou troque os filtros para voltar a enxergar a carteira do mês.",
              }
            : {
                titulo: "O funil ainda está vazio neste período.",
                texto: "O primeiro contato registrado já aparece aqui e alimenta automaticamente os indicadores.",
              };

  return (
    <div className="flex flex-col gap-5">
      {podeEditar ? <NovoLead procedimentos={procedimentos} /> : null}

      <Card>
        <CardCabecalho
          titulo="Carteira comercial"
          descricao="Busque toda a carteira do período, registre cada contato e o próximo retorno, converta ou vincule o cadastro clínico e acompanhe o avanço até agenda e venda sem perder o histórico do lead."
          acao={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Route aria-hidden="true" size={15} /> {total} no recorte</span>}
        />
        <CardCorpo className="flex flex-col gap-4">
          <FiltrosLeads busca={busca} etapa={etapa} total={total} />

          {leads.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {leads.map((lead) => <LinhaLead key={lead.id} lead={lead} podeEditar={podeEditar} hoje={hoje} />)}
            </ul>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-cartao)] border border-dashed border-card-border px-5 text-center">
              <UserRoundPlus aria-hidden="true" size={24} className="text-outline" />
              <p className="mt-3 text-sm font-semibold text-on-surface">{vazio.titulo}</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-outline">{vazio.texto}</p>
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
