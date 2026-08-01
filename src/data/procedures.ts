import type { Procedimento } from "./types";

/**
 * Procedimentos fictícios. Valores e intervalos de retorno são apenas
 * demonstrativos — não representam a tabela real da clínica nem constituem
 * orientação clínica.
 */
export const PROCEDIMENTOS: Procedimento[] = [
  {
    id: "proc-1",
    nome: "Toxina botulínica",
    duracaoMin: 45,
    valor: 1450,
    retornoSugeridoDias: 150,
  },
  {
    id: "proc-2",
    nome: "Preenchimento labial",
    duracaoMin: 60,
    valor: 2100,
    retornoSugeridoDias: 300,
  },
  {
    id: "proc-3",
    nome: "Skinbooster",
    duracaoMin: 50,
    valor: 1200,
    retornoSugeridoDias: 120,
  },
  {
    id: "proc-4",
    nome: "Limpeza de pele profunda",
    duracaoMin: 60,
    valor: 320,
    retornoSugeridoDias: 45,
  },
  {
    id: "proc-5",
    nome: "Microagulhamento",
    duracaoMin: 50,
    valor: 680,
    retornoSugeridoDias: 30,
  },
  {
    id: "proc-6",
    nome: "Peeling químico",
    duracaoMin: 40,
    valor: 540,
    retornoSugeridoDias: 30,
  },
  {
    id: "proc-7",
    nome: "Bioestimulador de colágeno",
    duracaoMin: 60,
    valor: 2600,
    retornoSugeridoDias: 180,
  },
  {
    id: "proc-8",
    nome: "Avaliação inicial",
    duracaoMin: 30,
    valor: 0,
    retornoSugeridoDias: 15,
  },
  {
    id: "proc-9",
    nome: "Drenagem linfática",
    duracaoMin: 50,
    valor: 260,
    retornoSugeridoDias: 14,
  },
];

export function procedimentoPorId(id: string): Procedimento | undefined {
  return PROCEDIMENTOS.find((p) => p.id === id);
}
