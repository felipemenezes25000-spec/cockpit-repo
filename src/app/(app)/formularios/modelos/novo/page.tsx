import type { Metadata } from "next";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import { SomenteAdministradora } from "@/components/configuracoes/somente-administradora";
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
        <SomenteAdministradora voltarPara="/formularios/modelos" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <FormularioModelo modelo={null} />
    </div>
  );
}
