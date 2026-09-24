import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LinkDeVoltar } from "@/components/ui/page-hero";
import { CLINICA } from "@/lib/nav";

/**
 * A casca das telas de acesso (entrar, recuperar e redefinir a senha).
 *
 * À esquerda, a cabine azul com a marca e o que o sistema faz — só frases
 * genéricas: tela pública nunca mostra dado de paciente. À direita, o
 * formulário, com o `<h1>` da tela, visível em qualquer largura.
 */
export function AuthShell({
  titulo,
  descricao,
  children,
  voltarPara,
  rotuloVoltar,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
  voltarPara?: string;
  rotuloVoltar?: string;
}) {
  const recursos = [
    [CalendarDays, "O dia inteiro à vista", "Quem está em atendimento, quem vem a seguir e o que falta confirmar."],
    [FileText, "Registros com histórico", "Prontuários e documentos versionados, sem apagar o que veio antes."],
    [ShieldCheck, "Acesso por perfil", "Cada pessoa da equipe vê só o que o seu papel permite."],
  ] as const;

  return (
    <main className="min-h-screen bg-fundo px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-reveal mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface lg:grid-cols-[1.05fr_0.95fr]">
        <section aria-label={`${CLINICA.nome} — Cockpit do consultório`} className="cabine hidden flex-col justify-between rounded-none p-10 lg:flex xl:p-12">
          <div>
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-[var(--radius-controle)] bg-cabine-texto text-sm font-bold text-cabine-profunda">
                {CLINICA.monograma}
              </span>
              <div className="leading-tight">
                <p className="font-bold">{CLINICA.nome}</p>
                <p className="text-sm text-cabine-texto-secundario">Cockpit do consultório</p>
              </div>
            </div>
            <p className="mt-14 max-w-md text-[2.75rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">
              O dia da clínica numa tela só.
            </p>
            <p className="mt-4 max-w-md text-base leading-7 text-cabine-texto-secundario">
              Agenda, pacientes, prontuários, documentos e financeiro no mesmo lugar, com o agora sempre à vista.
            </p>
          </div>

          <ul className="mt-10 grid gap-2.5">
            {recursos.map(([Icone, tituloItem, descricaoItem], indice) => (
              <li
                key={tituloItem}
                style={{ animationDelay: `${150 + indice * 90}ms` }}
                className="dashboard-stagger flex items-start gap-3 rounded-[var(--radius-controle)] border border-cabine-linha bg-cabine-profunda px-4 py-3.5"
              >
                <Icone aria-hidden="true" size={18} strokeWidth={1.9} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{tituloItem}</p>
                  <p className="mt-0.5 text-sm leading-5 text-cabine-texto-secundario">{descricaoItem}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
          <div className="w-full max-w-md">
            {voltarPara ? (
              <LinkDeVoltar href={voltarPara} className="mb-6">
                {rotuloVoltar ?? "Voltar"}
              </LinkDeVoltar>
            ) : null}

            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-[var(--radius-controle)] bg-primary-container text-sm font-bold text-on-primary">
                {CLINICA.monograma}
              </span>
              <div className="leading-tight">
                <p className="text-sm font-bold text-primary">{CLINICA.nome}</p>
                <p className="text-xs text-outline">Cockpit do consultório</p>
              </div>
            </div>

            <p className="rotulo text-primary">Acesso seguro</p>
            <h1 className="titulo-tela mt-2 text-on-surface">{titulo}</h1>
            <p className="mt-2 mb-7 text-sm leading-6 text-on-surface-variant">{descricao}</p>
            {children}

            <p className="mt-8 border-t border-card-border pt-5 text-xs leading-5 text-outline">
              Ambiente interno do consultório. O acesso depende de conta ativa e permissões válidas.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
