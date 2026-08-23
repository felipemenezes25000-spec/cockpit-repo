import { Building2, ChevronRight, Clock3, ShieldCheck, Stethoscope, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { listarProcedimentos } from "@/server/consultas/procedimentos";

export const metadata: Metadata = {
  title: "Configurações",
  description: "Dados da clínica, equipe, procedimentos e preferências do sistema.",
};

type Secao = {
  titulo: string;
  descricao: string;
  icone: LucideIcon;
  href?: string;
  resumo?: string;
};

export default async function PaginaConfiguracoes() {
  const procedimentos = await listarProcedimentos();
  const ativos = procedimentos.filter((p) => p.ativo).length;

  const secoes: Secao[] = [
    {
      titulo: "Procedimentos",
      descricao: "A tabela do que a clínica faz: nome, duração, valor e retorno sugerido.",
      icone: Stethoscope,
      href: "/configuracoes/procedimentos",
      resumo:
        ativos === 0
          ? "Nenhum ativo"
          : `${ativos} ${ativos === 1 ? "ativo" : "ativos"} na agenda`,
    },
    {
      titulo: "Equipe",
      descricao: "Quem atende e quem opera o sistema, com o perfil de acesso de cada pessoa.",
      icone: Users,
    },
    {
      titulo: "Dados da clínica",
      descricao: "Nome, endereço, contato e o que aparece nos documentos.",
      icone: Building2,
    },
    {
      titulo: "Horário de funcionamento",
      descricao: "Expediente por dia da semana, para a agenda mostrar o dia inteiro.",
      icone: Clock3,
    },
    {
      titulo: "Acesso e permissões",
      descricao: "Liberar contas novas e definir quem é administradora.",
      icone: ShieldCheck,
    },
  ];

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />

      <Card>
        <CardCabecalho
          titulo="Configurações"
          descricao="O que a clínica precisa definir uma vez para o resto do sistema funcionar."
        />
        <CardCorpo>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {secoes.map((secao) => {
              const Icone = secao.icone;
              const conteudo = (
                <>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-primary">
                    <Icone aria-hidden="true" size={18} strokeWidth={1.5} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-on-surface">{secao.titulo}</span>
                      {!secao.href ? (
                        <span className="rounded-[var(--radius-tag)] border border-dashed border-outline-variant px-1.5 py-0.5 text-[0.6875rem] text-outline">
                          em breve
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-on-surface-variant">
                      {secao.descricao}
                    </span>
                    {secao.resumo ? (
                      <span className="mt-1.5 block text-xs font-medium text-primary">
                        {secao.resumo}
                      </span>
                    ) : null}
                  </span>
                  {secao.href ? (
                    <ChevronRight
                      aria-hidden="true"
                      size={18}
                      strokeWidth={1.5}
                      className="shrink-0 text-outline-variant"
                    />
                  ) : null}
                </>
              );

              const classe =
                "flex items-start gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)]";

              return (
                <li key={secao.titulo}>
                  {secao.href ? (
                    <Link
                      href={secao.href}
                      className={`${classe} transition-colors hover:border-primary`}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    <div className={`${classe} opacity-70`}>{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </CardCorpo>
      </Card>
    </div>
  );
}
