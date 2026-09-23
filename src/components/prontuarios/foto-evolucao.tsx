"use client";

import {
  Archive,
  ArchiveRestore,
  ImageOff,
  LoaderCircle,
  PencilLine,
  Trash2,
  X,
} from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Campo, classeDeAreaDeTexto, ENTRADA } from "@/components/ui/field";
import { FormularioDeAcao } from "@/components/ui/formulario-acao";
import { cn } from "@/lib/cn";
import { formatarData } from "@/lib/format";
import { formatarTamanho, LIMITE_LEGENDA } from "@/lib/prontuario-imagens";
import {
  alternarArquivamentoImagem,
  atualizarImagem,
  eliminarImagem,
  type EstadoDaImagem,
} from "@/server/acoes/prontuario-imagens";
import type { ImagemDoProntuario } from "@/server/consultas/prontuario-imagens";

/**
 * Uma foto de evolução, com o que se pode fazer com ela.
 *
 * A imagem é servida por URL assinada de validade curta, e não por
 * `next/image`: o otimizador faria uma cópia da foto no cache da CDN, fora do
 * bucket privado e fora da RLS que protege o resto. Dado de saúde não sai da
 * porta que o guarda.
 */

type Painel = "nenhum" | "editar" | "eliminar";

/**
 * Vive aqui, e não na ação: arquivo `"use server"` só exporta função
 * assíncrona. A identidade deste objeto é o que distingue "ainda não enviou"
 * de "enviou e voltou" — cada execução da ação devolve um objeto novo.
 */
const ESTADO_INICIAL: EstadoDaImagem = { erro: null };

function BotaoDeAcao({
  children,
  onClick,
  ativo = false,
  perigo = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ativo?: boolean;
  perigo?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] px-2.5 text-xs font-medium transition-colors",
        perigo
          ? "text-outline hover:bg-negativo-fundo hover:text-negativo"
          : "text-outline hover:bg-surface-container-low hover:text-primary",
        ativo && !perigo && "bg-surface-container-low text-primary",
        ativo && perigo && "bg-negativo-fundo text-negativo",
      )}
    >
      {children}
    </button>
  );
}

function Salvar({ rotulo, perigo = false }: { rotulo: string; perigo?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-cartao)] px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55",
        perigo
          ? "bg-negativo text-white hover:bg-error"
          : "bg-primary-container text-on-primary hover:bg-primary",
      )}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
      ) : null}
      {rotulo}
    </button>
  );
}

function BotaoArquivar({ arquivada }: { arquivada: boolean }) {
  const { pending } = useFormStatus();
  const Icone = arquivada ? ArchiveRestore : Archive;

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] px-2.5 text-xs font-medium text-outline transition-colors hover:bg-surface-container-low hover:text-primary disabled:opacity-55"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
      )}
      {arquivada ? "Reativar" : "Arquivar"}
    </button>
  );
}

export function FotoDaEvolucao({
  imagem,
  prontuarioId,
  hojeNaClinica,
}: {
  imagem: ImagemDoProntuario;
  prontuarioId: string;
  hojeNaClinica: string;
}) {
  const [painel, setPainel] = useState<Painel>("nenhum");
  const ampliada = useRef<HTMLDialogElement>(null);

  const [estadoEdicao, salvarEdicao] = useActionState(
    atualizarImagem,
    ESTADO_INICIAL,
  );
  const [estadoEliminacao, eliminar] = useActionState(
    eliminarImagem,
    ESTADO_INICIAL,
  );

  // Cada execução devolve um objeto novo; o inicial é a constante do módulo.
  // Fechar só quando deu certo mantém o erro à vista, junto do campo.
  useEffect(() => {
    if (estadoEdicao !== ESTADO_INICIAL && !estadoEdicao.erro) {
      setPainel("nenhum");
    }
  }, [estadoEdicao]);

  const descricao = imagem.legenda || `Foto de ${formatarData(imagem.dataCaptura)}`;

  return (
    <li
      className={cn(
        "flex flex-col overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface",
        imagem.arquivada && "opacity-70",
      )}
    >
      {imagem.url ? (
        <button
          type="button"
          onClick={() => ampliada.current?.showModal()}
          className="group relative block aspect-4/3 w-full overflow-hidden bg-surface-container-low"
          aria-label={`Ampliar: ${descricao}`}
        >
          {/* Sem `next/image` (ver o comentário no topo) e sem `loading="lazy"`:
              a URL assinada vale 15 minutos, e uma foto que só fosse buscada
              meia hora depois chegaria com a assinatura vencida. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem.url}
            alt={descricao}
            width={imagem.largura ?? undefined}
            height={imagem.altura ?? undefined}
            className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </button>
      ) : (
        <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-2 bg-negativo-fundo px-4 text-center">
          <ImageOff aria-hidden="true" size={24} strokeWidth={1.5} className="text-negativo" />
          <p className="text-xs text-negativo">
            O arquivo não está mais no armazenamento. O registro continua aqui.
          </p>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="tabular text-xs font-medium text-outline">
            {formatarData(imagem.dataCaptura)}
            {imagem.arquivada ? " · arquivada" : ""}
            {imagem.exemplo ? " · exemplo" : ""}
          </p>
          {imagem.legenda ? (
            <p className="mt-1 text-sm leading-relaxed text-on-surface">
              {imagem.legenda}
            </p>
          ) : (
            <p className="mt-1 text-sm text-outline-variant">Sem legenda</p>
          )}
        </div>

        <p className="mt-auto text-xs text-outline-variant">
          {formatarTamanho(imagem.tamanhoBytes)}
          {imagem.largura && imagem.altura
            ? ` · ${imagem.largura}×${imagem.altura}`
            : ""}
          {imagem.criadoPor ? ` · ${imagem.criadoPor}` : ""}
        </p>

        <div className="-mx-1 flex flex-wrap items-center gap-0.5 border-t border-card-border pt-2">
          <BotaoDeAcao
            onClick={() => setPainel(painel === "editar" ? "nenhum" : "editar")}
            ativo={painel === "editar"}
          >
            <PencilLine aria-hidden="true" size={14} strokeWidth={1.75} />
            Editar
          </BotaoDeAcao>

          <FormularioDeAcao
            acao={alternarArquivamentoImagem}
            campos={{
              id: imagem.id,
              prontuario_id: prontuarioId,
              arquivar: imagem.arquivada ? "nao" : "sim",
            }}
          >
            <BotaoArquivar arquivada={imagem.arquivada} />
          </FormularioDeAcao>

          <BotaoDeAcao
            onClick={() => setPainel(painel === "eliminar" ? "nenhum" : "eliminar")}
            ativo={painel === "eliminar"}
            perigo
          >
            <Trash2 aria-hidden="true" size={14} strokeWidth={1.75} />
            Eliminar
          </BotaoDeAcao>
        </div>

        {painel === "editar" ? (
          <form
            action={salvarEdicao}
            className="flex flex-col gap-3 border-t border-card-border pt-3"
          >
            <input type="hidden" name="id" value={imagem.id} />
            <input type="hidden" name="prontuario_id" value={prontuarioId} />

            <Campo id={`data-${imagem.id}`} rotulo="Data da captura" obrigatorio>
              <input
                id={`data-${imagem.id}`}
                name="data_captura"
                type="date"
                defaultValue={imagem.dataCapturaCampo}
                max={hojeNaClinica}
                required
                className={ENTRADA}
              />
            </Campo>

            <Campo id={`legenda-${imagem.id}`} rotulo="Legenda">
              <input
                id={`legenda-${imagem.id}`}
                name="legenda"
                type="text"
                defaultValue={imagem.legenda}
                maxLength={LIMITE_LEGENDA}
                className={ENTRADA}
              />
            </Campo>

            {estadoEdicao.erro ? (
              <p role="alert" className="text-xs text-error">
                {estadoEdicao.erro}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <Salvar rotulo="Salvar" />
              <button
                type="button"
                onClick={() => setPainel("nenhum")}
                className="h-9 px-3 text-sm font-medium text-outline hover:text-primary"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {painel === "eliminar" ? (
          <form
            action={eliminar}
            className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo p-3"
          >
            <input type="hidden" name="id" value={imagem.id} />
            <input type="hidden" name="prontuario_id" value={prontuarioId} />

            <p className="text-xs leading-relaxed text-negativo">
              Eliminar apaga o arquivo e a linha, e não tem volta. É para o
              pedido da titular (LGPD, art. 18, VI) — para foto tremida ou
              repetida, arquive. Fica registrado que a imagem existiu, quem
              eliminou e por quê; a imagem, não.
            </p>

            <Campo
              id={`motivo-${imagem.id}`}
              rotulo="Motivo"
              obrigatorio
              dica="Fica guardado. Pelo menos 10 caracteres."
            >
              <textarea
                id={`motivo-${imagem.id}`}
                name="motivo"
                required
                minLength={10}
                maxLength={500}
                rows={2}
                placeholder="Pedido de eliminação feito pela paciente por escrito em 10/09."
                className={classeDeAreaDeTexto({ altura: "curta" })}
              />
            </Campo>

            <label className="flex items-start gap-2 text-xs text-negativo">
              <input
                type="checkbox"
                name="confirmacao"
                value="sim"
                required
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-negativo)]"
              />
              Confirmo que esta foto deve ser eliminada em definitivo.
            </label>

            {estadoEliminacao.erro ? (
              <p role="alert" className="text-xs font-medium text-error">
                {estadoEliminacao.erro}
              </p>
            ) : null}

            <div className="flex items-center gap-2">
              <Salvar rotulo="Eliminar em definitivo" perigo />
              <button
                type="button"
                onClick={() => setPainel("nenhum")}
                className="h-9 px-3 text-sm font-medium text-negativo hover:underline"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {imagem.url ? (
        <dialog
          ref={ampliada}
          onClick={(evento) => {
            // Clique no fundo fecha. O conteúdo interrompe a propagação.
            if (evento.target === ampliada.current) ampliada.current?.close();
          }}
          className="m-auto max-h-[92vh] max-w-[92vw] rounded-[var(--radius-painel)] bg-surface p-0 backdrop:bg-black/70"
        >
          <div className="flex max-h-[92vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-card-border px-4 py-3">
              <div className="min-w-0">
                <p className="tabular text-xs text-outline">
                  {formatarData(imagem.dataCaptura)}
                </p>
                {imagem.legenda ? (
                  <p className="mt-0.5 text-sm text-on-surface">{imagem.legenda}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => ampliada.current?.close()}
                aria-label="Fechar"
                className="shrink-0 rounded-[var(--radius-tag)] p-1.5 text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.75} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt={descricao}
              className="max-h-[calc(92vh-4.5rem)] w-auto max-w-full object-contain"
            />
          </div>
        </dialog>
      ) : null}
    </li>
  );
}
