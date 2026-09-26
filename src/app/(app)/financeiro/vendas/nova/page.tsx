import { BadgePercent, CheckCircle2, ReceiptText, ShoppingBag, Wallet } from "lucide-react";
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

function Passo({ icone: Icone, titulo, texto }: { icone: typeof ShoppingBag; titulo: string; texto: string }) {
  return (
    <li className="premium-interactive flex min-w-0 items-start gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3.5 shadow-[0_10px_24px_-22px_rgba(8,41,76,.3)]">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
        <Icone aria-hidden="true" size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-on-surface">{titulo}</p>
        <p className="mt-1 break-words text-xs leading-5 text-outline">{texto}</p>
      </div>
    </li>
  );
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
    <div className="page-reveal mx-auto flex w-full max-w-6xl flex-col gap-5">
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

      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <Card>
          <CardCabecalho
            titulo="Dados da venda"
            descricao="No cartão, a paciente parcela e a clínica recebe um repasse só, já líquido de taxa."
          />
          <CardCorpo className="min-w-0 py-7 sm:py-8 [&_form>div:last-child]:sticky [&_form>div:last-child]:bottom-[calc(5.15rem+env(safe-area-inset-bottom))] [&_form>div:last-child]:z-20 [&_form>div:last-child]:-mx-1 [&_form>div:last-child]:overflow-hidden [&_form>div:last-child]:rounded-[var(--radius-painel)] [&_form>div:last-child]:border [&_form>div:last-child]:border-card-border [&_form>div:last-child]:bg-surface/95 [&_form>div:last-child]:px-3 [&_form>div:last-child]:py-3 [&_form>div:last-child]:shadow-[0_24px_54px_-30px_rgba(8,41,76,.45)] [&_form>div:last-child]:backdrop-blur-md lg:[&_form>div:last-child]:bottom-3 sm:[&_form>div:last-child]:px-4">
            <FormularioVenda
              procedimentos={catalogo.procedimentos}
              taxas={taxas}
              pacienteInicial={pacienteInicial}
              podeAlterarTaxa={podeAlterarTaxa}
              dataPadrao={chaveDoDia(hoje())}
            />
          </CardCorpo>
        </Card>

        <aside className="premium-panel min-w-0 rounded-[var(--radius-painel)] border p-4 xl:sticky xl:top-28">
          <p className="rotulo text-primary">Como a venda fecha</p>
          <h2 className="mt-2 break-words text-lg font-semibold tracking-[-0.025em] text-on-surface">Uma operação, três leituras</h2>
          <p className="mt-2 break-words text-sm leading-6 text-on-surface-variant">O formulário mantém negociação, custo de pagamento e entrada de caixa separados para o financeiro continuar confiável.</p>

          <ol className="mt-5 flex min-w-0 flex-col gap-2.5">
            <Passo icone={ShoppingBag} titulo="1. Negociação" texto="Valor original, desconto e valor final combinado com a paciente." />
            <Passo icone={BadgePercent} titulo="2. Taxa" texto="Quando houver cartão, o custo fica explícito e não vira uma despesa duplicada." />
            <Passo icone={Wallet} titulo="3. Recebimento" texto="Previsto ou já recebido, sempre pelo líquido que efetivamente pertence à clínica." />
          </ol>

          <div className="mt-5 flex min-w-0 items-start gap-2 rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-3 py-3 text-xs leading-5 text-positivo">
            <CheckCircle2 aria-hidden="true" size={15} strokeWidth={1.8} className="mt-0.5 shrink-0" />
            <span className="min-w-0 break-words">A prévia da conta no formulário usa a mesma lógica financeira do registro no servidor.</span>
          </div>

          <div className="mt-3 flex min-w-0 items-start gap-2 text-xs leading-5 text-outline">
            <ReceiptText aria-hidden="true" size={14} strokeWidth={1.7} className="mt-0.5 shrink-0 text-primary" />
            <span className="min-w-0 break-words">Depois de salvar, a venda ganha uma tela própria com trilha de recebimento e alterações.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
