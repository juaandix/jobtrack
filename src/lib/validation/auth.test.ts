import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  AUTH_MESSAGES,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  loginSchema,
  signupSchema,
} from "./auth";

/** Builds a syntactically valid email of exactly `length` characters. */
function emailOfLength(length: number): string {
  const domain = "@example.com";
  return "a".repeat(length - domain.length) + domain;
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

describe("loginSchema", () => {
  const valid = { email: "ana@example.com", password: "x" };

  it("accepts a valid email and any non-empty password", () => {
    expect(loginSchema.safeParse(valid)).toEqual({
      success: true,
      data: valid,
    });
  });

  it("does not apply the signup password policy", () => {
    const result = loginSchema.safeParse({ ...valid, password: "abc" });
    expect(result.success).toBe(true);
  });

  it("trims and lower-cases the email", () => {
    const result = loginSchema.safeParse({
      email: "  Ana.Perez@Example.COM \t",
      password: "secreta",
    });
    expect(result.data?.email).toBe("ana.perez@example.com");
  });

  it("does not trim the password", () => {
    const result = loginSchema.safeParse({ ...valid, password: "  clave  " });
    expect(result.data?.password).toBe("  clave  ");
  });

  it("requires the email", () => {
    const error = expectFailure(loginSchema.safeParse({ ...valid, email: "" }));
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
  });

  it("treats a whitespace-only email as empty", () => {
    const error = expectFailure(
      loginSchema.safeParse({ ...valid, email: "   " }),
    );
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
  });

  it.each(["ana", "ana@", "@example.com", "ana@example", "ana @example.com"])(
    "rejects the malformed email %j",
    (email) => {
      const error = expectFailure(loginSchema.safeParse({ ...valid, email }));
      expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailInvalid]);
    },
  );

  it(`accepts an email of exactly ${EMAIL_MAX_LENGTH} characters`, () => {
    const email = emailOfLength(EMAIL_MAX_LENGTH);
    expect(email).toHaveLength(254);
    expect(loginSchema.safeParse({ ...valid, email }).success).toBe(true);
  });

  it(`rejects an email of ${EMAIL_MAX_LENGTH + 1} characters`, () => {
    const email = emailOfLength(EMAIL_MAX_LENGTH + 1);
    expect(email).toHaveLength(255);
    const error = expectFailure(loginSchema.safeParse({ ...valid, email }));
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailTooLong]);
    expect(AUTH_MESSAGES.emailTooLong).toBe(
      "El email no puede superar los 254 caracteres",
    );
  });

  it("measures the email length after trimming", () => {
    const email = `  ${emailOfLength(EMAIL_MAX_LENGTH)}  `;
    expect(loginSchema.safeParse({ ...valid, email }).success).toBe(true);
  });

  it("requires the password", () => {
    const error = expectFailure(
      loginSchema.safeParse({ ...valid, password: "" }),
    );
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
  });

  it(`accepts a password of exactly ${PASSWORD_MAX_LENGTH} characters`, () => {
    const password = "a".repeat(PASSWORD_MAX_LENGTH);
    expect(loginSchema.safeParse({ ...valid, password }).success).toBe(true);
  });

  it(`rejects a password of ${PASSWORD_MAX_LENGTH + 1} characters`, () => {
    const password = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    const error = expectFailure(loginSchema.safeParse({ ...valid, password }));
    expect(messagesFor(error, "password")).toEqual([
      "La contraseña no puede superar los 72 caracteres",
    ]);
  });

  it("strips unknown fields", () => {
    const result = loginSchema.safeParse({ ...valid, role: "admin" });
    expect(result.data).toEqual(valid);
  });

  it("reports missing fields with the required messages", () => {
    const error = expectFailure(loginSchema.safeParse({}));
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
  });

  it("rejects non-string values with the required messages", () => {
    const error = expectFailure(
      loginSchema.safeParse({ email: 42, password: null }),
    );
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
  });

  it.each([null, undefined, 42, "ana@example.com", []])(
    "rejects the non-object input %j with a Spanish form error",
    (input) => {
      const error = expectFailure(loginSchema.safeParse(input));
      expect(error.issues).toHaveLength(1);
      expect(error.issues[0]?.path).toEqual([]);
      expect(error.issues[0]?.message).toBe(AUTH_MESSAGES.invalidForm);
    },
  );
});

describe("signupSchema", () => {
  const valid = {
    email: "ana@example.com",
    password: "secreta1",
    confirmPassword: "secreta1",
  };

  function withPassword(password: string): typeof valid {
    return { ...valid, password, confirmPassword: password };
  }

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(valid)).toEqual({
      success: true,
      data: valid,
    });
  });

  it("accepts letters with accents or ñ", () => {
    expect(signupSchema.safeParse(withPassword("ñ1234567")).success).toBe(true);
  });

  it("trims and lower-cases the email", () => {
    const result = signupSchema.safeParse({
      ...valid,
      email: " ANA@Example.com ",
    });
    expect(result.data?.email).toBe("ana@example.com");
  });

  it("requires the email, including whitespace-only values", () => {
    for (const email of ["", "  \n "]) {
      const error = expectFailure(signupSchema.safeParse({ ...valid, email }));
      expect(messagesFor(error, "email")).toEqual([
        AUTH_MESSAGES.emailRequired,
      ]);
    }
  });

  it("rejects a malformed email", () => {
    const error = expectFailure(
      signupSchema.safeParse({ ...valid, email: "ana.example.com" }),
    );
    expect(messagesFor(error, "email")).toEqual([
      "El email no tiene un formato válido",
    ]);
  });

  it("applies the email length limit", () => {
    expect(
      signupSchema.safeParse({ ...valid, email: emailOfLength(254) }).success,
    ).toBe(true);
    const error = expectFailure(
      signupSchema.safeParse({ ...valid, email: emailOfLength(255) }),
    );
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailTooLong]);
  });

  it("requires the password with a single message", () => {
    const error = expectFailure(signupSchema.safeParse(withPassword("")));
    expect(messagesFor(error, "password")).toEqual(["Introduce tu contraseña"]);
  });

  it(`accepts a password of exactly ${PASSWORD_MIN_LENGTH} characters`, () => {
    const password = "abcdefg1";
    expect(password).toHaveLength(8);
    expect(signupSchema.safeParse(withPassword(password)).success).toBe(true);
  });

  it(`rejects a password of ${PASSWORD_MIN_LENGTH - 1} characters`, () => {
    const password = "abcdef1";
    expect(password).toHaveLength(7);
    const error = expectFailure(signupSchema.safeParse(withPassword(password)));
    expect(messagesFor(error, "password")).toEqual([
      "La contraseña debe tener al menos 8 caracteres",
    ]);
  });

  it(`accepts a password of exactly ${PASSWORD_MAX_LENGTH} characters`, () => {
    const password = "a".repeat(PASSWORD_MAX_LENGTH - 1) + "1";
    expect(password).toHaveLength(72);
    expect(signupSchema.safeParse(withPassword(password)).success).toBe(true);
  });

  it(`rejects a password of ${PASSWORD_MAX_LENGTH + 1} characters`, () => {
    const password = "a".repeat(PASSWORD_MAX_LENGTH) + "1";
    expect(password).toHaveLength(73);
    const error = expectFailure(signupSchema.safeParse(withPassword(password)));
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordTooLong,
    ]);
  });

  it("requires at least one number", () => {
    const error = expectFailure(
      signupSchema.safeParse(withPassword("solamente")),
    );
    expect(messagesFor(error, "password")).toEqual([
      "La contraseña debe incluir al menos un número",
    ]);
  });

  it("requires at least one letter", () => {
    const error = expectFailure(
      signupSchema.safeParse(withPassword("12345678")),
    );
    expect(messagesFor(error, "password")).toEqual([
      "La contraseña debe incluir al menos una letra",
    ]);
  });

  it("reports every broken password rule, starting with the length", () => {
    const error = expectFailure(signupSchema.safeParse(withPassword("!!")));
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordTooShort,
      AUTH_MESSAGES.passwordNeedsLetter,
      AUTH_MESSAGES.passwordNeedsNumber,
    ]);
  });

  it("requires the confirmation", () => {
    const error = expectFailure(
      signupSchema.safeParse({ ...valid, confirmPassword: "" }),
    );
    expect(messagesFor(error, "confirmPassword")).toEqual([
      "Confirma tu contraseña",
    ]);
  });

  it("assigns a mismatch to confirmPassword", () => {
    const error = expectFailure(
      signupSchema.safeParse({ ...valid, confirmPassword: "secreta2" }),
    );
    expect(error.issues).toHaveLength(1);
    expect(error.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(error.issues[0]?.message).toBe("Las contraseñas no coinciden");
  });

  it("compares the passwords exactly (case and spaces matter)", () => {
    for (const confirmPassword of ["SECRETA1", "secreta1 "]) {
      const error = expectFailure(
        signupSchema.safeParse({ ...valid, confirmPassword }),
      );
      expect(messagesFor(error, "confirmPassword")).toEqual([
        AUTH_MESSAGES.passwordsDoNotMatch,
      ]);
    }
  });

  it("reports the mismatch together with errors in other fields", () => {
    const error = expectFailure(
      signupSchema.safeParse({
        email: "no-es-un-email",
        password: "corta1",
        confirmPassword: "otra",
      }),
    );
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailInvalid]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordTooShort,
    ]);
    expect(messagesFor(error, "confirmPassword")).toEqual([
      AUTH_MESSAGES.passwordsDoNotMatch,
    ]);
  });

  it("reports the mismatch even when the email is empty, too long or invalid", () => {
    for (const [email, emailMessage] of [
      ["", AUTH_MESSAGES.emailRequired],
      ["   ", AUTH_MESSAGES.emailRequired],
      [`${"a".repeat(250)}@example.com`, AUTH_MESSAGES.emailTooLong],
      ["no-es-un-email", AUTH_MESSAGES.emailInvalid],
    ] as const) {
      const error = expectFailure(
        signupSchema.safeParse({
          email,
          password: "secreta1",
          confirmPassword: "secreta2",
        }),
      );
      expect(messagesFor(error, "email")).toEqual([emailMessage]);
      expect(messagesFor(error, "confirmPassword")).toEqual([
        AUTH_MESSAGES.passwordsDoNotMatch,
      ]);
    }
  });

  it("does not report a mismatch when a password is missing", () => {
    const error = expectFailure(
      signupSchema.safeParse({ ...valid, password: "" }),
    );
    expect(messagesFor(error, "confirmPassword")).toEqual([]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
  });

  it("strips unknown fields", () => {
    const result = signupSchema.safeParse({ ...valid, user_id: "otro" });
    expect(result.data).toEqual(valid);
  });

  it("reports every missing field on an empty object", () => {
    const error = expectFailure(signupSchema.safeParse({}));
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
    expect(messagesFor(error, "confirmPassword")).toEqual([
      AUTH_MESSAGES.confirmPasswordRequired,
    ]);
  });

  it("rejects non-string values with the required messages", () => {
    const error = expectFailure(
      signupSchema.safeParse({
        email: ["ana@example.com"],
        password: 12345678,
        confirmPassword: 12345678,
      }),
    );
    expect(messagesFor(error, "email")).toEqual([AUTH_MESSAGES.emailRequired]);
    expect(messagesFor(error, "password")).toEqual([
      AUTH_MESSAGES.passwordRequired,
    ]);
    expect(messagesFor(error, "confirmPassword")).toEqual([
      AUTH_MESSAGES.confirmPasswordRequired,
    ]);
  });

  it.each([null, 0, "texto"])(
    "rejects the non-object input %j with a Spanish form error",
    (input) => {
      const error = expectFailure(signupSchema.safeParse(input));
      expect(error.issues.map((issue) => issue.message)).toEqual([
        AUTH_MESSAGES.invalidForm,
      ]);
    },
  );
});
