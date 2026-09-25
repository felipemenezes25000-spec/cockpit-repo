function LinhaCarteira() {
  return (
    <div className="grid gap-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0">
        <span className="esqueleto block h-4 w-40" />
        <span className="esqueleto mt-3 block h-3 w-full max-w-sm" />
        <span className="esqueleto mt-3 block h-3 w-56" />
        <span className="esqueleto mt-3 block h-6 w-48" />
      </div>
      <div className="flex flex-col gap-2 border-t border-card-border pt-3 lg:border-t-0 lg:pt-0">
        <span className="esqueleto h-10 w-full" />
        <span className="esqueleto h-8 w-full" />
        <span className="esqueleto h-9 w-full" />
      </div>
    </div>
  );
}

export default function CarregandoCaptacao() {
  return (
    <div className="flex flex-col gap-5 pb-8 sm:gap-6" aria-busy="true" aria-label="Carregando Captação">
      <header className="flex flex-col gap-2">
        <span className="esqueleto h-3 w-20" />
        <span className="esqueleto h-8 w-full max-w-md" />
        <span className="esqueleto h-4 w-full max-w-2xl" />
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="esqueleto h-7 w-24" />
          <span className="esqueleto h-7 w-32" />
          <span className="esqueleto h-7 w-28" />
        </div>
      </header>

      <div className="premium-panel flex flex-col gap-3 rounded-[var(--radius-painel)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-col gap-2">
          <span className="esqueleto h-3 w-28" />
          <span className="esqueleto h-3 w-56" />
        </div>
        <span className="esqueleto h-10 w-full max-w-64" />
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-12">
        <div className="premium-panel min-h-[32rem] rounded-[var(--radius-painel)] border p-5 xl:col-span-3">
          <span className="esqueleto block h-5 w-36" />
          <span className="esqueleto mt-8 block h-10 w-44" />
          <span className="esqueleto mt-5 block h-2 w-full" />
          <span className="esqueleto mt-8 block h-16 w-full" />
          <span className="esqueleto mt-6 block h-10 w-full" />
        </div>

        <div className="cabine flex min-h-[34rem] flex-col items-center justify-center gap-3 p-6 xl:col-span-6">
          <span className="h-20 w-full max-w-lg rounded-[var(--radius-cartao)] border border-cabine-linha bg-cabine-profunda" />
          <span className="h-20 w-[82%] rounded-[var(--radius-cartao)] border border-cabine-linha bg-cabine-profunda" />
          <span className="h-20 w-[64%] rounded-[var(--radius-cartao)] border border-cabine-linha bg-cabine-profunda" />
          <span className="h-20 w-[47%] rounded-[var(--radius-cartao)] border border-cabine-linha bg-cabine-profunda" />
        </div>

        <div className="premium-panel min-h-[32rem] rounded-[var(--radius-painel)] border p-5 xl:col-span-3">
          <span className="esqueleto block h-5 w-40" />
          <span className="esqueleto mt-7 block h-16 w-full" />
          <span className="esqueleto mt-5 block h-16 w-full" />
          <span className="esqueleto mt-8 block h-36 w-full" />
        </div>
      </div>

      <div className="premium-panel rounded-[var(--radius-painel)] border p-5">
        <div className="flex flex-col gap-2 border-b border-card-border pb-5">
          <span className="esqueleto h-3 w-24" />
          <span className="esqueleto h-5 w-72 max-w-full" />
          <span className="esqueleto h-3 w-full max-w-xl" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, indice) => (
            <div key={indice} className="rounded-[var(--radius-cartao)] border border-card-border p-4">
              <span className="esqueleto block h-3 w-24" />
              <span className="esqueleto mt-3 block h-7 w-32" />
              <span className="esqueleto mt-3 block h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-[var(--radius-painel)] border border-card-border p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, indice) => (
              <span key={indice} className="esqueleto h-14 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-12">
        {Array.from({ length: 3 }).map((_, indice) => (
          <div key={indice} className="premium-panel min-h-72 rounded-[var(--radius-painel)] border p-5 xl:col-span-4">
            <span className="esqueleto block h-5 w-40" />
            <span className="esqueleto mt-6 block h-16 w-full" />
            <span className="esqueleto mt-3 block h-16 w-full" />
            <span className="esqueleto mt-3 block h-16 w-full" />
          </div>
        ))}
        <div className="premium-panel rounded-[var(--radius-painel)] border p-5 xl:col-span-12">
          <span className="esqueleto block h-5 w-56" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, indice) => (
              <span key={indice} className="esqueleto h-28 w-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="premium-panel rounded-[var(--radius-painel)] border p-5">
        <div className="flex flex-col gap-3 border-b border-card-border pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="esqueleto h-5 w-40" />
            <span className="esqueleto h-3 w-full max-w-md" />
          </div>
          <span className="esqueleto h-8 w-28" />
        </div>
        <div className="mt-5 flex flex-col gap-3">
          <span className="esqueleto h-11 w-full" />
          <LinhaCarteira />
          <LinhaCarteira />
          <LinhaCarteira />
        </div>
      </div>
    </div>
  );
}
