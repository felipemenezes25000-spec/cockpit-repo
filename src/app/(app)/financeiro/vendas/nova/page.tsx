import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioVenda } from "@/components/financeiro/formulario-venda";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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

  // Vinda da ficha: a paciente já chega escolhida.
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
    <div className="mx-auto max-w-3xl">
      <Link
        href="/financeiro/vendas"
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para as vendas
      </Link>

      <Card>
        <CardCabecalho
          titulo="Nova venda"
          descricao="No cartão, a paciente parcela e a clínica recebe um repasse só, já líquido de taxa."
        />
        <CardCorpo className="py-8">
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
