import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EtapaDoPainel } from "@/server/consultas/captacao";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("mes=2026-09&pagina=3"),
}));

const { FunilVivo } = await import("./funil-vivo");

const ETAPAS: EtapaDoPainel[] = [
  { etapa: "novo", volume: 64, conversao: null, necessarioAgora: 42 },
  { etapa: "qualificado", volume: 38, conversao: 59.4, necessarioAgora: 25 },
  { etapa: "agendamento", volume: 21, conversao: 55.3, necessarioAgora: 15 },
  { etapa: "ganho", volume: 13, conversao: 61.9, necessarioAgora: 10 },
];

/** `prefers-reduced-motion`: sem `matchMedia` (jsdom puro) o funil fica parado. */
function movimento(reduzido: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((consulta: string) => ({
      matches: reduzido && consulta.includes("reduce"),
      media: consulta,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

const desenho = (container: HTMLElement) => container.querySelector("svg[data-funil-3d]") as SVGSVGElement;
const animacoes = (svg: SVGSVGElement) => svg.querySelectorAll("animate, animateMotion, animateTransform").length;

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

/** A qualidade que o aparelho já provou aguentar (o componente começa "leve"). */
const qualidade = (valor: "plena" | "leve" | "parada") => window.localStorage.setItem("cockpit.funil.qualidade", valor);

describe("FunilVivo (funil 3D)", () => {
  it("dá um botão por etapa, com nome e volume, e abre na entrada de leads", () => {
    movimento(true);
    render(<FunilVivo etapas={ETAPAS} />);
    const nomes = ["Entrada de leads: 64", "Lead qualificado: 38", "Agendamento: 21", "Venda concluída: 13"];
    for (const nome of nomes) expect(screen.getByRole("button", { name: nome })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entrada de leads: 64" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Agendamento: 21" })).toHaveAttribute("aria-pressed", "false");

    const painel = screen.getByRole("complementary", { name: "Etapa selecionada" });
    expect(within(painel).getByText("Entrada de leads")).toBeInTheDocument();
    expect(within(painel).getByText("+42")).toBeInTheDocument();
    expect(within(painel).getByText("—")).toBeInTheDocument();
  });

  it("mostra volume e conversão de cada etapa no balão ao lado da faixa", () => {
    movimento(true);
    render(<FunilVivo etapas={ETAPAS} />);
    const qualificado = screen.getByRole("button", { name: "Lead qualificado: 38" });
    expect(qualificado).toHaveTextContent("Volume: 38");
    expect(qualificado).toHaveTextContent("Conversão: 59,4%");
    expect(screen.getByRole("button", { name: "Entrada de leads: 64" })).toHaveTextContent("Conversão: —");
  });

  it("troca a etapa ao tocar e leva a carteira filtrada, sem a página antiga", () => {
    movimento(true);
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    fireEvent.click(screen.getByRole("button", { name: "Agendamento: 21" }));

    expect(screen.getByRole("button", { name: "Agendamento: 21" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Entrada de leads: 64" })).toHaveAttribute("aria-pressed", "false");
    const painel = screen.getByRole("complementary", { name: "Etapa selecionada" });
    expect(within(painel).getByText("55,3%")).toBeInTheDocument();
    expect(within(painel).getByText("+15")).toBeInTheDocument();
    expect(within(painel).getByRole("link", { name: /Ver quem está nesta etapa agora/ })).toHaveAttribute(
      "href",
      "/captacao?mes=2026-09&etapa=agendamento",
    );
    // No desenho, a faixa escolhida é marcada para se destacar.
    expect(desenho(container).querySelector('[data-faixa="2"]')).toHaveAttribute("data-sel", "sim");
    expect(desenho(container).querySelector('[data-faixa="0"]')).not.toHaveAttribute("data-sel");
  });

  it("solta uma onda de luz na faixa escolhida a cada troca — e nada disso com movimento reduzido", () => {
    movimento(false);
    const { container, unmount } = render(<FunilVivo etapas={ETAPAS} />);
    expect(desenho(container).querySelector("[data-onda]")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Agendamento: 21" }));
    expect(desenho(container).querySelector('[data-faixa="2"] [data-onda]')).not.toBeNull();
    unmount();

    movimento(true);
    const parado = render(<FunilVivo etapas={ETAPAS} />);
    fireEvent.click(screen.getByRole("button", { name: "Agendamento: 21" }));
    expect(desenho(parado.container).querySelector("[data-onda]")).toBeNull();
  });

  it("é decorativo para quem lê a tela: o desenho fica fora da árvore de acessibilidade", () => {
    movimento(true);
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    expect(desenho(container)).toHaveAttribute("aria-hidden", "true");
    expect(desenho(container)).toHaveAttribute("focusable", "false");
  });

  it("fica parado quando a pessoa pede menos movimento", () => {
    movimento(true);
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    expect(animacoes(desenho(container))).toBe(0);
  });

  it("começa leve: leads entram e moedas saem, mas sem frisos girando nem estrelas piscando", () => {
    movimento(false);
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    const svg = desenho(container);
    expect(svg.querySelectorAll('animate[attributeName="d"]').length).toBe(0);
    expect(svg.querySelectorAll("animateMotion").length).toBeGreaterThanOrEqual(5 + 4);
  });

  it("no aparelho que já provou aguentar, ganha vida inteira: giro, vórtice, leads entrando e moedas saindo", () => {
    movimento(false);
    qualidade("plena");
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    const svg = desenho(container);
    expect(animacoes(svg)).toBeGreaterThan(40);
    // Frisos das faixas girando (o "d" de cada filete muda ao longo da volta).
    expect(svg.querySelectorAll('animate[attributeName="d"]').length).toBe(6 * 4);
    // Leads e moedas se movem por caminho.
    expect(svg.querySelectorAll("animateMotion").length).toBeGreaterThanOrEqual(5 + 4);
  });

  it("no aparelho sem fôlego, fica parado mesmo com o movimento liberado", () => {
    movimento(false);
    qualidade("parada");
    const { container } = render(<FunilVivo etapas={ETAPAS} />);
    expect(animacoes(desenho(container))).toBe(0);
  });

  it("sem entradas no período, não mostra fluxo (nem leads nem moedas), só o funil girando", () => {
    movimento(false);
    qualidade("plena");
    const vazias = ETAPAS.map((etapa) => ({ ...etapa, volume: 0, conversao: null }));
    const { container } = render(<FunilVivo etapas={vazias} />);
    expect(screen.getByText("aguardando entradas")).toBeInTheDocument();
    const svg = desenho(container);
    expect(svg.querySelectorAll('animate[attributeName="d"]').length).toBe(6 * 4);
    // Só os brilhos das bordas andam por caminho; leads, moedas e espiral somem.
    expect(svg.querySelectorAll("animateMotion").length).toBe(4 * 2);
  });

  it("não desenha nada sem etapas", () => {
    movimento(true);
    const { container } = render(<FunilVivo etapas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
