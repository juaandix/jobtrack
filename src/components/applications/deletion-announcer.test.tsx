import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DeletionAnnouncer, useAnnounceDeletion } from "./deletion-announcer";

function AnnounceButton({ message }: { message: string }) {
  const announce = useAnnounceDeletion();
  return (
    <button type="button" onClick={() => announce?.(message)}>
      Anunciar
    </button>
  );
}

function liveRegion(): HTMLElement {
  const region = document.querySelector("[aria-live]");
  if (!(region instanceof HTMLElement)) throw new Error("sin región aria-live");
  return region;
}

describe("DeletionAnnouncer", () => {
  it("pinta el contenido y una región aria-live vacía", () => {
    render(
      <DeletionAnnouncer>
        <h1 tabIndex={-1}>Mis candidaturas</h1>
      </DeletionAnnouncer>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Mis candidaturas" }),
    ).toBeInTheDocument();
    expect(liveRegion()).toHaveAttribute("aria-live", "polite");
    expect(liveRegion()).toHaveAttribute("aria-atomic", "true");
    expect(liveRegion()).toBeEmptyDOMElement();
  });

  it("al anunciar escribe el mensaje y enfoca el h1", async () => {
    const user = userEvent.setup();
    render(
      <DeletionAnnouncer>
        <h1 tabIndex={-1}>Mis candidaturas</h1>
        <AnnounceButton message="Candidatura borrada: Frontend en Acme." />
      </DeletionAnnouncer>,
    );

    await user.click(screen.getByRole("button", { name: "Anunciar" }));

    expect(liveRegion()).toHaveTextContent(
      "Candidatura borrada: Frontend en Acme.",
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveFocus();
  });

  it("un mensaje repetido se escribe en un nodo nuevo para volver a anunciarse", async () => {
    const user = userEvent.setup();
    render(
      <DeletionAnnouncer>
        <h1 tabIndex={-1}>Mis candidaturas</h1>
        <AnnounceButton message="Candidatura borrada: Frontend en Acme." />
      </DeletionAnnouncer>,
    );
    const button = screen.getByRole("button", { name: "Anunciar" });

    await user.click(button);
    const first = liveRegion().firstElementChild;
    await user.click(button);
    const second = liveRegion().firstElementChild;

    expect(first).not.toBeNull();
    expect(second).not.toBe(first);
    expect(second).toHaveTextContent("Candidatura borrada: Frontend en Acme.");
  });

  it("fuera de un DeletionAnnouncer el hook devuelve null", async () => {
    const user = userEvent.setup();
    render(<AnnounceButton message="Hola" />);

    await user.click(screen.getByRole("button", { name: "Anunciar" }));

    expect(document.querySelector("[aria-live]")).toBeNull();
  });
});
