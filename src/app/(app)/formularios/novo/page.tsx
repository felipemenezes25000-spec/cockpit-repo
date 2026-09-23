import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioEmissao } from "@/components/documentos/formulario-emissao";
import { uuidValido } from "@/lib/formulario";
import { pacienteParaSelecao } from "@/server/consultas/pacientes";
import {
  EstruturaDocumentoPendenteError,
  modelosParaEmissao,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Emitir documento",
  description: "Emite contrato, termo ou orientação a partir de um modelo.",
};

function lerTexto(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 36);
}

export default async function PaginaEmitirDocumento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const corrige = lerTexto(parametros.corrige);

  const modelos = await modelosParaEmissao().catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return null;
    throw erro;
  });

  if (!modelos) {
    return (
      <div>
        <EstruturaPendenteDocumento />
      </div>
    );
  }

  const paciente = await pacienteParaSelecao(lerTexto(parametros.paciente));

  return (
    <div className="mx-auto max-w-4xl">

      {/* Correção não edita o documento antigo: emite um novo apontando para
          ele, e o antigo passa a "substituído". */}
      <FormularioEmissao
        modelos={modelos}
        pacienteInicial={paciente}
        corrigeId={uuidValido(corrige) ? corrige : ""}
      />
    </div>
  );
}
