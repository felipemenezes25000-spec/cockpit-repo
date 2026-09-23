import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { garantirVersaoPostgrest, VERSAO_POSTGREST } from "../scripts/versao-postgrest.mjs";

const SEM_BLOCO = "export type Json = string\n\nexport type Database = {\n  public: {\n    Tables: {}\n  }\n}\n";

describe("garantirVersaoPostgrest", () => {
  it("reinjeta o __InternalSupabase que o `gen types --local` omite", () => {
    const saida = garantirVersaoPostgrest(SEM_BLOCO, "14.5");
    expect(saida).toContain('export type Database = {\n  // Allows');
    expect(saida).toContain('__InternalSupabase: {\n    PostgrestVersion: "14.5"\n  }\n  public: {');
  });

  it("não duplica quando a saída (--linked) já traz o bloco", () => {
    const uma = garantirVersaoPostgrest(SEM_BLOCO);
    expect(garantirVersaoPostgrest(uma)).toBe(uma);
  });

  it("preserva quebras CRLF", () => {
    const saida = garantirVersaoPostgrest(SEM_BLOCO.replace(/\n/g, "\r\n"));
    expect(saida).toContain('__InternalSupabase: {\r\n    PostgrestVersion: ');
    expect(saida.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("a versão fixada bate com a do tipos-banco.ts versionado", () => {
    const arquivo = readFileSync(new URL("../src/lib/supabase/tipos-banco.ts", import.meta.url), "utf8");
    expect(arquivo).toContain(`PostgrestVersion: "${VERSAO_POSTGREST}"`);
  });
});
