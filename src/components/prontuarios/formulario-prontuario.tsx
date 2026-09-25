"use client";

import { CircleAlert, FileClock, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { cn } from "@/lib/cn";
import { LIMITES_PRONTUARIO, PRONTUARIO_EM_BRANCO, type ErrosProntuario, type ValoresProntuario } from "@/lib/prontuario";
import type { EstadoProntuario } from "@/server/acoes/prontuarios";
import type { AtendimentoDoProntuario, PacienteDoProntuario } from "@/server/consultas/prontuarios";

type Acao = (estado: EstadoProntuario, dados: FormData) => Promise<EstadoProntuario>;
const ESTADO_INICIAL: EstadoProntuario = { erros: {} };

function BotaoSalvar({ rotulo }: { rotulo: string }) {
  return <BotaoDeAcao tom="primario" tamanho="md" icone={<Save size={18} strokeWidth={1.75} />} rotuloPendente="Salvando…">{rotulo}</BotaoDeAcao>;
}

function CampoPacienteTravado({ paciente, erro }: { paciente: PacienteDoProntuario; erro?: string }) {
  return <Campo id="paciente_id" rotulo="Paciente" obrigatorio erro={erro}>
    <input type="hidden" name="paciente_id" value={paciente.id} />
    <div className="flex items-start gap-3 rounded-[var(--radius-cartao)] border border-primary-fixed bg-selecao px-3.5 py-3 shadow-[0_10px_22px_-18px_rgba(8,84,160,.4)]">
      <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-surface text-primary"><ShieldCheck size={15} /></span>
      <div><p className="text-sm font-semibold text-on-surface">{paciente.nome}</p><p className="mt-0.5 text-xs leading-5 text-outline">{paciente.detalhe} · paciente preservada nesta versão</p></div>
    </div>
  </Campo>;
}

function CampoAtendimento({ atendimento }: { atendimento: AtendimentoDoProntuario | null }) {
  return <><input type="hidden" name="atendimento_id" value={atendimento?.id ?? ""} />{atendimento ? <div className="flex items-start gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3.5 py-3"><span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-primary"><FileClock size={15} /></span><div><p className="text-[0.68rem] font-bold tracking-[0.07em] text-outline uppercase">Atendimento vinculado</p><p className="mt-1 text-sm font-medium text-on-surface">{atendimento.detalhe}</p></div></div> : null}</>;
}

export function FormularioProntuario({ acao, modo, inicial, prontuarioId, pacienteInicial, atendimentoInicial, dataPadrao, cancelarPara, rotuloSalvar }: { acao: Acao; modo: "novo" | "versao"; inicial?: Partial<ValoresProntuario>; prontuarioId?: string; pacienteInicial: PacienteDoProntuario | null; atendimentoInicial?: AtendimentoDoProntuario | null; dataPadrao: string; cancelarPara: string; rotuloSalvar: string }) {
  const [estado, enviar] = useActionState(acao, ESTADO_INICIAL);
  const partida: ValoresProntuario = { ...PRONTUARIO_EM_BRANCO, data_registro: dataPadrao, paciente_id: pacienteInicial?.id ?? "", atendimento_id: atendimentoInicial?.id ?? "", titulo: atendimentoInicial?.tituloSugerido ?? "", ...inicial };
  const de = (campo: keyof ValoresProntuario) => estado.valores?.[campo] ?? partida[campo];
  const erros: ErrosProntuario = estado.erros;
  const marcar = (campo: keyof ErrosProntuario) => erros[campo] ? ({ "aria-invalid": true as const, "aria-describedby": `${campo}-erro` } as const) : {};

  return <form action={enviar} className="flex flex-col gap-6 sm:gap-7" noValidate>
    {prontuarioId ? <input type="hidden" name="prontuario_id" value={prontuarioId} /> : null}
    {erros.geral || erros.prontuario_id ? <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-painel)] border border-error bg-error-container px-4 py-3 text-sm text-on-error-container shadow-[0_12px_30px_-26px_rgba(153,27,27,.35)]"><CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />{erros.geral ?? erros.prontuario_id}</p> : null}

    <GrupoDeCampos titulo="Identificação" descricao="Paciente, data e título dão contexto ao registro sem misturar o conteúdo clínico."><div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {modo === "versao" && pacienteInicial ? <CampoPacienteTravado paciente={pacienteInicial} erro={erros.paciente_id} /> : <SeletorPaciente inicial={pacienteInicial} erro={erros.paciente_id} />}
      <Campo id="data_registro" rotulo="Data do registro" obrigatorio erro={erros.data_registro}><input id="data_registro" name="data_registro" type="date" required defaultValue={de("data_registro")} className={cn(ENTRADA, erros.data_registro && ENTRADA_ERRO)} {...marcar("data_registro")} /></Campo>
      <Campo id="titulo" rotulo="Título" obrigatorio erro={erros.titulo} className="lg:col-span-2"><input id="titulo" name="titulo" type="text" required maxLength={LIMITES_PRONTUARIO.titulo} defaultValue={de("titulo")} placeholder="Avaliação inicial" className={cn(ENTRADA, erros.titulo && ENTRADA_ERRO)} {...marcar("titulo")} /></Campo>
      <div className="lg:col-span-2"><CampoAtendimento atendimento={atendimentoInicial ?? null} />{erros.atendimento_id ? <p id="atendimento_id-erro" role="alert" className="mt-1.5 text-xs text-error">{erros.atendimento_id}</p> : null}</div>
    </div></GrupoDeCampos>

    {modo === "versao" ? <GrupoDeCampos titulo="Motivo da versão" descricao="A nova versão preserva o registro anterior; descreva por que o histórico está sendo atualizado."><Campo id="motivo" rotulo="Motivo" obrigatorio erro={erros.motivo}><input id="motivo" name="motivo" type="text" required maxLength={LIMITES_PRONTUARIO.motivo} defaultValue={de("motivo")} placeholder="Evolução após retorno" className={cn(ENTRADA, erros.motivo && ENTRADA_ERRO)} {...marcar("motivo")} /></Campo></GrupoDeCampos> : null}

    <GrupoDeCampos titulo="Registro clínico" descricao="Preencha o que se aplica ao atendimento. Pelo menos um campo desta ficha precisa ter conteúdo."><div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Campo id="queixa" rotulo="Queixa e anamnese" erro={erros.queixa}><textarea id="queixa" name="queixa" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("queixa")} className={cn(AREA_TEXTO, erros.queixa && ENTRADA_ERRO)} {...marcar("queixa")} /></Campo>
      <Campo id="avaliacao" rotulo="Avaliação" erro={erros.avaliacao}><textarea id="avaliacao" name="avaliacao" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("avaliacao")} className={cn(AREA_TEXTO, erros.avaliacao && ENTRADA_ERRO)} {...marcar("avaliacao")} /></Campo>
      <Campo id="conduta" rotulo="Conduta" erro={erros.conduta}><textarea id="conduta" name="conduta" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("conduta")} className={cn(AREA_TEXTO, erros.conduta && ENTRADA_ERRO)} {...marcar("conduta")} /></Campo>
      <Campo id="evolucao" rotulo="Evolução" erro={erros.evolucao}><textarea id="evolucao" name="evolucao" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("evolucao")} className={cn(AREA_TEXTO, erros.evolucao && ENTRADA_ERRO)} {...marcar("evolucao")} /></Campo>
      <Campo id="orientacoes" rotulo="Orientações" erro={erros.orientacoes}><textarea id="orientacoes" name="orientacoes" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("orientacoes")} className={cn(AREA_TEXTO, erros.orientacoes && ENTRADA_ERRO)} {...marcar("orientacoes")} /></Campo>
      <Campo id="observacoes" rotulo="Observações clínicas" erro={erros.observacoes}><textarea id="observacoes" name="observacoes" maxLength={LIMITES_PRONTUARIO.conteudo} defaultValue={de("observacoes")} className={cn(AREA_TEXTO, erros.observacoes && ENTRADA_ERRO)} {...marcar("observacoes")} /></Campo>
    </div></GrupoDeCampos>

    <RodapeAcoesFormulario>
      <BotaoSalvar rotulo={rotuloSalvar} />
      <Link href={cancelarPara} className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] hover:bg-selecao hover:text-primary active:scale-[0.985]">Cancelar</Link>
    </RodapeAcoesFormulario>
  </form>;
}
