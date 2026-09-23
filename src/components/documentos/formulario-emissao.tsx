"use client";

import { CircleAlert, FileText, LoaderCircle, Replace, Snowflake } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { Campo, ENTRADA } from "@/components/ui/field";
import { ROTULO_TIPO } from "@/lib/documento";
import { emitirDocumento, type EstadoModelo } from "@/server/acoes/documentos";
import type { PacienteParaSelecao } from "@/server/acoes/agenda";
import type { ModeloParaEmissao } from "@/server/consultas/documentos";

const INICIAL: EstadoModelo = { erros: {} };

function Emitir() {
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
          Emitindo…
        </>
      ) : (
        <>
          <Snowflake aria-hidden="true" size={18} strokeWidth={1.75} />
          Emitir e congelar o texto
        </>
      )}
    </button>
  );
}

export function FormularioEmissao({
  modelos,
  pacienteInicial,
  corrigeId,
}: {
  modelos: ModeloParaEmissao[];
  pacienteInicial: PacienteParaSelecao | null;
  /** Documento que este vai corrigir, quando a emissão veio de "Emitir correção". */
  corrigeId: string;
}) {
  const [estado, enviar] = useActionState(emitirDocumento, INICIAL);
  const [modeloId, setModeloId] = useState("");

  const escolhido = modelos.find((modelo) => modelo.id === modeloId) ?? null;

  if (modelos.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Nenhum modelo disponível" />
        <CardCorpo>
          <p className="text-sm text-on-surface-variant">
            Documento nasce de um modelo — não há como emitir texto avulso, porque
            é o modelo que dá o texto a congelar. A administradora precisa cadastrar
            pelo menos um modelo ativo antes.
          </p>
        </CardCorpo>
      </Card>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-6">
      {/* Precisa viver DENTRO deste form: campo solto em outro formulário não
          é enviado com a emissão. */}
      {corrigeId ? (
        <input type="hidden" name="documento_anterior_id" value={corrigeId} />
      ) : null}

      <Card>
        <CardCabecalho
          titulo="Emitir documento"
          descricao="O texto do modelo é copiado para o documento e não muda mais."
        />

        <CardCorpo className="flex flex-col gap-6">
          {corrigeId ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm text-on-surface-variant">
              <Replace aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
              Este documento vai corrigir um anterior. Ao emitir, o antigo passa a
              &quot;substituído&quot; — a menos que já esteja assinado, e aí ele
              permanece como está.
            </p>
          ) : null}

          <SeletorPaciente
            inicial={pacienteInicial}
            erro={estado.erros.geral}
          />

          <Campo
            id="modelo"
            rotulo="Modelo"
            obrigatorio
            erro={estado.erros.tipo}
            dica="Só aparecem modelos ativos e com texto."
          >
            <select
              id="modelo"
              name="modelo_id"
              value={modeloId}
              onChange={(evento) => setModeloId(evento.target.value)}
              required
              className={ENTRADA}
            >
              <option value="">Escolha o modelo</option>
              {modelos.map((modelo) => (
                <option key={modelo.id} value={modelo.id}>
                  {ROTULO_TIPO[modelo.tipo]} · {modelo.nome} (v{modelo.versao})
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            id="titulo"
            rotulo="Título do documento"
            dica="Em branco, usa o nome do modelo."
          >
            <input
              id="titulo"
              name="titulo"
              type="text"
              maxLength={160}
              defaultValue={estado.valores?.titulo ?? ""}
              placeholder={escolhido?.nome ?? "Contrato de prestação de serviços"}
              className={ENTRADA}
            />
          </Campo>

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
          <Emitir />
          <Link href="/formularios" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary">
            Cancelar
          </Link>
          <span className="text-xs text-outline">
            Depois de emitido, o texto não pode mais ser alterado.
          </span>
        </CardRodape>
      </Card>

      {escolhido ? (
        <Card as="div">
          <CardCabecalho
            titulo="Prévia do texto"
            descricao={`${escolhido.nome} · versão ${escolhido.versao}`}
          />
          <CardCorpo>
            {/* Isto é conferência para quem emite, não a fonte do documento.
                Quem lê o texto que vai congelar é a função `documento_emitir`,
                no banco — se o corpo viesse daqui, quem chamasse a API
                escolheria o que o hash iria atestar. */}
            <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-xs text-on-surface-variant">
              <FileText aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
              Confira antes de emitir. O texto gravado é lido do banco na hora da
              emissão, não daqui.
            </p>

            <div className="max-h-96 overflow-y-auto rounded-[var(--radius-cartao)] border border-card-border bg-surface px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
                {escolhido.corpo}
              </p>
            </div>
          </CardCorpo>
        </Card>
      ) : null}
    </form>
  );
}
