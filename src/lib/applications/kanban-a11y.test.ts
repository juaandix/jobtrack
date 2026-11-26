import type { Active, Over } from "@dnd-kit/core";
import { describe, expect, it } from "vitest";
import {
  DRAG_INSTRUCTIONS,
  adjacentColumnPosition,
  applicationName,
  columnLabel,
  dragAnnouncements,
  statusChangeFailedMessage,
  statusChangedMessage,
  statusFromDropId,
  type ColumnBox,
} from "./kanban-a11y";
import { APPLICATION_STATUSES } from "@/lib/validation/application";

/** The announcements only read `id`; the rest of dnd-kit's objects is irrelevant. */
function active(id: string): Active {
  return {
    id,
    data: { current: undefined },
    rect: { current: { initial: null, translated: null } },
  };
}

function over(id: string | number): Over {
  return {
    id,
    rect: { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0 },
    disabled: false,
    data: { current: undefined },
  };
}

const announcements = dragAnnouncements((id) =>
  id === "a1" ? "Frontend en Acme" : `desconocida ${id}`,
);

describe("applicationName", () => {
  it("nombra la candidatura por puesto y empresa", () => {
    expect(applicationName({ company: "Acme", position: "Frontend" })).toBe(
      "Frontend en Acme",
    );
  });
});

describe("columnLabel", () => {
  it("nombra la columna con su estado y el número de candidaturas", () => {
    expect(columnLabel("entrevista", 2)).toBe("Entrevista, 2 candidaturas");
    expect(columnLabel("oferta", 1)).toBe("Oferta, 1 candidatura");
    expect(columnLabel("rechazada_por_mi", 0)).toBe(
      "Rechazada por mí, 0 candidaturas",
    );
  });
});

describe("statusFromDropId", () => {
  it("devuelve el estado de cada columna", () => {
    for (const status of APPLICATION_STATUSES) {
      expect(statusFromDropId(status)).toBe(status);
    }
  });

  it.each([
    ["nulo", null],
    ["indefinido", undefined],
    ["un número", 3],
    ["un texto fuera del enum", "aceptada"],
    ["un texto vacío", ""],
  ])("con %s devuelve null", (_case, id) => {
    expect(statusFromDropId(id)).toBeNull();
  });
});

describe("dragAnnouncements", () => {
  it("anuncia en español al coger la tarjeta", () => {
    expect(announcements.onDragStart({ active: active("a1") })).toBe(
      "Has cogido la candidatura de Frontend en Acme.",
    );
  });

  it("anuncia la columna sobre la que está o que no hay ninguna", () => {
    expect(
      announcements.onDragOver({
        active: active("a1"),
        over: over("entrevista"),
      }),
    ).toBe(
      "La candidatura de Frontend en Acme está sobre la columna Entrevista.",
    );
    expect(announcements.onDragOver({ active: active("a1"), over: null })).toBe(
      "La candidatura de Frontend en Acme no está sobre ninguna columna.",
    );
  });

  it("anuncia dónde se suelta, y que fuera de las columnas no cambia", () => {
    expect(
      announcements.onDragEnd({
        active: active("a1"),
        over: over("rechazada_por_mi"),
      }),
    ).toBe(
      "Has soltado la candidatura de Frontend en Acme en la columna Rechazada por mí.",
    );
    expect(announcements.onDragEnd({ active: active("a1"), over: null })).toBe(
      "Has soltado la candidatura de Frontend en Acme fuera de las columnas. No cambia de estado.",
    );
    expect(
      announcements.onDragEnd({ active: active("a1"), over: over(7) }),
    ).toBe(
      "Has soltado la candidatura de Frontend en Acme fuera de las columnas. No cambia de estado.",
    );
  });

  it("anuncia la cancelación", () => {
    expect(
      announcements.onDragCancel({
        active: active("a1"),
        over: over("oferta"),
      }),
    ).toBe(
      "Movimiento cancelado. La candidatura de Frontend en Acme no cambia de estado.",
    );
  });

  it("las instrucciones explican el uso con teclado en español", () => {
    expect(DRAG_INSTRUCTIONS.draggable).toContain("Espacio o Intro");
    expect(DRAG_INSTRUCTIONS.draggable).toContain("Escape para cancelar");
  });
});

describe("mensajes de cambio de estado", () => {
  it("confirma el estado nuevo con su etiqueta", () => {
    expect(statusChangedMessage("Frontend en Acme", "en_proceso")).toBe(
      "La candidatura de Frontend en Acme está ahora en En proceso.",
    );
  });

  it("explica el fallo, el estado al que vuelve y el motivo", () => {
    expect(
      statusChangeFailedMessage(
        "Frontend en Acme",
        "enviada",
        "No se han podido guardar los cambios. Inténtalo de nuevo.",
      ),
    ).toBe(
      "No se ha podido mover la candidatura de Frontend en Acme; sigue en Enviada. No se han podido guardar los cambios. Inténtalo de nuevo.",
    );
  });
});

describe("adjacentColumnPosition", () => {
  // Three 200 px columns with 20 px gaps, given out of order on purpose.
  const columns: ColumnBox[] = [
    { left: 440, width: 200 },
    { left: 0, width: 200 },
    { left: 220, width: 200 },
  ];
  const CARD = 180;

  it("a la derecha centra la tarjeta en la columna siguiente, a la misma altura", () => {
    expect(adjacentColumnPosition({ x: 10, y: 75 }, CARD, columns, 1)).toEqual({
      x: 230,
      y: 75,
    });
  });

  it("a la izquierda va a la columna anterior", () => {
    expect(
      adjacentColumnPosition({ x: 450, y: 30 }, CARD, columns, -1),
    ).toEqual({ x: 230, y: 30 });
  });

  it("en los extremos no hay columna a la que ir", () => {
    expect(
      adjacentColumnPosition({ x: 10, y: 0 }, CARD, columns, -1),
    ).toBeNull();
    expect(
      adjacentColumnPosition({ x: 450, y: 0 }, CARD, columns, 1),
    ).toBeNull();
  });

  it("con el centro entre dos columnas parte de la más cercana", () => {
    // Centre at 205: 5 px right of the first column, 15 px left of the second.
    expect(adjacentColumnPosition({ x: 115, y: 0 }, CARD, columns, 1)).toEqual({
      x: 230,
      y: 0,
    });
    // Centre at 218: 2 px left of the second column.
    expect(adjacentColumnPosition({ x: 128, y: 0 }, CARD, columns, 1)).toEqual({
      x: 450,
      y: 0,
    });
  });

  it("con el centro fuera de todas parte de la del extremo", () => {
    expect(adjacentColumnPosition({ x: 900, y: 0 }, CARD, columns, -1)).toEqual(
      { x: 230, y: 0 },
    );
  });

  it("sin columnas devuelve null", () => {
    expect(adjacentColumnPosition({ x: 0, y: 0 }, CARD, [], 1)).toBeNull();
  });

  it("no modifica la lista de columnas", () => {
    const frozen = Object.freeze([...columns]);
    adjacentColumnPosition({ x: 10, y: 0 }, CARD, frozen, 1);
    expect(frozen[0]).toEqual({ left: 440, width: 200 });
  });
});
