import "server-only";

/**
 * O segredo do servidor (0032): só esta aplicação o conhece, e o banco guarda
 * apenas o SHA-256 dele. Toda função da porta pública de assinatura — e a do
 * balcão — o exige, e é por isso que IP, aparelho e localização gravados na
 * assinatura passam a ser atestados pelo servidor, não informados por quem
 * chama a API.
 *
 * Vem de `ASSINATURA_SEGREDO_SERVIDOR` (variável só do servidor, sem
 * NEXT_PUBLIC_, pelo menos 32 caracteres). Ausente, a assinatura não abre —
 * e o log diz o porquê.
 */
export function segredoDoServidor(): string | null {
  const valor = (process.env.ASSINATURA_SEGREDO_SERVIDOR ?? "").trim();
  return valor.length >= 32 ? valor : null;
}
