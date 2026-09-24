/** Esqueleto premium das telas autenticadas enquanto o servidor monta a próxima rota. */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
      <p className="sr-only">Carregando…</p>

      <div className="premium-panel page-reveal relative overflow-hidden rounded-[var(--radius-painel)] border px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative flex items-start gap-4 sm:gap-5">
          <div className="esqueleto size-12 shrink-0 rounded-[var(--radius-painel)] sm:size-14" />
          <div className="min-w-0 flex-1 pt-1">
            <div className="esqueleto h-2.5 w-24" />
            <div className="esqueleto mt-3 h-8 w-80 max-w-[85%] rounded-[var(--radius-controle)]" />
            <div className="esqueleto mt-3 h-3.5 w-[34rem] max-w-full" />
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="esqueleto h-8 w-28 rounded-full" />
              <div className="esqueleto h-8 w-36 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ animationDelay: `${80 + i * 60}ms` }}
            className="dashboard-stagger premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5"
          >
            <div className="relative esqueleto size-9 rounded-[var(--radius-controle)]" />
            <div className="relative esqueleto mt-5 h-7 w-20 rounded-[var(--radius-controle)]" />
            <div className="relative esqueleto mt-2 h-3 w-24 max-w-full" />
          </div>
        ))}
      </div>

      <div style={{ animationDelay: "180ms" }} className="dashboard-stagger premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-6">
        <div className="relative flex items-center justify-between gap-4 border-b border-card-border pb-4">
          <div className="min-w-0 flex-1">
            <div className="esqueleto h-5 w-40" />
            <div className="esqueleto mt-2 h-3 w-64 max-w-[80%]" />
          </div>
          <div className="esqueleto h-9 w-24 rounded-[var(--radius-controle)]" />
        </div>

        <div className="relative mt-4 flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-[var(--radius-painel)] border border-card-border bg-surface px-3.5 py-3.5">
              <div className="esqueleto size-10 shrink-0 rounded-[var(--radius-controle)]" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="esqueleto h-3.5 w-1/3 max-w-full" />
                <div className="esqueleto h-3 w-1/2 max-w-full" />
              </div>
              <div className="esqueleto hidden h-7 w-20 rounded-full sm:block" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
