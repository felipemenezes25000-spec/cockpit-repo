import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Rotas que existem sem login.
 *
 * `/assinar` é a única que serve conteúdo a quem não tem sessão, e serve
 * pouco: quem decide o que aparece são as três funções públicas da migração
 * 0014, que exigem o token do link e a data de nascimento da paciente. O
 * middleware só deixa a requisição chegar — a guarda é o banco.
 */
const PUBLICAS = ["/entrar", "/sem-acesso", "/assinar"];

function ehPublica(caminho: string): boolean {
  return PUBLICAS.some((p) => caminho === p || caminho.startsWith(`${p}/`));
}

/**
 * Renova a sessão a cada requisição e barra quem não está autenticado.
 *
 * O middleware é a primeira linha, não a única: mesmo que alguém chegue a uma
 * rota, a RLS do banco continua decidindo quais dados aparecem.
 */
export async function atualizarSessao(request: NextRequest) {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaGravar) {
        for (const { name, value } of cookiesParaGravar) {
          request.cookies.set(name, value);
        }
        resposta = NextResponse.next({ request });
        for (const { name, value, options } of cookiesParaGravar) {
          resposta.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser valida o token no servidor do Supabase. getSession apenas lê o
  // cookie, que o navegador pode ter adulterado — por isso não serve aqui.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const caminho = request.nextUrl.pathname;

  if (!user && !ehPublica(caminho)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    // Guarda para onde a pessoa queria ir, e devolve depois do login.
    if (caminho !== "/") destino.searchParams.set("proximo", caminho);
    return NextResponse.redirect(destino);
  }

  if (user && caminho === "/entrar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return NextResponse.redirect(destino);
  }

  return resposta;
}
