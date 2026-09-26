/**
 * O que a requisição diz sobre quem assinou: IP, aparelho e localização
 * aproximada. Lido dos cabeçalhos que a própria plataforma escreve — na
 * Vercel, `x-real-ip`, `x-forwarded-for` e `x-vercel-ip-*` são reescritos
 * pela borda, não chegam do navegador. E desde a 0032 o banco só aceita
 * esses valores de quem tem o segredo do servidor.
 */

type Cabecalhos = { get(nome: string): string | null };

export type EvidenciaDaRequisicao = {
  ip: string;
  dispositivo: string;
  localizacao: string;
};

function decodificar(valor: string | null): string {
  if (!valor) return "";
  try {
    return decodeURIComponent(valor).trim();
  } catch {
    return valor.trim();
  }
}

export function evidenciaDaRequisicao(cabecalhos: Cabecalhos): EvidenciaDaRequisicao {
  const ip = (cabecalhos.get("x-real-ip") ?? cabecalhos.get("x-forwarded-for") ?? "").split(",")[0]?.trim() ?? "";

  const partes = [
    decodificar(cabecalhos.get("x-vercel-ip-city")),
    decodificar(cabecalhos.get("x-vercel-ip-country-region")),
    decodificar(cabecalhos.get("x-vercel-ip-country")),
  ].filter(Boolean);

  return {
    ip: ip.slice(0, 64),
    dispositivo: (cabecalhos.get("user-agent") ?? "").slice(0, 400),
    localizacao: partes.join(", ").slice(0, 160),
  };
}

/**
 * O aparelho em português de gente: "iPhone · Safari", "Android · Chrome",
 * "Windows · Edge". O texto completo continua gravado; isto é só leitura.
 */
export function aparelhoLegivel(agente: string | null | undefined): string | null {
  if (!agente) return null;
  const a = agente;

  const sistema =
    /iPhone/.test(a) ? "iPhone"
    : /iPad/.test(a) ? "iPad"
    : /Android/.test(a) ? "Android"
    : /Windows/.test(a) ? "Windows"
    : /Mac OS X|Macintosh/.test(a) ? "Mac"
    : /Linux/.test(a) ? "Linux"
    : null;

  const navegador =
    /Edg\//.test(a) ? "Edge"
    : /OPR\/|Opera/.test(a) ? "Opera"
    : /SamsungBrowser/.test(a) ? "Samsung Internet"
    : /CriOS|Chrome\//.test(a) ? "Chrome"
    : /FxiOS|Firefox\//.test(a) ? "Firefox"
    : /Safari\//.test(a) ? "Safari"
    : null;

  const partes = [sistema, navegador].filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** Os fatores gravados pelo banco, em frases para a via e a ficha. */
export const ROTULO_FATOR: Record<string, string> = {
  posse_do_link: "Link pessoal e secreto",
  data_de_nascimento: "Data de nascimento conferida",
  codigo_por_email: "Código por e-mail confirmado",
  cpf_conferido: "CPF igual ao da ficha",
  conferencia_presencial: "Presença na clínica",
  documento_com_foto: "Documento com foto conferido",
};

export function rotuloDoFator(fator: string): string {
  return ROTULO_FATOR[fator] ?? fator;
}
