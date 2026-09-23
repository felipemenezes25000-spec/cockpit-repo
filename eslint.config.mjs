import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Tudo aqui é gerado e já é ignorado pelo git. `supabase/.temp` vem do
    // `supabase start` (o edge runtime ganha um index.ts minificado lá dentro);
    // o relatório do Playwright traz o visualizador de trace, também
    // minificado, sempre que um E2E falha.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "supabase/.temp/**",
      "e2e/relatorio/**",
      "e2e/capturas/**",
      "test-results/**",
    ],
  },
];

export default eslintConfig;
