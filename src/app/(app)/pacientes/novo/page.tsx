import { UserRoundPlus } from "lucide-react";
import type { Metadata } from "next";
import { FormularioPaciente } from "@/components/pacientes/formulario-paciente";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { cadastrarPaciente } from "@/server/acoes/pacientes";

export const metadata: Metadata = {
  title: "Nova paciente",
  description: "Cadastro de uma nova paciente da clínica.",
};

export default function PaginaNovaPaciente() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/pacientes">Voltar para pacientes</LinkDeVoltar>

      <CabecalhoDePagina
        icone={UserRoundPlus}
        rotulo="Pacientes"
        titulo="Cadastrar nova paciente"
        descricao="Comece pelo essencial e complete os demais dados conforme a relação com a clínica evoluir."
        meta={
          <>
            <SeloHero tom="informativo">Só o nome é obrigatório</SeloHero>
            <SeloHero>Cadastro editável depois</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Dados da paciente"
          descricao="Contato, nascimento e origem podem ser preenchidos agora ou atualizados posteriormente na ficha."
        />
        <CardCorpo className="py-7 sm:py-8">
          <FormularioPaciente
            acao={cadastrarPaciente}
            cancelarPara="/pacientes"
            rotuloSalvar="Cadastrar paciente"
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
