import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioTarefa } from "@/components/relacionamento/formulario-tarefa";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nova tarefa de contato" };

export default function PaginaNovaTarefa() {
  return <div className="mx-auto max-w-3xl"><Link href="/relacionamento?aba=tarefas" className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary"><ArrowLeft aria-hidden="true" size={16} /> Voltar ao relacionamento</Link><Card><CardCabecalho titulo="Criar tarefa de contato" descricao="Registre o próximo passo e um prazo, se houver." /><CardCorpo><FormularioTarefa /></CardCorpo></Card></div>;
}
