"use client";

import { CircleAlert, LoaderCircle, Save } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { LIMITE, ROTULO_TIPO, TIPOS_EM_USO } from "@/lib/documento";
import { formatarData, formatarHora } from "@/lib/format";
import {
  criarModelo,
  salvarNovaVersaoModelo,
  type EstadoModelo,
} from "@/server/acoes/documentos";
import type { ModeloCompleto } from "@/server/consultas/documentos";

const INICIAL: EstadoModelo = { erros: {} };

function Salvar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Salvando…
        </>
      ) : (
        <>
          <Save aria-hidden="true" size={18} strokeWidth={1.75} />
          {rotulo}
        </>
      )}
    </button>
  );
}

/**
 * Cria o modelo ou grava uma versão nova do texto.
 *
 * O tipo não aparece na edição porque não muda: um contrato que virasse termo
 * mudaria quem pode emiti-lo, e os documentos já emitidos guardam a cópia do
 * tipo antigo. Para mudar de natureza, cria-se outro modelo.
 */
export function FormularioModelo({ modelo }: { modelo: ModeloCompleto | null }) {
  const edicao = modelo !== null;
  const [estado, enviar] = useActionState(
    edicao ? salvarNovaVersaoModelo : criarModelo,
    INICIAL,
  );

  const valor = (campo: string, padrao: string) =>
    estado.valores?.[campo] ?? padrao;

  return (
    <div className="flex flex-col gap-6">
      <form action={enviar} className="flex flex-col gap-6">
        {edicao ? <input type="hidden" name="modelo_id" value={modelo.id} /> : null}

        <Card>
          <CardCabecalho
            titulo={edicao ? "Nova versão do modelo" : "Novo modelo"}
            descricao={
              edicao
                ? "A versão anterior fica guardada. Documentos já emitidos não mudam."
                : "O texto-base que cada documento vai congelar na emissão."
            }
          />

          <CardCorpo className="flex flex-col gap-5">
            {edicao ? (
              <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-3">
                <p className="text-xs font-medium uppercase text-outline">Tipo</p>
                <p className="mt-0.5 text-sm text-on-surface">
                  {ROTULO_TIPO[modelo.tipo]}
                </p>
                <p className="mt-1 text-xs text-outline">
                  O tipo não muda — ele decide quem pode emitir. Para outra
                  natureza, crie um modelo novo.
                </p>
              </div>
            ) : (
              <Campo id="tipo" rotulo="Tipo" obrigatorio erro={estado.erros.tipo}>
                <select
                  id="tipo"
                  name="tipo"
                  defaultValue={valor("tipo", "contrato")}
                  required
                  className={cn(ENTRADA, estado.erros.tipo && ENTRADA_ERRO)}
                >
                  {TIPOS_EM_USO.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {ROTULO_TIPO[tipo]}
                    </option>
                  ))}
                </select>
              </Campo>
            )}

            <Campo id="nome" rotulo="Nome" obrigatorio erro={estado.erros.nome}>
              <input
                id="nome"
                name="nome"
                type="text"
                maxLength={LIMITE.nome}
                required
                defaultValue={valor("nome", modelo?.nome ?? "")}
                placeholder="Contrato de prestação de serviços estéticos"
                className={cn(ENTRADA, estado.erros.nome && ENTRADA_ERRO)}
              />
            </Campo>

            <Campo
              id="descricao"
              rotulo="Descrição"
              erro={estado.erros.descricao}
              dica="Para quem vai escolher o modelo na hora de emitir."
            >
              <input
                id="descricao"
                name="descricao"
                type="text"
                maxLength={LIMITE.descricao}
                defaultValue={valor("descricao", modelo?.descricao ?? "")}
                className={ENTRADA}
              />
            </Campo>

            <Campo
              id="corpo"
              rotulo="Texto do documento"
              obrigatorio
              erro={estado.erros.corpo}
              dica="Escreva como a paciente vai ler. Parágrafos e quebras de linha são preservados."
            >
              <textarea
                id="corpo"
                name="corpo"
                required
                maxLength={LIMITE.corpo}
                rows={18}
                defaultValue={valor("corpo", modelo?.versaoAtual?.corpo ?? "")}
                className={cn(
                  AREA_TEXTO,
                  "min-h-[28rem] font-mono text-[0.8125rem]",
                  estado.erros.corpo && "border-error",
                )}
              />
            </Campo>

            {edicao ? (
              <Campo
                id="motivo"
                rotulo="Motivo da nova versão"
                obrigatorio
                erro={estado.erros.motivo}
                dica="Fica no histórico, junto com autor e data."
              >
                <input
                  id="motivo"
                  name="motivo"
                  type="text"
                  maxLength={LIMITE.motivo}
                  required
                  defaultValue={valor("motivo", "")}
                  placeholder="Ajuste na cláusula de cancelamento"
                  className={cn(ENTRADA, estado.erros.motivo && ENTRADA_ERRO)}
                />
              </Campo>
            ) : null}

            {estado.erros.geral ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
              >
                <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
                {estado.erros.geral}
              </p>
            ) : null}
          </CardCorpo>

          <CardRodape className="flex flex-wrap items-center gap-3">
            <Salvar rotulo={edicao ? "Salvar nova versão" : "Criar modelo"} />
            <span className="text-xs text-outline">
              Alterar o modelo nunca altera documento já emitido.
            </span>
          </CardRodape>
        </Card>
      </form>

      {edicao && modelo.versoes.length > 0 ? (
        <Card as="div">
          <CardCabecalho
            titulo="Histórico de versões"
            descricao={`${modelo.versoes.length} ${
              modelo.versoes.length === 1 ? "versão" : "versões"
            }`}
          />
          <CardCorpo>
            {modelo.versoes.map((versao) => (
              <details
                key={versao.id}
                className="group border-t border-card-border py-4 first:border-t-0 first:pt-0 last:pb-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-on-surface">
                      Versão {versao.numero}
                    </span>
                    <span className="block truncate text-xs text-outline">
                      {versao.motivo} · {formatarData(versao.criadoEm)} às{" "}
                      {formatarHora(versao.criadoEm)}
                      {versao.criadoPor ? ` · ${versao.criadoPor}` : ""}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-primary group-open:hidden">
                    Abrir
                  </span>
                  <span className="hidden text-xs font-medium text-primary group-open:inline">
                    Fechar
                  </span>
                </summary>

                <div className="mt-4 max-h-96 overflow-y-auto rounded-[var(--radius-cartao)] bg-surface px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
                    {versao.corpo}
                  </p>
                </div>
              </details>
            ))}
          </CardCorpo>
        </Card>
      ) : null}
    </div>
  );
}
