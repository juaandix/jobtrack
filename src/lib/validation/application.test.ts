// @vitest-environment node
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, expectTypeOf, it } from "vitest";
import type { z } from "zod";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import {
  APPLICATION_FIELDS,
  APPLICATION_LIMITS,
  APPLICATION_MESSAGES,
  APPLICATION_PORTALS,
  APPLICATION_STATUSES,
  type ApplicationCreateInput,
  type ApplicationUpdateInput,
  applicationCreateSchema,
  applicationPortalSchema,
  applicationStatusSchema,
  applicationUpdateSchema,
} from "./application";

const MIGRATIONS_DIR = fileURLToPath(
  new URL("../../../supabase/migrations", import.meta.url),
);

/** Values of a Postgres enum, as declared across all the SQL migrations. */
function sqlEnumValues(typeName: string): string[] {
  const sql = readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8"))
    .join("\n");
  const quoted = (text: string): string[] =>
    Array.from(text.matchAll(/'([^']*)'/g), (match) => match[1] ?? "");
  const created = new RegExp(
    `create type public\\.${typeName} as enum \\(([^)]*)\\)`,
    "i",
  ).exec(sql);
  const added = Array.from(
    sql.matchAll(
      new RegExp(`alter type public\\.${typeName} add value '([^']*)'`, "gi"),
    ),
    (match) => match[1] ?? "",
  );
  return [...quoted(created?.[1] ?? ""), ...added];
}

function messagesFor(error: z.ZodError, field: string): string[] {
  return error.issues
    .filter((issue) => issue.path[0] === field)
    .map((issue) => issue.message);
}

function expectFailure(result: {
  success: boolean;
  error?: z.ZodError;
}): z.ZodError {
  expect(result.success).toBe(false);
  if (result.error === undefined) throw new Error("expected a ZodError");
  return result.error;
}

/** A string of `length` characters as Postgres counts them. */
function textOfLength(length: number, char = "a"): string {
  return char.repeat(length);
}

const minimal = {
  company: "Acme",
  position: "Desarrolladora frontend",
  applied_at: "2026-11-25",
};

const full = {
  ...minimal,
  offer_url: "https://acme.example/jobs/42",
  portal: "linkedin",
  salary_min: 30000,
  salary_max: 40000,
  status: "entrevista",
  notes: "Primera llamada el lunes",
};

describe("enums", () => {
  it("match the SQL enum application_status", () => {
    expect(APPLICATION_STATUSES).toEqual(sqlEnumValues("application_status"));
    expect(applicationStatusSchema.options).toEqual(
      sqlEnumValues("application_status"),
    );
  });

  it("match the SQL enum application_portal", () => {
    expect(APPLICATION_PORTALS).toEqual(sqlEnumValues("application_portal"));
    expect(applicationPortalSchema.options).toEqual(
      sqlEnumValues("application_portal"),
    );
  });

  it("finds values in the migrations (guards against a broken parser)", () => {
    expect(sqlEnumValues("application_status")).toHaveLength(6);
    expect(sqlEnumValues("application_portal")).toHaveLength(7);
  });

  it.each(["", "Enviada", "archivada"])("rejects the status %j", (status) => {
    const error = expectFailure(applicationStatusSchema.safeParse(status));
    expect(error.issues[0]?.message).toBe(APPLICATION_MESSAGES.statusInvalid);
  });

  it.each(["", "LinkedIn", "glassdoor"])("rejects the portal %j", (portal) => {
    const error = expectFailure(applicationPortalSchema.safeParse(portal));
    expect(error.issues[0]?.message).toBe(APPLICATION_MESSAGES.portalInvalid);
  });
});

describe("applicationCreateSchema", () => {
  it("accepts the minimal application and nulls the optional columns", () => {
    expect(applicationCreateSchema.safeParse(minimal)).toEqual({
      success: true,
      data: {
        ...minimal,
        offer_url: null,
        salary_min: null,
        salary_max: null,
        notes: null,
      },
    });
  });

  it("accepts a complete application unchanged", () => {
    expect(applicationCreateSchema.safeParse(full)).toEqual({
      success: true,
      data: full,
    });
  });

  it("accepts every status and portal", () => {
    for (const status of APPLICATION_STATUSES) {
      for (const portal of APPLICATION_PORTALS) {
        const result = applicationCreateSchema.safeParse({
          ...minimal,
          status,
          portal,
        });
        expect(result.success).toBe(true);
      }
    }
  });

  it("leaves portal and status out when omitted so the DB defaults apply", () => {
    const result = applicationCreateSchema.safeParse(minimal);
    expect(result.data).not.toHaveProperty("portal");
    expect(result.data).not.toHaveProperty("status");
  });

  it("rejects a status or portal outside the enum", () => {
    const error = expectFailure(
      applicationCreateSchema.safeParse({
        ...minimal,
        status: "aceptada",
        portal: "monster",
      }),
    );
    expect(messagesFor(error, "status")).toEqual([
      APPLICATION_MESSAGES.statusInvalid,
    ]);
    expect(messagesFor(error, "portal")).toEqual([
      APPLICATION_MESSAGES.portalInvalid,
    ]);
  });

  it("rejects a non-object input with a form-level message", () => {
    const error = expectFailure(applicationCreateSchema.safeParse("x"));
    expect(error.issues[0]?.message).toBe(APPLICATION_MESSAGES.invalidForm);
  });

  describe("server-owned columns (DB-05)", () => {
    it("strips id, user_id, created_at and updated_at", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        id: "00000000-0000-0000-0000-000000000001",
        user_id: "00000000-0000-0000-0000-000000000002",
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2020-01-01T00:00:00Z",
      });
      expect(result.success).toBe(true);
      for (const key of ["id", "user_id", "created_at", "updated_at"]) {
        expect(result.data).not.toHaveProperty(key);
      }
    });

    it("does not expose them in the inferred types", () => {
      type ServerOwned = "id" | "user_id" | "created_at" | "updated_at";
      expectTypeOf<
        Extract<keyof ApplicationCreateInput, ServerOwned>
      >().toEqualTypeOf<never>();
      expectTypeOf<
        Extract<keyof ApplicationUpdateInput, ServerOwned>
      >().toEqualTypeOf<never>();
      expect(APPLICATION_FIELDS).not.toContain("user_id");
    });

    it("produces data assignable to the generated Insert/Update types", () => {
      expectTypeOf<ApplicationCreateInput>().toExtend<
        TablesInsert<"applications">
      >();
      expectTypeOf<ApplicationUpdateInput>().toExtend<
        TablesUpdate<"applications">
      >();
    });
  });

  describe.each([
    {
      field: "company" as const,
      max: APPLICATION_LIMITS.companyMaxLength,
      required: APPLICATION_MESSAGES.companyRequired,
      tooLong: APPLICATION_MESSAGES.companyTooLong,
    },
    {
      field: "position" as const,
      max: APPLICATION_LIMITS.positionMaxLength,
      required: APPLICATION_MESSAGES.positionRequired,
      tooLong: APPLICATION_MESSAGES.positionTooLong,
    },
  ])("$field", ({ field, max, required, tooLong }) => {
    it("is required", () => {
      const { [field]: _omitted, ...rest } = minimal;
      expect(_omitted).toBeDefined();
      const error = expectFailure(applicationCreateSchema.safeParse(rest));
      expect(messagesFor(error, field)).toEqual([required]);
    });

    it.each(["", "   ", "\t\n"])("treats %j as empty", (value) => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, [field]: value }),
      );
      expect(messagesFor(error, field)).toEqual([required]);
    });

    it("rejects a non-string value", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, [field]: 42 }),
      );
      expect(messagesFor(error, field)).toEqual([required]);
    });

    it("is trimmed", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        [field]: "  Valor  ",
      });
      expect(result.data?.[field]).toBe("Valor");
    });

    it("accepts exactly the maximum length, counting surrounding spaces out", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        [field]: `  ${textOfLength(max)}  `,
      });
      expect(result.success).toBe(true);
    });

    it("rejects one character over the maximum", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          [field]: textOfLength(max + 1),
        }),
      );
      expect(messagesFor(error, field)).toEqual([tooLong]);
    });

    it("counts characters like Postgres, not UTF-16 units", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        [field]: textOfLength(max, "🚀"),
      });
      expect(result.success).toBe(true);
    });
  });

  describe("offer_url", () => {
    it.each([undefined, null, "", "   "])("turns %j into null", (offer_url) => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        offer_url,
      });
      expect(result.data?.offer_url).toBeNull();
    });

    it.each(["http://a", "https://acme.example/jobs?id=1&ref=x"])(
      "accepts %j",
      (offer_url) => {
        const result = applicationCreateSchema.safeParse({
          ...minimal,
          offer_url,
        });
        expect(result.data?.offer_url).toBe(offer_url);
      },
    );

    it("trims surrounding spaces", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        offer_url: "  https://acme.example  ",
      });
      expect(result.data?.offer_url).toBe("https://acme.example");
    });

    it.each([
      "acme.example",
      "ftp://acme.example",
      "HTTPS://acme.example",
      "Http://acme.example",
      "https://",
      "https://acme .example",
      "javascript:alert(1)",
    ])("rejects %j like the SQL CHECK", (offer_url) => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, offer_url }),
      );
      expect(messagesFor(error, "offer_url")).toEqual([
        APPLICATION_MESSAGES.offerUrlInvalid,
      ]);
    });

    it("rejects a non-string value", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, offer_url: 1 }),
      );
      expect(messagesFor(error, "offer_url")).toEqual([
        APPLICATION_MESSAGES.offerUrlInvalid,
      ]);
    });

    it("accepts exactly the maximum length and rejects one more", () => {
      const prefix = "https://";
      const atLimit =
        prefix +
        textOfLength(APPLICATION_LIMITS.offerUrlMaxLength - prefix.length);
      expect(
        applicationCreateSchema.safeParse({ ...minimal, offer_url: atLimit })
          .success,
      ).toBe(true);
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          offer_url: `${atLimit}a`,
        }),
      );
      expect(messagesFor(error, "offer_url")).toEqual([
        APPLICATION_MESSAGES.offerUrlTooLong,
      ]);
    });
  });

  describe("applied_at", () => {
    it.each(["2024-02-29", "0001-01-01", "9999-12-31"])(
      "accepts %j",
      (applied_at) => {
        const result = applicationCreateSchema.safeParse({
          ...minimal,
          applied_at,
        });
        expect(result.data?.applied_at).toBe(applied_at);
      },
    );

    it.each([undefined, "", "  "])("is required (%j)", (applied_at) => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, applied_at }),
      );
      expect(messagesFor(error, "applied_at")).toEqual([
        APPLICATION_MESSAGES.appliedAtRequired,
      ]);
    });

    it.each([
      "2023-02-29",
      "2026-04-31",
      "2026-13-01",
      "2026-1-5",
      "25/11/2026",
      "2026-11-25T10:00:00Z",
      "0000-01-01",
      "hoy",
    ])("rejects %j", (applied_at) => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, applied_at }),
      );
      expect(messagesFor(error, "applied_at")).toEqual([
        APPLICATION_MESSAGES.appliedAtInvalid,
      ]);
    });
  });

  describe("salary", () => {
    it.each([
      [undefined, null],
      [null, null],
      ["", null],
      ["  ", null],
      ["35000", 35000],
      [" 35000 ", 35000],
      [0, 0],
      ["0", 0],
      [APPLICATION_LIMITS.salaryMax, APPLICATION_LIMITS.salaryMax],
    ])("parses salary_min %j as %j", (input, expected) => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        salary_min: input,
      });
      expect(result.data?.salary_min).toBe(expected);
    });

    it.each([
      [-1, APPLICATION_MESSAGES.salaryTooLow],
      ["-1", APPLICATION_MESSAGES.salaryTooLow],
      [APPLICATION_LIMITS.salaryMax + 1, APPLICATION_MESSAGES.salaryTooHigh],
      [1000.5, APPLICATION_MESSAGES.salaryInvalid],
      ["1000.5", APPLICATION_MESSAGES.salaryInvalid],
      ["30.000", APPLICATION_MESSAGES.salaryInvalid],
      ["30k", APPLICATION_MESSAGES.salaryInvalid],
      [Number.NaN, APPLICATION_MESSAGES.salaryInvalid],
      [true, APPLICATION_MESSAGES.salaryInvalid],
    ])("rejects salary_max %j", (input, message) => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, salary_max: input }),
      );
      expect(messagesFor(error, "salary_max")).toEqual([message]);
    });

    it("accepts min equal to max", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        salary_min: 40000,
        salary_max: "40000",
      });
      expect(result.success).toBe(true);
    });

    it("accepts only one bound", () => {
      expect(
        applicationCreateSchema.safeParse({ ...minimal, salary_min: 40000 })
          .success,
      ).toBe(true);
      expect(
        applicationCreateSchema.safeParse({ ...minimal, salary_max: 40000 })
          .success,
      ).toBe(true);
    });

    it("rejects min greater than max on salary_max", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          salary_min: 40001,
          salary_max: 40000,
        }),
      );
      expect(messagesFor(error, "salary_max")).toEqual([
        APPLICATION_MESSAGES.salaryOrder,
      ]);
    });

    it("reports the order error together with other field errors", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          company: "",
          salary_min: 2,
          salary_max: 1,
        }),
      );
      expect(messagesFor(error, "company")).toEqual([
        APPLICATION_MESSAGES.companyRequired,
      ]);
      expect(messagesFor(error, "salary_max")).toEqual([
        APPLICATION_MESSAGES.salaryOrder,
      ]);
    });

    it("skips the order check when a salary is invalid on its own", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          salary_min: "mucho",
          salary_max: 1,
        }),
      );
      expect(messagesFor(error, "salary_min")).toEqual([
        APPLICATION_MESSAGES.salaryInvalid,
      ]);
      expect(messagesFor(error, "salary_max")).toEqual([]);
    });
  });

  describe("notes", () => {
    it.each([undefined, null, "", " \n "])("turns %j into null", (notes) => {
      const result = applicationCreateSchema.safeParse({ ...minimal, notes });
      expect(result.data?.notes).toBeNull();
    });

    it("is trimmed", () => {
      const result = applicationCreateSchema.safeParse({
        ...minimal,
        notes: "  Llamar el lunes \n",
      });
      expect(result.data?.notes).toBe("Llamar el lunes");
    });

    it("accepts exactly the maximum length and rejects one more", () => {
      const max = APPLICATION_LIMITS.notesMaxLength;
      expect(
        applicationCreateSchema.safeParse({
          ...minimal,
          notes: textOfLength(max),
        }).success,
      ).toBe(true);
      const error = expectFailure(
        applicationCreateSchema.safeParse({
          ...minimal,
          notes: textOfLength(max + 1),
        }),
      );
      expect(messagesFor(error, "notes")).toEqual([
        APPLICATION_MESSAGES.notesTooLong,
      ]);
    });

    it("rejects a non-string value", () => {
      const error = expectFailure(
        applicationCreateSchema.safeParse({ ...minimal, notes: 5 }),
      );
      expect(messagesFor(error, "notes")).toEqual([
        APPLICATION_MESSAGES.invalidForm,
      ]);
    });
  });
});

describe("applicationUpdateSchema", () => {
  it("accepts a single field, such as a status change", () => {
    expect(applicationUpdateSchema.safeParse({ status: "oferta" })).toEqual({
      success: true,
      data: { status: "oferta" },
    });
  });

  it("accepts a complete application", () => {
    expect(applicationUpdateSchema.safeParse(full)).toEqual({
      success: true,
      data: full,
    });
  });

  it("does not add the fields that were not sent", () => {
    const result = applicationUpdateSchema.safeParse({ notes: "Hola" });
    expect(result.data).toEqual({ notes: "Hola" });
  });

  it("clears optional columns sent blank", () => {
    const result = applicationUpdateSchema.safeParse({
      offer_url: "",
      salary_min: "",
      notes: "  ",
    });
    expect(result.data).toEqual({
      offer_url: null,
      salary_min: null,
      notes: null,
    });
  });

  it("validates present fields with the creation rules", () => {
    const error = expectFailure(
      applicationUpdateSchema.safeParse({
        company: "  ",
        offer_url: "HTTP://x",
        status: "aceptada",
        applied_at: "2026-02-30",
      }),
    );
    expect(messagesFor(error, "company")).toEqual([
      APPLICATION_MESSAGES.companyRequired,
    ]);
    expect(messagesFor(error, "offer_url")).toEqual([
      APPLICATION_MESSAGES.offerUrlInvalid,
    ]);
    expect(messagesFor(error, "status")).toEqual([
      APPLICATION_MESSAGES.statusInvalid,
    ]);
    expect(messagesFor(error, "applied_at")).toEqual([
      APPLICATION_MESSAGES.appliedAtInvalid,
    ]);
  });

  it("checks the salary order when both bounds are sent", () => {
    const error = expectFailure(
      applicationUpdateSchema.safeParse({ salary_min: 5, salary_max: 4 }),
    );
    expect(messagesFor(error, "salary_max")).toEqual([
      APPLICATION_MESSAGES.salaryOrder,
    ]);
  });

  it("strips server-owned columns", () => {
    const result = applicationUpdateSchema.safeParse({
      status: "oferta",
      user_id: "00000000-0000-0000-0000-000000000002",
      id: "00000000-0000-0000-0000-000000000001",
    });
    expect(result.data).toEqual({ status: "oferta" });
  });

  it.each([{}, { user_id: "x" }, { company: undefined }])(
    "rejects an update without editable fields (%j)",
    (input) => {
      const error = expectFailure(applicationUpdateSchema.safeParse(input));
      expect(error.issues.map((issue) => issue.message)).toEqual([
        APPLICATION_MESSAGES.noChanges,
      ]);
    },
  );
});
