import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LinkDeVoltar } from "@/components/ui/page-hero";
import { MarcaComNome, MarcaDaClinica } from "@/components/ui/marca-da-clinica";
import { CLINICA } from "@/lib/nav";

/**
 * O instrumento da cabine de acesso: a logo da clínica (um ciclo) no centro e
 * três órbitas girando em sentidos diferentes, cada uma com um ponto de luz.
 * Tudo em traço mais escuro que o azul — o texto branco por cima não perde
 * contraste —, só os pontos são claros, e pequenos. Decoração pura.
 */
function Orbitas() {
  return (
    <div aria-hidden="true" className="orbitas">
      <span className="orbita orbita-1" />
      <span className="orbita orbita-2" />
      <span className="orbita orbita-3" />
      <MarcaDaClinica className="orbitas-marca" peso={0.9} />
    </div>
  );
}

/**
 * A casca das telas de acesso (entrar, recuperar e redefinir a senha).
 *
 * À esquerda, a cabine azul com a marca e o que o sistema faz — só frases
 * genéricas: tela pública nunca mostra dado de paciente. À direita, o
 * formulário, com o `<h1>` da tela, visível em qualquer largura. No celular a
 * cabine vira uma faixa compacta acima do formulário.
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
    <main className="fundo-vivo min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="page-reveal mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface shadow-flutuante lg:grid-cols-[1.05fr_0.95fr]">
        <section aria-label={`${CLINICA.nome} — Cockpit do consultório`} className="cabine hidden flex-col justify-between rounded-none p-10 lg:flex xl:p-12">
          <Orbitas />
          <div>
            <MarcaComNome tamanho="grande" tom="cabine" apoio="Cockpit do consultório" />
            <p className="cabine-titulo mt-14 max-w-md text-[2.75rem] leading-[1.08] font-semibold tracking-[-0.04em] text-balance">
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
                style={{ animationDelay: `${260 + indice * 110}ms` }}
                className="dashboard-stagger flex items-start gap-3 rounded-[var(--radius-controle)] border border-cabine-linha bg-cabine-profunda px-4 py-3.5"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-cabine-texto text-cabine-profunda">
                  <Icone aria-hidden="true" size={17} strokeWidth={2} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{tituloItem}</p>
                  <p className="mt-0.5 text-sm leading-5 text-cabine-texto-secundario">{descricaoItem}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-14">
          <div className="cascata w-full max-w-md">
            {voltarPara ? (
              <LinkDeVoltar href={voltarPara} className="mb-6">
                {rotuloVoltar ?? "Voltar"}
              </LinkDeVoltar>
            ) : null}

            <div className="cabine mb-8 p-5 lg:hidden">
              <MarcaComNome tamanho="medio" tom="cabine" apoio="Cockpit do consultório" />
              <p className="mt-4 text-lg leading-snug font-semibold tracking-[-0.02em] text-balance">O dia da clínica numa tela só.</p>
            </div>

            <p className="rotulo text-primary">Acesso seguro</p>
            <h1 className="titulo-tela mt-2 text-on-surface">{titulo}</h1>
            <p className="mt-2 mb-7 text-sm leading-6 text-on-surface-variant">{descricao}</p>
            <div>{children}</div>

            <p className="mt-8 border-t border-card-border pt-5 text-xs leading-5 text-outline">
              Ambiente interno do consultório. O acesso depende de conta ativa e permissões válidas.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
