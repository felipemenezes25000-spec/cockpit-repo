import {
  BadgeCheck,
  CalendarDays,
  Download,
  ExternalLink,
  Fingerprint,
  FileSignature,
  QrCode,
  Replace,
  ShieldCheck,
  Stamp,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { CardCorpo, CardRodape } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { aparelhoLegivel, rotuloDoFator } from "@/lib/assinatura/evidencia";
import { formatarData, formatarHora } from "@/lib/format";
import { carimbarAgora } from "@/server/acoes/assinatura-link";
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
import { RubricaDesenhada } from "./rubrica-desenhada";

/** "2 min 14 s", "45 s", "1 h 3 min" — o tempo com o documento aberto. */
export function duracaoDeLeitura(segundos: number): string {
  if (segundos < 60) return `${segundos} s`;
  if (segundos < 3600) {
    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;
    return resto > 0 ? `${minutos} min ${resto} s` : `${minutos} min`;
  }
  const horas = Math.floor(segundos / 3600);
  const minutos = Math.floor((segundos % 3600) / 60);
  return minutos > 0 ? `${horas} h ${minutos} min` : `${horas} h`;
}

function Metadado({
  icone: Icone,
  rotulo,
  children,
}: {
  icone: typeof CalendarDays;
  rotulo: string;
  children: React.ReactNode;
}) {
  // `dt` e `dd` filhos diretos da `div` do grupo: um invólucro a mais entre
  // eles quebra a lista de definição para o leitor de tela (axe: dlitem).
  return (
    <div className="documento-evidencia relative min-w-0 rounded-[var(--radius-controle)] border border-card-border bg-surface py-3 pr-3 pl-14">
      <dt className="rotulo text-[0.65rem] text-outline">
        <span aria-hidden="true" className="absolute top-3 left-3 flex size-8 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
          <Icone size={15} strokeWidth={1.75} />
        </span>
        {rotulo}
      </dt>
      <dd className="mt-1 text-sm leading-5 break-words text-on-surface">{children}</dd>
    </div>
  );
}

function Evidencia({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="documento-evidencia grid gap-1 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <span className="rotulo text-[0.65rem] text-outline">{rotulo}</span>
      <span className="text-sm leading-5 break-words text-on-surface">{valor}</span>
    </div>
  );
}

export function DetalheDocumento({
  documento,
  links,
  emailDisponivel = false,
}: {
  documento: DocumentoCompleto;
  links: LinkDeAssinatura[];
  emailDisponivel?: boolean;
}) {
  const assinatura = documento.assinatura;
  const anamnese = !seAssina(documento.tipo);
  const preenchimento = situacaoDaAnamnese(documento.campos);
  const aceitaResposta = documento.situacao === "emitido";

  return (
    <div className="page-reveal mx-auto flex w-full max-w-[1680px] flex-col gap-6">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
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

              <article className="documento-folha relative mx-auto max-w-4xl rounded-[var(--radius-painel)] border border-card-border px-5 py-7 sm:px-9 sm:py-10">
                <span aria-hidden="true" className="absolute inset-x-10 top-0 h-px bg-primary-fixed" />
                <div className="mb-7 flex items-center justify-between gap-4 border-b border-card-border pb-4">
                  <div>
                    <p className="rotulo text-primary">Via preservada</p>
                    <p className="mt-1 text-xs text-outline">Texto congelado no momento da emissão</p>
                  </div>
                  <FileSignature aria-hidden="true" size={22} strokeWidth={1.5} className="text-primary" />
                </div>
                <p className="whitespace-pre-wrap text-[0.95rem] leading-8 text-on-surface">
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
                descricao="Link pessoal com validade, data de nascimento e, quando houver e-mail, código de confirmação."
            >
              <PainelLink
                documentoId={documento.id}
                links={links}
                tipo={documento.tipo}
                pacienteNome={documento.paciente}
                pacienteTelefone={documento.pacienteTelefone}
                pacienteEmail={documento.pacienteEmail}
                emailDisponivel={emailDisponivel}
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
                descricao="A força da assinatura eletrônica vem do conjunto: quem, quando, onde, como foi conferido — e a prova de que nada mudou depois."
            >
              <CardCorpo className="flex flex-col gap-5">
                <div className="grid gap-2.5 sm:grid-cols-3">
                  <div className={`documento-evidencia flex min-w-0 items-start gap-2.5 rounded-[var(--radius-controle)] border px-3 py-3 ${assinatura.carimboEm ? "border-positivo-borda bg-positivo-fundo" : "border-atencao-borda bg-atencao-fundo"}`}>
                    <Stamp aria-hidden="true" size={17} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${assinatura.carimboEm ? "text-positivo" : "text-atencao"}`} />
                    <div className="min-w-0">
                      <p className="rotulo text-[0.62rem] text-outline">Carimbo de tempo</p>
                      {assinatura.carimboEm ? (
                        <p className="mt-0.5 text-sm font-semibold text-positivo">
                          {formatarData(assinatura.carimboEm)} às {formatarHora(assinatura.carimboEm)}
                          <span className="block text-xs font-normal text-on-surface-variant">{assinatura.carimboAutoridade} · RFC 3161</span>
                        </p>
                      ) : (
                        <div className="mt-1">
                          <p className="text-xs leading-5 text-atencao">Ainda não emitido.</p>
                          <FormularioDeAcao acao={carimbarAgora} campos={{ documento_id: documento.id }}>
                            <BotaoDeAcao tamanho="xs" icone={<Stamp size={13} strokeWidth={1.8} />} rotuloPendente="Carimbando…">
                              Carimbar agora
                            </BotaoDeAcao>
                          </FormularioDeAcao>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="documento-evidencia flex min-w-0 items-start gap-2.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
                    <QrCode aria-hidden="true" size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="rotulo text-[0.62rem] text-outline">Código de verificação</p>
                      {assinatura.codigoVerificacao ? (
                        <a
                          href={`/verificar/${assinatura.codigoVerificacao}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 font-mono text-sm font-bold tracking-[0.05em] text-primary hover:underline"
                        >
                          {assinatura.codigoVerificacao}
                          <ExternalLink aria-hidden="true" size={12} strokeWidth={1.9} />
                        </a>
                      ) : (
                        <p className="mt-0.5 text-sm text-outline">não gerado</p>
                      )}
                    </div>
                  </div>

                  <div className="documento-evidencia flex min-w-0 items-start gap-2.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
                    <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="rotulo text-[0.62rem] text-outline">Integridade</p>
                      <p className={`mt-0.5 text-sm font-semibold ${assinatura.hashAssinado === documento.hash ? "text-positivo" : "text-negativo"}`}>
                        {assinatura.hashAssinado === documento.hash ? "Texto idêntico ao assinado" : "Divergência no texto"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                  <div className="grid content-start gap-2.5">
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
                    {assinatura.leituraSegundos !== null ? (
                      <Evidencia
                        rotulo="Leitura"
                        valor={`Documento aberto por ${duracaoDeLeitura(assinatura.leituraSegundos)} antes de assinar${assinatura.leituraCompleta === true ? " · rolou o texto até o fim" : assinatura.leituraCompleta === false ? " · não rolou o texto até o fim" : ""}`}
                      />
                    ) : null}
                    {assinatura.localizacao ? (
                      <Evidencia rotulo="Local aproximado" valor={`${assinatura.localizacao} (pela rede)`} />
                    ) : null}
                    <Evidencia rotulo="Endereço de rede" valor={assinatura.ip ?? "não informado"} />
                    <Evidencia
                      rotulo="Aparelho"
                      valor={
                        assinatura.dispositivo
                          ? `${aparelhoLegivel(assinatura.dispositivo) ?? "Navegador"} — ${assinatura.dispositivo}`
                          : "não informado"
                      }
                    />
                    <Evidencia rotulo="Texto assinado (SHA-256)" valor={hashCurto(assinatura.hashAssinado)} />
                    {assinatura.manifestoHash ? (
                      <Evidencia rotulo="Registro (SHA-256)" valor={hashCurto(assinatura.manifestoHash)} />
                    ) : null}
                    <Evidencia
                      rotulo="Provedor"
                      valor={
                        assinatura.provedor === "interno"
                          ? "Interno (Lei 14.063/2020, assinatura eletrônica simples)"
                          : assinatura.provedor
                      }
                    />
                  </div>

                  <div className="flex min-w-0 flex-col gap-3">
                    <figure className="documento-evidencia rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 pt-3 pb-3">
                      {assinatura.rubrica ? (
                        <RubricaDesenhada caminho={assinatura.rubrica} className="h-24 w-full text-[#0b2a4a]" />
                      ) : (
                        <p className="flex h-24 items-center justify-center text-center font-serif text-lg italic text-[#0b2a4a]">{assinatura.nome}</p>
                      )}
                      <figcaption className="mt-1 border-t border-outline-variant pt-1.5 text-center text-[0.68rem] leading-4 text-outline">
                        {assinatura.rubrica ? "Rubrica feita na assinatura" : assinatura.rubricaDispensada ? "Assinou pelo nome (rubrica dispensada)" : "Assinatura anterior à rubrica"}
                      </figcaption>
                    </figure>

                    {assinatura.fatores.length > 0 ? (
                      <div className="documento-evidencia rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3">
                        <p className="rotulo text-[0.62rem] text-outline">Conferido</p>
                        <ul className="mt-2 flex flex-wrap gap-1.5">
                          {assinatura.fatores.map((fator) => (
                            <li key={fator} className="inline-flex items-center gap-1 rounded-full border border-positivo-borda bg-positivo-fundo px-2 py-0.5 text-[0.7rem] font-medium text-positivo">
                              <BadgeCheck aria-hidden="true" size={12} strokeWidth={1.9} />
                              {rotuloDoFator(fator)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                {assinatura.manifesto ? (
                  <details className="documento-evidencia group rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-primary marker:hidden">
                      <span className="inline-flex items-center gap-1.5">
                        <Fingerprint aria-hidden="true" size={14} strokeWidth={1.8} />
                        Manifesto e arquivos de prova
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-outline">
                      O manifesto reúne tudo o que a assinatura registrou. O SHA-256 dele é o que recebeu o carimbo de tempo: recalcule e compare para provar que nada mudou.
                    </p>
                    <pre className="mt-2 max-h-72 overflow-auto rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2.5 font-mono text-[0.7rem] leading-5 whitespace-pre-wrap break-all text-on-surface-variant">{assinatura.manifesto}</pre>
                    {assinatura.manifestoHash ? (
                      <p className="mt-2 break-all font-mono text-[0.7rem] text-outline">SHA-256 {assinatura.manifestoHash}</p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={`/formularios/${documento.id}/prova/manifesto`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-surface px-3 text-xs font-semibold text-primary hover:bg-selecao"
                      >
                        <Download aria-hidden="true" size={13} strokeWidth={1.9} />
                        Manifesto (.txt)
                      </a>
                      {assinatura.carimboEm ? (
                        <a
                          href={`/formularios/${documento.id}/prova/carimbo`}
                          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-surface px-3 text-xs font-semibold text-primary hover:bg-selecao"
                        >
                          <Download aria-hidden="true" size={13} strokeWidth={1.9} />
                          Carimbo de tempo (.tsr)
                        </a>
                      ) : null}
                    </div>
                  </details>
                ) : null}

                {assinatura.hashAssinado !== documento.hash ? (
                  <p role="alert" className="rounded-[var(--radius-controle)] border border-error bg-error-container px-3.5 py-2.5 text-sm text-on-error-container">
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
                className="premium-interactive mt-4 inline-flex min-h-9 items-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3 text-sm font-semibold text-primary hover:bg-primary-fixed"
              >
                Abrir ficha da paciente
              </Link>

              {documento.documentoAnteriorId ? (
                <Link
                  href={`/formularios/${documento.documentoAnteriorId}`}
                  className="documento-evidencia mt-2 flex items-start gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3 text-sm text-on-surface-variant hover:text-primary"
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
