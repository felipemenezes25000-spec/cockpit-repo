import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // `supabase/.temp` é gerado pelo `supabase start` (o edge runtime ganha um
    // index.ts minificado lá dentro) e já é ignorado pelo git.
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "supabase/.temp/**"],
  },
];

export default eslintConfig;
