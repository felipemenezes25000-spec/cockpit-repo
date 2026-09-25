import { BadgePercent, History, PencilLine, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EXPLICACAO_TAXAS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { FormularioTaxa } from "@/components/financeiro/formulario-taxa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import { formatarPercentual, bpDoBanco } from "@/lib/moeda";
import { atualizarTaxa } from "@/server/acoes/taxas-cartao";
import { taxaPorId } from "@/server/consultas/taxas";

export const metadata: Metadata = { title: "Editar taxa" };

type Props = { params: Promise<{ id: string }> };

export default async function PaginaEditarTaxa({ params }: Props) {
  if (!(await ehAdministradora())) {
    return <SomenteAdministradora voltarPara="/financeiro/taxas" explicacao={EXPLICACAO_TAXAS} />;
  }

  const { id } = await params;
  const taxa = await taxaPorId(id);
  if (!taxa) notFound();

  const descricaoTaxa = `${taxa.operadora} — ${taxa.tipo === "credito" ? `crédito ${taxa.parcelas}x` : "débito"}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <LinkDeVoltar href="/financeiro/taxas">Voltar para taxas</LinkDeVoltar>

      <CabecalhoDePagina
        icone={PencilLine}
        rotulo="Taxa de cartão"
        titulo={descricaoTaxa}
        descricao="Ajuste o padrão usado por novas vendas. Vendas já registradas mantêm a cópia da taxa que estava vigente no momento da operação."
        meta={
          <>
            <SeloHero tom={taxa.ativa ? "positivo" : "neutro"}>{taxa.ativa ? "Taxa ativa" : "Taxa inativa"}</SeloHero>
            <SeloHero tom="informativo">
              <BadgePercent aria-hidden="true" size={13} strokeWidth={1.7} />
              {formatarPercentual(bpDoBanco(taxa.percentual))}
            </SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Editar configuração" descricao="A alteração passa a valer apenas para operações futuras que usem esta combinação." />
        <CardCorpo className="py-7 sm:py-8">
          <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="min-w-0">
              <FormularioTaxa
                acao={atualizarTaxa}
                taxaId={taxa.id}
                inicial={{
                  operadora: taxa.operadora,
                  tipo: taxa.tipo,
                  parcelas: String(taxa.parcelas),
                  percentual: String(taxa.percentual).replace(".", ","),
                }}
                rotuloSalvar="Salvar alterações"
              />
            </div>

            <aside className="integridade-cabine p-4 sm:p-5 xl:sticky xl:top-28">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] bg-selecao text-primary">
                  <History aria-hidden="true" size={17} strokeWidth={1.75} />
                </span>
                <div>
                  <p className="rotulo text-primary">Regra futura</p>
                  <h2 className="mt-1 text-base font-semibold text-on-surface">O passado continua intacto</h2>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Configuração atual</p>
                  <p className="mt-1 text-xs leading-5 text-outline">{descricaoTaxa} · {formatarPercentual(bpDoBanco(taxa.percentual))}</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold text-on-surface">Vendas anteriores</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Cada venda guarda a taxa aplicada no momento da operação; esta edição não recalcula o histórico.</p>
                </div>
                <div className="rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 py-3">
                  <div className="flex items-center gap-2 text-primary">
                    <ShieldCheck aria-hidden="true" size={14} strokeWidth={1.75} />
                    <p className="text-xs font-semibold">Situação da regra</p>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-on-surface-variant">{taxa.ativa ? "Ativa: pode ser usada por novas vendas compatíveis." : "Inativa: permanece no histórico, mas não deve alimentar novas operações."}</p>
                </div>
              </div>
            </aside>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
