import type { Profissional } from "./types";

/** Equipe fictícia usada na demonstração. */
export const PROFISSIONAIS: Profissional[] = [
  { id: "prof-1", nome: "Dra. Érika Passos", especialidade: "Estética avançada" },
  { id: "prof-2", nome: "Dra. Marina Rocha", especialidade: "Harmonização facial" },
  { id: "prof-3", nome: "Camila Duarte", especialidade: "Estética corporal" },
];

export function profissionalPorId(id: string): Profissional | undefined {
  return PROFISSIONAIS.find((p) => p.id === id);
}

/** Nome curto para caber em listas estreitas: "Dra. Marina". */
export function nomeCurto(nome: string): string {
  const partes = nome.split(" ");
  if (partes[0].endsWith(".")) return `${partes[0]} ${partes[1] ?? ""}`.trim();
  return partes[0];
}
