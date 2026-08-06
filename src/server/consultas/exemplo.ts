import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";

/**
 * Há dados fictícios carregados?
 *
 * A faixa de aviso no topo das telas depende disto. Quando a clínica cadastrar
 * os dados reais e rodar `npm run dados:limpar`, o aviso some sozinho.
 */
export const temDadosDeExemplo = cache(async (): Promise<boolean> => {
  const supabase = await clienteServidor();

  const { count, error } = await supabase
    .from("pacientes")
    .select("id", { count: "exact", head: true })
    .eq("exemplo", true);

  // Se a checagem falhar, é mais seguro avisar do que esconder.
  if (error) return true;
  return (count ?? 0) > 0;
});
