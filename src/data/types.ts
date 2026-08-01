/** Tipos de domínio do cockpit. Nesta etapa alimentam apenas dados fictícios. */

export type SituacaoAtendimento =
  | "agendado"
  | "aguardando_confirmacao"
  | "confirmado"
  | "em_atendimento"
  | "concluido"
  | "cancelado"
  | "ausente";

export type Prioridade = "alta" | "media" | "baixa";

export type TipoPendencia =
  | "anamnese"
  | "termo"
  | "confirmacao"
  | "pagamento"
  | "retorno"
  | "pesquisa";

export type SituacaoAcompanhamento = "nao_iniciado" | "em_contato" | "aguardando_resposta";

export type Profissional = {
  id: string;
  nome: string;
  especialidade: string;
};

export type Procedimento = {
  id: string;
  nome: string;
  /** Duração média em minutos — posiciona o atendimento na Linha do Dia. */
  duracaoMin: number;
  valor: number;
  /** Intervalo sugerido, em dias, para o retorno. Apenas demonstrativo. */
  retornoSugeridoDias: number;
};

export type Paciente = {
  id: string;
  nome: string;
  /** Dia e mês do aniversário. O ano não entra nos dados fictícios. */
  aniversario: { dia: number; mes: number };
  /** Há quantos dias foi atendida pela última vez. */
  ultimoAtendimentoEmDias: number;
  ultimoProcedimentoId: string;
};

export type Atendimento = {
  id: string;
  pacienteId: string;
  profissionalId: string;
  procedimentoId: string;
  inicio: Date;
  situacao: SituacaoAtendimento;
  valor: number;
};

export type Pendencia = {
  id: string;
  tipo: TipoPendencia;
  pacienteId: string;
  /** Prazo em dias a partir de hoje. Negativo significa atrasado. */
  prazoEmDias: number;
  prioridade: Prioridade;
  detalhe: string;
  /** Módulo que vai resolver a pendência quando estiver pronto. */
  destino: string;
};

export type Retorno = {
  id: string;
  pacienteId: string;
  procedimentoId: string;
  ultimoAtendimentoEmDias: number;
  situacao: SituacaoAcompanhamento;
};

export type Recebimento = {
  id: string;
  pacienteId: string;
  procedimentoId: string;
  valor: number;
  emDias: number;
  situacao: "recebido" | "em_aberto";
  forma: "Pix" | "Cartão de crédito" | "Cartão de débito" | "Dinheiro";
};

export type Despesa = {
  id: string;
  descricao: string;
  categoria: "Produtos" | "Estrutura" | "Equipe" | "Marketing" | "Impostos";
  valor: number;
  emDias: number;
};

export type PontoMensal = {
  data: Date;
  recebido: number;
};
