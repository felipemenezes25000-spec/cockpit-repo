import {
  Building2,
  ChevronRight,
  Clock3,
  Images,
  Settings2,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
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

function CartaoConfiguracao({ secao }: { secao: Secao }) {
  const Icone = secao.icone;
  const disponivel = Boolean(secao.href);

  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-4">
        <span
          className={
            disponivel
              ? "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-primary-fixed text-primary"
              : "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low text-outline"
          }
        >
          <Icone aria-hidden="true" size={20} strokeWidth={1.65} />
        </span>

        {disponivel ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container-low text-outline transition-[transform,background-color,color] duration-150 group-hover:translate-x-0.5 group-hover:bg-primary-fixed group-hover:text-primary">
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </span>
        ) : (
          <SeloHero className="min-h-7 px-2.5 py-0 text-[0.66rem]">Em preparação</SeloHero>
        )}
      </div>

      <div className="mt-5">
        <h3 className="text-base font-semibold tracking-[-0.015em] text-on-surface">{secao.titulo}</h3>
        <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{secao.descricao}</p>
      </div>

      {secao.resumo ? (
        <div className="mt-4 border-t border-card-border pt-3">
          <span className="text-xs font-semibold text-primary">{secao.resumo}</span>
        </div>
      ) : null}
    </>
  );

  const classe = disponivel
    ? "premium-interactive group relative isolate block h-full overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-5"
    : "relative block h-full rounded-[var(--radius-painel)] border border-dashed border-outline-variant bg-surface-container-low p-5";

  if (secao.href) {
    return (
      <Link href={secao.href} className={classe}>
        {conteudo}
      </Link>
    );
  }

  return <div className={classe}>{conteudo}</div>;
}

export default async function PaginaConfiguracoes() {
  const [procedimentos, administradora] = await Promise.all([
    listarProcedimentos(),
    ehAdministradora(),
  ]);
  const ativos = procedimentos.filter((p) => p.ativo).length;

  const secoes: Secao[] = [
    {
      titulo: "Procedimentos",
      descricao: "A tabela operacional da clínica: nome, duração, valor e retorno sugerido usados na agenda.",
      icone: Stethoscope,
      href: "/configuracoes/procedimentos",
      resumo: ativos === 0 ? "Nenhum procedimento ativo" : `${ativos} ${ativos === 1 ? "procedimento ativo" : "procedimentos ativos"}`,
    },
    ...(administradora
      ? [
          {
            titulo: "Conferência das fotos",
            descricao: "Reconciliação de fotos de evolução com registro e arquivo, em modo somente leitura.",
            icone: Images,
            href: "/configuracoes/fotos",
            resumo: "Ferramenta administrativa de integridade",
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
      descricao: "Nome, endereço, contatos e informações institucionais usadas nos documentos.",
      icone: Building2,
    },
    {
      titulo: "Horário de funcionamento",
      descricao: "Expediente por dia da semana para estruturar visualmente a agenda completa.",
      icone: Clock3,
    },
    {
      titulo: "Acesso e permissões",
      descricao: "Liberação de contas novas e administração dos perfis de acesso do sistema.",
      icone: ShieldCheck,
    },
  ];

  const disponiveis = secoes.filter((secao) => secao.href).length;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoDePagina
        icone={Settings2}
        rotulo="Sistema"
        titulo="Configurações"
        descricao="Centralize as definições que sustentam a operação do consultório. O que ainda não pode ser editado aparece explicitamente como preparação, sem fingir ser uma função disponível."
        meta={
          <>
            <SeloHero tom="informativo">{disponiveis} {disponiveis === 1 ? "área disponível" : "áreas disponíveis"}</SeloHero>
            <SeloHero>{secoes.length - disponiveis} em preparação</SeloHero>
            {administradora ? (
              <SeloHero tom="positivo">
                <Sparkles aria-hidden="true" size={13} strokeWidth={1.7} />
                Visão administrativa
              </SeloHero>
            ) : null}
          </>
        }
      />

      <section aria-labelledby="configuracoes-disponiveis">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="rotulo text-primary">Operação</p>
            <h2 id="configuracoes-disponiveis" className="mt-1 text-xl font-semibold tracking-[-0.025em] text-on-surface">
              Áreas do sistema
            </h2>
          </div>
          <p className="hidden max-w-md text-right text-xs leading-5 text-outline sm:block">
            Itens sem link permanecem visíveis para deixar claro o que está planejado, sem criar falsas ações.
          </p>
        </div>

        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {secoes.map((secao) => (
            <li key={secao.titulo}>
              <CartaoConfiguracao secao={secao} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
