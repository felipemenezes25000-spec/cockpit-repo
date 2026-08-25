import type { Database } from "./supabase/tipos-banco";

/**
 * Tipos e rótulos do perfil de acesso.
 *
 * Fica separado de `auth.ts` de propósito: componentes de cliente precisam
 * destes tipos, e `auth.ts` usa `next/headers`, que só existe no servidor.
 */

export type Papel = Database["public"]["Enums"]["papel_usuario"];

export type UsuarioAtual = {
  id: string;
  email: string | null;
  nome: string;
  papel: Papel;
};

export const ROTULO_PAPEL: Record<Papel, string> = {
  administradora: "Administradora",
  recepcao: "Recepção",
  financeiro: "Financeiro",
};
