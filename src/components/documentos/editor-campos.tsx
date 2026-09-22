"use client";

import { ChevronDown, ChevronUp, ListPlus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  campoEmBranco,
  precisaDeOpcoes,
  ROTULO_TIPO_CAMPO,
  TIPOS_CAMPO,
  type CampoDoModelo,
  type TipoCampo,
} from "@/lib/documento";

/**
 * Monta as perguntas da anamnese.
 *
 * A lista vive em estado do navegador e sai num campo escondido, em JSON: uma
 * lista de objetos não tem forma em `FormData`, e inventar `campo[0][rotulo]`
 * seria reconstruir mal o que o JSON já resolve.
 *
 * A `chave` de cada pergunta nasce aqui e nunca muda. É por ela que a resposta
 * encontra a pergunta depois — reordenar o formulário não pode trocar as
 * respostas de lugar.
 */
export function EditorDeCampos({
  iniciais,
  obrigatorio,
}: {
  iniciais: CampoDoModelo[];
  /** Anamnese precisa de pelo menos uma pergunta; os outros tipos, nenhuma. */
  obrigatorio: boolean;
}) {
  const [campos, setCampos] = useState<CampoDoModelo[]>(iniciais);

  function alterar(indice: number, mudanca: Partial<CampoDoModelo>) {
    setCampos((atuais) =>
      atuais.map((campo, i) => (i === indice ? { ...campo, ...mudanca } : campo)),
    );
  }

  function mover(indice: number, direcao: -1 | 1) {
    const destino = indice + direcao;
    if (destino < 0 || destino >= campos.length) return;

    setCampos((atuais) => {
      const copia = [...atuais];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });
  }

  function trocarTipo(indice: number, tipo: TipoCampo) {
    // Trocar para um tipo sem alternativas esvazia as que existiam: guardá-las
    // escondidas faria elas ressurgirem sozinhas na próxima troca.
    alterar(indice, {
      tipo,
      opcoes: precisaDeOpcoes(tipo) ? campos[indice].opcoes : [],
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="campos" value={JSON.stringify(campos)} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="rotulo">Perguntas do formulário</p>
          <p className="mt-1 text-xs text-outline">
            {obrigatorio
              ? "Anamnese precisa de pelo menos uma pergunta."
              : "Opcional. Contrato, termo e orientação costumam não ter perguntas."}
          </p>
        </div>
        <span className="tabular text-xs text-outline">
          {campos.length === 1 ? "1 pergunta" : `${campos.length} perguntas`}
        </span>
      </div>

      {campos.length === 0 ? (
        <p className="rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-6 text-center text-sm text-outline">
          Nenhuma pergunta ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {campos.map((campo, indice) => (
            <li
              key={campo.chave}
              className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="tabular text-xs font-medium text-outline">
                  Pergunta {indice + 1}
                </span>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label="Mover para cima"
                    className="flex size-7 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary disabled:opacity-30"
                  >
                    <ChevronUp aria-hidden="true" size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === campos.length - 1}
                    aria-label="Mover para baixo"
                    className="flex size-7 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary disabled:opacity-30"
                  >
                    <ChevronDown aria-hidden="true" size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCampos((atuais) => atuais.filter((_, i) => i !== indice))
                    }
                    aria-label={`Remover pergunta ${indice + 1}`}
                    className="flex size-7 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-negativo-fundo hover:text-negativo"
                  >
                    <Trash2 aria-hidden="true" size={15} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <input
                  type="text"
                  value={campo.rotulo}
                  maxLength={300}
                  placeholder="Você tem alergia a algum medicamento?"
                  onChange={(evento) => alterar(indice, { rotulo: evento.target.value })}
                  aria-label={`Enunciado da pergunta ${indice + 1}`}
                  className={ENTRADA}
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <select
                    value={campo.tipo}
                    onChange={(evento) =>
                      trocarTipo(indice, evento.target.value as TipoCampo)
                    }
                    aria-label={`Tipo da pergunta ${indice + 1}`}
                    className={ENTRADA}
                  >
                    {TIPOS_CAMPO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {ROTULO_TIPO_CAMPO[tipo]}
                      </option>
                    ))}
                  </select>

                  <label className="flex h-11 items-center gap-2.5 text-sm text-on-surface">
                    <input
                      type="checkbox"
                      checked={campo.obrigatorio}
                      onChange={(evento) =>
                        alterar(indice, { obrigatorio: evento.target.checked })
                      }
                      className="size-4 shrink-0 accent-[var(--color-primary-container)]"
                    />
                    Resposta obrigatória
                  </label>
                </div>

                <input
                  type="text"
                  value={campo.ajuda}
                  maxLength={300}
                  placeholder="Texto de apoio (opcional)"
                  onChange={(evento) => alterar(indice, { ajuda: evento.target.value })}
                  aria-label={`Texto de apoio da pergunta ${indice + 1}`}
                  className={cn(ENTRADA, "text-xs")}
                />

                {precisaDeOpcoes(campo.tipo) ? (
                  <div className="rounded-[var(--radius-cartao)] bg-surface-container-low p-3">
                    <p className="rotulo mb-2">Alternativas</p>

                    {campo.opcoes.length === 0 ? (
                      <p className="mb-2 text-xs text-atencao">
                        Escolha sem alternativa não é escolha. Acrescente ao menos uma.
                      </p>
                    ) : null}

                    <ul className="flex flex-col gap-2">
                      {campo.opcoes.map((opcao, iOpcao) => (
                        <li key={iOpcao} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opcao}
                            maxLength={160}
                            onChange={(evento) =>
                              alterar(indice, {
                                opcoes: campo.opcoes.map((o, i) =>
                                  i === iOpcao ? evento.target.value : o,
                                ),
                              })
                            }
                            aria-label={`Alternativa ${iOpcao + 1}`}
                            className={cn(ENTRADA, "h-9 bg-surface text-sm")}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              alterar(indice, {
                                opcoes: campo.opcoes.filter((_, i) => i !== iOpcao),
                              })
                            }
                            aria-label={`Remover alternativa ${iOpcao + 1}`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-tag)] text-outline transition-colors hover:bg-negativo-fundo hover:text-negativo"
                          >
                            <X aria-hidden="true" size={15} strokeWidth={1.75} />
                          </button>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={() =>
                        alterar(indice, { opcoes: [...campo.opcoes, ""] })
                      }
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <Plus aria-hidden="true" size={14} strokeWidth={2} />
                      Acrescentar alternativa
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setCampos((atuais) => [...atuais, campoEmBranco()])}
        className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-[var(--radius-controle)] border border-primary bg-surface px-5 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
      >
        <ListPlus aria-hidden="true" size={18} strokeWidth={1.75} />
        Acrescentar pergunta
      </button>
    </div>
  );
}
