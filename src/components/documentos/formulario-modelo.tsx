"use client";

import { CircleAlert, Save } from "lucide-react";
import { useActionState, useState } from "react";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { cn } from "@/lib/cn";
import {
  LIMITE,
  ROTULO_TIPO,
  TIPOS_EM_USO,
  type TipoDocumento,
} from "@/lib/documento";
import { EditorDeCampos } from "./editor-campos";
import { formatarData, formatarHora } from "@/lib/format";
import {
  criarModelo,
  salvarNovaVersaoModelo,
  type EstadoModelo,
} from "@/server/acoes/documentos";
import type { ModeloCompleto } from "@/server/consultas/documentos";

const INICIAL: EstadoModelo = { erros: {} };

export function FormularioModelo({ modelo }: { modelo: ModeloCompleto | null }) {
  const edicao = modelo !== null;
  const [estado, enviar] = useActionState(edicao ? salvarNovaVersaoModelo : criarModelo, INICIAL);
  const valor = (campo: string, padrao: string) => estado.valores?.[campo] ?? padrao;
  const [tipo, setTipo] = useState<TipoDocumento>(modelo?.tipo ?? ((valor("tipo", "contrato") as TipoDocumento) || "contrato"));

  return (
    <div className="flex flex-col gap-6">
      <form action={enviar} className="flex flex-col gap-6">
        {edicao ? <input type="hidden" name="modelo_id" value={modelo.id} /> : null}

        <Card>
          <CardCabecalho
            titulo={edicao ? "Nova versão do modelo" : "Novo modelo"}
            descricao={edicao ? "A versão anterior fica guardada. Documentos já emitidos não mudam." : "O texto-base e as perguntas que cada documento vai congelar na emissão."}
          />

          <CardCorpo className="flex flex-col gap-5">
            {edicao ? (
              <div className="rounded-[var(--radius-painel)] border border-informativo-borda bg-informativo-fundo px-4 py-3">
                <p className="rotulo text-informativo-texto">Tipo preservado</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{ROTULO_TIPO[modelo.tipo]}</p>
                <p className="mt-1 text-xs leading-5 text-outline">O tipo não muda porque decide quem pode emitir. Para outra natureza, crie um modelo novo.</p>
              </div>
            ) : (
              <Campo id="tipo" rotulo="Tipo" obrigatorio erro={estado.erros.tipo}>
                <select id="tipo" name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoDocumento)} required className={cn(ENTRADA, estado.erros.tipo && ENTRADA_ERRO)}>
                  {TIPOS_EM_USO.map((valorTipo) => <option key={valorTipo} value={valorTipo}>{ROTULO_TIPO[valorTipo]}</option>)}
                </select>
              </Campo>
            )}

            <Campo id="nome" rotulo="Nome" obrigatorio erro={estado.erros.nome}>
              <input id="nome" name="nome" type="text" maxLength={LIMITE.nome} required defaultValue={valor("nome", modelo?.nome ?? "")} placeholder="Contrato de prestação de serviços estéticos" className={cn(ENTRADA, estado.erros.nome && ENTRADA_ERRO)} />
            </Campo>

            <Campo id="descricao" rotulo="Descrição" erro={estado.erros.descricao} dica="Para quem vai escolher o modelo na hora de emitir.">
              <input id="descricao" name="descricao" type="text" maxLength={LIMITE.descricao} defaultValue={valor("descricao", modelo?.descricao ?? "")} className={ENTRADA} />
            </Campo>

            <Campo id="corpo" rotulo="Texto do documento" obrigatorio erro={estado.erros.corpo} dica="Escreva como a paciente vai ler. Parágrafos e quebras de linha são preservados.">
              <textarea id="corpo" name="corpo" required maxLength={LIMITE.corpo} rows={18} defaultValue={valor("corpo", modelo?.versaoAtual?.corpo ?? "")} className={cn(AREA_TEXTO, "min-h-[28rem] font-mono text-[0.8125rem] leading-6", estado.erros.corpo && "border-error")} />
            </Campo>

            <div className="rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 sm:p-5">
              <EditorDeCampos key={modelo?.id ?? tipo} iniciais={modelo?.versaoAtual?.campos ?? []} obrigatorio={tipo === "anamnese"} />
            </div>

            {edicao ? (
              <Campo id="motivo" rotulo="Motivo da nova versão" obrigatorio erro={estado.erros.motivo} dica="Fica no histórico, junto com autor e data.">
                <input id="motivo" name="motivo" type="text" maxLength={LIMITE.motivo} required defaultValue={valor("motivo", "")} placeholder="Ajuste na cláusula de cancelamento" className={cn(ENTRADA, estado.erros.motivo && ENTRADA_ERRO)} />
              </Campo>
            ) : null}

            {estado.erros.geral ? (
              <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-negativo">
                <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
                {estado.erros.geral}
              </p>
            ) : null}
          </CardCorpo>

          <CardRodape className="flex flex-wrap items-center gap-3">
            <BotaoDeAcao tom="primario" tamanho="md" icone={<Save aria-hidden="true" strokeWidth={1.75} />} rotuloPendente={edicao ? "Salvando nova versão…" : "Criando modelo…"}>
              {edicao ? "Salvar nova versão" : "Criar modelo"}
            </BotaoDeAcao>
            <span className="text-xs leading-5 text-outline">Alterar o modelo nunca altera documento já emitido.</span>
          </CardRodape>
        </Card>
      </form>

      {edicao && modelo.versoes.length > 0 ? (
        <Card as="div">
          <CardCabecalho titulo="Histórico de versões" descricao={`${modelo.versoes.length} ${modelo.versoes.length === 1 ? "versão" : "versões"}`} />
          <CardCorpo className="space-y-2">
            {modelo.versoes.map((versao, indice) => (
              <details key={versao.id} className="group overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface open:border-primary-fixed open:bg-selecao">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-container-low">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                      Versão {versao.numero}
                      {indice === 0 ? <span className="rounded-full border border-primary-fixed bg-primary-fixed px-2 py-0.5 text-[0.62rem] font-semibold text-primary">mais recente</span> : null}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-outline">{versao.motivo} · {formatarData(versao.criadoEm)} às {formatarHora(versao.criadoEm)}{versao.criadoPor ? ` · ${versao.criadoPor}` : ""}</span>
                  </span>
                  <span className="text-xs font-semibold text-primary group-open:hidden">Abrir</span>
                  <span className="hidden text-xs font-semibold text-primary group-open:inline">Fechar</span>
                </summary>
                <div className="border-t border-card-border p-3 sm:p-4">
                  <div className="rolagem-discreta rolagem-esmaecida max-h-96 overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-4">
                    <p className="whitespace-pre-wrap text-sm leading-7 text-on-surface">{versao.corpo}</p>
                  </div>
                </div>
              </details>
            ))}
          </CardCorpo>
        </Card>
      ) : null}
    </div>
  );
}
