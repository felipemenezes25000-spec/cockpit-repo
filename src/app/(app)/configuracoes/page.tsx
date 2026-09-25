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

function CartaoConfiguracao({ secao, indice }: { secao: Secao; indice: number }) {
  const Icone = secao.icone;
  const disponivel = Boolean(secao.href);

  const conteudo = (
    <>
      <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-12 size-32 rounded-full bg-primary-fixed/45 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-4">
        <span
          className={
            disponivel
              ? "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-gradient-to-br from-surface to-selecao text-primary shadow-[0_14px_28px_-22px_rgba(8,84,160,.65)] transition-transform duration-200 group-hover:-translate-y-0.5"
              : "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low text-outline"
          }
        >
          <Icone aria-hidden="true" size={21} strokeWidth={1.7} />
        </span>

        {disponivel ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline transition-[transform,background-color,border-color,color] duration-150 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary">
            <ChevronRight aria-hidden="true" size={17} strokeWidth={1.7} />
          </span>
        ) : (
          <SeloHero className="min-h-7 px-2.5 py-0 text-[0.66rem]">Em preparação</SeloHero>
        )}
      </div>

      <div className="relative mt-5">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="tabular text-[0.64rem] font-bold tracking-[0.08em] text-outline uppercase">0{indice + 1}</span>
          <span aria-hidden="true" className="h-px w-6 bg-card-border" />
        </div>
        <h3 className="text-base font-bold tracking-[-0.018em] text-on-surface transition-colors group-hover:text-primary">{secao.titulo}</h3>
        <p className="mt-1.5 text-sm leading-6 text-on-surface-variant">{secao.descricao}</p>
      </div>

      {secao.resumo ? (
        <div className="relative mt-5 border-t border-card-border pt-3.5">
          <span className="inline-flex rounded-full border border-primary-fixed bg-selecao px-2.5 py-1 text-xs font-semibold text-primary">{secao.resumo}</span>
        </div>
      ) : null}
    </>
  );

  const classe = disponivel
    ? "premium-interactive group relative isolate block h-full overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface p-5"
    : "group relative block h-full overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-dashed border-outline-variant bg-surface-container-low p-5";

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
    <div className="page-reveal flex flex-col gap-6">
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

      <section className="premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5" aria-labelledby="configuracoes-disponiveis">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary-fixed/35 blur-3xl" />
        <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="rotulo text-primary">Operação</p>
            <h2 id="configuracoes-disponiveis" className="mt-1 text-xl font-bold tracking-[-0.03em] text-on-surface">
              Áreas do sistema
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Ajustes que governam agenda, cadastros e integridade operacional ficam reunidos aqui.
            </p>
          </div>
          <p className="max-w-md text-xs leading-5 text-outline sm:text-right">
            Itens sem link permanecem visíveis para deixar claro o que está planejado, sem criar falsas ações.
          </p>
        </div>

        <ul className="relative grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {secoes.map((secao, indice) => (
            <li key={secao.titulo}>
              <CartaoConfiguracao secao={secao} indice={indice} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
