"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { chaveDoDia } from "@/lib/dates";
import { uuidValido } from "@/lib/prontuario";
import {
  BUCKET_IMAGENS,
  caminhoCoerente,
  dimensoesSanas,
  legendaNormalizada,
  mensagemDoStorage,
  motivoDaRecusa,
  motivoDataInvalida,
} from "@/lib/prontuario-imagens";
import { clienteServidor } from "@/lib/supabase/server";

/**
 * O que acontece depois que o navegador manda o arquivo.
 *
 * O arquivo NÃO passa por aqui, e isso é decisão, não atalho: a Vercel corta o
 * corpo de uma requisição de função em 4,5 MB, e o bucket aceita 10 MB. Uma
 * foto de 6 MB morreria no caminho, com um erro de plataforma que a tela não
 * tem como explicar. O navegador fala direto com o Storage — que tem política
 * própria (0011) e recusa quem não é administradora — e a ação de servidor
 * grava a linha que descreve o arquivo.
 *
 * Arquivo primeiro, linha depois. Se a linha falhar, o arquivo sai junto: um
 * objeto no bucket sem linha que o explique é dado de saúde sem dono e sem
 * rastro, que é o que a 0011 manda evitar.
 */

export type RegistroDeImagem = {
  prontuarioId: string;
  caminho: string;
  nomeOriginal: string;
  dataCaptura: string;
  legenda: string;
  largura: number | null;
  altura: number | null;
};

export type ResultadoDoEnvio = { ok: true } | { ok: false; erro: string };

/**
 * O que a edição e a eliminação devolvem: só o erro, ou nada.
 *
 * A constante do estado inicial NÃO mora aqui. Arquivo `"use server"` só pode
 * exportar função assíncrona — exportar o objeto quebra a chamada da ação em
 * tempo de execução, e o build não avisa. Ela fica no componente, como o
 * `INICIAL` do `importador.tsx`.
 */
export type EstadoDaImagem = { erro: string | null };

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function erroDoBanco(
  error: { code?: string; message?: string } | null | undefined,
  padrao: string,
): string {
  if (
    error?.code === "PGRST202" ||
    error?.code === "PGRST205" ||
    error?.message?.includes("schema cache")
  ) {
    return "A migração das fotos ainda não foi aplicada no banco. Aplique a 0011 e a 0012 antes.";
  }

  if (error?.code === "23503") return "Prontuário não encontrado.";
  if (error?.code === "23505") return "Este arquivo já está registrado.";
  if (error?.code === "23514") return "O banco recusou os dados da foto.";
  if (error?.code === "42501") return "Seu perfil não tem permissão para isto.";

  // O texto do Postgres não sobe para a tela (invariante §9, regra 11).
  return padrao;
}

/** Só a administradora mexe em foto de prontuário — na tela, aqui e na RLS. */
async function administradoraOuErro(): Promise<{ id: string } | string> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  if (usuario.papel !== "administradora") {
    return "Apenas a administradora pode mexer nas fotos do prontuário.";
  }
  return { id: usuario.id };
}

function pastaEArquivo(caminho: string): { pasta: string; arquivo: string } {
  const corte = caminho.indexOf("/");
  return { pasta: caminho.slice(0, corte), arquivo: caminho.slice(corte + 1) };
}

/**
 * Grava a linha da foto que o navegador acabou de mandar para o bucket.
 *
 * O tamanho e o tipo não vêm do cliente: são lidos de volta do Storage. O
 * navegador poderia declarar qualquer coisa, e uma linha que descreve um
 * arquivo diferente do que está lá é pior do que nenhuma linha. A ida ao
 * Storage também confirma que o upload de fato chegou.
 */
export async function registrarImagem(
  entrada: RegistroDeImagem,
): Promise<ResultadoDoEnvio> {
  const quem = await administradoraOuErro();
  if (typeof quem === "string") return { ok: false, erro: quem };

  const prontuarioId = String(entrada.prontuarioId ?? "").slice(0, 36);
  const caminho = String(entrada.caminho ?? "").slice(0, 200);

  if (!uuidValido(prontuarioId)) {
    return { ok: false, erro: "Prontuário não identificado." };
  }

  if (!caminhoCoerente(prontuarioId, caminho)) {
    return { ok: false, erro: "Caminho do arquivo inválido." };
  }

  const dataCaptura = String(entrada.dataCaptura ?? "").slice(0, 10);
  const erroData = motivoDataInvalida(dataCaptura, chaveDoDia());
  if (erroData) return { ok: false, erro: erroData };

  const supabase = await clienteServidor();
  const { pasta, arquivo } = pastaEArquivo(caminho);

  const { data: objetos, error: erroLista } = await supabase.storage
    .from(BUCKET_IMAGENS)
    .list(pasta, { limit: 1, search: arquivo });

  if (erroLista) {
    return {
      ok: false,
      erro: mensagemDoStorage(
        erroLista,
        "Não foi possível confirmar o arquivo no armazenamento.",
      ),
    };
  }

  const objeto = (objetos ?? []).find((item) => item.name === arquivo);
  if (!objeto?.metadata) {
    return {
      ok: false,
      erro: "O arquivo não chegou ao armazenamento. Envie de novo.",
    };
  }

  const tamanho = Number(objeto.metadata.size ?? 0);
  const tipo = String(objeto.metadata.mimetype ?? "");
  const recusa = motivoDaRecusa({ tipo, tamanho });

  if (recusa) {
    // Chegou e não serve. Sai agora, antes de existir linha que o aponte —
    // senão fica órfão no bucket para sempre.
    await supabase.storage.from(BUCKET_IMAGENS).remove([caminho]);
    return { ok: false, erro: recusa };
  }

  // A `ordem` só desempata fotos do mesmo dia; o eixo continua sendo a data de
  // captura. Quem chega depois entra depois.
  const { data: ultima } = await supabase
    .from("prontuario_imagens")
    .select("ordem")
    .eq("prontuario_id", prontuarioId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dimensoes = dimensoesSanas(entrada.largura, entrada.altura);

  const { error } = await supabase.from("prontuario_imagens").insert({
    prontuario_id: prontuarioId,
    caminho,
    nome_original:
      String(entrada.nomeOriginal ?? "").trim().slice(0, 200) || arquivo,
    tipo_mime: tipo,
    tamanho_bytes: tamanho,
    largura: dimensoes?.largura ?? null,
    altura: dimensoes?.altura ?? null,
    legenda: legendaNormalizada(String(entrada.legenda ?? "")),
    data_captura: dataCaptura,
    ordem: (ultima?.ordem ?? 0) + 1,
    criado_por: quem.id,
  });

  if (error) {
    await supabase.storage.from(BUCKET_IMAGENS).remove([caminho]);
    return {
      ok: false,
      erro: erroDoBanco(
        error,
        "Não foi possível registrar a foto. O arquivo foi removido.",
      ),
    };
  }

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return { ok: true };
}

/** Legenda e data de captura — o que se corrige sem mexer no arquivo. */
export async function atualizarImagem(
  _anterior: EstadoDaImagem,
  dados: FormData,
): Promise<EstadoDaImagem> {
  const quem = await administradoraOuErro();
  if (typeof quem === "string") return { erro: quem };

  const id = texto(dados, "id").slice(0, 36);
  const prontuarioId = texto(dados, "prontuario_id").slice(0, 36);
  if (!uuidValido(id) || !uuidValido(prontuarioId)) {
    return { erro: "Foto não identificada." };
  }

  const dataCaptura = texto(dados, "data_captura").slice(0, 10);
  const erroData = motivoDataInvalida(dataCaptura, chaveDoDia());
  if (erroData) return { erro: erroData };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("prontuario_imagens")
    .update({
      legenda: legendaNormalizada(texto(dados, "legenda")),
      data_captura: dataCaptura,
    })
    .eq("id", id);

  if (error) {
    return { erro: erroDoBanco(error, "Não foi possível salvar a alteração.") };
  }

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return { erro: null };
}

/**
 * Arquivar tira da ficha e preserva: foto tremida, duplicada, enquadramento
 * errado. Não é eliminação — o arquivo continua no bucket e a linha, no banco.
 */
export async function alternarArquivamentoImagem(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.papel !== "administradora") return;

  const id = texto(dados, "id").slice(0, 36);
  const prontuarioId = texto(dados, "prontuario_id").slice(0, 36);
  if (!uuidValido(id) || !uuidValido(prontuarioId)) return;

  const supabase = await clienteServidor();
  await supabase
    .from("prontuario_imagens")
    .update({ arquivada: dados.get("arquivar") === "sim" })
    .eq("id", id);

  revalidatePath(`/prontuarios/${prontuarioId}`);
}

/**
 * Eliminação a pedido da titular (LGPD, art. 18, VI).
 *
 * São dois lugares e a ordem importa: o arquivo sai primeiro, a linha depois.
 * Invertida, se a remoção do arquivo falhasse sobraria um objeto no bucket sem
 * nenhuma linha apontando para ele — dado de saúde sem dono e sem rastro.
 *
 * O caminho vem do banco, nunca do formulário: o navegador manda só o id da
 * linha. O motivo e os metadados da linha removida vão para
 * `prontuario_imagem_eliminacoes` na mesma transação do DELETE (0012).
 */
export async function eliminarImagem(
  _anterior: EstadoDaImagem,
  dados: FormData,
): Promise<EstadoDaImagem> {
  const quem = await administradoraOuErro();
  if (typeof quem === "string") return { erro: quem };

  const id = texto(dados, "id").slice(0, 36);
  const prontuarioId = texto(dados, "prontuario_id").slice(0, 36);
  if (!uuidValido(id) || !uuidValido(prontuarioId)) {
    return { erro: "Foto não identificada." };
  }

  if (dados.get("confirmacao") !== "sim") {
    return { erro: "Marque a confirmação para eliminar a foto." };
  }

  const motivo = texto(dados, "motivo").replace(/\s+/g, " ").slice(0, 500);
  if (motivo.length < 10) {
    return {
      erro: "Descreva o motivo da eliminação em pelo menos 10 caracteres.",
    };
  }

  const supabase = await clienteServidor();

  const { data: imagem, error: erroBusca } = await supabase
    .from("prontuario_imagens")
    .select("id, caminho, prontuario_id")
    .eq("id", id)
    .maybeSingle();

  if (erroBusca) {
    return { erro: erroDoBanco(erroBusca, "Não foi possível ler a foto.") };
  }
  if (!imagem || imagem.prontuario_id !== prontuarioId) {
    return { erro: "Foto não encontrada neste prontuário." };
  }

  // Antes de encostar no arquivo: a 0012 chegou a este banco? Sem ela o DELETE
  // falharia depois de o arquivo já ter sido destruído, e o que se perderia
  // seria justamente a imagem que o registro deveria explicar.
  const { error: erroEstrutura } = await supabase
    .from("prontuario_imagem_eliminacoes")
    .select("id")
    .limit(1);

  if (erroEstrutura) {
    return {
      erro: erroDoBanco(erroEstrutura, "Não foi possível registrar a eliminação."),
    };
  }

  const { error: erroArquivo } = await supabase.storage
    .from(BUCKET_IMAGENS)
    .remove([imagem.caminho]);

  if (erroArquivo) {
    // A linha fica. Ela é o que ainda liga o arquivo a um dono: apagá-la agora
    // deixaria a imagem no bucket sem ninguém saber que está lá.
    return {
      erro: mensagemDoStorage(
        erroArquivo,
        "O arquivo não pôde ser removido do armazenamento, então nada foi eliminado.",
      ),
    };
  }

  const { error } = await supabase.rpc("prontuario_imagem_eliminar", {
    p_imagem_id: id,
    p_motivo: motivo,
  });

  if (error) {
    // O arquivo já saiu. A linha sobrou apontando para o vazio — aparece na
    // galeria como foto sem imagem, e é assim que se descobre para resolver.
    return {
      erro: erroDoBanco(
        error,
        "O arquivo foi removido, mas o registro da eliminação falhou. A foto aparecerá sem imagem até isto ser resolvido.",
      ),
    };
  }

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return { erro: null };
}
