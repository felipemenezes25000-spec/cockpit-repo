import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CABECALHO_ID_REQUISICAO, idDeCorrelacao } from "@/lib/erros-banco";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";

/**
 * Rotas que existem sem login.
 *
 * `/assinar` serve documentos a quem não tem sessão: quem decide o que aparece
 * são as funções públicas do banco, que exigem o token do link e a data de
 * nascimento da paciente. `/verificar` confere a autenticidade de uma via
 * pelo código impresso nela, e só mostra iniciais, datas e identificações
 * (0032) — nada de dado de saúde. As rotas de senha só chamam o Supabase Auth.
 */
const PUBLICAS = [
  "/entrar",
  "/sem-acesso",
  "/assinar",
  "/verificar",
  "/recuperar-senha",
  "/redefinir-senha",
];

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
  // Id da requisição, para ligar o que a pessoa viu à linha do log. Sempre
  // gerado aqui: um valor vindo do navegador poderia forjar a correlação.
  const idRequisicao = idDeCorrelacao();
  request.headers.set(CABECALHO_ID_REQUISICAO, idRequisicao);

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
    // Guarda para onde a pessoa queria ir, e devolve depois do login. Só o
    // caminho: a query de outra rota não vaza para a tela de login.
    destino.search = "";
    if (caminho !== "/") destino.searchParams.set("proximo", caminho);
    return comId(redirecionarComCookies(destino, resposta), idRequisicao);
  }

  if (user && caminho === "/entrar") {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return comId(redirecionarComCookies(destino, resposta), idRequisicao);
  }

  return comId(resposta, idRequisicao);
}

/**
 * Redireciona levando os cookies que o `getUser` acabou de gravar.
 *
 * Quando o access token venceu, o `getUser` troca o refresh token e grava o
 * par novo em `resposta`. Um redirect criado do zero perderia esses cookies:
 * o navegador reenviaria o refresh token antigo, já trocado, e a sessão
 * poderia ser revogada — a pessoa seria deslogada sem motivo.
 */
function redirecionarComCookies(destino: URL, resposta: NextResponse): NextResponse {
  const redirecionamento = NextResponse.redirect(destino);
  for (const cookie of resposta.cookies.getAll()) {
    redirecionamento.cookies.set(cookie);
  }
  return redirecionamento;
}

/** O mesmo id volta na resposta: quem abre o DevTools consegue citá-lo. */
function comId(resposta: NextResponse, idRequisicao: string): NextResponse {
  resposta.headers.set(CABECALHO_ID_REQUISICAO, idRequisicao);
  return resposta;
}
