import { hoje, instanteNaClinica, partesDoDia } from "./dates";

/**
 * Período mensal das telas financeiras, guardado na URL como `?mes=AAAA-MM`.
 * Mesmo raciocínio do dia da Agenda: recarregar, voltar e mandar o link de um
 * mês específico funcionam.
 */

export type Periodo = {
  /** Primeiro instante do mês, no relógio da clínica. */
  de: Date;
  /** Primeiro instante do mês seguinte — limite exclusivo. */
  ate: Date;
  chave: string;
  chaveAnterior: string;
  chaveProxima: string;
  ehMesAtual: boolean;
};

function chaveDe(ano: number, mes: number): string {
  // Normaliza mês fora de 1..12 (dezembro + 1 vira janeiro do ano seguinte).
  const instante = instanteNaClinica(ano, mes, 1);
  const partes = partesDoDia(instante);
  return `${partes.ano}-${String(partes.mes).padStart(2, "0")}`;
}

/** Aceita só "AAAA-MM"; qualquer outra coisa cai no mês corrente. */
export function lerMes(valor: string | string[] | undefined): Periodo {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  const agora = partesDoDia(hoje());

  let ano = agora.ano;
  let mes = agora.mes;

  if (texto && /^\d{4}-\d{2}$/.test(texto)) {
    const [a, m] = texto.split("-").map(Number);
    if (m >= 1 && m <= 12 && a >= 2000 && a <= 2100) {
      ano = a;
      mes = m;
    }
  }

  return {
    de: instanteNaClinica(ano, mes, 1),
    ate: instanteNaClinica(ano, mes + 1, 1),
    chave: chaveDe(ano, mes),
    chaveAnterior: chaveDe(ano, mes - 1),
    chaveProxima: chaveDe(ano, mes + 1),
    ehMesAtual: ano === agora.ano && mes === agora.mes,
  };
}

/** Colunas `date` do Postgres comparam com texto "AAAA-MM-DD". */
export function dataParaColuna(instante: Date): string {
  const { ano, mes, dia } = partesDoDia(instante);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
