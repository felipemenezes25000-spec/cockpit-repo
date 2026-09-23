import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Testes de unidade e de componente.
 *
 * Nenhum teste daqui fala com banco: regra de negócio é função pura em
 * `lib/`, e ação de servidor é testada com o cliente do Supabase trocado por
 * um falso (`testes/supabase-falso.ts`). O que depende de banco de verdade
 * mora em `supabase/testes/` (SQL) e em `e2e/` (Playwright), sempre contra o
 * Supabase LOCAL.
 *
 * `server-only` é trocado por um módulo vazio: fora do Next, o pacote de
 * verdade lança erro na importação — que é exatamente o que ele deve fazer
 * num componente de cliente, mas não num teste.
 */
export default defineConfig({
  // O tsconfig do Next usa "jsx": "preserve" (quem transforma é o Next); aqui
  // o Vite precisa transformar ele mesmo. Desde o Vite 8 isso é do oxc.
  oxc: { jsx: { runtime: "automatic" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./testes/server-only.ts", import.meta.url)),
    },
  },
  test: {
    setupFiles: ["./testes/preparar.ts"],
    // O relógio da clínica é São Paulo. O processo roda em UTC de propósito,
    // como na Vercel: é assim que a divergência de meia-noite aparece.
    env: { TZ: "UTC" },
    restoreMocks: true,
    // Componentes pedem DOM; o resto roda em Node, que é mais rápido.
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          include: ["src/**/*.test.ts", "testes/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "dom",
          include: ["src/**/*.test.tsx", "testes/**/*.test.tsx"],
          environment: "jsdom",
        },
      },
    ],
  },
});
