import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Cliente sem sessão, para a superfície pública do link (`/assinar`).
 *
 * As funções do link decidem pelo token e pela data de nascimento, nunca pela
 * sessão. Mas se alguém da equipe estiver logado no navegador em que a
 * paciente abre o link — o tablet do balcão —, `clienteServidor()` mandaria os
 * cookies dessa pessoa, e o banco registraria na auditoria a funcionária como
 * autora do que a paciente respondeu. Sem cookies, a chamada chega como
 * `anon`: quem responde e quem assina é a paciente.
 */
export function clienteAnonimo() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
