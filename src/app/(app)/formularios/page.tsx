import { FilePlus2, FileSignature, LayoutList } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FiltrosDocumentos } from "@/components/documentos/filtros-documentos";
import { ListaDocumentos } from "@/components/documentos/lista-documentos";
import { Paginacao } from "@/components/ui/paginacao";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { estaAlemDoFim, PaginaAlemDoFim } from "@/components/ui/pagina-alem-do-fim";
import type { SituacaoDocumento, TipoDocumento } from "@/lib/documento";
import {
  EstruturaDocumentoPendenteError,
  listarDocumentos,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Documentos e Contratos",
  description: "Contratos, termos e orientações emitidos para as pacientes.",
};

const SITUACOES = ["emitido", "assinado", "cancelado", "substituido"] as const;
const TIPOS = ["contrato", "termo", "orientacao", "anamnese"] as const;

function lerTexto(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 80);
}

export default async function PaginaDocumentos({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const busca = lerTexto(parametros.busca);
  const pagina = Math.max(1, Number(lerTexto(parametros.pagina)) || 1);
  const situacaoBruta = lerTexto(parametros.situacao);
  const tipoBruto = lerTexto(parametros.tipo);
  const situacao = (SITUACOES as readonly string[]).includes(situacaoBruta)
    ? (situacaoBruta as SituacaoDocumento)
    : "";
  const tipo = (TIPOS as readonly string[]).includes(tipoBruto)
    ? (tipoBruto as TipoDocumento)
    : "";

  const resultado = await listarDocumentos({
    busca,
    situacao: situacao || "todas",
    tipo: tipo || "todos",
    pagina,
  }).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return null;
    throw erro;
  });

  if (!resultado) return <EstruturaPendenteDocumento />;

  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;
  if (situacao) preservar.situacao = situacao;
  if (tipo) preservar.tipo = tipo;

  return (
    <div className="page-reveal flex flex-col gap-5 sm:gap-6">
      <CabecalhoDePagina
        icone={FileSignature}
        rotulo="Workspace documental"
        titulo="Documentos e contratos"
        descricao="Emita, acompanhe e recupere termos, contratos, orientações e anamneses preservando a via entregue e o histórico de assinatura."
        acoes={
          <>
            <BotaoLink href="/formularios/modelos" variante="contorno" tamanho="sm">
              <LayoutList aria-hidden="true" size={16} strokeWidth={1.75} />
              Modelos
            </BotaoLink>
            <BotaoLink href="/formularios/novo" variante="primaria" tamanho="sm">
              <FilePlus2 aria-hidden="true" size={16} strokeWidth={1.75} />
              Emitir documento
            </BotaoLink>
          </>
        }
        meta={
          <>
            <SeloHero tom="informativo">{resultado.total} {resultado.total === 1 ? "documento" : "documentos"}</SeloHero>
            {(busca || situacao || tipo) ? <SeloHero>Filtros ativos</SeloHero> : <SeloHero>Todos os registros</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCorpo className="flex flex-col gap-6 sm:gap-7">
          <FiltrosDocumentos busca={busca} situacao={situacao} tipo={tipo} total={resultado.total} />
          {estaAlemDoFim(resultado) ? (
            <PaginaAlemDoFim
              icone={FileSignature}
              total={resultado.total}
              paginas={resultado.paginas}
              singular="documento"
              plural="documentos"
              caminho="/formularios"
              parametros={preservar}
            />
          ) : (
            <>
              <ListaDocumentos documentos={resultado.itens} filtrado={Boolean(busca || situacao || tipo)} />
              <Paginacao
                pagina={resultado.pagina}
                paginas={resultado.paginas}
                parametros={preservar}
                caminho="/formularios"
                rotulo="Paginação dos documentos"
              />
            </>
          )}
        </CardCorpo>
      </Card>
    </div>
  );
}
