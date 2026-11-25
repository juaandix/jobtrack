import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APPLICATION_ERROR_MESSAGES, notFoundError } from "./errors";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication,
  type Application,
} from "./repository";
import { APPLICATION_MESSAGES } from "@/lib/validation/application";

type QueryResult = { data: unknown; error: unknown };
type Call = { method: string; args: unknown[] };

/**
 * Fake of the Supabase query builder: every method records its call and
 * returns the builder, which resolves (when awaited) to `state.result`.
 */
const state: { calls: Call[]; table: string | null; result: QueryResult } =
  vi.hoisted(() => ({
    calls: [],
    table: null,
    result: { data: null, error: null },
  }));

const createClient = vi.hoisted(() =>
  vi.fn(async () => {
    const builder: Record<string, unknown> = {};
    for (const method of [
      "select",
      "insert",
      "update",
      "delete",
      "eq",
      "order",
      "single",
      "maybeSingle",
    ]) {
      builder[method] = (...args: unknown[]) => {
        state.calls.push({ method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) =>
      resolve(state.result);
    return {
      from: (table: string) => {
        state.table = table;
        return builder;
      },
    };
  }),
);

vi.mock("@/lib/supabase/server", () => ({ createClient }));

const ID = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

const ROW: Application = {
  id: ID,
  user_id: "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  company: "Acme",
  position: "Frontend",
  offer_url: null,
  portal: "linkedin",
  applied_at: "2026-11-25",
  salary_min: 30000,
  salary_max: 40000,
  status: "enviada",
  notes: null,
  created_at: "2026-11-25T10:00:00Z",
  updated_at: "2026-11-25T10:00:00Z",
};

const VALID_INPUT = {
  company: "  Acme ",
  position: "Frontend",
  applied_at: "2026-11-25",
  portal: "linkedin",
  salary_min: "30000",
  salary_max: "40000",
};

const SALARY_ORDER_ERROR = {
  code: "23514",
  message:
    'new row for relation "applications" violates check constraint "applications_salary_order"',
};

function respond(result: QueryResult): void {
  state.result = result;
}

function calls(): Call[] {
  return state.calls;
}

function argsOf(method: string): unknown[] | undefined {
  return state.calls.find((call) => call.method === method)?.args;
}

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.clearAllMocks();
  state.calls = [];
  state.table = null;
  state.result = { data: null, error: null };
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

describe("listApplications", () => {
  it("lista las candidaturas ordenadas por applied_at desc", async () => {
    respond({ data: [ROW], error: null });

    const result = await listApplications();

    expect(result).toEqual({ ok: true, data: [ROW] });
    expect(state.table).toBe("applications");
    expect(calls()).toEqual([
      { method: "select", args: ["*"] },
      { method: "order", args: ["applied_at", { ascending: false }] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("devuelve una lista vacía si no hay candidaturas", async () => {
    respond({ data: [], error: null });

    expect(await listApplications()).toEqual({ ok: true, data: [] });
  });

  it("un error de BD da un mensaje genérico y solo registra el código", async () => {
    respond({ data: null, error: { code: "XX000", message: "detalle" } });

    expect(await listApplications()).toEqual({
      ok: false,
      error: {
        kind: "unknown",
        message: APPLICATION_ERROR_MESSAGES.unknown.list,
        fieldErrors: {},
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[applications] list failed",
      "XX000",
    );
  });
});

describe("getApplication", () => {
  it("devuelve la candidatura por id", async () => {
    respond({ data: ROW, error: null });

    expect(await getApplication(ID)).toEqual({ ok: true, data: ROW });
    expect(calls()).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["id", ID] },
      { method: "maybeSingle", args: [] },
    ]);
  });

  it("inexistente o ajena (RLS devuelve 0 filas) → no encontrada", async () => {
    respond({ data: null, error: null });

    expect(await getApplication(ID)).toEqual({
      ok: false,
      error: notFoundError(),
    });
  });

  it("un id que no es un uuid → no encontrada sin consultar la BD", async () => {
    expect(await getApplication("no-es-un-uuid")).toEqual({
      ok: false,
      error: notFoundError(),
    });
    expect(await getApplication("")).toEqual({
      ok: false,
      error: notFoundError(),
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un error de BD da un mensaje genérico", async () => {
    respond({ data: null, error: { code: "XX000", message: "detalle" } });

    const result = await getApplication(ID);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toBe(APPLICATION_ERROR_MESSAGES.unknown.get);
    }
  });
});

describe("createApplication", () => {
  it("valida, normaliza e inserta sin enviar user_id", async () => {
    respond({ data: ROW, error: null });

    const result = await createApplication({
      ...VALID_INPUT,
      user_id: "otro-usuario",
      id: "id-elegido",
      created_at: "2000-01-01",
    });

    expect(result).toEqual({ ok: true, data: ROW });
    const [payload] = argsOf("insert") ?? [];
    expect(payload).toEqual({
      company: "Acme",
      position: "Frontend",
      applied_at: "2026-11-25",
      portal: "linkedin",
      offer_url: null,
      salary_min: 30000,
      salary_max: 40000,
      notes: null,
    });
    expect(payload).not.toHaveProperty("user_id");
    expect(calls().map((call) => call.method)).toEqual([
      "insert",
      "select",
      "single",
    ]);
  });

  it("con datos inválidos no toca la BD y devuelve errores por campo", async () => {
    const result = await createApplication({
      company: "",
      position: "Frontend",
      applied_at: "no-es-fecha",
      salary_min: "50000",
      salary_max: "40000",
      status: "inventado",
    });

    expect(createClient).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_ERROR_MESSAGES.invalidData,
        fieldErrors: {
          company: APPLICATION_MESSAGES.companyRequired,
          applied_at: APPLICATION_MESSAGES.appliedAtInvalid,
          salary_max: APPLICATION_MESSAGES.salaryOrder,
          status: APPLICATION_MESSAGES.statusInvalid,
        },
      },
    });
  });

  it("una entrada que no es un objeto es un error de validación", async () => {
    const result = await createApplication(null);

    expect(createClient).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_MESSAGES.invalidForm,
        fieldErrors: {},
      },
    });
  });

  it("la violación de applications_salary_order se traduce al campo salary_max", async () => {
    respond({ data: null, error: SALARY_ORDER_ERROR });

    expect(await createApplication(VALID_INPUT)).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_ERROR_MESSAGES.invalidData,
        fieldErrors: { salary_max: APPLICATION_MESSAGES.salaryOrder },
      },
    });
  });

  it("sin sesión (RLS rechaza la fila) → error de autorización", async () => {
    respond({
      data: null,
      error: { code: "42501", message: "row-level security" },
    });

    const result = await createApplication(VALID_INPUT);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe("unauthorized");
      expect(result.error.message).toBe(
        APPLICATION_ERROR_MESSAGES.unauthorized,
      );
    }
  });
});

describe("updateApplication", () => {
  it("valida y actualiza solo los campos enviados, sin user_id", async () => {
    const updated: Application = { ...ROW, status: "entrevista" };
    respond({ data: updated, error: null });

    const result = await updateApplication(ID, {
      status: "entrevista",
      user_id: "otro-usuario",
    });

    expect(result).toEqual({ ok: true, data: updated });
    expect(calls()).toEqual([
      { method: "update", args: [{ status: "entrevista" }] },
      { method: "eq", args: ["id", ID] },
      { method: "select", args: ["*"] },
      { method: "maybeSingle", args: [] },
    ]);
  });

  it("un campo opcional vacío se envía como null para borrarlo", async () => {
    respond({ data: ROW, error: null });

    await updateApplication(ID, { notes: "  ", offer_url: "" });

    expect(argsOf("update")).toEqual([{ notes: null, offer_url: null }]);
  });

  it("inexistente o ajena (0 filas actualizadas) → no encontrada", async () => {
    respond({ data: null, error: null });

    expect(await updateApplication(ID, { status: "oferta" })).toEqual({
      ok: false,
      error: notFoundError(),
    });
  });

  it("un id que no es un uuid → no encontrada sin consultar la BD", async () => {
    expect(await updateApplication("123", { status: "oferta" })).toEqual({
      ok: false,
      error: notFoundError(),
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("sin cambios → error de validación sin tocar la BD", async () => {
    expect(await updateApplication(ID, {})).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_MESSAGES.noChanges,
        fieldErrors: {},
      },
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("con un campo inválido devuelve su error sin tocar la BD", async () => {
    const result = await updateApplication(ID, { portal: "monster" });

    expect(createClient).not.toHaveBeenCalled();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.fieldErrors).toEqual({
        portal: APPLICATION_MESSAGES.portalInvalid,
      });
    }
  });

  it("la violación de applications_salary_order (solo un salario enviado) va a salary_max", async () => {
    respond({ data: null, error: SALARY_ORDER_ERROR });

    const result = await updateApplication(ID, { salary_max: "1000" });

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "validation",
        message: APPLICATION_ERROR_MESSAGES.invalidData,
        fieldErrors: { salary_max: APPLICATION_MESSAGES.salaryOrder },
      },
    });
  });

  it("un error de BD da un mensaje genérico", async () => {
    respond({ data: null, error: { code: "08006", message: "conexión" } });

    const result = await updateApplication(ID, { status: "oferta" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({
        kind: "unknown",
        message: APPLICATION_ERROR_MESSAGES.unknown.update,
        fieldErrors: {},
      });
    }
  });
});

describe("deleteApplication", () => {
  it("borra la candidatura y devuelve su id", async () => {
    respond({ data: { id: ID }, error: null });

    expect(await deleteApplication(ID)).toEqual({
      ok: true,
      data: { id: ID },
    });
    expect(calls()).toEqual([
      { method: "delete", args: [] },
      { method: "eq", args: ["id", ID] },
      { method: "select", args: ["id"] },
      { method: "maybeSingle", args: [] },
    ]);
  });

  it("inexistente o ajena (0 filas borradas) → no encontrada", async () => {
    respond({ data: null, error: null });

    expect(await deleteApplication(ID)).toEqual({
      ok: false,
      error: notFoundError(),
    });
  });

  it("un id que no es un uuid → no encontrada sin consultar la BD", async () => {
    expect(await deleteApplication("../otra")).toEqual({
      ok: false,
      error: notFoundError(),
    });
    expect(createClient).not.toHaveBeenCalled();
  });

  it("un error de BD da un mensaje genérico", async () => {
    respond({ data: null, error: { message: "sin código" } });

    const result = await deleteApplication(ID);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "unknown",
        message: APPLICATION_ERROR_MESSAGES.unknown.delete,
        fieldErrors: {},
      },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[applications] delete failed",
      "unknown",
    );
  });
});
