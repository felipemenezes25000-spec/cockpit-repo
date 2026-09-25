import { ContactRound, MapPin, ShieldCheck, UserRoundPlus } from "lucide-react";
import type { Metadata } from "next";
import { FormularioPaciente } from "@/components/pacientes/formulario-paciente";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { cadastrarPaciente } from "@/server/acoes/pacientes";

export const metadata: Metadata = {
  title: "Nova paciente",
  description: "Cadastro de uma nova paciente da clínica.",
};

function Nota({ icone: Icone, titulo, texto }: { icone: typeof ShieldCheck; titulo: string; texto: string }) {
  return (
    <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
      <div className="flex items-center gap-2 text-primary">
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
        <p className="text-xs font-semibold">{titulo}</p>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-outline">{texto}</p>
    </div>
  );
}

export default function PaginaNovaPaciente() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
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
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioPaciente
                acao={cadastrarPaciente}
                cancelarPara="/pacientes"
                rotuloSalvar="Cadastrar paciente"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Cadastro limpo</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">Comece sem excesso de atrito</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <Nota icone={ContactRound} titulo="Identidade primeiro" texto="O nome cria a ficha. CPF, nascimento e demais dados podem ser completados conforme necessário." />
                <Nota icone={MapPin} titulo="Contato e endereço" texto="Preencha o que já estiver disponível sem bloquear o cadastro por informação que ainda não chegou." />
                <Nota icone={ShieldCheck} titulo="Clínico fica no prontuário" texto="Observações administrativas servem à operação. Queixas, avaliações e condutas pertencem ao prontuário clínico." />
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
