import type { Pendencia } from "./types";

/**
 * Pendências fictícias da clínica. Cada uma aponta para o módulo que vai
 * resolvê-la quando estiver pronto — nesta etapa o botão apenas navega até lá.
 */
export const PENDENCIAS: Pendencia[] = [
  {
    id: "pend-1",
    tipo: "termo",
    pacienteId: "pac-8",
    prazoEmDias: 0,
    prioridade: "alta",
    detalhe: "Termo de consentimento do bioestimulador aguardando assinatura",
    destino: "/formularios",
  },
  {
    id: "pend-2",
    tipo: "confirmacao",
    pacienteId: "pac-12",
    prazoEmDias: 0,
    prioridade: "alta",
    detalhe: "Atendimento de hoje às 15:30 ainda sem confirmação",
    destino: "/agenda",
  },
  {
    id: "pend-3",
    tipo: "anamnese",
    pacienteId: "pac-14",
    prazoEmDias: 0,
    prioridade: "alta",
    detalhe: "Anamnese não preenchida para o preenchimento labial",
    destino: "/prontuarios",
  },
  {
    id: "pend-4",
    tipo: "pagamento",
    pacienteId: "pac-16",
    prazoEmDias: -3,
    prioridade: "alta",
    detalhe: "Parcela do peeling químico em aberto",
    destino: "/financeiro",
  },
  {
    id: "pend-5",
    tipo: "confirmacao",
    pacienteId: "pac-11",
    prazoEmDias: 1,
    prioridade: "media",
    detalhe: "Confirmar atendimento de amanhã às 18:30",
    destino: "/agenda",
  },
  {
    id: "pend-6",
    tipo: "retorno",
    pacienteId: "pac-3",
    prazoEmDias: 2,
    prioridade: "media",
    detalhe: "Retorno da toxina botulínica precisa ser agendado",
    destino: "/relacionamento",
  },
  {
    id: "pend-7",
    tipo: "pagamento",
    pacienteId: "pac-5",
    prazoEmDias: 4,
    prioridade: "media",
    detalhe: "Saldo do microagulhamento combinado para esta semana",
    destino: "/financeiro",
  },
  {
    id: "pend-8",
    tipo: "pesquisa",
    pacienteId: "pac-4",
    prazoEmDias: 5,
    prioridade: "baixa",
    detalhe: "Pesquisa de satisfação do skinbooster ainda não respondida",
    destino: "/relacionamento",
  },
  {
    id: "pend-9",
    tipo: "termo",
    pacienteId: "pac-2",
    prazoEmDias: 7,
    prioridade: "baixa",
    detalhe: "Orientações pós-procedimento não entregues",
    destino: "/formularios",
  },
  {
    id: "pend-10",
    tipo: "pesquisa",
    pacienteId: "pac-10",
    prazoEmDias: 9,
    prioridade: "baixa",
    detalhe: "Pesquisa de satisfação da avaliação inicial",
    destino: "/relacionamento",
  },
];

export const ROTULO_PENDENCIA: Record<Pendencia["tipo"], string> = {
  anamnese: "Anamnese",
  termo: "Termo",
  confirmacao: "Confirmação",
  pagamento: "Pagamento",
  retorno: "Retorno",
  pesquisa: "Pesquisa",
};

/** Alta primeiro; dentro da mesma prioridade, o prazo mais próximo. */
const PESO: Record<Pendencia["prioridade"], number> = { alta: 0, media: 1, baixa: 2 };

export function pendenciasOrdenadas(): Pendencia[] {
  return [...PENDENCIAS].sort(
    (a, b) => PESO[a.prioridade] - PESO[b.prioridade] || a.prazoEmDias - b.prazoEmDias,
  );
}
