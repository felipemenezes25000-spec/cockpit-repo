import { CheckCircle2, DatabaseZap, FileHeart, ShieldCheck } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { SeloHero } from "@/components/ui/page-hero";

const PASSOS = [
  {
    titulo: "Aplicar a migração clínica",
    descricao: "Cria prontuários, versões e as regras de acesso para conteúdo clínico sensível.",
    codigo: "supabase/migrations/0010_prontuarios.sql",
  },
  {
    titulo: "Publicar a estrutura",
    descricao: "Sincroniza o schema no ambiente conectado preservando o restante da base.",
    codigo: "npm.cmd run db:push",
  },
  {
    titulo: "Atualizar os tipos",
    descricao: "Regera os tipos para que o frontend e as consultas usem exatamente o schema publicado.",
    codigo: "npm.cmd run db:tipos",
  },
] as const;

export function EstruturaPendenteProntuario() {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardCabecalho
        titulo="Estrutura clínica ainda não publicada"
        descricao="O fluxo de prontuário já existe no Cockpit, mas o ambiente conectado ainda precisa receber as tabelas e políticas que preservam o histórico clínico."
        acao={<SeloHero tom="atencao"><DatabaseZap aria-hidden="true" size={13} />Migração pendente</SeloHero>}
      />
      <CardCorpo className="flex flex-col gap-6 py-6 sm:py-7">
        <div className="grid gap-3 sm:grid-cols-3">
          {PASSOS.map((passo, indice) => (
            <article key={passo.titulo} className="premium-interactive relative overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-atencao-borda bg-atencao-fundo text-atencao">
                  {indice === 0 ? <DatabaseZap aria-hidden="true" size={17} strokeWidth={1.7} /> : indice === 1 ? <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.7} /> : <CheckCircle2 aria-hidden="true" size={17} strokeWidth={1.7} />}
                </span>
                <span className="tabular text-[0.64rem] font-bold tracking-[0.1em] text-outline uppercase">0{indice + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-on-surface">{passo.titulo}</h3>
              <p className="mt-1.5 text-xs leading-5 text-outline">{passo.descricao}</p>
              <code className="mt-4 block overflow-x-auto rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2 text-[0.68rem] leading-5 text-on-surface-variant">{passo.codigo}</code>
            </article>
          ))}
        </div>

        <div className="flex items-start gap-3 rounded-[var(--radius-painel)] border border-informativo-borda bg-informativo-fundo px-4 py-3.5 text-sm leading-6 text-on-surface-variant">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-informativo-borda bg-surface/70 text-informativo-texto">
            <FileHeart aria-hidden="true" size={16} strokeWidth={1.7} />
          </span>
          <p><strong className="font-semibold text-on-surface">O bloqueio é intencional.</strong> Enquanto a estrutura não estiver no banco, nenhum conteúdo clínico é tratado como salvo. Isso evita prontuário sem versionamento ou fora das políticas de acesso.</p>
        </div>
      </CardCorpo>
    </Card>
  );
}
