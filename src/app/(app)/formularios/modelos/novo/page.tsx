import { FilePlus2 } from "lucide-react";
import type { Metadata } from "next";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import {
  EXPLICACAO_MODELOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Novo modelo",
  description: "Cadastra o texto-base de um contrato, termo ou orientação.",
};

export default async function PaginaNovoModelo() {
  const administradora = await ehAdministradora();

  if (!administradora) {
    return <SomenteAdministradora voltarPara="/formularios/modelos" explicacao={EXPLICACAO_MODELOS} />;
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href="/formularios/modelos">Voltar para modelos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FilePlus2}
        rotulo="Documentos"
        titulo="Criar novo modelo"
        descricao="Defina o texto-base e, quando aplicável, as perguntas que serão congeladas em cada documento emitido a partir deste modelo."
        meta={
          <>
            <SeloHero tom="informativo">Base versionada</SeloHero>
            <SeloHero>Emissão congela uma cópia</SeloHero>
            <SeloHero tom="positivo">Somente administradora</SeloHero>
          </>
        }
      />

      <FormularioModelo modelo={null} />
    </div>
  );
}
