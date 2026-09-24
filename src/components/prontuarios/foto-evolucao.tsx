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

type Painel = "nenhum" | "editar" | "eliminar";

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
        "inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-transparent px-2.5 text-xs font-medium transition-[transform,background-color,border-color,box-shadow,color] duration-180 active:scale-[0.98]",
        perigo
          ? "text-outline hover:border-negativo-borda/45 hover:bg-negativo-fundo hover:text-negativo"
          : "text-outline hover:border-primary/10 hover:bg-white/70 hover:text-primary hover:shadow-[var(--shadow-cartao)]",
        ativo && !perigo && "border-primary/10 bg-primary-fixed/45 text-primary shadow-[var(--shadow-cartao)]",
        ativo && perigo && "border-negativo-borda/55 bg-negativo-fundo text-negativo shadow-[var(--shadow-cartao)]",
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
        "inline-flex h-9 items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-180 active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none",
        perigo
          ? "border-negativo bg-negativo text-on-primary shadow-[0_8px_20px_-12px_rgba(187,0,0,0.6)] hover:-translate-y-px hover:bg-error hover:shadow-[0_12px_26px_-14px_rgba(187,0,0,0.72)]"
          : "border-primary-container bg-primary-container text-on-primary shadow-[var(--shadow-primary)] hover:-translate-y-px hover:bg-primary",
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
      className="inline-flex h-8 items-center gap-1.5 rounded-[9px] border border-transparent px-2.5 text-xs font-medium text-outline transition-[transform,background-color,border-color,box-shadow,color] duration-180 hover:border-primary/10 hover:bg-white/70 hover:text-primary hover:shadow-[var(--shadow-cartao)] active:scale-[0.98] disabled:opacity-55"
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

  useEffect(() => {
    if (estadoEdicao !== ESTADO_INICIAL && !estadoEdicao.erro) {
      setPainel("nenhum");
    }
  }, [estadoEdicao]);

  const descricao = imagem.legenda || `Foto de ${formatarData(imagem.dataCaptura)}`;

  return (
    <li
      className={cn(
        "group/foto relative flex flex-col overflow-hidden rounded-[18px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-realce)]",
        // Arquivada não usa opacidade no cartão: derrubaria o texto terciário
        // para ~3,2:1 (§7.4). O estado vem da borda tracejada, do fundo recuado
        // e do selo "· arquivada" na data; só a foto esmaece. A ativa usa o
        // token de superfície (§7.3), translúcido como o resto do vidro.
        imagem.arquivada
          ? "border-dashed border-outline-variant bg-surface-container-low"
          : "border-card-border/80 bg-surface/72 hover:border-primary/15",
      )}
    >
      {imagem.url ? (
        <button
          type="button"
          onClick={() => ampliada.current?.showModal()}
          className="group relative block aspect-4/3 w-full overflow-hidden bg-surface-container-low"
          aria-label={`Ampliar: ${descricao}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagem.url}
            alt={descricao}
            width={imagem.largura ?? undefined}
            height={imagem.altura ?? undefined}
            className={cn(
              "size-full object-cover transition-[transform,filter] duration-300 group-hover:scale-[1.025] group-hover:brightness-[0.97]",
              imagem.arquivada && "opacity-70",
            )}
          />
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#071d33]/18 via-transparent to-white/6 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
          <span className="pointer-events-none absolute right-3 bottom-3 translate-y-1 rounded-full border border-white/75 bg-white/82 px-2.5 py-1 text-[0.65rem] font-semibold text-primary opacity-0 shadow-[var(--shadow-cartao)] backdrop-blur-md transition-[transform,opacity] duration-200 group-hover:translate-y-0 group-hover:opacity-100">Ampliar</span>
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
            <p className="mt-1 text-sm text-outline">Sem legenda</p>
          )}
        </div>

        <p className="mt-auto text-xs text-outline">
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
            className="flex flex-col gap-3 rounded-[14px] border border-primary/10 bg-primary-fixed/18 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
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
                className="h-9 rounded-[9px] px-3 text-sm font-medium text-outline transition-colors hover:bg-white/60 hover:text-primary"
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {painel === "eliminar" ? (
          <form
            action={eliminar}
            className="relative flex flex-col gap-3 overflow-hidden rounded-[14px] border border-negativo-borda bg-negativo-fundo/74 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]"
          >
            <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-negativo" />
            <input type="hidden" name="id" value={imagem.id} />
            <input type="hidden" name="prontuario_id" value={prontuarioId} />

            <p className="pl-1 text-xs leading-relaxed text-negativo">
              <strong>Eliminação definitiva.</strong> Apaga o arquivo e a linha, e não tem volta. É para o pedido da titular (LGPD, art. 18, VI) — para foto tremida ou repetida, arquive. Fica registrado que a imagem existiu, quem eliminou e por quê; a imagem, não.
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

            <label className="flex items-start gap-2 rounded-[10px] border border-negativo-borda/60 bg-white/45 p-2.5 text-xs text-negativo">
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
                className="h-9 rounded-[9px] px-3 text-sm font-medium text-negativo transition-colors hover:bg-white/48 hover:underline"
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
            if (evento.target === ampliada.current) ampliada.current?.close();
          }}
          className="m-auto max-h-[92vh] max-w-[92vw] overflow-hidden rounded-[22px] border border-white/70 bg-white/92 p-0 shadow-[0_32px_90px_-30px_rgba(3,24,47,0.55)] backdrop:bg-[#071d33]/72 backdrop:backdrop-blur-sm"
        >
          <div className="flex max-h-[92vh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-card-border/80 bg-white/86 px-4 py-3 backdrop-blur-md">
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
                className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-card-border/70 bg-white/72 text-outline shadow-[var(--shadow-cartao)] transition-[transform,background-color,color] hover:bg-primary-fixed/40 hover:text-primary active:scale-95"
              >
                <X aria-hidden="true" size={18} strokeWidth={1.75} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagem.url}
              alt={descricao}
              className="max-h-[calc(92vh-4.5rem)] w-auto max-w-full bg-[#07111d] object-contain"
            />
          </div>
        </dialog>
      ) : null}
    </li>
  );
}