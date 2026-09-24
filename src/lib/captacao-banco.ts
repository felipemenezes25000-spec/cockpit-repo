import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/tipos-banco";

/**
 * Tipagem local das tabelas e funções da migração 0029.
 *
 * `tipos-banco.ts` é gerado a partir do projeto Supabase vinculado. Como a
 * migração nova ainda precisa ser aplicada antes de `npm run db:tipos`, o
 * módulo usa esta extensão estrutural temporária. Depois do push + geração,
 * ela pode ser removida sem mudar nenhuma regra de domínio.
 */

export type EtapaLead = "novo" | "qualificado" | "agendamento" | "ganho" | "perdido";

type PublicoBase = Database["public"];

type LeadRow = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string;
  campanha: string | null;
  procedimento_interesse_id: string | null;
  etapa: EtapaLead;
  paciente_id: string | null;
  venda_id: string | null;
  motivo_perda: string | null;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

type TabelaLead = {
  Row: LeadRow;
  Insert: {
    id?: string;
    nome: string;
    telefone?: string | null;
    email?: string | null;
    origem?: string;
    campanha?: string | null;
    procedimento_interesse_id?: string | null;
    etapa?: EtapaLead;
    paciente_id?: string | null;
    venda_id?: string | null;
    motivo_perda?: string | null;
    observacoes?: string | null;
    criado_por?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: Partial<LeadRow>;
  Relationships: [];
};

type LeadEtapaRow = {
  id: number;
  lead_id: string;
  de: EtapaLead | null;
  para: EtapaLead;
  motivo: string | null;
  por: string | null;
  em: string;
};

type TabelaLeadEtapas = {
  Row: LeadEtapaRow;
  Insert: {
    id?: never;
    lead_id: string;
    de?: EtapaLead | null;
    para: EtapaLead;
    motivo?: string | null;
    por?: string | null;
    em?: string;
  };
  Update: Partial<LeadEtapaRow>;
  Relationships: [];
};

type MetaComercialRow = {
  id: string;
  competencia: string;
  procedimento_id: string | null;
  meta_faturamento: number;
  ticket_medio_planejado: number;
  taxa_lead_qualificado: number;
  taxa_qualificado_agendamento: number;
  taxa_agendamento_venda: number;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
};

type TabelaMetaComercial = {
  Row: MetaComercialRow;
  Insert: {
    id?: string;
    competencia: string;
    procedimento_id?: string | null;
    meta_faturamento: number;
    ticket_medio_planejado: number;
    taxa_lead_qualificado?: number;
    taxa_qualificado_agendamento?: number;
    taxa_agendamento_venda?: number;
    criado_por?: string | null;
    criado_em?: string;
    atualizado_em?: string;
  };
  Update: Partial<MetaComercialRow>;
  Relationships: [];
};

export type DatabaseCaptacao = Omit<Database, "public"> & {
  public: Omit<PublicoBase, "Tables" | "Enums" | "Functions"> & {
    Tables: PublicoBase["Tables"] & {
      leads: TabelaLead;
      lead_etapas: TabelaLeadEtapas;
      metas_comerciais: TabelaMetaComercial;
    };
    Enums: PublicoBase["Enums"] & {
      etapa_lead: EtapaLead;
    };
    Functions: PublicoBase["Functions"] & {
      lead_converter_em_paciente: {
        Args: { p_lead_id: string };
        Returns: string;
      };
    };
  };
};

export type ClienteCaptacao = SupabaseClient<DatabaseCaptacao>;

export function comoClienteCaptacao(cliente: unknown): ClienteCaptacao {
  return cliente as ClienteCaptacao;
}
