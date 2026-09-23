import "server-only";

import { cache } from "react";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import {
  alvosDaBuscaDePacientes,
  formatarTelefone,
  lerEndereco,
  nomeExibido,
  type Endereco,
} from "@/lib/paciente";
import { uuidValido } from "@/lib/formulario";
import { centavosParaReais, somaEmCentavos } from "@/lib/moeda";
import { paginaAlemDoFim, todasAsLinhas } from "./todas-as-linhas";
import type {
  Prioridade,
  SituacaoAcompanhamento,
  SituacaoAtendimento,
  TipoPendencia,
} from "@/lib/dominio";

export const POR_PAGINA = 20;

export type FiltroSituacao = "ativas" | "arquivadas" | "todas";

export type PacienteDaLista = {
  id: string;
  nome: string;
  nomeSocial: string | null;
  exibicao: string;
  telefone: string | null;
  email: string | null;
  dataNascimento: Date | null;
  ativo: boolean;
  exemplo: boolean;
};

export type PaginaDePacientes = {
  itens: PacienteDaLista[];
  total: number;
  pagina: number;
  paginas: number;
};

export type PacienteCompleto = {
  id: string;
  nome: string;
  nomeSocial: string | null;
  exibicao: string;
  cpf: string | null;
  /** Cru, no formato "AAAA-MM-DD" — é o que o `input type="date"` espera. */
  dataNascimento: string | null;
  /** O mesmo dia como instante da clínica, para exibir e calcular idade. */
  nascimento: Date | null;
  telefone: string | null;
  email: string | null;
  endereco: Endereco;
  observacoes: string | null;
  origem: string | null;
  ativo: boolean;
  exemplo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
};

/**
 * Página da listagem, em ordem alfabética.
 *
 * A busca cobre nome, nome social, e-mail e telefone. Nome e nome social
 * são procurados sem acento, pela coluna gerada `busca` (0025): "Conceicao"
 * acha "Conceição", e o contrário também. Quando o termo é só
 * dígito, procura também no CPF e no telefone sem formatação — a clínica
 * digita "11987654321" ou "119 8765", não o formato exato guardado.
 */
export const listarPacientes = cache(
  async (opcoes: {
    busca?: string;
    situacao?: FiltroSituacao;
    pagina?: number;
  } = {}): Promise<PaginaDePacientes> => {
    const supabase = await clienteServidor();

    const situacao = opcoes.situacao ?? "ativas";
    const pagina = Math.max(1, Math.trunc(opcoes.pagina ?? 1));
    const alvos = alvosDaBuscaDePacientes(opcoes.busca ?? "");
    const frase = "Não foi possível carregar os pacientes.";

    // Os mesmos filtros montam a página e, quando preciso, a contagem abaixo:
    // escritos uma vez só, o total nunca conta um conjunto diferente da lista.
    const montar = (contagem: { count: "exact"; head?: boolean }) => {
      let consulta = supabase
        .from("pacientes")
        .select("id, nome, nome_social, telefone, email, data_nascimento, ativo, exemplo", contagem);

      if (situacao === "ativas") consulta = consulta.eq("ativo", true);
      if (situacao === "arquivadas") consulta = consulta.eq("ativo", false);
      if (alvos) consulta = consulta.or(alvos.join(","));
      return consulta;
    };

    const de = (pagina - 1) * POR_PAGINA;

    const { data, count, error } = await montar({ count: "exact" })
      .order("nome", { ascending: true })
      // Desempate único: homônimas (comuns depois de uma importação) mudariam
      // de ordem entre requisições e repetiriam ou sumiriam entre páginas.
      .order("id", { ascending: true })
      .range(de, de + POR_PAGINA - 1);

    let linhas = data ?? [];
    let total = count ?? 0;

    if (error) {
      if (!paginaAlemDoFim(error)) falhaDeConsulta("consulta pacientes", error, frase);

      // `?pagina=99` numa lista de duas páginas: o PostgREST responde 416 e,
      // com erro, não entrega o total. Não é falha do banco — a tela mostra a
      // lista vazia com a paginação, e o total vem de uma contagem sem linhas.
      const contagem = await montar({ count: "exact", head: true });
      if (contagem.error) falhaDeConsulta("consulta pacientes: contagem", contagem.error, frase);
      linhas = [];
      total = contagem.count ?? 0;
    }

    return {
      itens: linhas.map((p) => ({
        id: p.id,
        nome: p.nome,
        nomeSocial: p.nome_social,
        exibicao: p.nome_social?.trim() || p.nome,
        telefone: p.telefone,
        email: p.email,
        dataNascimento: p.data_nascimento ? dataDoBanco(p.data_nascimento) : null,
        ativo: p.ativo,
        exemplo: p.exemplo,
      })),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA)),
    };
  },
);

/** Ficha da paciente. `null` quando não existe ou a RLS não deixa ver. */
export const pacientePorId = cache(
  async (id: string): Promise<PacienteCompleto | null> => {
    // Endereço digitado à mão com id torto é "não existe" (404), não falha
    // do banco — o Postgres recusaria o texto como uuid.
    if (!uuidValido(id)) return null;

    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // Falha de leitura não é "paciente não existe": vira tela de erro, não
    // 404. Ficha inexistente e ficha escondida pela RLS continuam iguais
    // (sem linha, sem erro), como o §8.1 pede.
    if (error) falhaDeConsulta("consulta pacientes", error, "Não foi possível carregar a ficha da paciente.");
    if (!data) return null;

    return {
      id: data.id,
      nome: data.nome,
      nomeSocial: data.nome_social,
      exibicao: data.nome_social?.trim() || data.nome,
      cpf: data.cpf,
      dataNascimento: data.data_nascimento,
      nascimento: data.data_nascimento ? dataDoBanco(data.data_nascimento) : null,
      telefone: data.telefone,
      email: data.email,
      endereco: lerEndereco(data.endereco),
      observacoes: data.observacoes,
      origem: data.origem,
      ativo: data.ativo,
      exemplo: data.exemplo,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
    };
  },
);

// ---------------------------------------------------------------------
// Histórico da ficha
// ---------------------------------------------------------------------

export type AtendimentoDoHistorico = {
  id: string;
  inicio: Date;
  duracaoMin: number;
  procedimento: string;
  profissional: string;
  situacao: SituacaoAtendimento;
  valor: number;
  observacoes: string | null;
};

export type RetornoDaFicha = {
  id: string;
  sugeridoPara: Date;
  /** Negativo quando a data sugerida já passou. */
  emDias: number;
  procedimento: string | null;
  situacao: SituacaoAcompanhamento;
};

export type PendenciaDaFicha = {
  id: string;
  tipo: TipoPendencia;
  descricao: string;
  prazo: Date | null;
  prazoEmDias: number | null;
  prioridade: Prioridade;
};

export type ResumoFinanceiroPaciente = {
  recebido: number;
  emAberto: number;
};

export type HistoricoDoPaciente = {
  atendimentos: AtendimentoDoHistorico[];
  retornos: RetornoDaFicha[];
  pendencias: PendenciaDaFicha[];
  financeiro: ResumoFinanceiroPaciente;
  totalConcluidos: number;
};

/**
 * Tudo que a ficha mostra além do cadastro, em quatro consultas paralelas.
 *
 * O financeiro é somado aqui e não no banco: o PostgREST não faz agregação sem
 * uma view. O volume por paciente é de dezenas de linhas, mas a soma segue a
 * regra de todo agregado: lida inteira, em blocos (`todasAsLinhas`), e feita
 * em centavos inteiros (AGENTS.md §7.1).
 */
export const historicoDoPaciente = cache(
  async (pacienteId: string): Promise<HistoricoDoPaciente> => {
    const supabase = await clienteServidor();
    const frase = "Não foi possível carregar o histórico.";

    const [atendimentos, retornos, pendencias, recebimentos] = await Promise.all([
      supabase
        .from("atendimentos")
        .select(
          `id, inicio, duracao_min, situacao, valor, observacoes,
           procedimentos ( nome ),
           profissionais ( nome )`,
        )
        .eq("paciente_id", pacienteId)
        .order("inicio", { ascending: false }),

      supabase
        .from("retornos")
        .select("id, sugerido_para, situacao, procedimentos ( nome )")
        .eq("paciente_id", pacienteId)
        .not("situacao", "in", "(agendado,recusado)")
        .order("sugerido_para", { ascending: true }),

      supabase
        .from("pendencias")
        .select("id, tipo, descricao, prazo, prioridade")
        .eq("paciente_id", pacienteId)
        .eq("situacao", "aberta")
        .order("prazo", { ascending: true, nullsFirst: false }),

      todasAsLinhas(
        (inicio, fim) =>
          supabase
            .from("recebimentos")
            .select("valor, situacao")
            .eq("paciente_id", pacienteId)
            .order("id")
            .range(inicio, fim),
        "consulta pacientes: recebimentos",
        frase,
      ),
    ]);

    // Nenhuma leitura falha calada (AGENTS.md §6, regra 11): recebimento que
    // não veio viraria "Total recebido R$ 0,00" e "Em aberto R$ 0,00" como
    // fato, pendência que não veio, "Nada em aberto", e retorno, um cartão que
    // some. Os recebimentos já falham alto dentro de `todasAsLinhas`.
    if (atendimentos.error) falhaDeConsulta("consulta pacientes: atendimentos", atendimentos.error, frase);
    if (retornos.error) falhaDeConsulta("consulta pacientes: retornos", retornos.error, frase);
    if (pendencias.error) falhaDeConsulta("consulta pacientes: pendências", pendencias.error, frase);

    const lista = (atendimentos.data ?? []).map((a) => ({
      id: a.id,
      inicio: new Date(a.inicio),
      duracaoMin: a.duracao_min,
      procedimento: a.procedimentos?.nome ?? "Procedimento",
      profissional: a.profissionais?.nome ?? "Equipe",
      situacao: a.situacao,
      valor: a.valor,
      observacoes: a.observacoes,
    }));

    // Em centavos inteiros, como o painel financeiro: em reais de ponto
    // flutuante, R$ 10,10 + R$ 20,20 dá 30,299999…, não 30,30. Reais só na
    // saída, com uma divisão.
    const confirmados = recebimentos.filter(
      (r) => r.situacao === "recebido" || r.situacao === "recebido_divergencia",
    );
    const abertos = recebimentos.filter(
      (r) => r.situacao === "previsto" || r.situacao === "pendente",
    );
    const financeiro: ResumoFinanceiroPaciente = {
      recebido: centavosParaReais(somaEmCentavos(confirmados.map((r) => r.valor))),
      emAberto: centavosParaReais(somaEmCentavos(abertos.map((r) => r.valor))),
    };

    return {
      atendimentos: lista,
      totalConcluidos: lista.filter((a) => a.situacao === "concluido").length,
      retornos: (retornos.data ?? []).map((r) => {
        const sugeridoPara = dataDoBanco(r.sugerido_para);
        return {
          id: r.id,
          sugeridoPara,
          emDias: diferencaEmDias(sugeridoPara),
          procedimento: r.procedimentos?.nome ?? null,
          situacao: r.situacao,
        };
      }),
      pendencias: (pendencias.data ?? []).map((p) => {
        const prazo = p.prazo ? dataDoBanco(p.prazo) : null;
        return {
          id: p.id,
          tipo: p.tipo,
          descricao: p.descricao,
          prazo,
          prazoEmDias: prazo ? diferencaEmDias(prazo) : null,
          prioridade: p.prioridade,
        };
      }),
      financeiro,
    };
  },
);

/**
 * A paciente escolhida de antemão num seletor — quando a emissão, a venda ou a
 * marcação começa pela ficha dela (`?paciente=`).
 *
 * Ficha inexistente e sem permissão dão `null`, como na ficha (§8.1). Falha do
 * banco não: ela sobe para a tela de erro, em vez de parecer "nenhuma paciente".
 */
export const pacienteParaSelecao = cache(
  async (
    id: string,
  ): Promise<{ id: string; nome: string; detalhe: string; telefone: string | null } | null> => {
    if (!uuidValido(id)) return null;

    const supabase = await clienteServidor();
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome, nome_social, telefone, email")
      .eq("id", id)
      .maybeSingle();

    if (error) falhaDeConsulta("consulta pacientes: seleção", error, "Não foi possível carregar a paciente.");
    if (!data) return null;

    const telefone = data.telefone ? formatarTelefone(data.telefone) : null;
    return {
      id: data.id,
      nome: nomeExibido(data),
      detalhe: [telefone, data.email].filter(Boolean).join(" · ") || "sem contato cadastrado",
      telefone: data.telefone,
    };
  },
);
