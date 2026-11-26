import { describe, expect, it } from "vitest";
import { applicationDeletedMessage } from "./announcements";

describe("applicationDeletedMessage", () => {
  it("nombra la candidatura borrada", () => {
    expect(
      applicationDeletedMessage({ company: "Acme", position: "Frontend" }),
    ).toBe("Candidatura borrada: Frontend en Acme.");
  });

  it("conserva el texto tal cual (tildes, espacios internos)", () => {
    expect(
      applicationDeletedMessage({
        company: "Ñandú  S.A.",
        position: "Diseñador UX",
      }),
    ).toBe("Candidatura borrada: Diseñador UX en Ñandú  S.A..");
  });
});
