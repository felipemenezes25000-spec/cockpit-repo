export default function CarregandoCaptacao() {
  return (
    <div className="flex flex-col gap-5 pb-8 sm:gap-6" aria-busy="true" aria-label="Carregando Captação">
      <header className="flex flex-col gap-2">
        <span className="esqueleto h-3 w-20" />
        <span className="esqueleto h-8 w-full max-w-md" />
        <span className="esqueleto h-4 w-full max-w-2xl" />
        <div className="mt-2 flex gap-2">
          <span className="esqueleto h-7 w-24" />
          <span className="esqueleto h-7 w-32" />
        </div>
      </header>

      <div className="premium-panel flex items-center justify-between rounded-[var(--radius-painel)] border px-4 py-3 sm:px-5">
        <span className="esqueleto h-4 w-32" />
        <span className="esqueleto h-10 w-64" />
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

      <div className="premium-panel min-h-28 rounded-[var(--radius-painel)] border p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, indice) => (
            <span key={indice} className="esqueleto h-14 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
