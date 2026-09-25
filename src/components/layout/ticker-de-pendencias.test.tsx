import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TickerDePendencias, type PendenciaDoTicker } from "./ticker-de-pendencias";

// O jsdom não tem ResizeObserver; o letreiro só o usa para acertar a velocidade.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    disconnect() {}
  },
);

const PENDENCIAS: PendenciaDoTicker[] = [
  {
    id: "p1",
    tipo: "Pagamento",
    paciente: "Renata Souza Vilaça",
    descricao: "Parcela em aberto",
    prioridade: "alta",
    prazo: "venceu há 3 dias",
    atrasada: true,
    destino: "/financeiro",
  },
  {
    id: "p2",
    tipo: "Anamnese",
    paciente: null,
    descricao: "Anamnese não preenchida",
    prioridade: "media",
    prazo: null,
    atrasada: false,
    destino: "/prontuarios",
  },
];

describe("TickerDePendencias", () => {
  it("cada pendência é um link só para o teclado e o leitor de tela: a cópia do laço fica de fora", () => {
    render(<TickerDePendencias pendencias={PENDENCIAS} total={10} altas={3} />);
    const regiao = screen.getByRole("region", { name: "Pendências em aberto" });

    // A lista aparece duas vezes no DOM (o laço sem emenda), mas uma cópia é oculta e sai do Tab.
    const copia = regiao.querySelector('ul[aria-hidden="true"]')!;
    expect(copia).not.toBeNull();
    for (const link of copia.querySelectorAll("a")) expect(link).toHaveAttribute("tabindex", "-1");

    const visiveis = within(regiao).getAllByRole("link").filter((link) => !copia.contains(link));
    // O rótulo "Pendências" + as duas pendências.
    expect(visiveis).toHaveLength(3);
    expect(visiveis[1]).toHaveAttribute("href", "/financeiro");
    expect(visiveis[1]).toHaveTextContent("Prioridade alta");
    // Nome curto: primeiro e último.
    expect(visiveis[1]).toHaveTextContent("Renata Vilaça");
    expect(visiveis[1]).toHaveTextContent("venceu há 3 dias");
  });

  it("o total e as prioritárias vão por extenso no rótulo", () => {
    render(<TickerDePendencias pendencias={PENDENCIAS} total={10} altas={3} />);
    expect(
      screen.getByRole("link", { name: "10 pendências em aberto, 3 de prioridade alta. Abrir o Relacionamento" }),
    ).toHaveAttribute("href", "/relacionamento");
  });

  it("o movimento pode ser parado (WCAG 2.2.2)", () => {
    render(<TickerDePendencias pendencias={PENDENCIAS} total={2} altas={1} />);
    const pausa = screen.getByRole("button", { name: "Parar de passar as pendências" });
    expect(pausa).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pausa);
    const retomar = screen.getByRole("button", { name: "Voltar a passar as pendências" });
    expect(retomar).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".ticker-trilho")).toHaveAttribute("data-pausado", "true");
  });

  it("sem pendência, diz que está tudo em dia e não mostra pausa", () => {
    render(<TickerDePendencias pendencias={[]} total={0} altas={0} />);
    expect(screen.getByText("Nada pendente agora — tudo em dia.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
