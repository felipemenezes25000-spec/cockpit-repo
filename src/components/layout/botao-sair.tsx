"use client";

import { LogOut } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { sair } from "@/app/entrar/actions";

function Botao({ className, comIcone }: { className?: string; comIcone: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-3 transition-colors disabled:opacity-60",
        className,
      )}
    >
      {comIcone ? <LogOut aria-hidden="true" size={18} strokeWidth={1.5} /> : null}
      {pending ? "Saindo…" : "Sair"}
    </button>
  );
}

export function BotaoSair({
  className,
  comIcone = true,
}: {
  className?: string;
  comIcone?: boolean;
}) {
  return (
    <form action={sair}>
      <Botao
        comIcone={comIcone}
        className={
          className ??
          "h-11 rounded-[var(--radius-controle)] border border-primary bg-surface px-6 text-sm font-medium text-primary hover:bg-surface-container-low"
        }
      />
    </form>
  );
}
