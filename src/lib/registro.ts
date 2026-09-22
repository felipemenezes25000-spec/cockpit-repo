import "server-only";

import { erroParaRegistro, mensagemDoBanco, type ErroDoBanco } from "./erros-banco";

/**
 * Registro técnico de falha, só no servidor.
 *
 * A tela recebe a frase de `erros-banco.ts`; quem opera o sistema precisa do
 * resto — o código do Postgres e onde aconteceu — para investigar. O que vai
 * para o log é a versão sanitizada: nunca `details`, nunca valor digitado,
 * nunca conteúdo de prontuário, anamnese, documento ou token. Na Vercel isso
 * aparece em Logs da função, que é onde se procura.
 */
export function registrarFalha(contexto: string, erro: ErroDoBanco): void {
  // Recusa de regra de negócio (`raise exception` nosso) não é falha
  // técnica: é o banco dizendo "não pode", com frase para a tela. Logar cada
  // uma afogaria as falhas de verdade.
  if (!erro || erro.code === "P0001") return;
  const { codigo, mensagem } = erroParaRegistro(erro);
  console.error(`[cockpit] ${contexto}`, { codigo, mensagem });
}

/**
 * Consulta que falhou: registra e lança um erro com frase segura.
 *
 * Quem pega é o `error.tsx` da rota, que mostra a frase e oferece tentar de
 * novo. Em produção o Next esconde a mensagem de qualquer forma; aqui ela já
 * nasce sem nada do Postgres, para o ambiente de desenvolvimento e os logs
 * não mostrarem mais do que deveriam.
 */
export function falhaDeConsulta(contexto: string, erro: ErroDoBanco, frase: string): never {
  registrarFalha(contexto, erro);
  throw new Error(mensagemDoBanco(erro, frase));
}
