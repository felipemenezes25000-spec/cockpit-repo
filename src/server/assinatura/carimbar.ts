import "server-only";
import { after } from "next/server";
import { carimbar } from "@/lib/assinatura/carimbo";
import { registrarFalha } from "@/lib/registro";
import { clienteAnonimo } from "@/lib/supabase/server";
import { segredoDoServidor } from "@/server/assinatura/segredo";

/**
 * Carimbo de tempo (RFC 3161) do manifesto de uma assinatura.
 *
 * Fora do arquivo de ações de propósito: o que mora em `"use server"` vira
 * endpoint que qualquer um chama. Isto aqui só roda chamado pelo servidor —
 * depois de uma assinatura (`agendarCarimbo`) ou pela equipe, na ficha
 * (`carimbarAgora`, que confere a sessão antes).
 *
 * O manifesto vem do banco (`documento_verificar`), nunca de quem chamou; e o
 * banco aceita o carimbo uma vez só (0032, `documento_assinatura_carimbar`).
 */
export async function carimbarAssinatura(codigoVerificacao: string): Promise<"ok" | "ja_carimbado" | "falhou"> {
  const segredo = segredoDoServidor();
  if (!segredo) {
    registrarFalha("assinatura: carimbo", { code: "configuracao", message: "ASSINATURA_SEGREDO_SERVIDOR ausente" });
    return "falhou";
  }

  const supabase = clienteAnonimo();
  const { data: verificacao, error } = await supabase.rpc("documento_verificar", {
    p_codigo: codigoVerificacao,
    p_servidor: segredo,
  });
  const linha = Array.isArray(verificacao) ? verificacao[0] : null;
  if (error || !linha?.manifesto_hash) {
    registrarFalha(
      "assinatura: carimbo (ler manifesto)",
      error ?? { code: "banco", message: String(linha?.situacao ?? "sem linha") },
    );
    return "falhou";
  }
  if (linha.carimbo_em) return "ja_carimbado";

  const { carimbo, falhas } = await carimbar(linha.manifesto_hash);
  if (!carimbo) {
    registrarFalha("assinatura: carimbo", { code: "autoridade", message: falhas.join("; ").slice(0, 300) });
    return "falhou";
  }

  const { data: gravado, error: erroGravar } = await supabase.rpc("documento_assinatura_carimbar", {
    p_codigo_verificacao: codigoVerificacao,
    p_token_base64: carimbo.tokenBase64,
    p_carimbo_em: carimbo.hora.toISOString(),
    p_autoridade: carimbo.autoridade,
    p_servidor: segredo,
  });
  if (erroGravar || (gravado !== "ok" && gravado !== "ja_carimbado")) {
    registrarFalha("assinatura: gravar carimbo", erroGravar ?? { code: "banco", message: String(gravado) });
    return "falhou";
  }
  return gravado;
}

/**
 * Depois da resposta: quem assinou vê a via na hora e o carimbo chega em
 * seguida (a via recarregada já o mostra). Falhou? A ficha oferece carimbar.
 */
export function agendarCarimbo(codigoVerificacao: string | null | undefined): void {
  if (!codigoVerificacao) return;
  after(async () => {
    await carimbarAssinatura(codigoVerificacao);
  });
}
