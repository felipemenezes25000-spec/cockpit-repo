import { readFileSync } from "node:fs";
import { join } from "node:path";

/** As contas de `supabase/usuarios-locais.json` — só existem no Supabase local. */
export type Papel ="administradora" | "financeiro" | "recepcao";

const arquivo = JSON.parse(
  readFileSync(join(__dirname, "..", "supabase", "usuarios-locais.json"), "utf8"),
) as { senha: string; usuarios: { email: string; nome: string; papel: Papel }[] };

export const SENHA_LOCAL = arquivo.senha;
export const USUARIOS_LOCAIS = arquivo.usuarios;

export function arquivoDaSessao(papel: Papel): string {
  return join(__dirname, ".auth", `${papel}.json`);
}
