import { aniversarioNesteAno, diferencaEmDias, hoje } from "@/lib/dates";
import { PACIENTES } from "./patients";
import type { Paciente } from "./types";

export type Aniversariante = {
  paciente: Paciente;
  data: Date;
  /** Negativo = já passou neste mês. */
  emDias: number;
};

/** Aniversariantes do mês corrente, das datas mais próximas para as mais distantes. */
export function aniversariantesDoMes(): Aniversariante[] {
  const mesAtual = hoje().getMonth() + 1;

  return PACIENTES.filter((p) => p.aniversario.mes === mesAtual)
    .map((paciente) => {
      const data = aniversarioNesteAno(paciente.aniversario.dia, paciente.aniversario.mes);
      return { paciente, data, emDias: diferencaEmDias(data) };
    })
    .sort((a, b) => a.data.getDate() - b.data.getDate());
}
