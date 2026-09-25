"use client";

import { CircleAlert, FileText, Replace, Snowflake } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { Campo, ENTRADA } from "@/components/ui/field";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { ROTULO_TIPO } from "@/lib/documento";
import { emitirDocumento, type EstadoModelo } from "@/server/acoes/documentos";
import type { PacienteParaSelecao } from "@/server/acoes/agenda";
import type { ModeloParaEmissao } from "@/server/consultas/documentos";

const INICIAL: EstadoModelo = { erros: {} };

export function FormularioEmissao({
  modelos,
  pacienteInicial,
  corrigeId,
}: {
  modelos: ModeloParaEmissao[];
  pacienteInicial: PacienteParaSelecao | null;
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
          <p className="text-sm leading-6 text-on-surface-variant">
            Documento nasce de um modelo — não há como emitir texto avulso, porque é o modelo que dá o texto a congelar. A administradora precisa cadastrar pelo menos um modelo ativo antes.
          </p>
        </CardCorpo>
      </Card>
    );
  }

  return (
    <form action={enviar} className="flex flex-col gap-6">
      {corrigeId ? <input type="hidden" name="documento_anterior_id" value={corrigeId} /> : null}

      <Card>
        <CardCabecalho titulo="Emitir documento" descricao="O texto do modelo é copiado para o documento e não muda mais." />

        <CardCorpo className="flex flex-col gap-6">
          {corrigeId ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-informativo-borda bg-informativo-fundo px-3.5 py-3 text-sm leading-6 text-on-surface-variant">
              <Replace aria-hidden="true" size={16} className="mt-1 shrink-0 text-informativo-texto" />
              Este documento vai corrigir um anterior. Ao emitir, o antigo passa a &quot;substituído&quot; — a menos que já esteja assinado, e aí ele permanece como está.
            </p>
          ) : null}

          <SeletorPaciente inicial={pacienteInicial} erro={estado.erros.geral} />

          <Campo id="modelo" rotulo="Modelo" obrigatorio erro={estado.erros.tipo} dica="Só aparecem modelos ativos e com texto.">
            <select id="modelo" name="modelo_id" value={modeloId} onChange={(evento) => setModeloId(evento.target.value)} required className={ENTRADA}>
              <option value="">Escolha o modelo</option>
              {modelos.map((modelo) => <option key={modelo.id} value={modelo.id}>{ROTULO_TIPO[modelo.tipo]} · {modelo.nome} (v{modelo.versao})</option>)}
            </select>
          </Campo>

          <Campo id="titulo" rotulo="Título do documento" dica="Em branco, usa o nome do modelo.">
            <input id="titulo" name="titulo" type="text" maxLength={160} defaultValue={estado.valores?.titulo ?? ""} placeholder={escolhido?.nome ?? "Contrato de prestação de serviços"} className={ENTRADA} />
          </Campo>

          {estado.erros.geral ? (
            <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-negativo">
              <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
              {estado.erros.geral}
            </p>
          ) : null}
        </CardCorpo>

        <CardRodape className="flex flex-wrap items-center gap-3">
          <BotaoDeAcao tom="primario" tamanho="md" icone={<Snowflake aria-hidden="true" strokeWidth={1.75} />} rotuloPendente="Emitindo e congelando…">
            Emitir e congelar o texto
          </BotaoDeAcao>
          <Link href="/formularios" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
            Cancelar
          </Link>
          <span className="text-xs leading-5 text-outline">Depois de emitido, o texto não pode mais ser alterado.</span>
        </CardRodape>
      </Card>

      {escolhido ? (
        <Card as="div">
          <CardCabecalho titulo="Prévia do texto" descricao={`${escolhido.nome} · versão ${escolhido.versao}`} />
          <CardCorpo>
            <p className="mb-4 flex items-start gap-2 rounded-[var(--radius-cartao)] border border-informativo-borda bg-informativo-fundo px-3.5 py-3 text-xs leading-5 text-on-surface-variant">
              <FileText aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-informativo-texto" />
              Confira antes de emitir. O texto gravado é lido do banco na hora da emissão, não daqui.
            </p>
            <div className="rolagem-discreta rolagem-esmaecida max-h-96 overflow-y-auto rounded-[var(--radius-painel)] border border-card-border bg-surface px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-7 text-on-surface">{escolhido.corpo}</p>
            </div>
          </CardCorpo>
        </Card>
      ) : null}
    </form>
  );
}
