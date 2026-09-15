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
  TAMANHO_MAXIMO,
  tipoAceito,
} from "@/lib/prontuario-imagens";
import { clienteNavegador } from "@/lib/supabase/client";
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

type Estado = "esperando" | "enviando" | "ok" | "erro";

type ItemDaFila = {
  chave: string;
  nome: string;
  tamanho: number;
  estado: Estado;
  erro?: string;
};

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
    esperando: <span className="size-4 shrink-0 rounded-full border border-outline-variant" />,
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

  return (
    <li className="flex flex-col gap-1 border-b border-card-border px-4 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2.5">
        {icone}
        <span className="min-w-0 flex-1 truncate text-sm text-on-surface">
          {item.nome}
        </span>
        <span className="tabular shrink-0 text-xs text-outline">
          {formatarTamanho(item.tamanho)}
        </span>
      </div>
      {item.erro ? (
        <p className="pl-6.5 text-xs text-negativo">{item.erro}</p>
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

    setFalha(null);
    setEnviando(true);

    const inicial: ItemDaFila[] = escolhidos.map((arquivo, indice) => ({
      chave: `${indice}-${arquivo.name}`,
      nome: arquivo.name,
      tamanho: arquivo.size,
      estado: "esperando",
    }));
    setFila(inicial);

    const supabase = clienteNavegador();
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

      const recusa = motivoDaRecusa({ tipo: arquivo.type, tamanho: arquivo.size });
      if (recusa || !tipoAceito(arquivo.type)) {
        marcar(indice, { estado: "erro", erro: recusa ?? "Formato não aceito." });
        continue;
      }

      marcar(indice, { estado: "enviando" });

      const caminho = caminhoDaImagem(prontuarioId, arquivo.type);
      const dimensoes = await dimensoesDoArquivo(arquivo);

      const { error: erroEnvio } = await supabase.storage
        .from(BUCKET_IMAGENS)
        .upload(caminho, arquivo, { contentType: arquivo.type, upsert: false });

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

      // Quando a linha falha, a ação já removeu o arquivo do bucket. Não sobra
      // nada para limpar aqui.
      marcar(
        indice,
        resposta.ok ? { estado: "ok" } : { estado: "erro", erro: resposta.erro },
      );
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

  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo
          id="foto-data-captura"
          rotulo="Quando a foto foi tirada"
          obrigatorio
          dica="O eixo da evolução é este, não o dia do envio."
        >
          <input
            id="foto-data-captura"
            type="date"
            value={dataCaptura}
            max={hojeNaClinica}
            onChange={(evento) => setDataCaptura(evento.target.value)}
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
            "h-auto py-2.5 file:mr-3 file:cursor-pointer file:rounded-[var(--radius-tag)] file:border-0 file:bg-secondary-fixed file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary",
          )}
        />
      </Campo>

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
        <div>
          <p className="rotulo mb-2 flex items-center gap-2">
            <ImagePlus aria-hidden="true" size={14} strokeWidth={1.75} />
            {enviando
              ? "Enviando"
              : `${gravadas} ${gravadas === 1 ? "gravada" : "gravadas"}${
                  recusadas > 0
                    ? ` · ${recusadas} ${recusadas === 1 ? "recusada" : "recusadas"}`
                    : ""
                }`}
          </p>
          <ul className="rounded-[var(--radius-cartao)] border border-card-border bg-surface">
            {fila.map((item) => (
              <Linha key={item.chave} item={item} />
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
