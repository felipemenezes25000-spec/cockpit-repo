import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRetorno } from "@/components/relacionamento/formulario-retorno";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";

export const metadata: Metadata = { title: "Novo retorno" };

export default function PaginaNovoRetorno() {
  return <div className="mx-auto max-w-3xl"><Link href="/relacionamento?aba=retornos" className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary"><ArrowLeft aria-hidden="true" size={16} /> Voltar ao relacionamento</Link><Card><CardCabecalho titulo="Registrar retorno" descricao="A data é combinada pela equipe com a paciente." /><CardCorpo><FormularioRetorno /></CardCorpo></Card></div>;
}
