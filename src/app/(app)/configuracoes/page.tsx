import { Building2, ChevronRight, Clock3, Images, ShieldCheck, Stethoscope, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehAdministradora } from "@/lib/auth";
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
  const [procedimentos, administradora] = await Promise.all([
    listarProcedimentos(),
    ehAdministradora(),
  ]);
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
    // Só a administradora: a função do banco recusa as outras pessoas.
    ...(administradora
      ? [
          {
            titulo: "Conferência das fotos",
            descricao:
              "Fotos de evolução com registro e sem arquivo, ou com arquivo e sem registro. Só leitura.",
            icone: Images,
            href: "/configuracoes/fotos",
          },
        ]
      : []),
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

      <Card>
        <CardCabecalho
          titulo="Configurações"
          descricao="O que a clínica precisa definir uma vez para o resto do sistema funcionar. Os itens marcados como em breve ainda não podem ser alterados por aqui."
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
                        <span className="shrink-0 rounded-[var(--radius-tag)] border border-dashed border-outline px-1.5 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap text-on-surface-variant">
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
                "flex items-start gap-4 rounded-[var(--radius-cartao)] border p-4";

              return (
                <li key={secao.titulo}>
                  {secao.href ? (
                    <Link
                      href={secao.href}
                      className={`${classe} border-card-border bg-surface shadow-[var(--shadow-cartao)] transition-colors hover:border-primary`}
                    >
                      {conteudo}
                    </Link>
                  ) : (
                    // Seção que ainda não existe: contorno tracejado e fundo cinza, sem
                    // seta nem hover — não é link e não finge ser. O selo "em breve"
                    // diz o motivo em texto, não só pela aparência.
                    <div className={`${classe} border-dashed border-outline-variant bg-surface-container-low`}>
                      {conteudo}
                    </div>
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
