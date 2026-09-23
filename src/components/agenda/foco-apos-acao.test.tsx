import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FocoAposAcao } from "./foco-apos-acao";
import type { SituacaoAtendimento } from "@/lib/dominio";

/** O bloco da lista: os botões de situação mudam com ela; o link fica. */
function Bloco({ situacao }: { situacao: SituacaoAtendimento }) {
  return (
    <FocoAposAcao situacao={situacao}>
      {situacao === "agendado" ? (
        <form onSubmit={(evento) => evento.preventDefault()}>
          <button type="submit">Confirmar</button>
        </form>
      ) : null}
      <a href="/agenda/1/editar">Remarcar ou editar</a>
    </FocoAposAcao>
  );
}

describe("FocoAposAcao — o foco depois de mudar a situação", () => {
  it("o botão clicado some: o foco vai para o próximo controle do bloco e a nova situação é anunciada", () => {
    const { rerender } = render(<Bloco situacao="agendado" />);
    const botao = screen.getByRole("button", { name: "Confirmar" });
    botao.focus();
    fireEvent.submit(botao);

    act(() => rerender(<Bloco situacao="confirmado" />));

    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Remarcar ou editar" }));
    expect(screen.getByRole("status")).toHaveTextContent("Situação agora: Confirmado.");
  });

  it("sem controle nenhum no bloco, o próprio bloco recebe o foco", () => {
    function SoBotao({ situacao }: { situacao: SituacaoAtendimento }) {
      return (
        <FocoAposAcao situacao={situacao}>
          {situacao === "em_atendimento" ? (
            <form onSubmit={(evento) => evento.preventDefault()}>
              <button type="submit">Concluir</button>
            </form>
          ) : null}
        </FocoAposAcao>
      );
    }
    const { rerender, container } = render(<SoBotao situacao="em_atendimento" />);
    const botao = screen.getByRole("button", { name: "Concluir" });
    botao.focus();
    fireEvent.submit(botao);

    act(() => rerender(<SoBotao situacao="concluido" />));

    expect(document.activeElement).toBe(container.firstElementChild);
  });

  it("mudança que veio de fora (outra pessoa, atualização da página) não rouba o foco", () => {
    const { rerender } = render(
      <>
        <input aria-label="Outro campo" />
        <Bloco situacao="agendado" />
      </>,
    );
    const outro = screen.getByRole("textbox", { name: "Outro campo" });
    outro.focus();

    act(() =>
      rerender(
        <>
          <input aria-label="Outro campo" />
          <Bloco situacao="confirmado" />
        </>,
      ),
    );

    expect(document.activeElement).toBe(outro);
    expect(screen.getByRole("status")).toHaveTextContent("");
  });

  it("depois de agir, a pessoa foi para outro lugar: o foco fica onde ela está", () => {
    const { rerender } = render(
      <>
        <input aria-label="Outro campo" />
        <Bloco situacao="agendado" />
      </>,
    );
    const botao = screen.getByRole("button", { name: "Confirmar" });
    botao.focus();
    fireEvent.submit(botao);
    const outro = screen.getByRole("textbox", { name: "Outro campo" });
    outro.focus();

    act(() =>
      rerender(
        <>
          <input aria-label="Outro campo" />
          <Bloco situacao="confirmado" />
        </>,
      ),
    );

    expect(document.activeElement).toBe(outro);
  });
});
