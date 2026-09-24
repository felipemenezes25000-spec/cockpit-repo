"use client";

import {
  CircleAlert,
  CircleCheck,
  ImagePlus,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Campo, ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  BUCKET_IMAGENS,
  caminhoDaImagem,
  formatarTamanho,
  LIMITE_LEGENDA,
  MAXIMO_POR_ENVIO,
  mensagemDoStorage,
  motivoDaRecusa,
  motivoDataInvalida,
  TAMANHO_MAXIMO,
  tipoAceito,
  tipoPeloConteudo,
} from "@/lib/prontuario-imagens";
import { registrarImagem } from "@/server/acoes/prontuario-imagens";

/**
 * O arquivo sai daqui direto para o Storage, sem passar pela ação de servidor.
 *
 * Não é otimização: a Vercel corta o corpo de uma requisição de função em
 * 4,5 MB e o bucket aceita 10 MB. Uma foto no meio dessa faixa morreria com um
 * erro de plataforma que a tela não teria como explicar. Quem autoriza o envio
 * é a política de Storage da migração 0011, que só deixa a administradora
 * escrever no bucket — a mesma barreira, em outro lugar.
 *
 * Depois que o arquivo chega, a ação de servidor grava a linha e confere
 * tamanho e tipo lendo o objeto de volta.
 */

/**
 * O cliente do Supabase no navegador só é carregado quando a primeira foto
 * vai subir: importado no topo, ele entrava no JavaScript inicial da ficha do
 * prontuário (uns 75 kB a mais que as rotas vizinhas) para quem só ia ler.
 * Dentro do `try` de cada foto: se o pedaço de JS não carregar (rede caiu), a
 * foto é marcada com erro como qualquer outra falha de rede.
 */
async function clienteDoStorage() {
  const { clienteNavegador } = await import("@/lib/supabase/client");
  return clienteNavegador();
}

type Estado = "esperando" | "enviando" | "ok" | "erro";

type ItemDaFila = {
  chave: string;
  nome: string;
  tamanho: number;
  estado: Estado;
  erro?: string;
};

/**
 * O tipo pelos primeiros bytes, não pela extensão. O navegador deduz
 * `arquivo.type` do nome: um PNG salvo como ".jpg" chegaria como JPEG e o
 * servidor, que confere o conteúdo, o recusaria. Sem conseguir ler, fica o
 * declarado — o servidor confere de qualquer jeito.
 */
async function tipoDoArquivo(arquivo: File): Promise<string> {
  try {
    const inicio = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer());
    return tipoPeloConteudo(inicio) ?? arquivo.type;
  } catch {
    return arquivo.type;
  }
}

/**
 * Largura e altura reservam o espaço da foto na tela antes de ela chegar. Só o
 * navegador consegue lê-las sem decodificar a imagem no servidor; quando
 * falha, a linha fica sem as duas (o banco exige ambas ou nenhuma).
 */
async function dimensoesDoArquivo(
  arquivo: File,
): Promise<{ largura: number; altura: number } | null> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const dimensoes = { largura: bitmap.width, altura: bitmap.height };
    bitmap.close();
    return dimensoes;
  } catch {
    return null;
  }
}

function Linha({ item }: { item: ItemDaFila }) {
  const icone = {
    esperando: <span className="size-4 shrink-0 rounded-full border border-outline-variant bg-white" />,
    enviando: (
      <LoaderCircle
        aria-hidden="true"
        size={16}
        className="shrink-0 animate-spin text-primary"
      />
    ),
    ok: <CircleCheck aria-hidden="true" size={16} className="shrink-0 text-positivo" />,
    erro: <CircleAlert aria-hidden="true" size={16} className="shrink-0 text-negativo" />,
  }[item.estado];

  const superficie = {
    esperando: "border-card-border/65 bg-white/45",
    enviando: "border-primary/15 bg-primary-fixed/22 shadow-[var(--shadow-cartao)]",
    ok: "border-positivo-borda/55 bg-positivo-fundo/42",
    erro: "border-negativo-borda/55 bg-negativo-fundo/34",
  }[item.estado];

  return (
    <li className={cn("relative flex flex-col gap-1 overflow-hidden rounded-[13px] border px-3.5 py-3 transition-[background-color,border-color,box-shadow] duration-200", superficie)}>
      {item.estado === "enviando" ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-primary now-pulse" />
      ) : null}
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-white/70 bg-white/70 shadow-[var(--shadow-cartao)]">
          {icone}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-on-surface">
          {item.nome}
        </span>
        <span className="tabular shrink-0 rounded-full border border-card-border/65 bg-white/60 px-2 py-1 text-[0.66rem] font-medium text-outline">
          {formatarTamanho(item.tamanho)}
        </span>
      </div>
      {item.erro ? (
        <p className="pl-10.5 text-xs leading-5 text-negativo">{item.erro}</p>
      ) : null}
    </li>
  );
}

export function EnviarFotos({
  prontuarioId,
  dataSugerida,
  hojeNaClinica,
}: {
  prontuarioId: string;
  /** Data do registro do prontuário: a foto costuma ser do dia do atendimento. */
  dataSugerida: string;
  hojeNaClinica: string;
}) {
  const router = useRouter();
  const campoArquivo = useRef<HTMLInputElement>(null);

  const [dataCaptura, setDataCaptura] = useState(dataSugerida);
  const [legenda, setLegenda] = useState("");
  const [escolhidos, setEscolhidos] = useState<File[]>([]);
  const [fila, setFila] = useState<ItemDaFila[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [erroData, setErroData] = useState<string | null>(null);

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    const lista = [...(evento.target.files ?? [])];
    setFalha(
      lista.length > MAXIMO_POR_ENVIO
        ? `Máximo de ${MAXIMO_POR_ENVIO} fotos por envio. As demais ficaram de fora.`
        : null,
    );
    setEscolhidos(lista.slice(0, MAXIMO_POR_ENVIO));
    setFila([]);
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando || escolhidos.length === 0) return;

    // A data é conferida ANTES de qualquer arquivo subir, com a mesma função
    // que `registrarImagem` usa (AGENTS.md §6, regra 4). O `max` do campo
    // barra o futuro, mas não um ano digitado errado ("0025"): recusada só no
    // servidor, cada foto do lote já teria ido ao bucket e voltado.
    const motivoData = motivoDataInvalida(dataCaptura, hojeNaClinica);
    setErroData(motivoData);
    if (motivoData) return;

    setFalha(null);
    setEnviando(true);

    const inicial: ItemDaFila[] = escolhidos.map((arquivo, indice) => ({
      chave: `${indice}-${arquivo.name}`,
      nome: arquivo.name,
      tamanho: arquivo.size,
      estado: "esperando",
    }));
    setFila(inicial);

    const resultados = [...inicial];

    function marcar(indice: number, mudanca: Partial<ItemDaFila>) {
      resultados[indice] = { ...resultados[indice], ...mudanca };
      setFila([...resultados]);
    }

    // Uma de cada vez, de propósito. A ação de servidor calcula a `ordem` da
    // foto a partir da maior já gravada; em paralelo, duas fotos do mesmo dia
    // leriam o mesmo número e empatariam.
    for (let indice = 0; indice < escolhidos.length; indice += 1) {
      const arquivo = escolhidos[indice];

      const tipo = await tipoDoArquivo(arquivo);
      const recusa = motivoDaRecusa({ tipo, tamanho: arquivo.size });
      if (recusa || !tipoAceito(tipo)) {
        marcar(indice, { estado: "erro", erro: recusa ?? "Formato não aceito." });
        continue;
      }

      marcar(indice, { estado: "enviando" });

      // Uma foto que falha por rede não pode parar a fila nem prender a tela
      // em "enviando": ela é marcada com erro e a próxima segue.
      try {
        const caminho = caminhoDaImagem(prontuarioId, tipo);
        const dimensoes = await dimensoesDoArquivo(arquivo);
        const supabase = await clienteDoStorage();

        const { error: erroEnvio } = await supabase.storage
          .from(BUCKET_IMAGENS)
          .upload(caminho, arquivo, { contentType: tipo, upsert: false });

        if (erroEnvio) {
          // Mesma tradução que o servidor usa: o Storage fala inglês, a tela não.
          marcar(indice, {
            estado: "erro",
            erro: mensagemDoStorage(erroEnvio, "Não foi possível enviar o arquivo."),
          });
          continue;
        }

        const resposta = await registrarImagem({
          prontuarioId,
          caminho,
          nomeOriginal: arquivo.name,
          dataCaptura,
          legenda,
          largura: dimensoes?.largura ?? null,
          altura: dimensoes?.altura ?? null,
        });

        // Quando a ação recusa depois de conferir sessão e caminho, ela mesma
        // tira o arquivo do bucket (e registra no log se não conseguir); o
        // navegador não repete a remoção. O arquivo fica em três casos: a
        // sessão caiu entre o upload e a ação, o caminho já pertence a uma
        // foto registrada, ou a ação não conseguiu conferir isso. Sobrando
        // arquivo sem linha, a Conferência das fotos (/configuracoes/fotos) o
        // mostra.
        marcar(
          indice,
          resposta.ok ? { estado: "ok" } : { estado: "erro", erro: resposta.erro },
        );
      } catch {
        // Aqui o navegador não sabe o que aconteceu: a conexão pode ter caído
        // antes do upload, entre ele e a ação, ou depois de a linha já ter
        // sido gravada. Remover daqui poderia apagar o arquivo de uma foto
        // registrada, então nada é removido — se sobrar arquivo sem linha,
        // ele também aparece na Conferência das fotos.
        marcar(indice, {
          estado: "erro",
          erro: "A conexão caiu durante o envio. Confira a galeria e envie de novo se a foto não aparecer.",
        });
      }
    }

    setEnviando(false);

    if (resultados.some((item) => item.estado === "ok")) {
      setEscolhidos([]);
      setLegenda("");
      if (campoArquivo.current) campoArquivo.current.value = "";
      router.refresh();
    }
  }

  const gravadas = fila.filter((item) => item.estado === "ok").length;
  const recusadas = fila.filter((item) => item.estado === "erro").length;
  const concluidas = gravadas + recusadas;
  const progresso = fila.length > 0 ? Math.round((concluidas / fila.length) * 100) : 0;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo
          id="foto-data-captura"
          rotulo="Quando a foto foi tirada"
          obrigatorio
          dica="O eixo da evolução é este, não o dia do envio."
          erro={erroData ?? undefined}
        >
          <input
            id="foto-data-captura"
            type="date"
            value={dataCaptura}
            max={hojeNaClinica}
            onChange={(evento) => {
              setDataCaptura(evento.target.value);
              setErroData(null);
            }}
            required
            className={ENTRADA}
          />
        </Campo>

        <Campo
          id="foto-legenda"
          rotulo="Legenda"
          dica={`Vale para todas as fotos deste envio. Dá para ajustar uma a uma depois. Até ${LIMITE_LEGENDA} caracteres.`}
        >
          <input
            id="foto-legenda"
            type="text"
            value={legenda}
            maxLength={LIMITE_LEGENDA}
            placeholder="Perfil direito, antes da primeira sessão"
            onChange={(evento) => setLegenda(evento.target.value)}
            className={ENTRADA}
          />
        </Campo>
      </div>

      <div className="relative overflow-hidden rounded-[18px] border border-dashed border-primary/18 bg-[linear-gradient(145deg,rgba(209,232,255,0.28),rgba(255,255,255,0.72))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-5">
        <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-36 rounded-full bg-primary-fixed/45 blur-3xl" />
        <div className="relative flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-primary/10 bg-white/76 text-primary shadow-[var(--shadow-cartao)]">
            <ImagePlus aria-hidden="true" size={20} strokeWidth={1.65} />
          </span>
          <div className="min-w-0 flex-1">
            <Campo
              id="foto-arquivos"
              rotulo="Fotos"
              obrigatorio
              dica={`JPEG, PNG ou WebP, até ${formatarTamanho(TAMANHO_MAXIMO)} cada. No máximo ${MAXIMO_POR_ENVIO} por vez.`}
            >
              <input
                ref={campoArquivo}
                id="foto-arquivos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={aoEscolher}
                className={cn(
                  ENTRADA,
                  "h-auto bg-white/72 py-2.5 file:mr-3 file:cursor-pointer file:rounded-[9px] file:border file:border-primary/10 file:bg-primary-fixed/50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary file:shadow-[var(--shadow-cartao)] file:transition-colors hover:file:bg-primary-fixed/75",
                )}
              />
            </Campo>
          </div>
        </div>

        {escolhidos.length > 0 && fila.length === 0 ? (
          <div className="relative mt-4 border-t border-primary/10 pt-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-on-surface-variant">
                {escolhidos.length === 1 ? "1 arquivo pronto" : `${escolhidos.length} arquivos prontos`}
              </p>
              <p className="text-[0.66rem] text-outline">A fila será enviada em ordem, uma foto por vez.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {escolhidos.map((arquivo, indice) => (
                <span key={`${indice}-${arquivo.name}`} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-card-border/75 bg-white/72 px-2.5 py-1 text-[0.68rem] text-on-surface-variant shadow-[var(--shadow-cartao)]">
                  <ImagePlus aria-hidden="true" size={12} className="shrink-0 text-primary" />
                  <span className="max-w-48 truncate">{arquivo.name}</span>
                  <span className="tabular shrink-0 text-outline">{formatarTamanho(arquivo.size)}</span>
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {falha ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-atencao-borda bg-atencao-fundo px-3.5 py-2.5 text-sm text-atencao"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {falha}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enviando || escolhidos.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
        >
          {enviando ? (
            <>
              <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
              Enviando…
            </>
          ) : (
            <>
              <Upload aria-hidden="true" size={18} strokeWidth={1.75} />
              {escolhidos.length > 1
                ? `Enviar ${escolhidos.length} fotos`
                : "Enviar foto"}
            </>
          )}
        </button>

        {escolhidos.length > 0 && !enviando ? (
          <span className="text-xs text-outline">
            {escolhidos.length === 1
              ? "1 arquivo escolhido"
              : `${escolhidos.length} arquivos escolhidos`}
          </span>
        ) : null}
      </div>

      {fila.length > 0 ? (
        <div className="relative overflow-hidden rounded-[18px] border border-card-border/75 bg-white/56 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),var(--shadow-cartao)] sm:p-4">
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 right-0 size-36 rounded-full bg-primary-fixed/28 blur-3xl" />
          <div className="relative mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="rotulo flex items-center gap-2">
              <ImagePlus aria-hidden="true" size={14} strokeWidth={1.75} />
              {enviando
                ? "Fila de envio"
                : `${gravadas} ${gravadas === 1 ? "gravada" : "gravadas"}${
                    recusadas > 0
                      ? ` · ${recusadas} ${recusadas === 1 ? "recusada" : "recusadas"}`
                      : ""
                  }`}
            </p>
            <span className="tabular text-xs font-semibold text-primary">{progresso}%</span>
          </div>

          <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-primary-fixed/36" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progresso} aria-label="Progresso do envio das fotos">
            <span className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,var(--color-primary-container),var(--color-primary))] transition-[width] duration-300 ease-out" style={{ width: `${progresso}%` }} />
          </div>

          <ul className="relative flex flex-col gap-2">
            {fila.map((item) => (
              <Linha key={item.chave} item={item} />
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}