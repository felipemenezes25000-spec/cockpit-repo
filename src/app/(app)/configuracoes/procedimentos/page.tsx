import { Plus, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import { ListaProcedimentos } from "@/components/configuracoes/lista-procedimentos";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
    <div className="flex flex-col gap-6">
      <LinkDeVoltar href="/configuracoes">Voltar para configurações</LinkDeVoltar>

      <CabecalhoDePagina
        icone={Stethoscope}
        rotulo="Configurações"
        titulo="Procedimentos"
        descricao="A tabela que alimenta a Agenda: duração, valor e retorno sugerido ficam centralizados aqui para novas marcações."
        acoes={
          administradora ? (
            <BotaoLink href="/configuracoes/procedimentos/novo" variante="primaria" tamanho="sm">
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
              Novo procedimento
            </BotaoLink>
          ) : undefined
        }
        meta={
          <>
            <SeloHero tom={ativos > 0 ? "positivo" : "atencao"}>{ativos} {ativos === 1 ? "ativo na agenda" : "ativos na agenda"}</SeloHero>
            {inativos > 0 ? <SeloHero>{inativos} {inativos === 1 ? "fora da agenda" : "fora da agenda"}</SeloHero> : null}
            <SeloHero tom="informativo">{procedimentos.length} no total</SeloHero>
          </>
        }
      />

      <Card>
        <CardCabecalho
          titulo="Tabela da clínica"
          descricao={
            procedimentos.length === 0
              ? "A tabela está vazia."
              : "Ativos aparecem em novas marcações; inativos preservam o histórico sem voltar à Agenda."
          }
        />

        <CardCorpo>
          <ListaProcedimentos procedimentos={procedimentos} podeEditar={administradora} />
        </CardCorpo>

        <CardRodape className="text-outline">
          {administradora
            ? "Procedimento não se apaga: o histórico de atendimentos aponta para ele. Tirar da agenda afeta apenas novas marcações e preserva o passado."
            : "Só a administradora altera a tabela. A recepção usa os procedimentos disponíveis na Agenda."}
        </CardRodape>
      </Card>
    </div>
  );
}
