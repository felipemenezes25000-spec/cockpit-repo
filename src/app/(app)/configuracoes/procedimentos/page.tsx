import { ArrowLeft, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ListaProcedimentos } from "@/components/configuracoes/lista-procedimentos";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
import { listarProcedimentos } from "@/server/consultas/procedimentos";

export const metadata: Metadata = {
  title: "Procedimentos",
  description: "Tabela de procedimentos da clínica: duração, valor e retorno sugerido.",
};

export default async function PaginaProcedimentos() {
  const [procedimentos, administradora] = await Promise.all([
    listarProcedimentos(),
    ehAdministradora(),
  ]);

  const ativos = procedimentos.filter((p) => p.ativo).length;
  const inativos = procedimentos.length - ativos;

  return (
    <div>

      <Link
        href="/configuracoes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Configurações
      </Link>

      <Card>
        <CardCabecalho
          titulo="Procedimentos"
          descricao={
            procedimentos.length === 0
              ? "A tabela está vazia."
              : `${ativos} na agenda` +
                (inativos > 0 ? ` · ${inativos} fora da agenda` : "")
          }
          acao={
            administradora ? (
              <BotaoLink href="/configuracoes/procedimentos/novo" variante="primaria" tamanho="sm">
                <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
                Novo procedimento
              </BotaoLink>
            ) : undefined
          }
        />

        <CardCorpo>
          <ListaProcedimentos procedimentos={procedimentos} podeEditar={administradora} />
        </CardCorpo>

        <CardRodape className="text-outline">
          {administradora
            ? "Procedimento não se apaga: o histórico de atendimentos aponta para ele. Tirar da agenda esconde das novas marcações e preserva o passado."
            : "Só a administradora altera a tabela. A recepção usa os procedimentos na agenda."}
        </CardRodape>
      </Card>
    </div>
  );
}
