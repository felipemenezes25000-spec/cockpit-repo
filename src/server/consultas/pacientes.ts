import "server-only";

import { cache } from "react";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import {
  apenasDigitos,
  formatarTelefone,
  lerEndereco,
  nomeExibido,
  type Endereco,
} from "@/lib/paciente";
import { uuidValido } from "@/lib/formulario";
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
 * Prepara o termo para o `or` do PostgREST.
 *
 * Vírgula, parêntese, aspas e barra invertida são a gramática do próprio
 * filtro: deixá-los passar permitiria que a busca alterasse a consulta. `*` e
 * `%` viram curinga no `ilike` — quem digitasse "%" listaria a base inteira.
 *
 * O ponto continua: sem ele não se busca por e-mail.
 */
function termoSeguro(bruto: string): string {
  return bruto
    .trim()
    .slice(0, 80)
    .replace(/[,()"\\*%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Página da listagem, em ordem alfabética.
 *
 * A busca cobre nome, nome social, e-mail e telefone. Quando o termo é só
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
    const termo = termoSeguro(opcoes.busca ?? "");

    let consulta = supabase
      .from("pacientes")
      .select(
        "id, nome, nome_social, telefone, email, data_nascimento, ativo, exemplo",
        { count: "exact" },
      );

    if (situacao === "ativas") consulta = consulta.eq("ativo", true);
    if (situacao === "arquivadas") consulta = consulta.eq("ativo", false);

    if (termo) {
      const alvos = [
        `nome.ilike.%${termo}%`,
        `nome_social.ilike.%${termo}%`,
        `email.ilike.%${termo}%`,
        `telefone.ilike.%${termo}%`,
      ];

      const digitos = apenasDigitos(termo);
      if (digitos.length >= 3) {
        alvos.push(`cpf.ilike.%${digitos}%`, `telefone.ilike.%${digitos}%`);
      }

      consulta = consulta.or(alvos.join(","));
    }

    const de = (pagina - 1) * POR_PAGINA;

    const { data, count, error } = await consulta
      .order("nome", { ascending: true })
      .range(de, de + POR_PAGINA - 1);

    if (error) {
      falhaDeConsulta("consulta pacientes", error, "Não foi possível carregar os pacientes.");
    }

    const total = count ?? 0;

    return {
      itens: (data ?? []).map((p) => ({
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
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("pacientes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    // Id em formato inválido faz o Postgres devolver erro de tipo, não vazio.
    if (error || !data) return null;

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
 * uma view, e o volume por paciente é de dezenas de linhas.
 */
export const historicoDoPaciente = cache(
  async (pacienteId: string): Promise<HistoricoDoPaciente> => {
    const supabase = await clienteServidor();

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

      supabase
        .from("recebimentos")
        .select("valor, situacao")
        .eq("paciente_id", pacienteId),
    ]);

    if (atendimentos.error) {
      falhaDeConsulta("consulta pacientes", atendimentos.error, "Não foi possível carregar o histórico.");
    }

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

    const financeiro = (recebimentos.data ?? []).reduce(
      (acumulado, r) => {
        if (r.situacao === "recebido" || r.situacao === "recebido_divergencia") {
          acumulado.recebido += r.valor;
        }
        if (r.situacao === "previsto" || r.situacao === "pendente") {
          acumulado.emAberto += r.valor;
        }
        return acumulado;
      },
      { recebido: 0, emAberto: 0 },
    );

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
