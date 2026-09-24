import "server-only";

import { uuidValido } from "@/lib/formulario";
import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { hoje, inicioDoDia, inicioDoDiaSeguinte } from "@/lib/dates";
import type { Database } from "@/lib/supabase/tipos-banco";

export type SituacaoAtendimento =
  Database["public"]["Enums"]["situacao_atendimento"];

export type AtendimentoDoDia = {
  id: string;
  inicio: Date;
  duracaoMin: number;
  situacao: SituacaoAtendimento;
  paciente: string;
  pacienteId: string;
  profissional: string;
  procedimento: string;
  valor: number;
  observacoes: string | null;
};

/**
 * Atendimentos de um dia, na ordem do relógio.
 *
 * O recorte usa o calendário de São Paulo: perto da meia-noite o dia do
 * servidor e o da clínica são diferentes.
 *
 * `profissionalId` é o filtro da tela (`?profissional=`). Id torto é ignorado,
 * como se o filtro não existisse — o Postgres recusaria o texto como uuid.
 */
export const atendimentosDoDia = cache(
  async (dia: Date, profissionalId?: string | null): Promise<AtendimentoDoDia[]> => {
    const supabase = await clienteServidor();

    let consulta = supabase
      .from("atendimentos")
      .select(
        `id, inicio, duracao_min, situacao, valor, observacoes, paciente_id,
         pacientes ( nome, nome_social ),
         profissionais ( nome ),
         procedimentos ( nome )`,
      )
      .gte("inicio", inicioDoDia(dia).toISOString())
      .lt("inicio", inicioDoDiaSeguinte(dia).toISOString());

    if (uuidValido(profissionalId)) consulta = consulta.eq("profissional_id", profissionalId);

    const { data, error } = await consulta.order("inicio", { ascending: true });

    if (error) falhaDeConsulta("consulta agenda", error, "Não foi possível carregar a agenda.");

    return (data ?? []).map((linha) => ({
      id: linha.id,
      inicio: new Date(linha.inicio),
      duracaoMin: linha.duracao_min,
      situacao: linha.situacao,
      // Nome social tem precedência sempre que preenchido.
      paciente: linha.pacientes?.nome_social || linha.pacientes?.nome || "Paciente",
      pacienteId: linha.paciente_id,
      profissional: linha.profissionais?.nome ?? "",
      procedimento: linha.procedimentos?.nome ?? "",
      valor: linha.valor,
      observacoes: linha.observacoes,
    }));
  },
);

export const atendimentosDeHoje = cache(
  (): Promise<AtendimentoDoDia[]> => atendimentosDoDia(hoje()),
);

// ---------------------------------------------------------------------
// Um atendimento, com a trilha de situações
// ---------------------------------------------------------------------

export type MudancaDeSituacao = {
  de: SituacaoAtendimento | null;
  para: SituacaoAtendimento;
  em: Date;
  por: string | null;
};

export type AtendimentoCompleto = {
  id: string;
  pacienteId: string;
  paciente: string;
  profissionalId: string;
  /** Nome da profissional, para o cabeçalho da edição. */
  profissional: string;
  procedimentoId: string;
  inicio: Date;
  duracaoMin: number;
  situacao: SituacaoAtendimento;
  valor: number;
  observacoes: string | null;
  trilha: MudancaDeSituacao[];
};

/** `null` quando não existe ou a RLS não deixa ver — a tela trata igual. */
export const atendimentoPorId = cache(
  async (id: string): Promise<AtendimentoCompleto | null> => {
    // Endereço digitado à mão com id torto é "não existe" (404), não falha
    // do banco — o Postgres recusaria o texto como uuid.
    if (!uuidValido(id)) return null;

    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("atendimentos")
      .select(
        `id, paciente_id, profissional_id, procedimento_id, inicio,
         duracao_min, situacao, valor, observacoes,
         pacientes ( nome, nome_social ),
         profissionais ( nome ),
         atendimento_situacoes ( de, para, em, perfis ( nome ) )`,
      )
      .eq("id", id)
      .maybeSingle();

    // Falha de leitura não é "atendimento não existe": vira tela de erro, não 404.
    if (error) falhaDeConsulta("consulta agenda", error, "Não foi possível carregar o atendimento.");
    if (!data) return null;

    return {
      id: data.id,
      pacienteId: data.paciente_id,
      paciente: data.pacientes?.nome_social || data.pacientes?.nome || "Paciente",
      profissionalId: data.profissional_id,
      profissional: data.profissionais?.nome ?? "",
      procedimentoId: data.procedimento_id,
      inicio: new Date(data.inicio),
      duracaoMin: data.duracao_min,
      situacao: data.situacao,
      valor: data.valor,
      observacoes: data.observacoes,
      trilha: (data.atendimento_situacoes ?? [])
        .map((m) => ({
          de: m.de,
          para: m.para,
          em: new Date(m.em),
          por: m.perfis?.nome ?? null,
        }))
        .sort((a, b) => b.em.getTime() - a.em.getTime()),
    };
  },
);

// ---------------------------------------------------------------------
// Catálogo do formulário
// ---------------------------------------------------------------------

export type OpcaoProfissional = { id: string; nome: string };
export type OpcaoProcedimento = {
  id: string;
  nome: string;
  duracaoMin: number;
  valorPadrao: number;
};

export type CatalogoAgenda = {
  profissionais: OpcaoProfissional[];
  procedimentos: OpcaoProcedimento[];
};

type ManterNoCatalogo = { profissionalId?: string; procedimentoId?: string };

/**
 * O que o formulário de marcar atendimento precisa para os seletores.
 *
 * O procedimento carrega a duração e o valor padrão: escolher "Botox" já
 * preenche 45 minutos e o preço da tabela, editáveis caso a caso.
 *
 * Só entram os ativos — desativar tira da agenda. A exceção é o que o
 * atendimento sendo editado já usa: sem ela, desativar um procedimento
 * travava a edição de todo atendimento antigo com ele, porque o seletor não
 * tinha a opção atual.
 */
export const catalogoAgenda = cache(async (manter: ManterNoCatalogo = {}): Promise<CatalogoAgenda> => {
  const supabase = await clienteServidor();

  const ativosOu = (id: string | undefined) => (uuidValido(id) ? `ativo.eq.true,id.eq.${id}` : "ativo.eq.true");

  const [profissionais, procedimentos] = await Promise.all([
    supabase
      .from("profissionais")
      .select("id, nome")
      .or(ativosOu(manter.profissionalId))
      .order("nome"),
    supabase
      .from("procedimentos")
      .select("id, nome, duracao_min, valor_padrao")
      .or(ativosOu(manter.procedimentoId))
      .order("nome"),
  ]);

  if (profissionais.error || procedimentos.error) {
    falhaDeConsulta(
      "consulta agenda: catálogo",
      profissionais.error ?? procedimentos.error,
      "Não foi possível carregar o catálogo da agenda.",
    );
  }

  return {
    profissionais: profissionais.data ?? [],
    procedimentos: (procedimentos.data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      duracaoMin: p.duracao_min,
      valorPadrao: p.valor_padrao,
    })),
  };
});
