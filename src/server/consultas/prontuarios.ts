import "server-only";

import { cache } from "react";
import { chaveDoDia, dataDoBanco } from "@/lib/dates";
import { formatarData, formatarHora } from "@/lib/format";
import { formatarTelefone, nomeExibido } from "@/lib/paciente";
import { clienteServidor } from "@/lib/supabase/server";

export const POR_PAGINA_PRONTUARIOS = 20;

export class EstruturaProntuarioPendenteError extends Error {
  constructor() {
    super("A migração de prontuários ainda não foi aplicada.");
    this.name = "EstruturaProntuarioPendenteError";
  }
}

/** A migração de prontuários (0010/0011) ainda não chegou neste banco. */
export function estruturaPendente(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  return Boolean(
    error.code === "PGRST205" ||
    error.message?.includes("schema cache") ||
    error.message?.includes("public.prontuarios") ||
    error.message?.includes("public.prontuario_versoes") ||
    error.message?.includes("public.prontuario_imagens"),
  );
}

export type PacienteDoProntuario = {
  id: string;
  nome: string;
  detalhe: string;
};

export type AtendimentoDoProntuario = {
  id: string;
  pacienteId: string;
  paciente: PacienteDoProntuario;
  detalhe: string;
  tituloSugerido: string;
  dataRegistro: string;
};

export type VersaoResumoProntuario = {
  numero: number;
  criadoEm: Date;
  criadoPor: string | null;
};

export type ProntuarioDaLista = {
  id: string;
  titulo: string;
  pacienteId: string;
  paciente: string;
  contato: string | null;
  dataRegistro: Date;
  atualizadoEm: Date;
  exemplo: boolean;
  atendimento: {
    id: string;
    inicio: Date;
    procedimento: string | null;
  } | null;
  ultimaVersao: VersaoResumoProntuario | null;
};

export type PaginaDeProntuarios = {
  itens: ProntuarioDaLista[];
  total: number;
  pagina: number;
  paginas: number;
};

export type VersaoDoProntuario = {
  id: number;
  numero: number;
  motivo: string;
  queixa: string;
  avaliacao: string;
  conduta: string;
  evolucao: string;
  orientacoes: string;
  observacoes: string;
  criadoEm: Date;
  atualizadoEm: Date;
  criadoPor: string | null;
  exemplo: boolean;
};

export type ProntuarioCompleto = {
  id: string;
  pacienteId: string;
  paciente: string;
  pacienteContato: string | null;
  dataRegistro: Date;
  dataRegistroCampo: string;
  titulo: string;
  criadoEm: Date;
  atualizadoEm: Date;
  exemplo: boolean;
  atendimento: {
    id: string;
    inicio: Date;
    procedimento: string | null;
    profissional: string | null;
  } | null;
  versaoAtual: VersaoDoProntuario | null;
  versoes: VersaoDoProntuario[];
};

function termoSeguro(bruto: string): string {
  return bruto
    .trim()
    .slice(0, 80)
    .replace(/[,()"\\*%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function contatoPaciente(paciente: {
  telefone: string | null;
  email: string | null;
}): string | null {
  const telefone = paciente.telefone ? formatarTelefone(paciente.telefone) : null;
  return [telefone, paciente.email].filter(Boolean).join(" · ") || null;
}

export const pacienteParaProntuario = cache(
  async (id: string): Promise<PacienteDoProntuario | null> => {
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome, nome_social, telefone, email")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      nome: nomeExibido(data),
      detalhe: contatoPaciente(data) ?? "sem contato cadastrado",
    };
  },
);

export const atendimentoParaProntuario = cache(
  async (id: string): Promise<AtendimentoDoProntuario | null> => {
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("atendimentos")
      .select(
        `id, paciente_id, inicio,
         pacientes ( id, nome, nome_social, telefone, email ),
         procedimentos ( nome ),
         profissionais ( nome )`,
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data || !data.pacientes) return null;

    const inicio = new Date(data.inicio);
    const procedimento = data.procedimentos?.nome ?? "Atendimento";
    const profissional = data.profissionais?.nome ?? "Equipe";

    return {
      id: data.id,
      pacienteId: data.paciente_id,
      paciente: {
        id: data.pacientes.id,
        nome: nomeExibido(data.pacientes),
        detalhe: contatoPaciente(data.pacientes) ?? "sem contato cadastrado",
      },
      detalhe: `${formatarData(inicio)} às ${formatarHora(inicio)} · ${procedimento} · ${profissional}`,
      tituloSugerido: procedimento,
      dataRegistro: chaveDoDia(inicio),
    };
  },
);

export const listarProntuarios = cache(
  async (opcoes: {
    busca?: string;
    pagina?: number;
  } = {}): Promise<PaginaDeProntuarios> => {
    const supabase = await clienteServidor();
    const pagina = Math.max(1, Math.trunc(opcoes.pagina ?? 1));
    const termo = termoSeguro(opcoes.busca ?? "");

    let pacientesEncontradas: string[] = [];

    if (termo) {
      const { data, error } = await supabase
        .from("pacientes")
        .select("id")
        .or(
          [
            `nome.ilike.%${termo}%`,
            `nome_social.ilike.%${termo}%`,
            `email.ilike.%${termo}%`,
            `telefone.ilike.%${termo}%`,
          ].join(","),
        )
        .limit(50);

      if (error) {
        throw new Error(`Não foi possível buscar as pacientes: ${error.message}`);
      }

      pacientesEncontradas = (data ?? []).map((paciente) => paciente.id);
    }

    let consulta = supabase
      .from("prontuarios")
      .select(
        `id, paciente_id, atendimento_id, data_registro, titulo, atualizado_em, exemplo,
         pacientes ( nome, nome_social, telefone, email ),
         atendimentos ( id, inicio, procedimentos ( nome ) )`,
        { count: "exact" },
      );

    if (termo) {
      const alvos = [`titulo.ilike.%${termo}%`];
      if (pacientesEncontradas.length > 0) {
        alvos.push(`paciente_id.in.(${pacientesEncontradas.join(",")})`);
      }
      consulta = consulta.or(alvos.join(","));
    }

    const de = (pagina - 1) * POR_PAGINA_PRONTUARIOS;
    const { data, count, error } = await consulta
      .order("data_registro", { ascending: false })
      .order("atualizado_em", { ascending: false })
      .range(de, de + POR_PAGINA_PRONTUARIOS - 1);

    if (error) {
      if (estruturaPendente(error)) throw new EstruturaProntuarioPendenteError();
      throw new Error(`Não foi possível carregar os prontuários: ${error.message}`);
    }

    const ids = (data ?? []).map((linha) => linha.id);
    const ultimasVersoes = new Map<string, VersaoResumoProntuario>();

    if (ids.length > 0) {
      const { data: versoes, error: erroVersoes } = await supabase
        .from("prontuario_versoes")
        .select("prontuario_id, versao, criado_em, perfis ( nome )")
        .in("prontuario_id", ids)
        .order("versao", { ascending: false });

      if (erroVersoes) {
        if (estruturaPendente(erroVersoes)) {
          throw new EstruturaProntuarioPendenteError();
        }
        throw new Error(
          `Não foi possível carregar as versões: ${erroVersoes.message}`,
        );
      }

      for (const versao of versoes ?? []) {
        if (!ultimasVersoes.has(versao.prontuario_id)) {
          ultimasVersoes.set(versao.prontuario_id, {
            numero: versao.versao,
            criadoEm: new Date(versao.criado_em),
            criadoPor: versao.perfis?.nome ?? null,
          });
        }
      }
    }

    const total = count ?? 0;

    return {
      itens: (data ?? []).map((linha) => ({
        id: linha.id,
        titulo: linha.titulo,
        pacienteId: linha.paciente_id,
        paciente: linha.pacientes
          ? nomeExibido(linha.pacientes)
          : "Paciente",
        contato: linha.pacientes ? contatoPaciente(linha.pacientes) : null,
        dataRegistro: dataDoBanco(linha.data_registro),
        atualizadoEm: new Date(linha.atualizado_em),
        exemplo: linha.exemplo,
        atendimento: linha.atendimentos
          ? {
              id: linha.atendimentos.id,
              inicio: new Date(linha.atendimentos.inicio),
              procedimento: linha.atendimentos.procedimentos?.nome ?? null,
            }
          : null,
        ultimaVersao: ultimasVersoes.get(linha.id) ?? null,
      })),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / POR_PAGINA_PRONTUARIOS)),
    };
  },
);

export const prontuarioPorId = cache(
  async (id: string): Promise<ProntuarioCompleto | null> => {
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("prontuarios")
      .select(
        `id, paciente_id, atendimento_id, data_registro, titulo,
         criado_em, atualizado_em, exemplo,
         pacientes ( nome, nome_social, telefone, email ),
         atendimentos ( id, inicio, procedimentos ( nome ), profissionais ( nome ) )`,
      )
      .eq("id", id)
      .maybeSingle();

    if (estruturaPendente(error)) throw new EstruturaProntuarioPendenteError();
    if (error || !data) return null;

    const { data: versoes, error: erroVersoes } = await supabase
      .from("prontuario_versoes")
      .select(
        `id, versao, motivo, queixa, avaliacao, conduta, evolucao,
         orientacoes, observacoes, criado_em, atualizado_em, exemplo,
         perfis ( nome )`,
      )
      .eq("prontuario_id", id)
      .order("versao", { ascending: false });

    if (erroVersoes) {
      if (estruturaPendente(erroVersoes)) {
        throw new EstruturaProntuarioPendenteError();
      }
      throw new Error(
        `Não foi possível carregar as versões do prontuário: ${erroVersoes.message}`,
      );
    }

    const listaVersoes: VersaoDoProntuario[] = (versoes ?? []).map((versao) => ({
      id: versao.id,
      numero: versao.versao,
      motivo: versao.motivo,
      queixa: versao.queixa,
      avaliacao: versao.avaliacao,
      conduta: versao.conduta,
      evolucao: versao.evolucao,
      orientacoes: versao.orientacoes,
      observacoes: versao.observacoes,
      criadoEm: new Date(versao.criado_em),
      atualizadoEm: new Date(versao.atualizado_em),
      criadoPor: versao.perfis?.nome ?? null,
      exemplo: versao.exemplo,
    }));

    return {
      id: data.id,
      pacienteId: data.paciente_id,
      paciente: data.pacientes ? nomeExibido(data.pacientes) : "Paciente",
      pacienteContato: data.pacientes ? contatoPaciente(data.pacientes) : null,
      dataRegistro: dataDoBanco(data.data_registro),
      dataRegistroCampo: data.data_registro,
      titulo: data.titulo,
      criadoEm: new Date(data.criado_em),
      atualizadoEm: new Date(data.atualizado_em),
      exemplo: data.exemplo,
      atendimento: data.atendimentos
        ? {
            id: data.atendimentos.id,
            inicio: new Date(data.atendimentos.inicio),
            procedimento: data.atendimentos.procedimentos?.nome ?? null,
            profissional: data.atendimentos.profissionais?.nome ?? null,
          }
        : null,
      versaoAtual: listaVersoes[0] ?? null,
      versoes: listaVersoes,
    };
  },
);
