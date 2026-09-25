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
import { CardCorpo, CardRodape } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
import { LinkDaVia } from "./link-da-via";

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
    <div className="flex items-start gap-3 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
        <Icone aria-hidden="true" size={15} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <dt className="rotulo text-[0.65rem] text-outline">{rotulo}</dt>
        <dd className="mt-1 text-sm leading-5 break-words text-on-surface">{children}</dd>
      </div>
    </div>
  );
}

function Evidencia({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="grid gap-1 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <span className="rotulo text-[0.65rem] text-outline">{rotulo}</span>
      <span className="text-sm leading-5 break-words text-on-surface">{valor}</span>
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
  const aceitaResposta = documento.situacao === "emitido";

  return (
    <div className="flex flex-col gap-6">
      <LinkDeVoltar href="/formularios">Voltar para documentos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FileSignature}
        rotulo="Documento emitido"
        titulo={documento.titulo}
        descricao={
          <>
            Registro de <span className="font-medium text-on-surface">{documento.paciente}</span> com texto congelado, trilha de emissão e evidências preservadas.
          </>
        }
        acoes={
          documento.situacao !== "substituido" ? (
            <BotaoLink
              href={`/formularios/novo?paciente=${documento.pacienteId}&corrige=${documento.id}`}
              variante="contorno"
              tamanho="sm"
            >
              <Replace aria-hidden="true" size={16} strokeWidth={1.75} />
              Emitir correção
            </BotaoLink>
          ) : undefined
        }
        meta={
          <>
            <MarcaTipo tipo={documento.tipo} />
            <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
            <SeloHero>{formatarData(documento.emitidoEm)}</SeloHero>
            {assinatura ? <SeloHero tom="positivo">Assinatura registrada</SeloHero> : null}
            {documento.exemplo ? <SeloHero tom="atencao">Dado demonstrativo</SeloHero> : null}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="flex flex-col gap-6">
          <CardRecolhivel id="doc-conteudo"
              titulo={anamnese ? "Conteúdo congelado" : "Texto assinado ou a assinar"}
              descricao="Esta é a cópia preservada do conteúdo emitido. Alterações posteriores no modelo não reescrevem este registro."
          >
            <CardCorpo>
              {documento.situacao === "cancelado" ? (
                <p className="mb-5 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo">
                  <strong className="font-semibold">Documento cancelado.</strong> {documento.motivoCancelamento}
                </p>
              ) : null}

              <article className="relative mx-auto max-w-4xl rounded-[var(--radius-painel)] border border-card-border bg-surface px-5 py-6 sm:px-8 sm:py-8">
                <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-primary-fixed" />
                <p className="whitespace-pre-wrap text-[0.94rem] leading-7 text-on-surface">
                  {documento.corpo}
                </p>
              </article>
            </CardCorpo>

            <CardRodape className="flex items-start gap-2 text-outline">
              <Fingerprint aria-hidden="true" size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>
                Impressão digital do texto (SHA-256):{" "}
                <code className="tabular break-all text-on-surface-variant">{documento.hash}</code>
              </span>
            </CardRodape>
          </CardRecolhivel>

          {anamnese ? (
            <CardRecolhivel id="doc-respostas"
                titulo={aceitaResposta ? "Preencher na consulta" : "Respostas registradas"}
                descricao={`${ROTULO_ANAMNESE[preenchimento]} · ${
                  aceitaResposta
                    ? "as respostas podem ser corrigidas quando for preciso."
                    : documento.situacao === "substituido"
                      ? "substituída por uma correção, não aceita mais respostas."
                      : "cancelada, não aceita mais respostas."
                }`}
            >
              <CardCorpo>
                <FormularioAnamnese
                  campos={documento.campos}
                  destino={{ tipo: "consulta", documentoId: documento.id }}
                  somenteLeitura={!aceitaResposta}
                />
              </CardCorpo>
            </CardRecolhivel>
          ) : null}

          {documento.situacao === "emitido" ? (
            <CardRecolhivel id="doc-envio"
                titulo={anamnese ? "Enviar para a paciente preencher" : "Enviar para a paciente assinar"}
                descricao="Link com validade e proteção pela data de nascimento da paciente."
            >
              <PainelLink
                documentoId={documento.id}
                links={links}
                tipo={documento.tipo}
                pacienteNome={documento.paciente}
                pacienteTelefone={documento.pacienteTelefone}
              />
            </CardRecolhivel>
          ) : null}

          {documento.situacao === "assinado" ? (
            <LinkDaVia documentoId={documento.id} links={links} />
          ) : null}

          {documento.situacao === "emitido" && !anamnese ? (
            <CardRecolhivel id="doc-assinar-presencialmente"
                titulo="Assinar presencialmente"
                descricao="Alternativa para quando a paciente está no balcão e alguém confere o documento com foto."
            >
              <PainelAssinatura documentoId={documento.id} />
            </CardRecolhivel>
          ) : null}

          {assinatura ? (
            <CardRecolhivel id="doc-evidencias-da-assinatura"
                titulo="Evidências da assinatura"
                descricao="A força da assinatura simples vem do conjunto de circunstâncias registradas."
            >
              <CardCorpo>
                <div className="grid gap-2.5">
                  <Evidencia rotulo="Assinado por" valor={assinatura.nome} />
                  {assinatura.cpf ? <Evidencia rotulo="CPF" valor={formatarCpf(assinatura.cpf)} /> : null}
                  <Evidencia
                    rotulo="Data e hora"
                    valor={`${formatarData(assinatura.assinadoEm)} às ${formatarHora(assinatura.assinadoEm)}`}
                  />
                  <Evidencia rotulo="Identidade conferida" valor={assinatura.verificacao} />
                  <Evidencia
                    rotulo="Como assinou"
                    valor={
                      assinatura.canal === "link"
                        ? "À distância, pelo link enviado"
                        : "Presencialmente, no balcão da clínica"
                    }
                  />
                  {assinatura.canal === "balcao" ? (
                    <Evidencia rotulo="Operador no balcão" valor={assinatura.operador ?? "não registrado"} />
                  ) : null}
                  <Evidencia
                    rotulo={assinatura.canal === "link" ? "Endereço IP (informado pelo navegador)" : "Endereço IP"}
                    valor={assinatura.ip ?? "não informado"}
                  />
                  <Evidencia
                    rotulo={assinatura.canal === "link" ? "Dispositivo (informado pelo navegador)" : "Dispositivo"}
                    valor={assinatura.dispositivo ?? "não informado"}
                  />
                  <Evidencia rotulo="Texto assinado" valor={hashCurto(assinatura.hashAssinado)} />
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
                  <p role="alert" className="mt-5 rounded-[var(--radius-controle)] border border-error bg-error-container px-3.5 py-2.5 text-sm text-on-error-container">
                    O hash registrado na assinatura não corresponde ao texto atual do documento. Isso não deveria acontecer — o banco impede alteração do texto. Avise quem cuida do sistema.
                  </p>
                ) : null}
              </CardCorpo>
            </CardRecolhivel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 xl:sticky xl:top-28 xl:self-start">
          <CardRecolhivel id="doc-resumo" as="div" titulo="Resumo"
          >
            <CardCorpo>
              <dl className="grid gap-3">
                <Metadado icone={UserRound} rotulo="Paciente">{documento.paciente}</Metadado>
                <Metadado icone={CalendarDays} rotulo="Emitido">
                  {formatarData(documento.emitidoEm)} às {formatarHora(documento.emitidoEm)}
                  {documento.emitidoPor ? ` · ${documento.emitidoPor}` : ""}
                </Metadado>
                {documento.modeloNome ? (
                  <Metadado icone={FileSignature} rotulo="Modelo de origem">
                    {documento.modeloNome}{documento.modeloVersao ? ` · versão ${documento.modeloVersao}` : ""}
                  </Metadado>
                ) : null}
              </dl>

              <Link
                href={`/pacientes/${documento.pacienteId}`}
                className="mt-4 inline-flex min-h-9 items-center rounded-[var(--radius-controle)] px-3 text-sm font-medium text-primary transition-colors hover:bg-selecao"
              >
                Abrir ficha da paciente
              </Link>

              {documento.documentoAnteriorId ? (
                <Link
                  href={`/formularios/${documento.documentoAnteriorId}`}
                  className="mt-2 flex items-start gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3 text-sm text-on-surface-variant transition-colors hover:border-primary-fixed-dim hover:text-primary"
                >
                  <Replace aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
                  Este documento corrige um anterior
                </Link>
              ) : null}
            </CardCorpo>
          </CardRecolhivel>

          <CardRecolhivel id="doc-integridade-do-registro" as="div" titulo="Integridade do registro"
          >
            <CardCorpo className="flex flex-col gap-3">
              <p className="flex items-start gap-2 rounded-[var(--radius-controle)] bg-selecao px-3 py-3 text-sm leading-6 text-on-surface-variant">
                <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
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
          </CardRecolhivel>
        </aside>
      </div>
    </div>
  );
}
