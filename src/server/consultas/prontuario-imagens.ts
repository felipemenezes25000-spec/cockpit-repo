import "server-only";

import { falhaDeConsulta, registrarFalha } from "@/lib/registro";

import { cache } from "react";
import { dataDoBanco } from "@/lib/dates";
import { mensagemDoBanco } from "@/lib/erros-banco";
import {
  BUCKET_IMAGENS,
  lerSobrasDasFotos,
  type SobraDeFoto,
} from "@/lib/prontuario-imagens";
import { clienteServidor } from "@/lib/supabase/server";
import { TAMANHO_DO_BLOCO } from "./todas-as-linhas";
import {
  EstruturaProntuarioPendenteError,
  estruturaPendente,
} from "./prontuarios";

/**
 * Quanto tempo a URL assinada vale.
 *
 * Quinze minutos é curto para um endereço que entrega dado de saúde a quem o
 * tiver — e é tempo de sobra para o que a página faz com ele, que é carregar
 * as fotos no instante em que abre. Depois disso quem sustenta a visita é o
 * cache do navegador, não a assinatura.
 *
 * É por isso também que a grade NÃO usa `loading="lazy"`: uma foto abaixo da
 * dobra, carregada meia hora depois, pediria uma assinatura já vencida. Melhor
 * baixar tudo enquanto a assinatura vale do que esticá-la para caber na
 * rolagem.
 */
const VALIDADE_URL = 15 * 60;

export type ImagemDoProntuario = {
  id: string;
  caminho: string;
  nomeOriginal: string;
  tipoMime: string;
  tamanhoBytes: number;
  largura: number | null;
  altura: number | null;
  legenda: string;
  dataCaptura: Date;
  /** A mesma data no formato do campo de formulário (AAAA-MM-DD). */
  dataCapturaCampo: string;
  ordem: number;
  arquivada: boolean;
  criadoEm: Date;
  criadoPor: string | null;
  exemplo: boolean;
  /** URL assinada, ou `null` quando o Storage não devolveu uma. */
  url: string | null;
};

export type EliminacaoDeImagem = {
  id: number;
  nomeOriginal: string;
  dataCaptura: Date;
  motivo: string;
  eliminadaEm: Date;
  eliminadaPor: string | null;
};

export type FotosDoProntuario = {
  visiveis: ImagemDoProntuario[];
  arquivadas: ImagemDoProntuario[];
  eliminacoes: EliminacaoDeImagem[];
};

/**
 * As fotos de um prontuário, já com URL assinada para exibir.
 *
 * A ordem é cronológica crescente: a evolução se lê do antes para o depois. A
 * coluna `ordem` desempata dentro do mesmo dia — que é o dia em que a clínica
 * fotografa vários ângulos de uma vez.
 */
export const fotosDoProntuario = cache(
  async (prontuarioId: string): Promise<FotosDoProntuario> => {
    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("prontuario_imagens")
      .select(
        `id, caminho, nome_original, tipo_mime, tamanho_bytes, largura, altura,
         legenda, data_captura, ordem, arquivada, criado_em, exemplo,
         perfis ( nome )`,
      )
      .eq("prontuario_id", prontuarioId)
      .order("data_captura", { ascending: true })
      .order("ordem", { ascending: true })
      .order("criado_em", { ascending: true });

    if (error) {
      if (estruturaPendente(error)) throw new EstruturaProntuarioPendenteError();
      falhaDeConsulta("consulta prontuario-imagens", error, "Não foi possível carregar as fotos.");
    }

    const linhas = data ?? [];

    // Uma chamada para todos os caminhos: assinar uma a uma seria uma ida ao
    // Storage por foto.
    const assinadas = new Map<string, string>();

    if (linhas.length > 0) {
      const { data: urls, error: erroUrls } = await supabase.storage
        .from(BUCKET_IMAGENS)
        .createSignedUrls(
          linhas.map((linha) => linha.caminho),
          VALIDADE_URL,
        );

      // Falha do Storage não é "arquivo perdido": com ela, cada foto
      // apareceria com o aviso de arquivo ausente sem estar.
      if (erroUrls) {
        falhaDeConsulta("consulta fotos: URLs assinadas", erroUrls, "Não foi possível carregar as fotos.");
      }

      for (const assinada of urls ?? []) {
        // `path` volta nulo quando o objeto não existe mais no bucket. A linha
        // continua aparecendo, sem imagem — é assim que se descobre que um
        // arquivo se perdeu, em vez de a foto sumir da tela sem explicação.
        if (assinada.path && assinada.signedUrl && !assinada.error) {
          assinadas.set(assinada.path, assinada.signedUrl);
        }
      }
    }

    const imagens: ImagemDoProntuario[] = linhas.map((linha) => ({
      id: linha.id,
      caminho: linha.caminho,
      nomeOriginal: linha.nome_original,
      tipoMime: linha.tipo_mime,
      tamanhoBytes: linha.tamanho_bytes,
      largura: linha.largura,
      altura: linha.altura,
      legenda: linha.legenda,
      dataCaptura: dataDoBanco(linha.data_captura),
      dataCapturaCampo: linha.data_captura,
      ordem: linha.ordem,
      arquivada: linha.arquivada,
      criadoEm: new Date(linha.criado_em),
      criadoPor: linha.perfis?.nome ?? null,
      exemplo: linha.exemplo,
      url: assinadas.get(linha.caminho) ?? null,
    }));

    const { data: eliminadas, error: erroEliminacoes } = await supabase
      .from("prontuario_imagem_eliminacoes")
      .select("id, nome_original, data_captura, motivo, eliminada_em, perfis ( nome )")
      .eq("prontuario_id", prontuarioId)
      .order("eliminada_em", { ascending: false });

    // A 0012 pode não ter sido aplicada ainda. A galeria funciona sem ela; o
    // que falta é o histórico de eliminações, e a ação de eliminar avisa.
    if (erroEliminacoes && !estruturaPendente(erroEliminacoes)) {
      falhaDeConsulta("consulta prontuario-imagens", erroEliminacoes, "Não foi possível carregar as eliminações.");
    }

    return {
      visiveis: imagens.filter((imagem) => !imagem.arquivada),
      arquivadas: imagens.filter((imagem) => imagem.arquivada),
      eliminacoes: (eliminadas ?? []).map((linha) => ({
        id: linha.id,
        nomeOriginal: linha.nome_original,
        dataCaptura: dataDoBanco(linha.data_captura),
        motivo: linha.motivo,
        eliminadaEm: new Date(linha.eliminada_em),
        eliminadaPor: linha.perfis?.nome ?? null,
      })),
    };
  },
);

export type ConferenciaDasFotos =
  | { permitida: true; sobras: SobraDeFoto[] }
  | { permitida: false; mensagem: string };

/**
 * Conferência entre o bucket e as linhas das fotos (migração 0024).
 *
 * Só leitura e só da administradora: a função do banco recusa as outras
 * pessoas com 42501, e essa recusa vira frase para a tela, não página de
 * erro. Qualquer outra falha é falha de consulta. Nada aqui apaga: quem
 * decide o que fazer com cada sobra é uma pessoa (a eliminação com motivo,
 * no prontuário).
 */
export const conferenciaDasFotos = cache(async (): Promise<ConferenciaDasFotos> => {
  const supabase = await clienteServidor();

  // Em blocos, como `todasAsLinhas`: função que devolve tabela também passa
  // pelo `max_rows` do PostgREST, e acima de 1000 sobras a lista sairia
  // cortada sem aviso — justo a tela que diz onde estão os órfãos. O laço é
  // local porque a recusa por permissão (42501) tem resposta própria.
  const linhas: Parameters<typeof lerSobrasDasFotos>[0][number][] = [];
  for (let inicio = 0; ; inicio += TAMANHO_DO_BLOCO) {
    const { data, error } = await supabase
      .rpc("prontuario_imagens_reconciliar")
      .order("caminho")
      .order("situacao")
      .range(inicio, inicio + TAMANHO_DO_BLOCO - 1);

    if (error) {
      if (error.code === "42501") {
        registrarFalha("consulta fotos: conferência recusada", error);
        return {
          permitida: false,
          mensagem: mensagemDoBanco(error, "A conferência das fotos é restrita à administradora."),
        };
      }
      falhaDeConsulta("consulta fotos: conferência", error, "Não foi possível conferir as fotos.");
    }

    linhas.push(...(data ?? []));
    if ((data?.length ?? 0) < TAMANHO_DO_BLOCO) break;
  }

  return { permitida: true, sobras: lerSobrasDasFotos(linhas, new Date()) };
});
