/**
 * O campo e o botão das telas de acesso (entrar, recuperar e redefinir a
 * senha). Um lugar só: as três telas dividem o mesmo layout, e um campo mais
 * baixo numa delas denuncia a tela "esquecida". Usar junto com `ENTRADA`.
 */

/** O campo: mais alto que o do sistema, com espaço à esquerda para o selo do ícone. */
export const CAMPO_ACESSO =
  "h-[3.35rem]! rounded-[var(--radius-cartao)] border-[#c9d7e5] bg-[#f8fbff] px-3.5 pl-[3.35rem] text-[0.95rem] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_1px_2px_rgba(8,41,76,.025)] transition-[border-color,background-color,box-shadow] duration-150 hover:border-[#9eb3c8] focus-visible:border-primary-container focus-visible:bg-surface focus-visible:shadow-[0_0_0_4px_rgba(10,110,209,.09)]";

/** O selo do ícone dentro do campo (o `group/campo` do rótulo acende o selo no foco). */
export const ICONE_ACESSO =
  "pointer-events-none absolute top-1/2 left-3 z-[1] flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline shadow-[0_1px_2px_rgba(8,41,76,.04)] transition-colors group-focus-within/campo:border-primary-fixed-dim group-focus-within/campo:bg-primary-fixed group-focus-within/campo:text-primary";

/** O botão de mostrar/ocultar a senha, na direita do campo. */
export const OLHO_ACESSO =
  "absolute top-1/2 right-2.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95";

/** A ação principal da tela. */
export const BOTAO_ACESSO =
  "group relative inline-flex h-[3.4rem] w-full items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-cartao)] border border-primary-container bg-primary-container px-6 text-[0.98rem] font-semibold text-on-primary shadow-[0_22px_44px_-24px_rgba(10,110,209,.95)] transition-[transform,background-color,border-color,box-shadow] duration-150 hover:border-primary-hover hover:bg-primary-hover hover:shadow-[0_26px_48px_-24px_rgba(8,60,115,.95)] active:translate-y-px active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0";
