import { Repeat2 } from "lucide-react";
import type { Metadata } from "next";
import { FormularioRetorno } from "@/components/relacionamento/formulario-retorno";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

export const metadata: Metadata = { title: "Novo retorno" };

export default function PaginaNovoRetorno() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/relacionamento?aba=retornos">Voltar ao relacionamento</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Repeat2}
        rotulo="Relacionamento"
        titulo="Registrar retorno"
        descricao="Guarde a data combinada e o contexto do acompanhamento para que a próxima conversa aconteça na hora certa."
        meta={
          <>
            <SeloHero tom="informativo">Data combinada pela equipe</SeloHero>
            <SeloHero>Fila de acompanhamento</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Detalhes do retorno"
          descricao="A data não é uma recomendação automática: ela registra o que foi combinado pela equipe com a paciente."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioRetorno />
        </CardCorpo>
      </Card>
    </div>
  );
}
