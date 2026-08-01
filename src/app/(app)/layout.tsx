import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";

/**
 * A Visão Geral se apoia na data de hoje. Sem isto o Next congelaria a tela na
 * data em que o build foi gerado.
 */
export const dynamic = "force-dynamic";

export default function LayoutApp({ children }: { children: ReactNode }) {
  return <EstruturaApp>{children}</EstruturaApp>;
}
