/**
 * Enquanto o servidor monta a próxima tela.
 *
 * Um esqueleto com a forma de toda página do sistema — título, faixa de
 * indicadores, lista — e não um spinner: a área não salta quando o conteúdo
 * chega, e fica claro que a navegação foi ouvida. O texto para leitor de tela
 * diz o mesmo em palavras.
 */
export default function Carregando() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-8">
      <p className="sr-only">Carregando…</p>

      <div className="flex flex-col gap-3">
        <div className="esqueleto h-3 w-28" />
        <div className="esqueleto h-8 w-72 max-w-full" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="esqueleto h-28 rounded-[var(--radius-painel)]" />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-painel)] border border-card-border bg-card p-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="esqueleto size-10 shrink-0 rounded-[var(--radius-controle)]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="esqueleto h-3.5 w-1/3" />
              <div className="esqueleto h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
