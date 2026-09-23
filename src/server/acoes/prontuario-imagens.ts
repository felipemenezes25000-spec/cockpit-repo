"use server";

import { revalidatePath } from "next/cache";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { usuarioAtual } from "@/lib/auth";
import { mensagemDoBanco, type ErroDoBanco } from "@/lib/erros-banco";
import { registrarFalha } from "@/lib/registro";
import { chaveDoDia } from "@/lib/dates";
import { uuidValido } from "@/lib/prontuario";
import {
  BUCKET_IMAGENS,
  caminhoCoerente,
  dimensoesSanas,
  extensaoDoTipo,
  legendaNormalizada,
  mensagemDoStorage,
  motivoDaRecusa,
  motivoDataInvalida,
  motivoDoConteudoDivergente,
  tipoAceito,
  tipoPeloConteudo,
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

function erroDoBanco(error: ErroDoBanco, padrao: string, contexto = "fotos"): string {
  if (error) registrarFalha(contexto, error);
  // O texto do Postgres não sobe para a tela (AGENTS.md §6, regra 11).
  return mensagemDoBanco(error, padrao, {
    "23503": "Prontuário não encontrado.",
    "23505": "Este arquivo já está registrado.",
    "23514": "O banco recusou os dados da foto.",
  });
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

type ErroDoStorage = { message?: string; statusCode?: string | number; status?: number } | null;

/**
 * Falha do Storage no log, no mesmo formato sanitizado das do banco.
 *
 * O caminho pode entrar no contexto: ele é feito só de UUIDs, de propósito
 * (§8.5), e é o que permite achar o objeto depois. Nome original, legenda e
 * qualquer outro dado da paciente ficam fora.
 */
function registrarFalhaDoStorage(contexto: string, erro: ErroDoStorage): void {
  if (!erro) return;
  registrarFalha(contexto, {
    code: `storage-${erro.statusCode ?? erro.status ?? "sem-status"}`,
    message: erro.message ?? "",
  });
}

/**
 * Tira do bucket o arquivo que não vai ganhar linha.
 *
 * Se a remoção também falhar, sobra exatamente o que a 0011 manda evitar:
 * dado de saúde no bucket sem linha que o explique. Isso não pode acontecer
 * em silêncio — vai para o log com o caminho, para a reconciliação achar.
 */
async function descartarArquivo(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  caminho: string,
  motivo: string,
): Promise<boolean> {
  // Reconfere a linha IMEDIATAMENTE antes de remover. A conferência do começo
  // da ação não basta: outra chamada com o mesmo caminho (POST reenviado pelo
  // navegador) pode ter gravado a linha depois dela, e um INSERT desta pode ter
  // chegado ao banco com a resposta perdida na rede. Com linha — ou sem
  // conseguir saber — o arquivo fica: apagar o de uma foto registrada é perda
  // sem volta, e um órfão ainda aparece na Conferência das fotos.
  const { data: linha, error: erroLinha } = await supabase
    .from("prontuario_imagens")
    .select("id")
    .eq("caminho", caminho)
    .maybeSingle();
  if (erroLinha) {
    registrarFalha(`fotos: arquivo órfão no bucket (${motivo}; registro não conferido) ${caminho}`, erroLinha);
    return false;
  }
  if (linha) return false;

  const { error } = await supabase.storage.from(BUCKET_IMAGENS).remove([caminho]);
  if (error) {
    registrarFalhaDoStorage(`fotos: arquivo órfão no bucket (${motivo}) ${caminho}`, error);
    return false;
  }
  return true;
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
 *
 * Quando esta ação roda, o arquivo JÁ está no bucket: o navegador sobe antes
 * de chamar. Por isso toda recusa depois de o caminho ser conferido tira o
 * arquivo de lá (`descartarArquivo`) — senão cada tentativa recusada deixaria
 * uma foto sem linha, que não aparece na galeria e não sai pela eliminação.
 */
export async function registrarImagem(
  entrada: RegistroDeImagem,
): Promise<ResultadoDoEnvio> {
  // Estas três recusas não tocam no Storage. Sem sessão de administradora, a
  // política do bucket nem deixaria remover; e um caminho que não é deste
  // prontuário não é nosso para apagar — poderia ser a foto de outra paciente.
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
  const supabase = await clienteServidor();
  const { pasta, arquivo } = pastaEArquivo(caminho);

  // Caminho que já tem linha é de foto registrada: um replay desta ação, ou
  // um erro transitório depois, não pode tirar do bucket o arquivo dela (a
  // saída de foto registrada só existe com motivo, em `eliminarImagem`).
  // Mesmo prontuário: já está feito. Outro: recusa sem tocar no Storage.
  const { data: jaRegistrada, error: erroExistente } = await supabase
    .from("prontuario_imagens")
    .select("prontuario_id")
    .eq("caminho", caminho)
    .maybeSingle();

  if (erroExistente) {
    // Sem saber se o caminho já tem linha, o arquivo NÃO é removido: apagar o
    // de uma foto registrada é perda sem volta, e um órfão ainda aparece na
    // Conferência das fotos. Quase sempre é o primeiro registro deste
    // arquivo, então ele fica para trás — e o caminho vai para o log.
    return {
      ok: false,
      erro: erroDoBanco(
        erroExistente,
        "Não foi possível registrar a foto. Tente de novo.",
        `fotos: arquivo órfão no bucket (registro não conferido) ${caminho}`,
      ),
    };
  }
  if (jaRegistrada) {
    return jaRegistrada.prontuario_id === prontuarioId
      ? { ok: true }
      : { ok: false, erro: "Caminho do arquivo inválido." };
  }

  // Daqui em diante o caminho é deste prontuário e nenhuma linha o aponta: o
  // arquivo, se está no bucket, só existe por causa deste envio. Toda recusa
  // abaixo o remove antes de responder (AGENTS.md §8.5, "Se a linha falha, o
  // arquivo sai junto"). A data é conferida só agora, e não lá em cima, pela
  // mesma razão: antes daqui, remover poderia levar o arquivo de uma foto já
  // registrada, num replay desta ação.
  const erroData = motivoDataInvalida(dataCaptura, chaveDoDia());
  if (erroData) {
    await descartarArquivo(supabase, caminho, "data inválida");
    return { ok: false, erro: erroData };
  }

  const { data: objetos, error: erroLista } = await supabase.storage
    .from(BUCKET_IMAGENS)
    .list(pasta, { limit: 1, search: arquivo });

  if (erroLista) {
    // Sem conferir, não há linha. O arquivo sai mesmo assim: a pessoa vai
    // reenviar com outro nome, e este ficaria para trás.
    registrarFalhaDoStorage("fotos: conferir o arquivo enviado", erroLista);
    await descartarArquivo(supabase, caminho, "não conferido");
    return {
      ok: false,
      erro: mensagemDoStorage(
        erroLista,
        "Não foi possível confirmar o arquivo no armazenamento. Envie de novo.",
      ),
    };
  }

  const objeto = (objetos ?? []).find((item) => item.name === arquivo);
  if (!objeto?.metadata) {
    // Quase sempre não há o que remover. A tentativa cobre o objeto que
    // exista sem os metadados que a conferência precisa.
    await descartarArquivo(supabase, caminho, "não encontrado");
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
    await descartarArquivo(supabase, caminho, "recusado");
    return { ok: false, erro: recusa };
  }

  // O tipo acima é o declarado no envio. O conteúdo é conferido pelos
  // primeiros bytes do objeto que de fato chegou, e a extensão do caminho
  // precisa bater com ele: "foto.jpg" que é outra coisa não entra.
  const { data: conteudo, error: erroConteudo } = await supabase.storage
    .from(BUCKET_IMAGENS)
    .download(caminho);

  if (erroConteudo || !conteudo) {
    registrarFalhaDoStorage("fotos: reler o arquivo enviado", erroConteudo);
    await descartarArquivo(supabase, caminho, "não relido");
    return {
      ok: false,
      erro: "Não foi possível conferir o arquivo enviado. Ele foi removido; envie de novo.",
    };
  }

  const inicio = new Uint8Array(await conteudo.slice(0, 12).arrayBuffer());
  const tipoReal = tipoPeloConteudo(inicio);
  if (
    !tipoAceito(tipo) ||
    tipoReal !== tipo ||
    !caminho.endsWith(`.${extensaoDoTipo(tipo)}`) ||
    conteudo.size !== tamanho
  ) {
    await descartarArquivo(supabase, caminho, "conteúdo divergente");
    return { ok: false, erro: motivoDoConteudoDivergente(tipo, tipoReal) };
  }

  // A `ordem` só desempata fotos do mesmo dia; o eixo continua sendo a data de
  // captura. Quem chega depois entra depois.
  const { data: ultima, error: erroOrdem } = await supabase
    .from("prontuario_imagens")
    .select("ordem")
    .eq("prontuario_id", prontuarioId)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (erroOrdem) {
    await descartarArquivo(supabase, caminho, "ordem não lida");
    return {
      ok: false,
      erro: erroDoBanco(erroOrdem, "Não foi possível registrar a foto. O arquivo foi removido."),
    };
  }

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
    // 23505 no `caminho` (unique): outra chamada registrou este arquivo entre
    // a conferência acima e aqui. O arquivo é de uma linha válida e fica.
    if (error.code === "23505") {
      revalidatePath(`/prontuarios/${prontuarioId}`);
      return { ok: false, erro: "Esta foto já estava registrada. Atualize a página." };
    }
    // Falha parcial: o arquivo chegou, a linha não. `erroDoBanco` registra a
    // causa; `descartarArquivo` registra se o arquivo também ficar para trás.
    const removido = await descartarArquivo(supabase, caminho, "linha não gravada");
    return {
      ok: false,
      erro: erroDoBanco(
        error,
        removido
          ? "Não foi possível registrar a foto. O arquivo foi removido."
          : "Não foi possível confirmar o registro da foto. Atualize a página antes de enviar de novo.",
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
  // O prontuário vai na condição: a foto só se corrige na página a que
  // pertence. E zero linhas (RLS ou id de outro prontuário) não é sucesso.
  const { data, error } = await supabase
    .from("prontuario_imagens")
    .update({
      legenda: legendaNormalizada(texto(dados, "legenda")),
      data_captura: dataCaptura,
    })
    .eq("id", id)
    .eq("prontuario_id", prontuarioId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { erro: erroDoBanco(error, "Não foi possível salvar a alteração.", "fotos: atualizar") };
  }
  if (!data) return { erro: "Foto não encontrada neste prontuário." };

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return { erro: null };
}

/**
 * Arquivar tira da ficha e preserva: foto tremida, duplicada, enquadramento
 * errado. Não é eliminação — o arquivo continua no bucket e a linha, no banco.
 */
export async function alternarArquivamentoImagem(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const quem = await administradoraOuErro();
  if (typeof quem === "string") return falha(quem);

  const id = texto(dados, "id").slice(0, 36);
  const prontuarioId = texto(dados, "prontuario_id").slice(0, 36);
  if (!uuidValido(id) || !uuidValido(prontuarioId)) return falha("Foto não identificada.");

  const arquivar = dados.get("arquivar") === "sim";
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("prontuario_imagens")
    .update({ arquivada: arquivar })
    .eq("id", id)
    .eq("prontuario_id", prontuarioId)
    .select("id")
    .maybeSingle();

  if (error) return falha(erroDoBanco(error, "Não foi possível alterar a foto.", "fotos: arquivar"));
  if (!data) return falha("Foto não encontrada neste prontuário.");

  revalidatePath(`/prontuarios/${prontuarioId}`);
  return sucesso(arquivar ? "Foto arquivada." : "Foto de volta à galeria.");
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
    registrarFalhaDoStorage("fotos: remover o arquivo na eliminação", erroArquivo);
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
    // Registrado mesmo quando a recusa é nossa (P0001), que `registrarFalha`
    // não loga: aqui o que importa é a inconsistência, não a causa.
    registrarFalha(`fotos: linha sem arquivo após eliminação ${id}`, {
      code: "inconsistencia",
      message: "arquivo removido do bucket; registro da eliminação falhou",
    });
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
