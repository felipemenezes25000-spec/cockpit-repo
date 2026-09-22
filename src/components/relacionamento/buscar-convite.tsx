"use client";

import { useState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import type { PacienteParaSelecao } from "@/server/acoes/agenda";
import { ConviteContato } from "./convite-contato";

export function BuscarConvite() {
  const [paciente, setPaciente] = useState<PacienteParaSelecao | null>(null);
  return <div className="space-y-4">
    <SeletorPaciente inicial={null} obrigatorio={false} aoEscolher={setPaciente} />
    {paciente && <ConviteContato pacienteId={paciente.id} nome={paciente.nome} telefone={paciente.telefone ?? null} tipo="avaliacao" />}
  </div>;
}
