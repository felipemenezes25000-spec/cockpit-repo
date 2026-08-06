import type { Database } from "./supabase/tipos-banco";

/**
 * Tipos de domínio derivados do banco.
 *
 * Ficam aqui, e não junto das consultas, porque componentes de cliente também
 * precisam deles — e os arquivos de consulta são `server-only`.
 */

type Enums = Database["public"]["Enums"];

export type SituacaoAtendimento = Enums["situacao_atendimento"];
export type Prioridade = Enums["prioridade"];
export type TipoPendencia = Enums["tipo_pendencia"];
export type SituacaoAcompanhamento = Enums["situacao_acompanhamento"];
export type SituacaoRecebimento = Enums["situacao_recebimento"];
export type FormaPagamento = Enums["forma_pagamento"];
export type CategoriaDespesa = Enums["categoria_despesa"];
