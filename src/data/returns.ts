import { procedimentoPorId } from "./procedures";
import type { Retorno } from "./types";

/**
 * Pacientes que podem precisar voltar.
 *
 * Os intervalos vêm da tabela fictícia de procedimentos e servem apenas para
 * demonstrar a tela. Não são recomendação clínica e precisam ser definidos
 * pela equipe antes de virarem regra do sistema.
 */
export const RETORNOS: Retorno[] = [
  {
    id: "ret-1",
    pacienteId: "pac-15",
    procedimentoId: "proc-7",
    ultimoAtendimentoEmDias: 210,
    situacao: "nao_iniciado",
  },
  {
    id: "ret-2",
    pacienteId: "pac-7",
    procedimentoId: "proc-2",
    ultimoAtendimentoEmDias: 190,
    situacao: "aguardando_resposta",
  },
  {
    id: "ret-3",
    pacienteId: "pac-3",
    procedimentoId: "proc-1",
    ultimoAtendimentoEmDias: 165,
    situacao: "em_contato",
  },
  {
    id: "ret-4",
    pacienteId: "pac-9",
    procedimentoId: "proc-3",
    ultimoAtendimentoEmDias: 133,
    situacao: "nao_iniciado",
  },
  {
    id: "ret-5",
    pacienteId: "pac-13",
    procedimentoId: "proc-1",
    ultimoAtendimentoEmDias: 96,
    situacao: "nao_iniciado",
  },
  {
    id: "ret-6",
    pacienteId: "pac-12",
    procedimentoId: "proc-5",
    ultimoAtendimentoEmDias: 58,
    situacao: "em_contato",
  },
  {
    id: "ret-7",
    pacienteId: "pac-5",
    procedimentoId: "proc-5",
    ultimoAtendimentoEmDias: 52,
    situacao: "nao_iniciado",
  },
  {
    id: "ret-8",
    pacienteId: "pac-11",
    procedimentoId: "proc-9",
    ultimoAtendimentoEmDias: 47,
    situacao: "aguardando_resposta",
  },
];

export const ROTULO_ACOMPANHAMENTO: Record<Retorno["situacao"], string> = {
  nao_iniciado: "Sem contato",
  em_contato: "Em contato",
  aguardando_resposta: "Aguardando resposta",
};

export type JanelaContato = {
  /** Dias desde o último atendimento até o retorno sugerido. */
  intervaloSugerido: number;
  /** Quantos dias faltam (negativo = já passou do período sugerido). */
  diasAteSugerido: number;
  /** Posição dentro da janela, de 0 a 1, saturada nas pontas. */
  progresso: number;
  fase: "aguardando" | "no_periodo" | "passou";
};

/**
 * Onde a paciente está dentro do período sugerido de contato.
 * A faixa "no período" começa a 85% do intervalo.
 */
export function janelaDeContato(retorno: Retorno): JanelaContato {
  const intervalo = procedimentoPorId(retorno.procedimentoId)?.retornoSugeridoDias ?? 90;
  const decorridos = retorno.ultimoAtendimentoEmDias;
  const razao = decorridos / intervalo;

  return {
    intervaloSugerido: intervalo,
    diasAteSugerido: intervalo - decorridos,
    progresso: Math.max(0, Math.min(1, razao)),
    fase: razao >= 1.15 ? "passou" : razao >= 0.85 ? "no_periodo" : "aguardando",
  };
}

/** Mais urgente primeiro: quem passou mais do período sugerido. */
export function retornosOrdenados(): Retorno[] {
  return [...RETORNOS].sort(
    (a, b) =>
      b.ultimoAtendimentoEmDias / (procedimentoPorId(b.procedimentoId)?.retornoSugeridoDias ?? 90) -
      a.ultimoAtendimentoEmDias / (procedimentoPorId(a.procedimentoId)?.retornoSugeridoDias ?? 90),
  );
}
