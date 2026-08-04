import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Database } from "./tipos-banco";

/**
 * Cliente para componentes de servidor, rotas e ações.
 *
 * Usa sempre a chave pública: quem decide o que cada pessoa enxerga é a RLS do
 * banco, a partir do usuário da sessão. A chave `service_role` ignoraria toda a
 * RLS e por isso não entra em lugar nenhum da aplicação.
 */
export async function clienteServidor() {
  const cookieStore = await cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesParaGravar) {
        try {
          for (const { name, value, options } of cookiesParaGravar) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Componente de servidor não pode gravar cookie. Tudo bem: quem
          // renova a sessão é o middleware.
        }
      },
    },
  });
}
