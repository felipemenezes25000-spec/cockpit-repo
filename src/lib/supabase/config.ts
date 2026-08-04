/**
 * Configuração de acesso ao Supabase.
 *
 * Falha alto e cedo: sem as variáveis, é melhor a aplicação não subir do que
 * subir e falhar em cada consulta com um erro obscuro.
 */

function obrigatoria(nome: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Variável de ambiente ${nome} não definida. ` +
        `Copie .env.local.example para .env.local e preencha os valores do projeto.`,
    );
  }
  return valor;
}

export const SUPABASE_URL = obrigatoria(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = obrigatoria(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
