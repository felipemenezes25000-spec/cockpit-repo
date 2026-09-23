import { FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioEmissao } from "@/components/documentos/formulario-emissao";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
  const emCorrecao = uuidValido(corrige);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href="/formularios">Voltar para documentos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FilePlus2}
        rotulo="Documentos"
        titulo={emCorrecao ? "Emitir correção" : "Emitir documento"}
        descricao="Escolha paciente e modelo em um fluxo que deixa claro o que será congelado como registro definitivo."
        meta={
          <>
            <SeloHero tom="informativo">Texto congelado na emissão</SeloHero>
            <SeloHero>{modelos.length} {modelos.length === 1 ? "modelo disponível" : "modelos disponíveis"}</SeloHero>
            {paciente ? <SeloHero tom="positivo">Paciente já selecionada</SeloHero> : null}
            {emCorrecao ? <SeloHero tom="atencao">Corrige documento anterior</SeloHero> : null}
          </>
        }
      />

      <FormularioEmissao
        modelos={modelos}
        pacienteInicial={paciente}
        corrigeId={emCorrecao ? corrige : ""}
      />
    </div>
  );
}
