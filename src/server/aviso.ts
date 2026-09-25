import { cookies } from "next/headers";
import { COOKIE_DO_AVISO, VIDA_DO_AVISO_S, type ChaveDoAviso } from "@/lib/aviso";

/**
 * Deixa o aviso para a próxima tela (ver `lib/aviso.ts`). Chame logo antes do
 * `redirect` de uma ação que deu certo.
 *
 * O cookie não é `httpOnly` de propósito: quem o lê e apaga é o navegador.
 * Também não é `secure`: leva só a chave de uma frase fixa, nada que valha
 * proteger, e assim funciona igual no `next start` em http://localhost.
 * Se não houver requisição (teste de unidade da ação), não há tela seguinte
 * para avisar — e o aviso nunca pode derrubar uma gravação que já aconteceu.
 */
export async function avisarNaProximaTela(chave: ChaveDoAviso): Promise<void> {
  try {
    const daResposta = await cookies();
    daResposta.set(COOKIE_DO_AVISO, chave, {
      path: "/",
      maxAge: VIDA_DO_AVISO_S,
      sameSite: "lax",
      httpOnly: false,
    });
  } catch {
    // Fora de uma requisição: sem tela seguinte, sem aviso.
  }
}
