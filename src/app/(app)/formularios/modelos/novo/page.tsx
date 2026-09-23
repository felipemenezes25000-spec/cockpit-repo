import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import {
  EXPLICACAO_MODELOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { ehAdministradora } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Novo modelo",
  description: "Cadastra o texto-base de um contrato, termo ou orientação.",
};

export default async function PaginaNovoModelo() {
  const administradora = await ehAdministradora();

  // Esconder a tela não protege a rota: `criarModelo` repete a checagem, e a
  // função do banco repete de novo.
  if (!administradora) {
    return (
      <div>
        <SomenteAdministradora
          voltarPara="/formularios/modelos"
          explicacao={EXPLICACAO_MODELOS}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/formularios/modelos"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para modelos
      </Link>
      <FormularioModelo modelo={null} />
    </div>
  );
}
