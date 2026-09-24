import { ArrowUpRight, CalendarClock, ClipboardPlus, FileText, Search, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { classeDeEntrada } from "@/components/ui/field";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { usuarioAtual } from "@/lib/auth";
import { termoDeBusca } from "@/lib/busca";
import { ROTULO_TIPO } from "@/lib/documento";
import { formatarData, formatarHora } from "@/lib/format";
import { buscarGlobalmente } from "@/server/consultas/busca-global";

export const metadata: Metadata = {
  title: "Busca global",
  description: "Encontre pacientes, atendimentos, documentos e prontuários do consultório.",
};

function SemResultado({ children }: { children: ReactNode }) {
  return <p className="rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3.5 py-3 text-sm text-outline">{children}</p>;
}

function verTodos(destino: string) {
  return <BotaoLink href={destino} tamanho="sm">Ver todos</BotaoLink>;
}

function TextoComDestaque({ texto, termo }: { texto: string; termo: string }) {
  const alvo = termo.trim().toLocaleLowerCase("pt-BR");
  if (!alvo) return texto;
  const base = texto.toLocaleLowerCase("pt-BR");
  const indice = base.indexOf(alvo);
  if (indice < 0) return texto;
  const fim = indice + alvo.length;
  return <>{texto.slice(0, indice)}<mark className="rounded-[var(--radius-tag)] bg-primary-fixed px-0.5 text-inherit">{texto.slice(indice, fim)}</mark>{texto.slice(fim)}</>;
}

const linhaResultado = "premium-interactive group relative block overflow-hidden rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3 hover:border-primary-fixed-dim hover:bg-surface-container-low";

function IconeResultado({ children }: { children: ReactNode }) {
  return <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary transition-transform duration-150">{children}</span>;
}

function SetaResultado() {
  return <ArrowUpRight aria-hidden="true" size={16} strokeWidth={1.65} className="shrink-0 text-outline-variant transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-primary" />;
}

export default async function PaginaBusca({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const parametros = await searchParams;
  const bruto = Array.isArray(parametros.q) ? parametros.q[0] : parametros.q;
  const termo = termoDeBusca(bruto ?? "");
  const usuario = await usuarioAtual();
  const administradora = usuario?.papel === "administradora";
  const resultado = termo.length >= 2 ? await buscarGlobalmente(termo, administradora) : null;
  const query = encodeURIComponent(termo);
  const totalVisivel = resultado ? resultado.pacientes.total + resultado.atendimentos.length + (resultado.documentos?.total ?? 0) + (resultado.prontuarios?.total ?? 0) : 0;

  return <div className="flex flex-col gap-6">
    <CabecalhoDePagina
      icone={Search}
      rotulo="Navegação"
      titulo="Busca global"
      descricao={`Encontre pacientes, atendimentos, documentos${administradora ? " e prontuários" : ""} sem precisar lembrar em qual módulo o registro está.`}
      meta={<><SeloHero tom="informativo">Busca por nome, contato, procedimento ou data</SeloHero>{resultado ? <SeloHero tom={totalVisivel > 0 ? "positivo" : "neutro"}>{totalVisivel} resultados localizados</SeloHero> : null}</>}
    />

    <form method="get" action="/busca" role="search" aria-label="Buscar em todos os módulos" className="premium-panel relative flex flex-col gap-3 overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:flex-row sm:p-5">
      <div className="relative min-w-0 flex-1"><Search aria-hidden="true" size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" /><input type="search" name="q" minLength={2} maxLength={80} required defaultValue={termo} autoFocus aria-label="O que deseja buscar?" placeholder="Nome, telefone, procedimento ou data (dd/mm/aaaa)" className={classeDeEntrada({ recuo: "busca" })} /></div>
      <button type="submit" className="relative inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary transition-[transform,background-color] duration-150 hover:bg-primary-hover active:translate-y-px active:scale-[0.99]"><Search aria-hidden="true" size={16} strokeWidth={1.8} />Buscar</button>
    </form>

    {!resultado ? <Card><EstadoVazio icone={Search} titulo="O que você procura?" descricao="Digite pelo menos dois caracteres. Para localizar atendimentos, use o nome da paciente, o procedimento ou a data." /></Card> : <>
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm text-on-surface-variant">Resultados para <strong className="text-on-surface">“{termo}”</strong></p><SeloHero>{totalVisivel} encontrados</SeloHero></div>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card className="relative overflow-hidden"><CardCabecalho titulo={`Pacientes · ${resultado.pacientes.total}`} descricao="Nome, contato ou CPF. Inclui cadastros arquivados." acao={resultado.pacientes.total > 0 ? verTodos(`/pacientes?busca=${query}&situacao=todas`) : undefined} /><CardCorpo className="relative">
          {resultado.pacientes.itens.length === 0 ? <SemResultado>Nenhuma paciente encontrada. Tente outro nome ou contato.</SemResultado> : <ul className="flex flex-col gap-2.5">{resultado.pacientes.itens.slice(0, 6).map((p) => <li key={p.id}><Link href={`/pacientes/${p.id}`} className={linhaResultado}><span className="flex items-center gap-3"><Avatar nome={p.exibicao} tom={p.ativo ? "marca" : "neutro"} /><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-on-surface"><TextoComDestaque texto={p.exibicao} termo={termo} /></span>{!p.ativo ? <SeloHero className="min-h-6 px-2 py-0 text-[0.66rem]">Arquivada</SeloHero> : null}</span><span className="mt-1 block truncate text-xs text-outline">{p.telefone || p.email || "Sem contato"}</span></span><SetaResultado /></span></Link></li>)}</ul>}
        </CardCorpo></Card>

        <Card className="relative overflow-hidden"><CardCabecalho titulo={`Atendimentos · ${resultado.atendimentos.length}${resultado.maisAtendimentos ? "+" : ""}`} descricao="Por paciente, procedimento ou data; até 8 mais recentes." /><CardCorpo className="relative">
          {resultado.atendimentos.length === 0 ? <SemResultado>Nenhum atendimento encontrado. Busque pelo nome, procedimento ou uma data.</SemResultado> : <ul className="flex flex-col gap-2.5">{resultado.atendimentos.map((a) => <li key={a.id}><Link href={a.href} className={linhaResultado}><span className="flex items-start gap-3"><IconeResultado><CalendarClock aria-hidden="true" size={17} strokeWidth={1.65} /></IconeResultado><span className="min-w-0 flex-1"><span className="flex flex-wrap items-start justify-between gap-2"><span className="min-w-0"><span className="block truncate font-semibold text-on-surface"><TextoComDestaque texto={a.paciente} termo={termo} /></span><span className="mt-1 block text-xs text-outline"><TextoComDestaque texto={a.procedimento} termo={termo} /> · {formatarData(a.inicio)} às {formatarHora(a.inicio)}</span></span><SituacaoChip situacao={a.situacao} compacto /></span></span><SetaResultado /></span></Link></li>)}</ul>}
          {resultado.maisAtendimentos ? <p className="mt-3 text-xs text-outline">Há mais atendimentos; refine o termo para encontrá-los.</p> : null}
        </CardCorpo></Card>

        <Card className="relative overflow-hidden"><CardCabecalho titulo={`Documentos${resultado.documentos ? ` · ${resultado.documentos.total}` : ""}`} descricao="Título ou paciente; acesso conforme seu perfil." acao={resultado.documentos?.total ? verTodos(`/formularios?busca=${query}`) : undefined} /><CardCorpo>
          {!resultado.documentos ? <SemResultado>Documentos indisponíveis no momento.</SemResultado> : resultado.documentos.itens.length === 0 ? <SemResultado>Nenhum documento encontrado. Tente outro título ou nome de paciente.</SemResultado> : <ul className="flex flex-col gap-2.5">{resultado.documentos.itens.slice(0, 6).map((d) => <li key={d.id}><Link href={`/formularios/${d.id}`} className={linhaResultado}><span className="flex items-center gap-3"><IconeResultado><FileText aria-hidden="true" size={17} strokeWidth={1.65} /></IconeResultado><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-on-surface"><TextoComDestaque texto={d.titulo} termo={termo} /></span><span className="mt-1 block truncate text-xs text-outline">{ROTULO_TIPO[d.tipo]} · <TextoComDestaque texto={d.paciente} termo={termo} /> · {formatarData(d.emitidoEm)}</span></span><SetaResultado /></span></Link></li>)}</ul>}
        </CardCorpo></Card>

        {administradora ? <Card className="relative overflow-hidden"><CardCabecalho titulo={`Prontuários${resultado.prontuarios ? ` · ${resultado.prontuarios.total}` : ""}`} descricao="Registros clínicos visíveis apenas para a administradora." acao={resultado.prontuarios?.total ? verTodos(`/prontuarios?busca=${query}`) : undefined} /><CardCorpo>
          {!resultado.prontuarios ? <SemResultado>Prontuários indisponíveis no momento.</SemResultado> : resultado.prontuarios.itens.length === 0 ? <SemResultado>Nenhum prontuário encontrado. Tente outro título ou nome de paciente.</SemResultado> : <ul className="flex flex-col gap-2.5">{resultado.prontuarios.itens.slice(0, 6).map((p) => <li key={p.id}><Link href={`/prontuarios/${p.id}`} className={linhaResultado}><span className="flex items-center gap-3"><IconeResultado><ClipboardPlus aria-hidden="true" size={17} strokeWidth={1.65} /></IconeResultado><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-on-surface"><TextoComDestaque texto={p.titulo} termo={termo} /></span><span className="mt-1 block truncate text-xs text-outline"><TextoComDestaque texto={p.paciente} termo={termo} /> · {formatarData(p.dataRegistro)}</span></span><SetaResultado /></span></Link></li>)}</ul>}
        </CardCorpo></Card> : null}
      </div>
      {totalVisivel > 0 ? <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs text-outline"><Users aria-hidden="true" size={14} /><span>Resultados organizados por contexto para entrar direto no registro certo.</span></div> : null}
    </>}
  </div>;
}
