import { FilePlus2, LayoutList } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FiltrosDocumentos } from "@/components/documentos/filtros-documentos";
import { ListaDocumentos } from "@/components/documentos/lista-documentos";
import { PaginacaoDocumentos } from "@/components/documentos/paginacao-documentos";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
const TIPOS = ["contrato", "termo", "orientacao"] as const;

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

  // Valor fora da lista vira "sem filtro": a URL é editável por qualquer um, e
  // um parâmetro inventado não deve virar erro de tela.
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

  if (!resultado) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <EstruturaPendenteDocumento />
      </div>
    );
  }

  const preservar: Record<string, string> = {};
  if (busca) preservar.busca = busca;
  if (situacao) preservar.situacao = situacao;
  if (tipo) preservar.tipo = tipo;

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />

      <Card>
        <CardCabecalho
          titulo="Documentos e Contratos"
          descricao="O que foi entregue e assinado por cada paciente."
          acao={
            <div className="flex flex-wrap gap-2">
              <BotaoLink href="/formularios/modelos" variante="contorno" tamanho="sm">
                <LayoutList aria-hidden="true" size={16} strokeWidth={1.75} />
                Modelos
              </BotaoLink>
              <BotaoLink href="/formularios/novo" variante="primaria" tamanho="sm">
                <FilePlus2 aria-hidden="true" size={16} strokeWidth={1.75} />
                Emitir documento
              </BotaoLink>
            </div>
          }
        />

        <CardCorpo className="flex flex-col gap-6">
          <FiltrosDocumentos
            busca={busca}
            situacao={situacao}
            tipo={tipo}
            total={resultado.total}
          />
          <ListaDocumentos
            documentos={resultado.itens}
            filtrado={Boolean(busca || situacao || tipo)}
          />
          <PaginacaoDocumentos
            pagina={resultado.pagina}
            paginas={resultado.paginas}
            parametros={preservar}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
