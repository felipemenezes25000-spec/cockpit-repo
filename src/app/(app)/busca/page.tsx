import { CalendarDays, ClipboardPlus, FileSignature, Search, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { ENTRADA } from "@/components/ui/field";
import { usuarioAtual } from "@/lib/auth";
import { termoDeBusca } from "@/lib/busca";
import { ROTULO_TIPO } from "@/lib/documento";
import { formatarData, formatarHora } from "@/lib/format";
import { buscarGlobalmente } from "@/server/consultas/busca-global";

export const metadata: Metadata = {
  title: "Busca global",
  description: "Encontre pacientes, atendimentos, documentos e prontuários do consultório.",
};

function verTodos(destino: string) {
  return <BotaoLink href={destino} tamanho="sm">Ver todos</BotaoLink>;
}

export default async function PaginaBusca({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const bruto = Array.isArray(parametros.q) ? parametros.q[0] : parametros.q;
  const termo = termoDeBusca(bruto ?? "");
  const usuario = await usuarioAtual();
  const administradora = usuario?.papel === "administradora";
  const resultado = termo.length >= 2 ? await buscarGlobalmente(termo, administradora) : null;
  const query = encodeURIComponent(termo);

  return <div>
    <FaixaDemonstracao className="mb-8" />
    <div className="mb-6"><p className="rotulo mb-2">Encontre no consultório</p><h2 className="t-display text-primary">Busca global</h2><p className="mt-1 text-sm text-outline">Pacientes, atendimentos, documentos{administradora ? " e prontuários" : ""} em um lugar.</p></div>
    <form method="get" action="/busca" role="search" aria-label="Buscar em todos os módulos" className="mb-8 flex flex-col gap-3 sm:flex-row">
      <div className="relative min-w-0 flex-1"><Search aria-hidden="true" size={18} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-outline" /><input type="search" name="q" minLength={2} maxLength={80} required defaultValue={termo} autoFocus aria-label="O que deseja buscar?" placeholder="Nome, telefone, procedimento ou data (dd/mm/aaaa)" className={`${ENTRADA} pl-11`} /></div>
      <button type="submit" className="h-11 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary hover:bg-primary">Buscar</button>
    </form>

    {!resultado ? <Card><EstadoVazio icone={Search} titulo="O que você procura?" descricao="Digite pelo menos dois caracteres. Para localizar atendimentos, use o nome da paciente, o procedimento ou a data." /></Card> : <>
      <p className="mb-4 text-sm text-on-surface-variant">Resultados para <strong className="text-on-surface">“{termo}”</strong></p>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Card><CardCabecalho titulo={`Pacientes · ${resultado.pacientes.total}`} descricao="Nome, contato ou CPF. Inclui cadastros arquivados." acao={resultado.pacientes.total > 0 ? verTodos(`/pacientes?busca=${query}&situacao=todas`) : undefined} /><CardCorpo>{resultado.pacientes.itens.length === 0 ? <EstadoVazio icone={Users} titulo="Nenhuma paciente encontrada" descricao="Tente outro nome ou contato." /> : <ul>{resultado.pacientes.itens.slice(0, 6).map((p) => <li key={p.id} className="border-b border-card-border last:border-0"><Link href={`/pacientes/${p.id}`} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"><span className="font-medium">{p.exibicao}</span><span className="text-xs text-outline">{p.telefone || p.email || "Sem contato"}{!p.ativo && " · Arquivada"}</span></Link></li>)}</ul>}</CardCorpo></Card>

        <Card><CardCabecalho titulo="Atendimentos" descricao="Por paciente, procedimento ou data; até 8 mais recentes." /><CardCorpo>{resultado.atendimentos.length === 0 ? <EstadoVazio icone={CalendarDays} titulo="Nenhum atendimento encontrado" descricao="Busque pelo nome, procedimento ou uma data." /> : <ul>{resultado.atendimentos.map((a) => <li key={a.id} className="border-b border-card-border last:border-0"><Link href={a.href} className="flex flex-wrap items-center justify-between gap-2 py-3 hover:text-primary"><span><span className="block font-medium">{a.paciente}</span><span className="text-xs text-outline">{a.procedimento} · {formatarData(a.inicio)} às {formatarHora(a.inicio)}</span></span><SituacaoChip situacao={a.situacao} compacto /></Link></li>)}</ul>}{resultado.maisAtendimentos && <p className="mt-3 text-xs text-outline">Há mais atendimentos; refine o termo para encontrá-los.</p>}</CardCorpo></Card>

        <Card><CardCabecalho titulo={`Documentos${resultado.documentos ? ` · ${resultado.documentos.total}` : ""}`} descricao="Título ou paciente; acesso conforme seu perfil." acao={resultado.documentos?.total ? verTodos(`/formularios?busca=${query}`) : undefined} /><CardCorpo>{!resultado.documentos ? <p className="text-sm text-outline">Documentos indisponíveis no momento.</p> : resultado.documentos.itens.length === 0 ? <EstadoVazio icone={FileSignature} titulo="Nenhum documento encontrado" descricao="Tente outro título ou nome de paciente." /> : <ul>{resultado.documentos.itens.slice(0, 6).map((d) => <li key={d.id} className="border-b border-card-border last:border-0"><Link href={`/formularios/${d.id}`} className="block py-3 hover:text-primary"><span className="block font-medium">{d.titulo}</span><span className="text-xs text-outline">{ROTULO_TIPO[d.tipo]} · {d.paciente} · {formatarData(d.emitidoEm)}</span></Link></li>)}</ul>}</CardCorpo></Card>

        {administradora && <Card><CardCabecalho titulo={`Prontuários${resultado.prontuarios ? ` · ${resultado.prontuarios.total}` : ""}`} descricao="Registros clínicos visíveis apenas para a administradora." acao={resultado.prontuarios?.total ? verTodos(`/prontuarios?busca=${query}`) : undefined} /><CardCorpo>{!resultado.prontuarios ? <p className="text-sm text-outline">Prontuários indisponíveis no momento.</p> : resultado.prontuarios.itens.length === 0 ? <EstadoVazio icone={ClipboardPlus} titulo="Nenhum prontuário encontrado" descricao="Tente outro título ou nome de paciente." /> : <ul>{resultado.prontuarios.itens.slice(0, 6).map((p) => <li key={p.id} className="border-b border-card-border last:border-0"><Link href={`/prontuarios/${p.id}`} className="block py-3 hover:text-primary"><span className="block font-medium">{p.titulo}</span><span className="text-xs text-outline">{p.paciente} · {formatarData(p.dataRegistro)}</span></Link></li>)}</ul>}</CardCorpo></Card>}
      </div>
    </>}
  </div>;
}
