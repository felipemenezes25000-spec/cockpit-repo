import { hoje } from "@/lib/dates";
import type { Paciente } from "./types";

/**
 * Pacientes fictícias. Nomes, datas e históricos são inventados apenas para
 * a demonstração — nenhum dado real da clínica foi utilizado.
 */

/** Aniversário no mês corrente, para que a demonstração sempre tenha aniversariantes. */
function noMesAtual(dia: number): { dia: number; mes: number } {
  return { dia, mes: hoje().getMonth() + 1 };
}

export const PACIENTES: Paciente[] = [
  {
    id: "pac-1",
    nome: "Aline Bastos",
    aniversario: noMesAtual(4),
    ultimoAtendimentoEmDias: 38,
    ultimoProcedimentoId: "proc-1",
  },
  {
    id: "pac-2",
    nome: "Beatriz Nogueira",
    aniversario: noMesAtual(11),
    ultimoAtendimentoEmDias: 12,
    ultimoProcedimentoId: "proc-4",
  },
  {
    id: "pac-3",
    nome: "Carolina Meireles",
    aniversario: noMesAtual(17),
    ultimoAtendimentoEmDias: 165,
    ultimoProcedimentoId: "proc-1",
  },
  {
    id: "pac-4",
    nome: "Daniela Prado",
    aniversario: noMesAtual(23),
    ultimoAtendimentoEmDias: 5,
    ultimoProcedimentoId: "proc-3",
  },
  {
    id: "pac-5",
    nome: "Eduarda Lins",
    aniversario: noMesAtual(28),
    ultimoAtendimentoEmDias: 52,
    ultimoProcedimentoId: "proc-5",
  },
  {
    id: "pac-6",
    nome: "Fernanda Quintela",
    aniversario: { dia: 9, mes: 2 },
    ultimoAtendimentoEmDias: 21,
    ultimoProcedimentoId: "proc-6",
  },
  {
    id: "pac-7",
    nome: "Gabriela Sarmento",
    aniversario: { dia: 14, mes: 3 },
    ultimoAtendimentoEmDias: 190,
    ultimoProcedimentoId: "proc-2",
  },
  {
    id: "pac-8",
    nome: "Helena Vasques",
    aniversario: { dia: 2, mes: 5 },
    ultimoAtendimentoEmDias: 7,
    ultimoProcedimentoId: "proc-7",
  },
  {
    id: "pac-9",
    nome: "Isabela Moretti",
    aniversario: { dia: 26, mes: 6 },
    ultimoAtendimentoEmDias: 133,
    ultimoProcedimentoId: "proc-3",
  },
  {
    id: "pac-10",
    nome: "Juliana Peçanha",
    aniversario: { dia: 30, mes: 8 },
    ultimoAtendimentoEmDias: 2,
    ultimoProcedimentoId: "proc-8",
  },
  {
    id: "pac-11",
    nome: "Larissa Andrade",
    aniversario: { dia: 6, mes: 9 },
    ultimoAtendimentoEmDias: 47,
    ultimoProcedimentoId: "proc-9",
  },
  {
    id: "pac-12",
    nome: "Mariana Coutinho",
    aniversario: { dia: 19, mes: 10 },
    ultimoAtendimentoEmDias: 58,
    ultimoProcedimentoId: "proc-5",
  },
  {
    id: "pac-13",
    nome: "Natália Ribas",
    aniversario: { dia: 12, mes: 11 },
    ultimoAtendimentoEmDias: 96,
    ultimoProcedimentoId: "proc-1",
  },
  {
    id: "pac-14",
    nome: "Otávia Bezerra",
    aniversario: { dia: 3, mes: 12 },
    ultimoAtendimentoEmDias: 15,
    ultimoProcedimentoId: "proc-4",
  },
  {
    id: "pac-15",
    nome: "Priscila Tavares",
    aniversario: { dia: 21, mes: 1 },
    ultimoAtendimentoEmDias: 210,
    ultimoProcedimentoId: "proc-7",
  },
  {
    id: "pac-16",
    nome: "Renata Vilaça",
    aniversario: { dia: 8, mes: 4 },
    ultimoAtendimentoEmDias: 29,
    ultimoProcedimentoId: "proc-6",
  },
];

export function pacientePorId(id: string): Paciente | undefined {
  return PACIENTES.find((p) => p.id === id);
}

export function nomePaciente(id: string): string {
  return pacientePorId(id)?.nome ?? "Paciente";
}
