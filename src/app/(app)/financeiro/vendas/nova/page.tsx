import { ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { FormularioVenda } from "@/components/financeiro/formulario-venda";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { formatarTelefone } from "@/lib/paciente";
import type { PacienteParaSelecao } from "@/server/acoes/agenda";
import { catalogoAgenda } from "@/server/consultas/agenda";
import { pacientePorId } from "@/server/consultas/pacientes";
import { taxasParaVenda } from "@/server/consultas/vendas";

export const metadata: Metadata = {
  title: "Nova venda",
  description: "Registrar uma venda e o recebimento dela.",
};

function lerTexto(valor: string | string[] | undefined): string {
  return (Array.isArray(valor) ? valor[0] : valor) ?? "";
}

export default async function PaginaNovaVenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const pacienteId = lerTexto(parametros.paciente);

  let pacienteInicial: PacienteParaSelecao | null = null;
  if (/^[0-9a-f-]{36}$/i.test(pacienteId)) {
    const paciente = await pacientePorId(pacienteId);
    if (paciente) {
      pacienteInicial = {
        id: paciente.id,
        nome: paciente.exibicao,
        detalhe:
          [
            paciente.telefone ? formatarTelefone(paciente.telefone) : null,
            paciente.email,
          ]
            .filter(Boolean)
            .join(" · ") || "sem contato cadastrado",
      };
    }
  }

  const [catalogo, taxas, podeAlterarTaxa] = await Promise.all([
    catalogoAgenda(),
    taxasParaVenda(),
    ehFinanceira(),
  ]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/vendas">Voltar para vendas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={ShoppingBag}
        rotulo="Financeiro"
        titulo="Registrar nova venda"
        descricao="Concentre procedimento, paciente, recebimento e taxas em um fluxo único, com leitura financeira clara antes da confirmação."
        meta={
          <>
            <SeloHero tom="informativo">Valores em centavos no banco</SeloHero>
            <SeloHero>Taxa separada do valor bruto</SeloHero>
            {pacienteInicial ? <SeloHero tom="positivo">Paciente já selecionada</SeloHero> : null}
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Dados da venda"
          descricao="No cartão, a paciente parcela e a clínica recebe um repasse só, já líquido de taxa."
        />
        <CardCorpo className="py-7 sm:py-8 [&_form>div:last-child]:sticky [&_form>div:last-child]:bottom-[calc(5.15rem+env(safe-area-inset-bottom))] [&_form>div:last-child]:z-20 [&_form>div:last-child]:-mx-1 [&_form>div:last-child]:overflow-hidden [&_form>div:last-child]:rounded-[16px] [&_form>div:last-child]:border [&_form>div:last-child]:border-card-border/85 [&_form>div:last-child]:bg-white/90 [&_form>div:last-child]:px-3 [&_form>div:last-child]:py-3 [&_form>div:last-child]:shadow-[0_16px_42px_-24px_rgba(8,41,76,0.42),inset_0_1px_0_rgba(255,255,255,0.96)] [&_form>div:last-child]:backdrop-blur-xl lg:[&_form>div:last-child]:bottom-3 sm:[&_form>div:last-child]:px-4">
          <FormularioVenda
            procedimentos={catalogo.procedimentos}
            taxas={taxas}
            pacienteInicial={pacienteInicial}
            podeAlterarTaxa={podeAlterarTaxa}
            dataPadrao={chaveDoDia(hoje())}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
