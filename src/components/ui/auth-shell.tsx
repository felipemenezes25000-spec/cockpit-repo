import { CalendarDays, ChevronRight, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LinkDeVoltar } from "@/components/ui/page-hero";
import { MarcaComNome, MarcaDaClinica } from "@/components/ui/marca-da-clinica";
import { CLINICA } from "@/lib/nav";

/**
 * Instrumento da cabine de acesso: a marca no centro e três órbitas em
 * velocidades diferentes. É decoração pura e nunca carrega dado de paciente.
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
 * Uma cena abstrata de consultório construída só com superfícies e a própria
 * marca. Dá profundidade à cabine sem depender de foto externa nem expor dados.
 */
function CenaClinica() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            "radial-gradient(circle at 82% 23%, rgba(214,233,251,.20), transparent 26%), radial-gradient(circle at 8% 88%, rgba(3,35,78,.48), transparent 35%)",
        }}
      />

      <div className="absolute top-[21%] right-[5%] h-[34%] w-[47%] overflow-hidden rounded-[var(--radius-painel)] border border-cabine-linha bg-cabine-profunda/55 shadow-[0_28px_70px_-36px_rgba(0,18,52,.82)]">
        <div
          className="absolute inset-y-0 left-0 w-[45%] opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,.22) 0 1px, transparent 1px 12px)",
          }}
        />
        <div className="absolute top-7 right-7 flex size-24 items-center justify-center rounded-full border border-cabine-linha bg-cabine-profunda/75 text-cabine-texto/45">
          <MarcaDaClinica className="size-16" peso={0.9} />
        </div>
        <div className="absolute right-5 bottom-5 left-5 h-11 rounded-[var(--radius-controle)] border border-cabine-linha bg-cabine-profunda/80" />
        <div className="absolute right-11 bottom-16 h-12 w-16 rounded-t-[var(--radius-cartao)] border border-cabine-linha bg-cabine-profunda/65" />
        <div className="absolute bottom-16 left-10 size-9 rounded-full border border-cabine-linha bg-cabine-texto/20" />
      </div>

      <div className="absolute top-[17%] right-[17%] h-[44%] w-px bg-cabine-linha/45" />
      <div className="absolute top-[61%] right-[5%] h-px w-[48%] bg-cabine-linha/35" />
    </div>
  );
}

/**
 * Casca das telas de acesso (entrar, recuperar e redefinir a senha).
 *
 * No desktop, a marca e o contexto ficam numa cabine azul e o formulário vive
 * em um cartão elevado. No celular a cabine vira uma assinatura compacta para
 * o formulário continuar sendo a primeira ação da tela.
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
    <main className="fundo-vivo min-h-screen overflow-hidden px-3 py-3 sm:px-5 sm:py-5 lg:px-7 lg:py-7">
      <div className="page-reveal mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1380px] overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface shadow-flutuante sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.12fr_0.88fr]">
        <section
          aria-label={`${CLINICA.nome} — Cockpit do consultório`}
          className="cabine relative hidden min-h-full flex-col justify-between rounded-none px-10 py-9 lg:flex xl:px-14 xl:py-11"
        >
          <CenaClinica />
          <Orbitas />

          <div className="relative z-[1]">
            <MarcaComNome tamanho="grande" tom="cabine" apoio="Cockpit do consultório" />

            <div className="mt-14 max-w-[34rem] xl:mt-16">
              <p className="cabine-titulo text-[3rem] leading-[1.02] font-semibold tracking-[-0.055em] text-balance xl:text-[3.55rem]">
                O dia da clínica
                <span className="block text-[#cfe4fa]">numa tela só.</span>
              </p>
              <p className="mt-5 max-w-lg text-[1.02rem] leading-7 text-cabine-texto-secundario xl:text-[1.08rem]">
                Agenda, pacientes, prontuários, documentos e financeiro no mesmo lugar, com o agora sempre à vista.
              </p>
            </div>
          </div>

          <ul className="relative z-[1] mt-12 grid max-w-[36rem] gap-3 xl:mt-16">
            {recursos.map(([Icone, tituloItem, descricaoItem], indice) => (
              <li
                key={tituloItem}
                style={{ animationDelay: `${260 + indice * 110}ms` }}
                className="dashboard-stagger grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[var(--radius-painel)] border border-cabine-linha bg-cabine-profunda/70 px-4 py-4 shadow-[0_18px_46px_-34px_rgba(0,18,52,.9)]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] bg-cabine-texto text-cabine-profunda shadow-[0_10px_24px_-16px_rgba(255,255,255,.9)]">
                  <Icone aria-hidden="true" size={21} strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p className="text-[0.95rem] font-semibold tracking-[-0.01em]">{tituloItem}</p>
                  <p className="mt-1 text-sm leading-5 text-cabine-texto-secundario">{descricaoItem}</p>
                </div>
                <span className="flex size-9 items-center justify-center rounded-full border border-cabine-linha bg-cabine-texto/10 text-cabine-texto">
                  <ChevronRight aria-hidden="true" size={18} strokeWidth={1.8} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="relative flex items-center justify-center overflow-hidden bg-surface-bright px-4 py-7 sm:px-8 sm:py-10 lg:px-10 xl:px-14"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 100% 0%, rgba(214,233,251,.72), transparent 36%), radial-gradient(circle at 15% 100%, rgba(234,243,251,.86), transparent 35%)",
            }}
          />

          <div className="cascata relative z-[1] w-full max-w-[31rem] rounded-[var(--radius-painel)] border border-card-border bg-surface px-5 py-6 shadow-flutuante sm:px-8 sm:py-8 xl:px-9 xl:py-9">
            {voltarPara ? (
              <LinkDeVoltar href={voltarPara} className="mb-6">
                {rotuloVoltar ?? "Voltar"}
              </LinkDeVoltar>
            ) : null}

            <div className="cabine mb-7 p-5 lg:hidden">
              <MarcaComNome tamanho="medio" tom="cabine" apoio="Cockpit do consultório" />
              <p className="mt-4 max-w-sm text-xl leading-tight font-semibold tracking-[-0.03em] text-balance">
                O dia da clínica numa tela só.
              </p>
            </div>

            <div className="mb-5 inline-flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
                <ShieldCheck aria-hidden="true" size={17} strokeWidth={2} />
              </span>
              <p className="rotulo text-primary">Acesso seguro</p>
            </div>

            <h1 className="text-[2rem] leading-[1.08] font-semibold tracking-[-0.045em] text-on-surface sm:text-[2.2rem]">
              {titulo}
            </h1>
            <p className="mt-3 mb-7 max-w-md text-sm leading-6 text-on-surface-variant sm:text-[0.94rem]">
              {descricao}
            </p>

            <div>{children}</div>

            <div className="mt-8 flex items-start gap-3 border-t border-card-border pt-5 text-xs leading-5 text-outline">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container-low text-primary">
                <LockKeyhole aria-hidden="true" size={14} strokeWidth={1.9} />
              </span>
              <p>Ambiente interno do consultório. O acesso depende de conta ativa e permissões válidas.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
