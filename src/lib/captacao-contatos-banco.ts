import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatabaseCaptacao } from "./captacao-banco";

type PublicoCaptacao = DatabaseCaptacao["public"];
type LeadBase = PublicoCaptacao["Tables"]["leads"];

export type CanalContatoLead =
  | "whatsapp"
  | "telefone"
  | "instagram"
  | "email"
  | "presencial"
  | "outro";

type TabelaLeadComContato = {
  Row: LeadBase["Row"] & {
    ultimo_contato_em: string | null;
    proximo_contato: string | null;
  };
  Insert: LeadBase["Insert"] & {
    ultimo_contato_em?: string | null;
    proximo_contato?: string | null;
  };
  Update: LeadBase["Update"] & {
    ultimo_contato_em?: string | null;
    proximo_contato?: string | null;
  };
  Relationships: LeadBase["Relationships"];
};

type LeadInteracaoRow = {
  id: number;
  lead_id: string;
  canal: CanalContatoLead;
  observacao: string | null;
  proximo_contato: string | null;
  por: string | null;
  em: string;
};

type TabelaLeadInteracoes = {
  Row: LeadInteracaoRow;
  Insert: {
    id?: never;
    lead_id: string;
    canal: CanalContatoLead;
    observacao?: string | null;
    proximo_contato?: string | null;
    por?: string | null;
    em?: string;
  };
  Update: Partial<LeadInteracaoRow>;
  Relationships: [];
};

export type DatabaseCaptacaoContatos = Omit<DatabaseCaptacao, "public"> & {
  public: Omit<PublicoCaptacao, "Tables"> & {
    Tables: Omit<PublicoCaptacao["Tables"], "leads"> & {
      leads: TabelaLeadComContato;
      lead_interacoes: TabelaLeadInteracoes;
    };
  };
};

export type ClienteCaptacaoContatos = SupabaseClient<DatabaseCaptacaoContatos>;

export function comoClienteCaptacaoContatos(cliente: unknown): ClienteCaptacaoContatos {
  return cliente as ClienteCaptacaoContatos;
}
