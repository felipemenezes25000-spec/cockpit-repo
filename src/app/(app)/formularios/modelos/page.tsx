import { FilePlus2, FileSignature } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { ListaModelos } from "@/components/documentos/lista-modelos";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import {
  EstruturaDocumentoPendenteError,
  listarModelos,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Modelos de documento",
  description: "Textos-base de contrato, termo e orientação.",
};

export default async function PaginaModelos() {
  const administradora = await ehAdministradora();

  // A recepção vê os modelos — precisa saber o que existe para emitir. Quem
  // escreve é só a administradora, e a RLS repete isso no banco.
  const modelos = await listarModelos({
    incluirInativos: administradora,
  }).catch((erro: unknown) => {
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

  return (
    <div>

      <Card>
        <CardCabecalho
          titulo="Modelos de documento"
          descricao="O texto-base que cada documento congela na emissão."
          acao={
            <div className="flex flex-wrap gap-2">
              <BotaoLink href="/formularios" variante="contorno" tamanho="sm">
                <FileSignature aria-hidden="true" size={16} strokeWidth={1.75} />
                Documentos
              </BotaoLink>
              {administradora ? (
                <BotaoLink
                  href="/formularios/modelos/novo"
                  variante="primaria"
                  tamanho="sm"
                >
                  <FilePlus2 aria-hidden="true" size={16} strokeWidth={1.75} />
                  Novo modelo
                </BotaoLink>
              ) : null}
            </div>
          }
        />

        <CardCorpo className="px-0 sm:px-0">
          <ListaModelos modelos={modelos} administradora={administradora} />
        </CardCorpo>

        {!administradora ? (
          <CardRodape className="text-outline">
            A recepção consulta os modelos para saber o que emitir. Quem escreve e
            aposenta é a administradora.
          </CardRodape>
        ) : null}
      </Card>
    </div>
  );
}
