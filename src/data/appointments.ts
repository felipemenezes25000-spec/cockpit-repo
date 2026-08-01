import { hojeAs, somarDias } from "@/lib/dates";
import { procedimentoPorId } from "./procedures";
import type { Atendimento, SituacaoAtendimento } from "./types";

type Rascunho = {
  id: string;
  hora: number;
  minuto: number;
  pacienteId: string;
  profissionalId: string;
  procedimentoId: string;
  situacao: SituacaoAtendimento;
};

/**
 * Agenda fictícia de hoje. Os horários são fixos e as situações cobrem os sete
 * estados previstos — não acompanham o relógio, por serem apenas demonstração.
 */
const AGENDA_DE_HOJE: Rascunho[] = [
  {
    id: "at-1",
    hora: 8,
    minuto: 30,
    pacienteId: "pac-10",
    profissionalId: "prof-1",
    procedimentoId: "proc-8",
    situacao: "concluido",
  },
  {
    id: "at-2",
    hora: 9,
    minuto: 30,
    pacienteId: "pac-2",
    profissionalId: "prof-3",
    procedimentoId: "proc-4",
    situacao: "concluido",
  },
  {
    id: "at-3",
    hora: 10,
    minuto: 45,
    pacienteId: "pac-8",
    profissionalId: "prof-1",
    procedimentoId: "proc-7",
    situacao: "em_atendimento",
  },
  {
    id: "at-4",
    hora: 12,
    minuto: 0,
    pacienteId: "pac-4",
    profissionalId: "prof-2",
    procedimentoId: "proc-3",
    situacao: "confirmado",
  },
  {
    id: "at-5",
    hora: 13,
    minuto: 30,
    pacienteId: "pac-16",
    profissionalId: "prof-3",
    procedimentoId: "proc-6",
    situacao: "ausente",
  },
  {
    id: "at-6",
    hora: 14,
    minuto: 30,
    pacienteId: "pac-1",
    profissionalId: "prof-1",
    procedimentoId: "proc-1",
    situacao: "confirmado",
  },
  {
    id: "at-7",
    hora: 15,
    minuto: 30,
    pacienteId: "pac-12",
    profissionalId: "prof-2",
    procedimentoId: "proc-5",
    situacao: "aguardando_confirmacao",
  },
  {
    id: "at-8",
    hora: 16,
    minuto: 30,
    pacienteId: "pac-6",
    profissionalId: "prof-3",
    procedimentoId: "proc-9",
    situacao: "cancelado",
  },
  {
    id: "at-9",
    hora: 17,
    minuto: 15,
    pacienteId: "pac-14",
    profissionalId: "prof-1",
    procedimentoId: "proc-2",
    situacao: "aguardando_confirmacao",
  },
  {
    id: "at-10",
    hora: 18,
    minuto: 30,
    pacienteId: "pac-11",
    profissionalId: "prof-2",
    procedimentoId: "proc-1",
    situacao: "agendado",
  },
];

function materializar(r: Rascunho): Atendimento {
  return {
    id: r.id,
    pacienteId: r.pacienteId,
    profissionalId: r.profissionalId,
    procedimentoId: r.procedimentoId,
    inicio: hojeAs(r.hora, r.minuto),
    situacao: r.situacao,
    valor: procedimentoPorId(r.procedimentoId)?.valor ?? 0,
  };
}

export const ATENDIMENTOS_HOJE: Atendimento[] = AGENDA_DE_HOJE.map(materializar).sort(
  (a, b) => a.inicio.getTime() - b.inicio.getTime(),
);

/** Prévia de amanhã, usada no rodapé da Linha do Dia. */
export const ATENDIMENTOS_AMANHA: Atendimento[] = [
  { id: "at-11", pacienteId: "pac-3", profissionalId: "prof-1", procedimentoId: "proc-1" },
  { id: "at-12", pacienteId: "pac-9", profissionalId: "prof-2", procedimentoId: "proc-3" },
  { id: "at-13", pacienteId: "pac-13", profissionalId: "prof-3", procedimentoId: "proc-5" },
  { id: "at-14", pacienteId: "pac-5", profissionalId: "prof-1", procedimentoId: "proc-7" },
].map((r, i) => ({
  ...r,
  inicio: somarDias(hojeAs(9 + i * 2, 0), 1),
  situacao: "agendado" as SituacaoAtendimento,
  valor: procedimentoPorId(r.procedimentoId)?.valor ?? 0,
}));

export function duracaoDoAtendimento(a: Atendimento): number {
  return procedimentoPorId(a.procedimentoId)?.duracaoMin ?? 45;
}
