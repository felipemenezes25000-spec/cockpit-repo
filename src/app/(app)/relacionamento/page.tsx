import { Cake, CalendarCheck, ClipboardList, Repeat2, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AcaoInline } from "@/components/relacionamento/acao-inline";
import { BuscarConvite } from "@/components/relacionamento/buscar-convite";
import { ConviteContato } from "@/components/relacionamento/convite-contato";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { diferencaEmDias, partesDoDia } from "@/lib/dates";
import { descreverPrazo, formatarData, formatarHora } from "@/lib/format";
import { ROTULO_TAREFA } from "@/lib/relacionamento";
import { confirmarPelaLista, mudarSituacaoRetorno, mudarSituacaoTarefa } from "@/server/acoes/relacionamento";
import {
  aniversariosDoMes, candidatasAAvaliacao, confirmacoesParaContato,
  contatosRegistrados, retornosParaContato, tarefasDeContato,
  type RetornoRelacionamento, type TarefaRelacionamento,
} from "@/server/consultas/relacionamento";

export const metadata: Metadata = { title: "Relacionamento" };

const ABAS = ["visao", "confirmacoes", "retornos", "aniversarios", "avaliacoes", "tarefas"] as const;
type Aba = (typeof ABAS)[number];
const ROTULO_RETORNO = {
  nao_iniciado: "Não iniciado",
  em_contato: "Em contato",
  aguardando_resposta: "Aguardando resposta",
  agendado: "Agendado",
  recusado: "Recusado",
} as const;
const ROTULOS: Record<Aba, string> = {
  visao: "Visão geral", confirmacoes: "Confirmações", retornos: "Retornos",
  aniversarios: "Aniversários", avaliacoes: "Avaliações", tarefas: "Tarefas",
};

function abaDaUrl(valor: string | string[] | undefined): Aba {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return ABAS.find((aba) => aba === texto) ?? "visao";
}

function mesDaUrl(valor: string | string[] | undefined): number {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const mes = Number(texto);
  return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : partesDoDia().mes;
}

function Tarefa({ tarefa }: { tarefa: TarefaRelacionamento }) {
  const aberta = tarefa.situacao === "aberta";
  return <li className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border py-4 last:border-0">
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium text-on-surface">{tarefa.descricao}</p>
      <p className="mt-1 text-xs text-outline">
        {ROTULO_TAREFA[tarefa.tipo as keyof typeof ROTULO_TAREFA] ?? "Tarefa"} · {tarefa.paciente ?? "Sem paciente"} · {tarefa.prazo ? formatarData(tarefa.prazo) : "Sem prazo"} · {aberta ? "Aberta" : tarefa.situacao === "resolvida" ? "Resolvida" : "Cancelada"}
      </p>
      {aberta && tarefa.prazo && diferencaEmDias(tarefa.prazo) < 0 && <p className="mt-1 text-xs font-medium text-negativo">Atrasada</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <AcaoInline acao={mudarSituacaoTarefa} campos={{ id: tarefa.id, para: aberta ? "resolvida" : "aberta" }} rotulo={aberta ? "Concluir" : "Reabrir"} />
      {aberta && <AcaoInline acao={mudarSituacaoTarefa} campos={{ id: tarefa.id, para: "cancelada" }} rotulo="Cancelar" />}
    </div>
  </li>;
}

function Retorno({ retorno }: { retorno: RetornoRelacionamento }) {
  const aberto = !["agendado", "recusado"].includes(retorno.situacao);
  return <li className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border py-4 last:border-0">
    <div className="min-w-0 flex-1">
      <Link href={`/pacientes/${retorno.pacienteId}`} className="text-sm font-medium text-primary hover:underline">{retorno.paciente}</Link>
      <p className="mt-1 text-xs text-outline">{retorno.procedimento ? `${retorno.procedimento} · ` : ""}Contato {descreverPrazo(diferencaEmDias(retorno.sugeridoPara))} · {formatarData(retorno.sugeridoPara)} · {ROTULO_RETORNO[retorno.situacao]}</p>
      {retorno.telefone && <p className="mt-1 text-xs text-outline">{retorno.telefone}</p>}
      {retorno.observacoes && <p className="mt-1 text-xs text-on-surface-variant">{retorno.observacoes}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      {aberto ? <>
        {retorno.situacao !== "em_contato" && <AcaoInline acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para: "em_contato" }} rotulo="Em contato" />}
        {retorno.situacao !== "aguardando_resposta" && <AcaoInline acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para: "aguardando_resposta" }} rotulo="Aguardar" />}
        <AcaoInline acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para: "agendado" }} rotulo="Agendado" />
        <AcaoInline acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para: "recusado" }} rotulo="Recusou" />
      </> : <AcaoInline acao={mudarSituacaoRetorno} campos={{ id: retorno.id, para: "em_contato" }} rotulo="Reabrir" />}
    </div>
  </li>;
}

export default async function PaginaRelacionamento({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const aba = abaDaUrl(parametros.aba);
  const [confirmacoes, retornos, tarefas] = await Promise.all([
    confirmacoesParaContato(), retornosParaContato(), tarefasDeContato(),
  ]);
  const abertas = tarefas.filter((t) => t.situacao === "aberta");
  const retornosNoPrazo = retornos.filter((r) => !["agendado", "recusado"].includes(r.situacao) && diferencaEmDias(r.sugeridoPara) <= 0);

  return <div>
    <FaixaDemonstracao className="mb-8" />
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><p className="rotulo mb-2">Cuidado contínuo</p><p className="t-display text-primary">Relacionamento</p><p className="mt-1 text-sm text-outline">Contatos antes e depois do atendimento, organizados para a equipe.</p></div>
      <div className="flex flex-wrap gap-2"><BotaoLink href="/relacionamento/retornos/novo" tamanho="sm">Novo retorno</BotaoLink><BotaoLink href="/relacionamento/tarefas/nova" variante="primaria" tamanho="sm">Criar tarefa</BotaoLink></div>
    </div>
    <nav aria-label="Seções de relacionamento" className="mb-6 flex gap-1 overflow-x-auto border-b border-card-border">
      {ABAS.map((item) => <Link key={item} href={`/relacionamento?aba=${item}`} aria-current={aba === item ? "page" : undefined} className={`shrink-0 px-3 py-2 text-sm font-medium ${aba === item ? "border-b-2 border-primary text-primary" : "text-outline hover:text-primary"}`}>{ROTULOS[item]}</Link>)}
    </nav>

    {aba === "visao" && <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { aba: "confirmacoes", titulo: "A confirmar", valor: confirmacoes.length, Icone: CalendarCheck },
          { aba: "retornos", titulo: "Retornos na data", valor: retornosNoPrazo.length, Icone: Repeat2 },
          { aba: "tarefas", titulo: "Tarefas abertas", valor: abertas.length, Icone: ClipboardList },
          { aba: "avaliacoes", titulo: "Avaliações", valor: "Google", Icone: Star },
        ].map(({ aba: destino, titulo, valor, Icone }) => <Link key={destino} href={`/relacionamento?aba=${destino}`} className="rounded-[var(--radius-painel)] border border-card-border bg-card p-5 hover:bg-surface-container-low"><Icone aria-hidden="true" size={19} className="text-primary" /><p className="mt-4 text-2xl font-semibold tabular">{valor}</p><p className="mt-1 text-xs text-outline">{titulo}</p></Link>)}
      </div>
      <Card><CardCabecalho titulo="Fila de acompanhamento" descricao="Tarefas abertas e retornos que chegaram à data combinada." /><CardCorpo>{abertas.length + retornosNoPrazo.length === 0 ? <EstadoVazio icone={ClipboardList} titulo="Acompanhamento em dia" descricao="As próximas ações aparecerão aqui." /> : <ul>{abertas.slice(0, 5).map((t) => <Tarefa key={t.id} tarefa={t} />)}{retornosNoPrazo.slice(0, 5).map((r) => <Retorno key={r.id} retorno={r} />)}</ul>}</CardCorpo></Card>
    </div>}

    {aba === "confirmacoes" && <Card><CardCabecalho titulo="Confirmações" descricao="Atendimentos dos próximos 15 dias ainda sem confirmação." /><CardCorpo>{confirmacoes.length === 0 ? <EstadoVazio icone={CalendarCheck} titulo="Tudo confirmado" descricao="Não há atendimentos aguardando confirmação." /> : <ul>{confirmacoes.map((item) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border py-4 last:border-0"><div><Link href={`/pacientes/${item.pacienteId}`} className="text-sm font-medium text-primary hover:underline">{item.paciente}</Link><p className="mt-1 text-xs text-outline">{item.procedimento} · {formatarData(item.inicio)} às {formatarHora(item.inicio)}</p><p className="mt-1 text-xs text-outline">{item.telefone || item.email || "Sem contato cadastrado"}</p></div><div className="flex flex-wrap items-center gap-2"><SituacaoChip situacao={item.situacao} compacto />{item.situacao === "agendado" && <AcaoInline acao={confirmarPelaLista} campos={{ id: item.id, para: "aguardando_confirmacao" }} rotulo="Aguardando resposta" />}<AcaoInline acao={confirmarPelaLista} campos={{ id: item.id, para: "confirmado" }} rotulo="Confirmar" /></div></li>)}</ul>}</CardCorpo></Card>}

    {aba === "retornos" && <Card><CardCabecalho titulo="Retornos" descricao="Datas combinadas pela equipe e situação de cada contato." acao={<BotaoLink href="/relacionamento/retornos/novo" tamanho="sm">Novo retorno</BotaoLink>} /><CardCorpo>{retornos.length === 0 ? <EstadoVazio icone={Repeat2} titulo="Nenhum retorno" descricao="Registre uma data combinada para acompanhar a paciente." /> : <ul>{retornos.map((r) => <Retorno key={r.id} retorno={r} />)}</ul>}</CardCorpo></Card>}

    {aba === "tarefas" && <Card><CardCabecalho titulo="Tarefas de contato" descricao={`${abertas.length} em aberto · ${tarefas.length - abertas.length} concluídas ou canceladas`} acao={<BotaoLink href="/relacionamento/tarefas/nova" tamanho="sm">Criar tarefa</BotaoLink>} /><CardCorpo>{tarefas.length === 0 ? <EstadoVazio icone={ClipboardList} titulo="Nenhuma tarefa" descricao="Crie uma tarefa para não perder um contato importante." /> : <ul>{[...abertas, ...tarefas.filter((t) => t.situacao !== "aberta")].map((t) => <Tarefa key={t.id} tarefa={t} />)}</ul>}</CardCorpo></Card>}

    {aba === "aniversarios" && <Aniversarios mes={mesDaUrl(parametros.mes)} />}
    {aba === "avaliacoes" && <Avaliacoes />}
  </div>;
}

async function Aniversarios({ mes }: { mes: number }) {
  const pessoas = await aniversariosDoMes(mes);
  const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  return <Card><CardCabecalho titulo="Aniversários" descricao="Prepare a mensagem e registre o envio manual." acao={<form method="get" className="flex items-center gap-2"><input type="hidden" name="aba" value="aniversarios" /><label htmlFor="mes" className="sr-only">Mês</label><select id="mes" name="mes" defaultValue={mes} className="h-9 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-sm">{meses.map((nome, i) => <option key={nome} value={i + 1}>{nome}</option>)}</select><button type="submit" className="text-sm font-medium text-primary">Ver</button></form>} /><CardCorpo>{pessoas.length === 0 ? <EstadoVazio icone={Cake} titulo="Nenhum aniversário neste mês" descricao="Escolha outro mês para consultar." /> : <ul>{pessoas.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border py-4 last:border-0"><div><Link href={`/pacientes/${p.id}`} className="text-sm font-medium text-primary hover:underline">{p.nome}</Link><p className="mt-1 text-xs text-outline">Dia {p.dia} de {meses[mes - 1]} · {p.telefone || "Sem telefone cadastrado"}</p></div><ConviteContato pacienteId={p.id} nome={p.nome} telefone={p.telefone} tipo="aniversario" /></li>)}</ul>}</CardCorpo></Card>;
}

async function Avaliacoes() {
  const [pessoas, contatos] = await Promise.all([candidatasAAvaliacao(), contatosRegistrados()]);
  const convites = contatos.filter((c) => c.descricao.startsWith("Convite"));
  return <div className="space-y-6">
    <Card><CardCabecalho titulo="Convidar uma paciente" descricao="Busque qualquer paciente ativa para preparar o link de avaliação." /><CardCorpo><BuscarConvite /></CardCorpo></Card>
    <Card><CardCabecalho titulo="Convites para avaliar no Google" descricao="Pacientes atendidas recentemente. Abra a mensagem e marque o envio depois de concluí-lo." /><CardCorpo>{pessoas.length === 0 ? <EstadoVazio icone={Star} titulo="Nenhum atendimento concluído" descricao="Pacientes atendidas aparecerão aqui." /> : <ul>{pessoas.map((p) => <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border py-4 last:border-0"><div><Link href={`/pacientes/${p.id}`} className="text-sm font-medium text-primary hover:underline">{p.nome}</Link><p className="mt-1 text-xs text-outline">Último atendimento em {formatarData(p.ultimoAtendimento)} · {p.telefone || "Sem telefone cadastrado"}</p></div><ConviteContato pacienteId={p.id} nome={p.nome} telefone={p.telefone} tipo="avaliacao" /></li>)}</ul>}</CardCorpo></Card>
    <Card><CardCabecalho titulo="Convites registrados" descricao="O sistema registra o envio informado pela equipe, sem consultar a avaliação no Google." /><CardCorpo>{convites.length === 0 ? <EstadoVazio icone={Star} titulo="Nenhum convite registrado" descricao="Após o envio, marque a paciente na lista acima." /> : <ul>{convites.map((c) => <li key={c.id} className="flex flex-wrap justify-between gap-2 border-b border-card-border py-3 text-sm last:border-0"><span>{c.paciente}</span><time dateTime={c.quando.toISOString()} className="text-xs text-outline">{formatarData(c.quando)} às {formatarHora(c.quando)}</time></li>)}</ul>}</CardCorpo></Card>
  </div>;
}
