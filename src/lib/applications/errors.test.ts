import { describe, expect, it } from "vitest";
import {
  APPLICATION_ERROR_MESSAGES,
  applicationDatabaseError,
  databaseErrorCode,
  notFoundError,
  validationError,
} from "./errors";
import {
  APPLICATION_MESSAGES,
  applicationCreateSchema,
  applicationUpdateSchema,
} from "@/lib/validation/application";

function checkViolation(constraint: string): {
  code: string;
  message: string;
  details: string;
} {
  return {
    code: "23514",
    message: `new row for relation "applications" violates check constraint "${constraint}"`,
    details: "Failing row contains (secret, data)",
  };
}

describe("applicationDatabaseError", () => {
  it("traduce applications_salary_order a un error del campo salary_max", () => {
    const error = applicationDatabaseError(
      checkViolation("applications_salary_order"),
      "create",
    );

    expect(error).toEqual({
      kind: "validation",
      message: APPLICATION_ERROR_MESSAGES.invalidData,
      fieldErrors: { salary_max: APPLICATION_MESSAGES.salaryOrder },
    });
  });

  it.each([
    [
      "applications_company_length",
      "company",
      APPLICATION_ERROR_MESSAGES.companyInvalid,
    ],
    [
      "applications_position_length",
      "position",
      APPLICATION_ERROR_MESSAGES.positionInvalid,
    ],
    [
      "applications_offer_url_length",
      "offer_url",
      APPLICATION_MESSAGES.offerUrlTooLong,
    ],
    [
      "applications_offer_url_format",
      "offer_url",
      APPLICATION_MESSAGES.offerUrlInvalid,
    ],
    [
      "applications_salary_min_range",
      "salary_min",
      APPLICATION_ERROR_MESSAGES.salaryOutOfRange,
    ],
    [
      "applications_salary_max_range",
      "salary_max",
      APPLICATION_ERROR_MESSAGES.salaryOutOfRange,
    ],
    ["applications_notes_length", "notes", APPLICATION_MESSAGES.notesTooLong],
  ])("traduce %s al campo %s", (constraint, field, message) => {
    const error = applicationDatabaseError(
      checkViolation(constraint),
      "update",
    );

    expect(error.kind).toBe("validation");
    expect(error.fieldErrors).toEqual({ [field]: message });
  });

  it("un CHECK desconocido o sin nombre da un error de validación genérico", () => {
    for (const error of [
      checkViolation("otra_restriccion"),
      { code: "23514", message: "check failed" },
      { code: "23514" },
    ]) {
      expect(applicationDatabaseError(error, "create")).toEqual({
        kind: "validation",
        message: APPLICATION_ERROR_MESSAGES.invalidData,
        fieldErrors: {},
      });
    }
  });

  it.each(["23502", "22P02"])(
    "el código %s es un error de validación genérico",
    (code) => {
      expect(
        applicationDatabaseError({ code, message: "detalle" }, "create"),
      ).toEqual({
        kind: "validation",
        message: APPLICATION_ERROR_MESSAGES.invalidData,
        fieldErrors: {},
      });
    },
  );

  it("42501 (sin permiso o sin sesión) es un error de autorización", () => {
    expect(
      applicationDatabaseError(
        {
          code: "42501",
          message: 'new row violates row-level security policy for table "x"',
        },
        "create",
      ),
    ).toEqual({
      kind: "unauthorized",
      message: APPLICATION_ERROR_MESSAGES.unauthorized,
      fieldErrors: {},
    });
  });

  it("PGRST116 (0 filas) es 'no encontrada' salvo al listar", () => {
    const error = { code: "PGRST116", message: "0 rows" };

    expect(applicationDatabaseError(error, "get")).toEqual(notFoundError());
    expect(applicationDatabaseError(error, "list")).toEqual({
      kind: "unknown",
      message: APPLICATION_ERROR_MESSAGES.unknown.list,
      fieldErrors: {},
    });
  });

  it.each(["list", "get", "create", "update", "delete"] as const)(
    "un error desconocido en %s da el mensaje genérico de la operación",
    (operation) => {
      const error = applicationDatabaseError(
        { code: "XX000", message: 'relation "applications" internal detail' },
        operation,
      );

      expect(error).toEqual({
        kind: "unknown",
        message: APPLICATION_ERROR_MESSAGES.unknown[operation],
        fieldErrors: {},
      });
      expect(error.message).not.toContain("applications");
    },
  );

  it("tolera errores sin forma de error de Supabase", () => {
    for (const error of [null, undefined, "fallo", 42, { code: 500 }]) {
      expect(applicationDatabaseError(error, "get").kind).toBe("unknown");
    }
  });

  it("el mensaje nunca incluye detalles internos", () => {
    const error = applicationDatabaseError(
      checkViolation("applications_salary_order"),
      "create",
    );
    const text = JSON.stringify(error);

    expect(text).not.toContain("applications_salary_order");
    expect(text).not.toContain("Failing row");
  });
});

describe("databaseErrorCode", () => {
  it("devuelve el código si existe", () => {
    expect(databaseErrorCode({ code: "23514", message: "x" })).toBe("23514");
  });

  it("devuelve null si no hay código o no es un objeto", () => {
    expect(databaseErrorCode({ message: "x" })).toBeNull();
    expect(databaseErrorCode("23514")).toBeNull();
    expect(databaseErrorCode(null)).toBeNull();
  });
});

describe("validationError", () => {
  it("devuelve los errores por campo y el mensaje genérico", () => {
    const parsed = applicationCreateSchema.safeParse({
      company: "",
      position: "Dev",
      applied_at: "2026-11-25",
    });
    if (parsed.success) throw new Error("se esperaba un error de validación");

    expect(validationError(parsed.error)).toEqual({
      kind: "validation",
      message: APPLICATION_ERROR_MESSAGES.invalidData,
      fieldErrors: { company: APPLICATION_MESSAGES.companyRequired },
    });
  });

  it("usa el mensaje de un error sin campo (p. ej. sin cambios)", () => {
    const parsed = applicationUpdateSchema.safeParse({});
    if (parsed.success) throw new Error("se esperaba un error de validación");

    expect(validationError(parsed.error)).toEqual({
      kind: "validation",
      message: APPLICATION_MESSAGES.noChanges,
      fieldErrors: {},
    });
  });
});
