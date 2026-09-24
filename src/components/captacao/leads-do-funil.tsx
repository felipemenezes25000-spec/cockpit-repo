"use client";

import { CircleAlert, LoaderCircle, MessageCircle, Plus, Route, UserRoundPlus } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { ACAO_INICIAL } from "@/lib/acao";
import { ETAPAS_FUNIL, ORIGENS_CAPTACAO, ROTULO_ETAPA } from "@/lib/captacao";
import { formatarData } from "@/lib/format";
import { formatarTelefone, linkWhatsapp } from "@/lib/paciente";
import { criarLead, mudarEtapaLead, type EstadoLead } from "@/server/acoes/captacao";
import type { LeadDoPainel } from "@/server/consultas/captacao";
import type { Procedimento } from "@/server/consultas/procedimentos";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { Campo, classeDeAreaDeTexto, classeDeEntrada } from "@/components/ui/field";

const INICIAL: EstadoLead = { erros: {} };

function BotaoAdicionar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-4 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-55"
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

function MoverLead({ lead }: { lead: LeadDoPainel }) {
  const [estado, executar] = useActionState(mudarEtapaLead, ACAO_INICIAL);
  const [para, setPara] = useState(lead.etapa);

  useEffect(() => {
    setPara(lead.etapa);
  }, [lead.etapa]);

  return (
    <form action={executar} className="flex min-w-[13rem] flex-col gap-2 sm:items-end">
      <input type="hidden" name="id" value={lead.id} />
      <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
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

function LinhaLead({ lead, podeEditar }: { lead: LeadDoPainel; podeEditar: boolean }) {
  const whatsapp = linkWhatsapp(lead.telefone);
  return (
    <li className="premium-interactive flex flex-col gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm text-on-surface">{lead.nome}</strong>
          <span className="rounded-[var(--radius-tag)] border border-informativo-borda bg-informativo-fundo px-2 py-0.5 text-[0.68rem] font-semibold text-informativo-texto">
            {ROTULO_ETAPA[lead.etapa]}
          </span>
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
      </div>
      {podeEditar ? <MoverLead lead={lead} /> : null}
    </li>
  );
}

export function LeadsDoFunil({
  leads,
  procedimentos,
  podeEditar,
}: {
  leads: LeadDoPainel[];
  procedimentos: Procedimento[];
  podeEditar: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      {podeEditar ? <NovoLead procedimentos={procedimentos} /> : null}

      <Card>
        <CardCabecalho
          titulo="Leads recentes"
          descricao="A carteira comercial fica separada de Pacientes até a conversão. Mover uma etapa grava histórico no banco."
          acao={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"><Route aria-hidden="true" size={15} /> {leads.length} exibidos</span>}
        />
        <CardCorpo>
          {leads.length > 0 ? (
            <ul className="flex flex-col gap-2.5">
              {leads.map((lead) => <LinhaLead key={lead.id} lead={lead} podeEditar={podeEditar} />)}
            </ul>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-[var(--radius-cartao)] border border-dashed border-card-border px-5 text-center">
              <UserRoundPlus aria-hidden="true" size={24} className="text-outline" />
              <p className="mt-3 text-sm font-semibold text-on-surface">O funil ainda está vazio neste período.</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-outline">O primeiro contato registrado já aparece aqui e alimenta automaticamente os indicadores.</p>
            </div>
          )}
        </CardCorpo>
      </Card>
    </div>
  );
}
