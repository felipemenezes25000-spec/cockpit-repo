import { describe, expect, it } from "vitest";
import {
  enderecoDaAgenda,
  lerChaveDoDia,
  lerDiaDaAgenda,
  lerProfissional,
} from "./parametros-agenda";
import { chaveDoDia, hoje } from "@/lib/dates";

const PROFISSIONAL = "c0000000-0000-4000-8000-000000000001";

describe("lerChaveDoDia — o dia da URL", () => {
  it("aceita data que existe, inclusive 29/02 de ano bissexto", () => {
    expect(lerChaveDoDia("2026-09-23")).toBe("2026-09-23");
    expect(lerChaveDoDia("2028-02-29")).toBe("2028-02-29");
    expect(lerChaveDoDia(["2026-09-23", "2026-01-01"])).toBe("2026-09-23");
  });

  it("recusa data que não existe em vez de normalizar (31/02 virava 03/03)", () => {
    expect(lerChaveDoDia("2026-02-31")).toBeNull();
    expect(lerChaveDoDia("2027-02-29")).toBeNull();
    expect(lerChaveDoDia("2026-13-01")).toBeNull();
    expect(lerChaveDoDia("0002-09-23")).toBeNull();
  });

  it("recusa formato torto e texto injetado", () => {
    expect(lerChaveDoDia(undefined)).toBeNull();
    expect(lerChaveDoDia("")).toBeNull();
    expect(lerChaveDoDia("23/09/2026")).toBeNull();
    expect(lerChaveDoDia("2026-09-23&profissional=x")).toBeNull();
  });

  it("dia inválido na URL abre hoje, não o dia normalizado", () => {
    expect(chaveDoDia(lerDiaDaAgenda("2026-02-31"))).toBe(chaveDoDia(hoje()));
    expect(chaveDoDia(lerDiaDaAgenda("2026-09-23"))).toBe("2026-09-23");
  });
});

describe("lerProfissional — o filtro da URL", () => {
  it("só um uuid vira filtro", () => {
    expect(lerProfissional(PROFISSIONAL)).toBe(PROFISSIONAL);
    expect(lerProfissional("todas")).toBeNull();
    expect(lerProfissional(undefined)).toBeNull();
    expect(lerProfissional(`${PROFISSIONAL}' or 1=1`)).toBeNull();
  });
});

describe("enderecoDaAgenda", () => {
  it("monta o endereço mantendo o filtro", () => {
    expect(enderecoDaAgenda(null)).toBe("/agenda");
    expect(enderecoDaAgenda("2026-09-23")).toBe("/agenda?dia=2026-09-23");
    expect(enderecoDaAgenda("2026-09-23", PROFISSIONAL)).toBe(
      `/agenda?dia=2026-09-23&profissional=${PROFISSIONAL}`,
    );
    expect(enderecoDaAgenda(null, PROFISSIONAL)).toBe(`/agenda?profissional=${PROFISSIONAL}`);
  });
});
