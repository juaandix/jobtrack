import { describe, expect, it } from "vitest";
import { notFoundError } from "./errors";
import {
  applyStatusChange,
  groupByStatus,
  planStatusChange,
  revertStatusChange,
  settleStatusChange,
  type StatusChange,
} from "./kanban";
import type { Application } from "./repository";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
} from "@/lib/validation/application";

function application(id: string, status: ApplicationStatus): Application {
  return {
    id,
    user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
    company: `Empresa ${id}`,
    position: "Frontend",
    offer_url: null,
    portal: "linkedin",
    applied_at: "2026-11-25",
    salary_min: null,
    salary_max: null,
    status,
    notes: null,
    created_at: "2026-11-25T10:00:00Z",
    updated_at: "2026-11-25T10:00:00Z",
  };
}

const LIST: readonly Application[] = Object.freeze([
  application("a", "enviada"),
  application("b", "entrevista"),
  application("c", "enviada"),
  application("d", "oferta"),
  application("e", "enviada"),
]);

function idsByStatus(
  applications: readonly Application[],
): Record<string, string[]> {
  return Object.fromEntries(
    groupByStatus(applications).map((column) => [
      column.status,
      column.applications.map((item) => item.id),
    ]),
  );
}

describe("groupByStatus", () => {
  it("con la lista vacía devuelve todas las columnas vacías en el orden del enum", () => {
    const columns = groupByStatus([]);

    expect(columns.map((column) => column.status)).toEqual([
      ...APPLICATION_STATUSES,
    ]);
    for (const column of columns) {
      expect(column.applications).toEqual([]);
      expect(column.count).toBe(0);
    }
  });

  it("con datos en una sola columna deja el resto vacías", () => {
    const list = [application("a", "oferta"), application("b", "oferta")];

    const columns = groupByStatus(list);

    expect(columns).toHaveLength(APPLICATION_STATUSES.length);
    for (const column of columns) {
      expect(column.count).toBe(column.status === "oferta" ? 2 : 0);
    }
  });

  it("con datos en todas las columnas coloca cada candidatura en exactamente una", () => {
    const list = APPLICATION_STATUSES.map((status) =>
      application(status, status),
    );

    const columns = groupByStatus(list);

    expect(columns.map((column) => column.status)).toEqual([
      ...APPLICATION_STATUSES,
    ]);
    for (const column of columns) {
      expect(column.count).toBe(1);
      expect(column.applications[0]?.status).toBe(column.status);
    }
    const allIds = columns.flatMap((column) =>
      column.applications.map((item) => item.id),
    );
    expect(allIds.toSorted()).toEqual(list.map((item) => item.id).toSorted());
  });

  it("conserva el orden de entrada dentro de cada columna", () => {
    expect(idsByStatus(LIST)).toEqual({
      enviada: ["a", "c", "e"],
      en_proceso: [],
      entrevista: ["b"],
      oferta: ["d"],
      descartada: [],
      rechazada_por_mi: [],
    });
    const reversed = LIST.toReversed();
    expect(idsByStatus(reversed).enviada).toEqual(["e", "c", "a"]);
  });

  it("el contador coincide con el número de tarjetas y no muta la entrada", () => {
    const snapshot = structuredClone(LIST);

    const columns = groupByStatus(LIST);

    expect(columns.find((column) => column.status === "enviada")?.count).toBe(
      3,
    );
    expect(columns.reduce((total, column) => total + column.count, 0)).toBe(
      LIST.length,
    );
    expect(LIST).toEqual(snapshot);
  });
});

describe("planStatusChange", () => {
  it("describe el cambio con el estado de origen y el de destino", () => {
    expect(planStatusChange(LIST, "a", "oferta")).toEqual({
      id: "a",
      from: "enviada",
      to: "oferta",
    });
  });

  it("mover al mismo estado no es un cambio", () => {
    expect(planStatusChange(LIST, "b", "entrevista")).toBeNull();
  });

  it("un id inexistente no es un cambio", () => {
    expect(planStatusChange(LIST, "zzz", "oferta")).toBeNull();
    expect(planStatusChange([], "a", "oferta")).toBeNull();
  });
});

describe("applyStatusChange y revertStatusChange", () => {
  const change: StatusChange = { id: "a", from: "enviada", to: "oferta" };

  it("aplicar mueve la tarjeta a la columna nueva sin mutar el estado anterior", () => {
    const snapshot = structuredClone(LIST);

    const next = applyStatusChange(LIST, change);

    expect(next).not.toBe(LIST);
    expect(LIST).toEqual(snapshot);
    expect(idsByStatus(next).enviada).toEqual(["c", "e"]);
    expect(idsByStatus(next).oferta).toEqual(["a", "d"]);
    expect(next.find((item) => item.id === "a")?.status).toBe("oferta");
    expect(next[1]).toBe(LIST[1]);
  });

  it("un cambio sobre un id inexistente deja la lista igual", () => {
    const next = applyStatusChange(LIST, {
      id: "zzz",
      from: "enviada",
      to: "oferta",
    });

    expect(next).toEqual(LIST);
  });

  it("revertir devuelve exactamente el estado anterior", () => {
    const next = applyStatusChange(LIST, change);

    const reverted = revertStatusChange(next, change);

    expect(reverted).toEqual(LIST);
    expect(groupByStatus(reverted)).toEqual(groupByStatus(LIST));
  });
});

describe("settleStatusChange", () => {
  const change: StatusChange = { id: "b", from: "entrevista", to: "oferta" };

  it("si la acción falla se revierte al estado anterior", async () => {
    const failingAction = (): Promise<{
      ok: false;
      error: ReturnType<typeof notFoundError>;
    }> => Promise.resolve({ ok: false, error: notFoundError() });
    const optimistic = applyStatusChange(LIST, change);
    expect(idsByStatus(optimistic).oferta).toEqual(["b", "d"]);

    const settled = settleStatusChange(
      optimistic,
      change,
      await failingAction(),
    );

    expect(settled).toEqual(LIST);
    expect(idsByStatus(settled).entrevista).toEqual(["b"]);
  });

  it("si la acción tiene éxito usa la fila devuelta por el servidor", () => {
    const fromServer: Application = {
      ...application("b", "oferta"),
      updated_at: "2026-11-26T09:00:00Z",
    };
    const optimistic = applyStatusChange(LIST, change);

    const settled = settleStatusChange(optimistic, change, {
      ok: true,
      data: fromServer,
    });

    expect(settled[1]).toBe(fromServer);
    expect(settled.filter((item) => item.id !== "b")).toEqual(
      LIST.filter((item) => item.id !== "b"),
    );
  });
});
