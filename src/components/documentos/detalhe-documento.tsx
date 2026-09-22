import {
  CalendarDays,
  Fingerprint,
  FileSignature,
  Replace,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { formatarData, formatarHora } from "@/lib/format";
import { formatarCpf } from "@/lib/paciente";
import { hashCurto, seAssina, situacaoDaAnamnese, ROTULO_ANAMNESE } from "@/lib/documento";
import type {
  DocumentoCompleto,
  LinkDeAssinatura,
} from "@/server/consultas/documentos";
import { CancelarDocumento } from "./cancelar-documento";
import { FormularioAnamnese } from "./formulario-anamnese";
import { MarcaSituacao, MarcaTipo } from "./marca-situacao";
import { PainelAssinatura } from "./painel-assinatura";
import { PainelLink } from "./painel-link";

function Metadado({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof CalendarDays;
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icone
        aria-hidden="true"
        size={16}
        strokeWidth={1.75}
        className="mt-0.5 shrink-0 text-outline"
      />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase text-outline">{rotulo}</dt>
        <dd className="mt-0.5 text-sm break-words text-on-surface">{children}</dd>
      </div>
    </div>
  );
}

function Evidencia({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-card-border py-2.5 first:border-t-0 first:pt-0 sm:flex-row sm:gap-4">
      <span className="text-xs font-medium uppercase text-outline sm:w-44 sm:shrink-0">
        {rotulo}
      </span>
      <span className="text-sm break-words text-on-surface">{valor}</span>
    </div>
  );
}

export function DetalheDocumento({
  documento,
  links,
}: {
  documento: DocumentoCompleto;
  links: LinkDeAssinatura[];
}) {
  const assinatura = documento.assinatura;
  const anamnese = !seAssina(documento.tipo);
  const preenchimento = situacaoDaAnamnese(documento.campos);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BotaoLink href="/formularios" variante="contorno" tamanho="sm">
          <FileSignature aria-hidden="true" size={16} strokeWidth={1.75} />
          Documentos
        </BotaoLink>

        {/* Corrigir não é editar: gera documento novo apontando para este. */}
        {documento.situacao !== "substituido" ? (
          <BotaoLink
            href={`/formularios/novo?paciente=${documento.pacienteId}&corrige=${documento.id}`}
            variante="contorno"
            tamanho="sm"
          >
            <Replace aria-hidden="true" size={16} strokeWidth={1.75} />
            Emitir correção
          </BotaoLink>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardCabecalho
              titulo={documento.titulo}
              descricao={
                <span className="flex flex-wrap items-center gap-2 pt-1">
                  <MarcaTipo tipo={documento.tipo} />
                  <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
                  {documento.exemplo ? (
                    <span className="text-xs text-outline-variant">exemplo</span>
                  ) : null}
                </span>
              }
            />
            <CardCorpo>
              {documento.situacao === "cancelado" ? (
                <p className="mb-5 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant">
                  <strong className="font-medium">Cancelado.</strong>{" "}
                  {documento.motivoCancelamento}
                </p>
              ) : null}

              {/* O texto exatamente como foi congelado. `whitespace-pre-wrap`
                  não é estilo: parágrafo, recuo e linha em branco fazem parte
                  do que a paciente leu. */}
              <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-5 py-5 sm:px-7 sm:py-6">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-on-surface">
                  {documento.corpo}
                </p>
              </div>
            </CardCorpo>

            <CardRodape className="flex items-start gap-2 text-outline">
              <Fingerprint
                aria-hidden="true"
                size={14}
                strokeWidth={1.75}
                className="mt-0.5 shrink-0"
              />
              <span>
                Impressão digital do texto (SHA-256):{" "}
                <code className="tabular break-all text-on-surface-variant">
                  {documento.hash}
                </code>
              </span>
            </CardRodape>
          </Card>

          {/* Anamnese não se assina: ela se preenche, e a resposta pode ser
              corrigida depois. Conteúdo que evolui, ao contrário do contrato. */}
          {anamnese ? (
            <Card>
              <CardCabecalho
                titulo="Preencher na consulta"
                descricao={`${ROTULO_ANAMNESE[preenchimento]} · as respostas podem ser corrigidas quando for preciso.`}
              />
              <CardCorpo>
                <FormularioAnamnese
                  campos={documento.campos}
                  destino={{ tipo: "consulta", documentoId: documento.id }}
                />
              </CardCorpo>
            </Card>
          ) : null}

          {/* Dois caminhos, e a ordem na tela diz qual é o principal: o link
              é o fluxo esperado; o balcão serve quando a paciente já está na
              clínica. A prova de cada um é diferente, e cada painel diz a sua. */}
          {documento.situacao === "emitido" ? (
            <Card>
              <CardCabecalho
                titulo={
                  anamnese
                    ? "Ou enviar para a paciente preencher"
                    : "Enviar para a paciente assinar"
                }
                descricao="Link com validade, protegido pela data de nascimento dela."
              />
              <PainelLink
                documentoId={documento.id}
                links={links}
                tipo={documento.tipo}
                pacienteNome={documento.paciente}
                pacienteTelefone={documento.pacienteTelefone}
              />
            </Card>
          ) : null}

          {documento.situacao === "emitido" && !anamnese ? (
            <Card>
              <CardCabecalho
                titulo="Ou assinar aqui, no balcão"
                descricao="Quando a paciente está presente e alguém confere o documento com foto."
              />
              <PainelAssinatura documentoId={documento.id} />
            </Card>
          ) : null}

          {assinatura ? (
            <Card>
              <CardCabecalho
                titulo="Evidências da assinatura"
                descricao="O que dá força à assinatura simples é o conjunto de circunstâncias."
              />
              <CardCorpo>
                <div className="flex flex-col">
                  <Evidencia rotulo="Assinado por" valor={assinatura.nome} />
                  {assinatura.cpf ? (
                    <Evidencia rotulo="CPF" valor={formatarCpf(assinatura.cpf)} />
                  ) : null}
                  <Evidencia
                    rotulo="Data e hora"
                    valor={`${formatarData(assinatura.assinadoEm)} às ${formatarHora(
                      assinatura.assinadoEm,
                    )}`}
                  />
                  <Evidencia
                    rotulo="Identidade conferida"
                    valor={assinatura.verificacao}
                  />
                  <Evidencia
                    rotulo="Como assinou"
                    valor={
                      assinatura.canal === "link"
                        ? "À distância, pelo link enviado"
                        : "Presencialmente, no balcão da clínica"
                    }
                  />
                  {assinatura.canal === "balcao" ? (
                    <Evidencia
                      rotulo="Operador no balcão"
                      valor={assinatura.operador ?? "não registrado"}
                    />
                  ) : null}
                  <Evidencia rotulo="Endereço IP" valor={assinatura.ip ?? "não informado"} />
                  <Evidencia
                    rotulo="Dispositivo"
                    valor={assinatura.dispositivo ?? "não informado"}
                  />
                  <Evidencia
                    rotulo="Texto assinado"
                    valor={hashCurto(assinatura.hashAssinado)}
                  />
                  <Evidencia
                    rotulo="Provedor"
                    valor={
                      assinatura.provedor === "interno"
                        ? "Interno (Lei 14.063/2020, assinatura simples)"
                        : assinatura.provedor
                    }
                  />
                </div>

                {assinatura.hashAssinado !== documento.hash ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
                  >
                    O hash registrado na assinatura não corresponde ao texto atual
                    do documento. Isso não deveria acontecer — o banco impede
                    alteração do texto. Avise quem cuida do sistema.
                  </p>
                ) : null}
              </CardCorpo>
            </Card>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6">
          <Card as="div">
            <CardCabecalho titulo="Resumo" />
            <CardCorpo>
              <dl className="flex flex-col gap-4">
                <Metadado icone={UserRound} rotulo="Paciente">
                  {documento.paciente}
                </Metadado>
                <Metadado icone={CalendarDays} rotulo="Emitido">
                  {formatarData(documento.emitidoEm)} às{" "}
                  {formatarHora(documento.emitidoEm)}
                  {documento.emitidoPor ? ` · ${documento.emitidoPor}` : ""}
                </Metadado>
                {documento.modeloNome ? (
                  <Metadado icone={FileSignature} rotulo="Modelo de origem">
                    {documento.modeloNome}
                    {documento.modeloVersao ? ` · versão ${documento.modeloVersao}` : ""}
                  </Metadado>
                ) : null}
              </dl>

              <Link
                href={`/pacientes/${documento.pacienteId}`}
                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Abrir ficha da paciente
              </Link>

              {documento.documentoAnteriorId ? (
                <Link
                  href={`/formularios/${documento.documentoAnteriorId}`}
                  className="mt-2 flex items-start gap-2 border-t border-card-border pt-4 text-sm text-on-surface-variant underline-offset-4 hover:text-primary hover:underline"
                >
                  <Replace
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.75}
                    className="mt-0.5 shrink-0"
                  />
                  Este documento corrige um anterior
                </Link>
              ) : null}
            </CardCorpo>
          </Card>

          <Card as="div">
            <CardCabecalho titulo="O que não muda" />
            <CardCorpo className="flex flex-col gap-3">
              <p className="flex items-start gap-2 text-sm text-on-surface-variant">
                <ShieldCheck
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.75}
                  className="mt-0.5 shrink-0 text-primary"
                />
                {anamnese
                  ? "O enunciado e as perguntas são a cópia congelada do que foi perguntado. Corrigir o modelo depois não reescreve esta anamnese — só as respostas mudam."
                  : "O texto acima é a cópia congelada do que a paciente leu. Alterar o modelo depois não altera este documento — o banco recusa qualquer mudança no corpo."}
              </p>

              {documento.situacao === "emitido" ? (
                <div className="border-t border-card-border pt-3">
                  <CancelarDocumento documentoId={documento.id} />
                </div>
              ) : null}
            </CardCorpo>
          </Card>
        </aside>
      </div>
    </div>
  );
}
