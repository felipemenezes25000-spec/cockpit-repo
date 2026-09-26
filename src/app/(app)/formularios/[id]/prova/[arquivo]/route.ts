import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { uuidValido } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";

/**
 * Os arquivos de prova de uma assinatura, para quem cuida do documento:
 *
 * - `manifesto`: o texto canônico do registro (0032). O SHA-256 dele é o que
 *   foi carimbado; `sha256sum manifesto.txt` confere.
 * - `carimbo`: a resposta da autoridade (RFC 3161), como veio. Confere com
 *   `openssl ts -reply -in carimbo.tsr -text` e, com a cadeia da autoridade,
 *   `openssl ts -verify -digest <sha256 do manifesto> -in carimbo.tsr ...`.
 *
 * Lidos pela sessão: a RLS decide quem enxerga a assinatura. Nada é aceito
 * do endereço além do id do documento e do nome do arquivo.
 */
export async function GET(
  _pedido: Request,
  { params }: { params: Promise<{ id: string; arquivo: string }> },
) {
  const { id, arquivo } = await params;
  if (!uuidValido(id) || (arquivo !== "manifesto" && arquivo !== "carimbo")) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const usuario = await usuarioAtual();
  if (!usuario) return new NextResponse("Sessão expirada", { status: 401 });

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("documento_assinaturas")
    .select("codigo_verificacao, manifesto, carimbo_token")
    .eq("documento_id", id)
    .maybeSingle();

  if (error) {
    registrarFalha("assinatura: arquivo de prova", error);
    return new NextResponse("Não foi possível ler a assinatura", { status: 500 });
  }
  if (!data) return new NextResponse("Não encontrado", { status: 404 });

  const nome = `assinatura-${(data.codigo_verificacao ?? id).toLowerCase()}`;
  const cabecalhos = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (arquivo === "manifesto") {
    if (!data.manifesto) return new NextResponse("Sem manifesto", { status: 404 });
    return new NextResponse(data.manifesto, {
      headers: {
        ...cabecalhos,
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${nome}-manifesto.txt"`,
      },
    });
  }

  if (!data.carimbo_token) return new NextResponse("Sem carimbo de tempo", { status: 404 });
  return new NextResponse(Buffer.from(data.carimbo_token, "base64"), {
    headers: {
      ...cabecalhos,
      "Content-Type": "application/timestamp-reply",
      "Content-Disposition": `attachment; filename="${nome}-carimbo.tsr"`,
    },
  });
}
