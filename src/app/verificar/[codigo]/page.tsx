import {
  BadgeCheck,
  CircleAlert,
  Clock3,
  FileText,
  Fingerprint,
  PenLine,
  SearchX,
  ShieldCheck,
  Stamp,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import { rotuloDoFator } from "@/lib/assinatura/evidencia";
import { cn } from "@/lib/cn";
import { ROTULO_TIPO, type TipoDocumento } from "@/lib/documento";
import { verificarAssinaturaPublica } from "@/server/consultas/documentos";
import { FormularioDeCodigo, MolduraDaVerificacao } from "../moldura";

export const metadata: Metadata = {
  title: "Verificação de assinatura",
  description: "Resultado da verificação de autenticidade de uma via assinada.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function dataHora(data: Date | null, segundos = false): string | null {
  if (!data) return null;
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(segundos ? { second: "2-digit" } : {}),
  });
}

function Linha({ icone: Icone, rotulo, children }: { icone: typeof Clock3; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1 border-t border-card-border py-3 first:border-t-0 first:pt-0 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
      <dt className="flex items-center gap-1.5 text-[0.68rem] font-semibold tracking-[0.055em] text-outline uppercase">
        <Icone aria-hidden="true" size={12} strokeWidth={1.9} className="shrink-0" />
        {rotulo}
      </dt>
      <dd className="min-w-0 break-words text-sm text-on-surface">{children}</dd>
    </div>
  );
}

const RESULTADO = {
  valido: {
    icone: ShieldCheck,
    titulo: "Assinatura autêntica",
    texto: "Este código corresponde a uma assinatura registrada pela clínica, e o documento continua válido.",
    tom: "positivo",
  },
  cancelado: {
    icone: TriangleAlert,
    titulo: "Assinatura autêntica, documento cancelado",
    texto: "A assinatura existe, mas o documento foi cancelado depois. Confirme com a clínica antes de usar esta via.",
    tom: "atencao",
  },
  substituido: {
    icone: TriangleAlert,
    titulo: "Assinatura autêntica, documento substituído",
    texto: "A assinatura existe, mas a clínica emitiu uma correção deste documento. A versão válida é a mais nova.",
    tom: "atencao",
  },
  nao_encontrado: {
    icone: SearchX,
    titulo: "Código não encontrado",
    texto: "Nenhuma assinatura corresponde a este código. Confira os 12 caracteres — o código não usa as letras I e O nem os números 0 e 1.",
    tom: "negativo",
  },
  falhou: {
    icone: CircleAlert,
    titulo: "Não foi possível verificar agora",
    texto: "A verificação não respondeu. Tente de novo em instantes.",
    tom: "negativo",
  },
} as const;

export default async function PaginaVerificacao({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpo = decodeURIComponent(codigo).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const formatado = limpo.length === 12 ? `${limpo.slice(0, 4)}-${limpo.slice(4, 8)}-${limpo.slice(8)}` : limpo;
  const resultado = await verificarAssinaturaPublica(limpo);
  const quadro = RESULTADO[resultado.situacao];
  const Icone = quadro.icone;
  const achou = resultado.situacao !== "nao_encontrado" && resultado.situacao !== "falhou";
  const tipo = resultado.tipo && resultado.tipo in ROTULO_TIPO ? ROTULO_TIPO[resultado.tipo as TipoDocumento] : resultado.tipo;

  return (
    <MolduraDaVerificacao>
      <section
        aria-live="polite"
        className={cn(
          "relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-5 py-7 shadow-[0_28px_72px_-50px_rgba(8,52,99,.58)] sm:px-9 sm:py-8",
          quadro.tom === "positivo" && "border-positivo-borda bg-[linear-gradient(150deg,#ffffff_0%,var(--color-positivo-fundo)_100%)]",
          quadro.tom === "atencao" && "border-atencao-borda bg-[linear-gradient(150deg,#ffffff_0%,var(--color-atencao-fundo)_100%)]",
          quadro.tom === "negativo" && "border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#f8fbff_100%)]",
        )}
      >
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <span
            className={cn(
              "verificacao-selo flex size-14 shrink-0 items-center justify-center rounded-full border-2 bg-surface",
              quadro.tom === "positivo" && "border-positivo text-positivo",
              quadro.tom === "atencao" && "border-atencao-acento text-atencao",
              quadro.tom === "negativo" && "border-outline-variant text-outline",
            )}
          >
            <Icone aria-hidden="true" size={26} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="rotulo text-primary">Código {formatado || "—"}</p>
            <h1 className="t-headline mt-1.5 break-words text-on-surface">{quadro.titulo}</h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-on-surface-variant">{quadro.texto}</p>
          </div>
        </div>
      </section>

      {achou ? (
        <section className="min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-card shadow-[0_26px_68px_-50px_rgba(8,52,99,.55)]">
          <div className="border-b border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-4 sm:px-8">
            <p className="rotulo text-primary">O que foi registrado</p>
            <p className="mt-1 text-xs leading-5 text-outline">Compare com o que está impresso na sua via.</p>
          </div>
          <dl className="px-5 py-5 sm:px-8 sm:py-6">
            {tipo ? <Linha icone={FileText} rotulo="Documento">{tipo}</Linha> : null}
            {resultado.iniciais ? <Linha icone={PenLine} rotulo="Assinado por">{resultado.iniciais} <span className="text-outline">(iniciais)</span></Linha> : null}
            {resultado.assinadoEm ? (
              <Linha icone={Clock3} rotulo="Assinado em">
                {dataHora(resultado.assinadoEm)} <span className="text-outline">(horário de Brasília)</span>
              </Linha>
            ) : null}
            <Linha icone={Fingerprint} rotulo="Forma">
              {resultado.canal === "link" ? "À distância, pelo link pessoal" : resultado.canal === "balcao" ? "Presencialmente, na clínica" : "Assinatura eletrônica"}
              {resultado.rubrica ? " · com rubrica" : ""}
            </Linha>
            {resultado.fatores.length > 0 ? (
              <Linha icone={BadgeCheck} rotulo="Conferido">
                <ul className="flex flex-wrap gap-1.5">
                  {resultado.fatores.map((fator) => (
                    <li key={fator} className="inline-flex items-center gap-1.5 rounded-full border border-positivo-borda bg-positivo-fundo px-2.5 py-1 text-xs font-medium text-positivo">
                      <BadgeCheck aria-hidden="true" size={13} strokeWidth={1.9} />
                      {rotuloDoFator(fator)}
                    </li>
                  ))}
                </ul>
              </Linha>
            ) : null}
            <Linha icone={Stamp} rotulo="Carimbo de tempo">
              {resultado.carimboEm ? (
                <>
                  <span className="font-medium text-positivo">{dataHora(resultado.carimboEm, true)}</span>{" "}
                  <span className="text-outline">· {resultado.carimboAutoridade} (RFC 3161)</span>
                </>
              ) : (
                <span className="text-outline">Ainda não emitido</span>
              )}
            </Linha>
            {resultado.textoHash ? (
              <Linha icone={Fingerprint} rotulo="Texto (SHA-256)">
                <code className="tabular block break-all text-xs leading-5 text-on-surface-variant">{resultado.textoHash}</code>
              </Linha>
            ) : null}
            {resultado.manifestoHash ? (
              <Linha icone={Fingerprint} rotulo="Registro (SHA-256)">
                <code className="tabular block break-all text-xs leading-5 text-on-surface-variant">{resultado.manifestoHash}</code>
              </Linha>
            ) : null}
          </dl>
          <p className="flex items-start gap-2 border-t border-card-border bg-surface-container-low px-5 py-4 text-xs leading-5 text-outline sm:px-8">
            <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <span>
              Se os primeiros caracteres da identificação do texto forem iguais aos impressos na via, o texto que você tem é o que foi assinado. O carimbo de tempo é emitido por uma autoridade independente e prova que o registro já existia naquele instante.
            </span>
          </p>
        </section>
      ) : null}

      <section className="rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface px-5 py-5 shadow-[0_20px_52px_-44px_rgba(8,41,76,.45)] sm:px-8">
        <FormularioDeCodigo compacto valor={achou ? "" : formatado} />
      </section>
    </MolduraDaVerificacao>
  );
}
