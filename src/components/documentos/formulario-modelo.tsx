"use client";

import { CircleAlert, FileCheck2, History, Save, ShieldCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
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

function Nota({ icone: Icone, titulo, children }: { icone: typeof ShieldCheck; titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2 text-primary">
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
        <p className="text-xs font-semibold">{titulo}</p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-outline">{children}</p>
    </div>
  );
}

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

          <CardCorpo className="flex flex-col gap-6 py-6 sm:py-7">
            {edicao ? (
              <div className="rounded-[var(--radius-painel)] border border-informativo-borda bg-informativo-fundo px-4 py-3">
                <p className="rotulo text-informativo-texto">Tipo preservado</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{ROTULO_TIPO[modelo.tipo]}</p>
                <p className="mt-1 text-xs leading-5 text-outline">O tipo não muda porque decide quem pode emitir. Para outra natureza, crie um modelo novo.</p>
              </div>
            ) : null}

            <GrupoDeCampos titulo="Identidade do modelo" descricao="Nome e descrição ajudam a equipe a escolher o texto certo na hora da emissão.">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {!edicao ? (
                  <Campo id="tipo" rotulo="Tipo" obrigatorio erro={estado.erros.tipo}>
                    <select id="tipo" name="tipo" value={tipo} onChange={(evento) => setTipo(evento.target.value as TipoDocumento)} required className={cn(ENTRADA, estado.erros.tipo && ENTRADA_ERRO)}>
                      {TIPOS_EM_USO.map((valorTipo) => <option key={valorTipo} value={valorTipo}>{ROTULO_TIPO[valorTipo]}</option>)}
                    </select>
                  </Campo>
                ) : null}

                <Campo id="nome" rotulo="Nome" obrigatorio erro={estado.erros.nome} className={edicao ? "lg:col-span-2" : undefined}>
                  <input id="nome" name="nome" type="text" maxLength={LIMITE.nome} required defaultValue={valor("nome", modelo?.nome ?? "")} placeholder="Contrato de prestação de serviços estéticos" className={cn(ENTRADA, estado.erros.nome && ENTRADA_ERRO)} />
                </Campo>

                <Campo id="descricao" rotulo="Descrição" erro={estado.erros.descricao} dica="Para quem vai escolher o modelo na hora de emitir." className="lg:col-span-2">
                  <input id="descricao" name="descricao" type="text" maxLength={LIMITE.descricao} defaultValue={valor("descricao", modelo?.descricao ?? "")} className={ENTRADA} />
                </Campo>
              </div>
            </GrupoDeCampos>

            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
              <div className="flex min-w-0 flex-col gap-6">
                <GrupoDeCampos titulo="Texto congelado na emissão" descricao="Escreva exatamente como a paciente deve ler. Parágrafos e quebras de linha são preservados.">
                  <Campo id="corpo" rotulo="Texto do documento" obrigatorio erro={estado.erros.corpo}>
                    <textarea id="corpo" name="corpo" required maxLength={LIMITE.corpo} rows={18} defaultValue={valor("corpo", modelo?.versaoAtual?.corpo ?? "")} className={cn(AREA_TEXTO, "documento-folha min-h-[31rem] font-mono text-[0.8125rem] leading-6", estado.erros.corpo && "border-error")} />
                  </Campo>
                </GrupoDeCampos>

                <GrupoDeCampos titulo="Campos estruturados" descricao={tipo === "anamnese" ? "Anamnese exige perguntas estruturadas; elas também são congeladas junto da versão." : "Adicione campos quando este tipo de documento precisar coletar respostas estruturadas."}>
                  <EditorDeCampos key={modelo?.id ?? tipo} iniciais={modelo?.versaoAtual?.campos ?? []} obrigatorio={tipo === "anamnese"} />
                </GrupoDeCampos>

                {edicao ? (
                  <GrupoDeCampos titulo="Motivo da versão" descricao="O histórico precisa explicar por que este texto substitui a versão anterior para emissões futuras.">
                    <Campo id="motivo" rotulo="Motivo" obrigatorio erro={estado.erros.motivo} dica="Fica no histórico, junto com autor e data.">
                      <input id="motivo" name="motivo" type="text" maxLength={LIMITE.motivo} required defaultValue={valor("motivo", "")} placeholder="Ajuste na cláusula de cancelamento" className={cn(ENTRADA, estado.erros.motivo && ENTRADA_ERRO)} />
                    </Campo>
                  </GrupoDeCampos>
                ) : null}
              </div>

              <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                    <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                  </span>
                  <div>
                    <p className="rotulo text-primary">Regra central</p>
                    <h3 className="mt-1 text-base font-semibold text-on-surface">Modelo muda. Emitido não.</h3>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <Nota icone={FileCheck2} titulo="Cópia congelada">Cada emissão grava a versão do texto usada naquele instante.</Nota>
                  <Nota icone={History} titulo="Histórico de versões">Ao editar, a versão anterior continua disponível para auditoria.</Nota>
                  <Nota icone={ShieldCheck} titulo="Sem reescrita retroativa">Alterar este formulário nunca modifica documento que já foi emitido.</Nota>
                </div>

                <div className="mt-4 rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <p className="text-xs font-semibold text-primary">Tipo atual</p>
                  <p className="mt-1 text-sm font-semibold text-on-surface">{ROTULO_TIPO[tipo]}</p>
                </div>
              </aside>
            </div>

            {estado.erros.geral ? (
              <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-negativo">
                <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
                {estado.erros.geral}
              </p>
            ) : null}
          </CardCorpo>

          <CardRodape className="sticky bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-20 flex flex-wrap items-center gap-3 border-t border-card-border bg-surface/95 backdrop-blur-md lg:bottom-3">
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
              <details key={versao.id} className="group premium-interactive overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface open:border-primary-fixed open:bg-selecao">
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
                  <div className="documento-folha rolagem-discreta rolagem-esmaecida max-h-96 overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 py-4">
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
