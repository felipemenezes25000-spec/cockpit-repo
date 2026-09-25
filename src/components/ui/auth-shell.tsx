import { CalendarDays, ChevronRight, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LinkDeVoltar } from "@/components/ui/page-hero";
import { MarcaComNome, MarcaDaClinica } from "@/components/ui/marca-da-clinica";
import { CLINICA } from "@/lib/nav";

function Orbitas() {
  return (
    <div aria-hidden="true" className="orbitas opacity-80">
      <span className="orbita orbita-1" />
      <span className="orbita orbita-2" />
      <span className="orbita orbita-3" />
      <MarcaDaClinica className="orbitas-marca" peso={0.9} />
    </div>
  );
}

/** Cena vetorial própria do login: consultório abstrato, sem foto externa. */
function CenaClinicaPremium() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[-1] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 84% 20%, rgba(255,255,255,.11), transparent 26%), radial-gradient(circle at 13% 89%, rgba(2,28,66,.34), transparent 38%)",
        }}
      />
      <div
        className="absolute top-[8%] right-[-8%] h-[72%] w-[78%] bg-contain bg-right-top bg-no-repeat opacity-95"
        style={{ backgroundImage: "url('/login-clinica.svg')" }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(10,110,209,.98) 0%, rgba(10,110,209,.78) 38%, rgba(8,84,160,.24) 71%, rgba(6,63,124,.14) 100%)",
        }}
      />
      <div className="absolute top-[15%] right-[8%] h-px w-[34%] bg-cabine-texto/10" />
      <div className="absolute top-[15%] right-[8%] h-[40%] w-px bg-cabine-texto/10" />
    </div>
  );
}

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
    <main className="fundo-vivo min-h-screen overflow-hidden p-3 sm:p-5 lg:p-7">
      <div className="page-reveal mx-auto grid min-h-[calc(100vh-1.5rem)] w-full max-w-[1540px] overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface shadow-flutuante sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.18fr_0.82fr]">
        <section
          aria-label={`${CLINICA.nome} — Cockpit do consultório`}
          className="cabine relative hidden min-h-full flex-col justify-between rounded-none px-11 py-10 lg:flex xl:px-14 xl:py-12 2xl:px-16"
        >
          <CenaClinicaPremium />
          <Orbitas />

          <div className="relative z-[2]">
            <MarcaComNome tamanho="grande" tom="cabine" apoio="Cockpit do consultório" />

            <div className="mt-14 max-w-[35rem] xl:mt-16 2xl:mt-20">
              <p className="cabine-titulo text-[3.15rem] leading-[0.99] font-semibold tracking-[-0.06em] text-balance xl:text-[3.75rem] 2xl:text-[4.15rem]">
                O dia da clínica
                <span className="block text-[#cfe4fa]">numa tela só.</span>
              </p>
              <p className="mt-6 max-w-[32rem] text-[1.02rem] leading-7 text-cabine-texto-secundario xl:text-[1.08rem]">
                Agenda, pacientes, prontuários, documentos e financeiro no mesmo lugar, com o agora sempre à vista.
              </p>
            </div>
          </div>

          <ul className="relative z-[2] mt-12 grid max-w-[39rem] gap-3 xl:mt-14">
            {recursos.map(([Icone, tituloItem, descricaoItem], indice) => (
              <li
                key={tituloItem}
                style={{ animationDelay: `${260 + indice * 110}ms` }}
                className="dashboard-stagger grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-[var(--radius-painel)] border border-cabine-linha bg-[#07529b]/88 px-4.5 py-4 shadow-[0_20px_50px_-34px_rgba(0,18,52,.95)] transition-[transform,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-[#8bc2f3] hover:bg-[#064989]"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] bg-cabine-texto text-cabine-profunda shadow-[0_10px_24px_-16px_rgba(255,255,255,.95)]">
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

        <section className="relative flex items-center justify-center overflow-hidden bg-[#f8fbff] px-4 py-7 sm:px-8 sm:py-10 lg:px-10 xl:px-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 96% 3%, rgba(197,226,252,.86), transparent 32%), radial-gradient(circle at 6% 96%, rgba(224,240,255,.92), transparent 34%), linear-gradient(145deg, rgba(255,255,255,.96), rgba(246,250,255,.92))",
            }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 size-[28rem] rounded-full border border-primary-fixed/55" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-36 -bottom-52 size-[38rem] rounded-full border border-primary-fixed/45" />

          <div className="cascata relative z-[1] w-full max-w-[34rem] rounded-[var(--radius-painel)] border border-[#d5e0eb] bg-surface px-6 py-7 shadow-[0_34px_80px_-38px_rgba(8,41,76,.42),0_8px_28px_-16px_rgba(8,41,76,.18)] sm:px-9 sm:py-9 xl:px-10 xl:py-10">
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
              <span className="flex size-8 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary shadow-[inset_0_0_0_1px_rgba(10,110,209,.08)]">
                <ShieldCheck aria-hidden="true" size={17} strokeWidth={2} />
              </span>
              <p className="rotulo text-primary">Acesso seguro</p>
            </div>

            <h1 className="text-[2.15rem] leading-[1.04] font-semibold tracking-[-0.05em] text-on-surface sm:text-[2.45rem]">
              {titulo}
            </h1>
            <p className="mt-3 mb-8 max-w-md text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">
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
