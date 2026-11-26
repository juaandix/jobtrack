import { describe, expect, it } from "vitest";
import {
  NO_FILTERS,
  applicationFiltersHref,
  applicationsCount,
  filterApplications,
  filtersFromFormData,
  hasActiveFilters,
  normalizeText,
  parseApplicationFilters,
  resultsSummary,
  type ApplicationFilters,
} from "./filter";
import type { Application } from "./repository";

type Row = Pick<Application, "company" | "status" | "portal"> & { id: string };

const TELEFONICA: Row = {
  id: "1",
  company: "Telefónica",
  status: "entrevista",
  portal: "linkedin",
};
const NANDU: Row = {
  id: "2",
  company: "ÑANDÚ Software",
  status: "enviada",
  portal: "infojobs",
};
const ACME: Row = {
  id: "3",
  company: "Acme",
  status: "entrevista",
  portal: "infojobs",
};
const ROWS: readonly Row[] = [TELEFONICA, NANDU, ACME];

function filters(overrides: Partial<ApplicationFilters>): ApplicationFilters {
  return { ...NO_FILTERS, ...overrides };
}

function ids(rows: readonly Row[]): string[] {
  return rows.map((row) => row.id);
}

describe("normalizeText", () => {
  it("quita tildes y diéresis y pasa a minúsculas", () => {
    expect(normalizeText("Telefónica")).toBe("telefonica");
    expect(normalizeText("ÑANDÚ")).toBe("nandu");
    expect(normalizeText("Pingüino ÀÉÎÕÜ")).toBe("pinguino aeiou");
  });

  it("normaliza también texto ya compuesto en NFD", () => {
    expect(normalizeText("Telefónica")).toBe("telefonica");
  });

  it("deja igual el texto vacío", () => {
    expect(normalizeText("")).toBe("");
  });
});

describe("filterApplications", () => {
  it("con una lista vacía devuelve una lista vacía", () => {
    expect(filterApplications([], filters({ status: "oferta" }))).toEqual([]);
    expect(filterApplications([], NO_FILTERS)).toEqual([]);
  });

  it("sin criterios devuelve todas en el mismo orden", () => {
    expect(ids(filterApplications(ROWS, NO_FILTERS))).toEqual(["1", "2", "3"]);
  });

  it("no modifica la lista de entrada", () => {
    const input = [...ROWS];
    filterApplications(input, filters({ status: "enviada" }));
    expect(input).toEqual(ROWS);
  });

  it("filtra solo por estado", () => {
    expect(
      ids(filterApplications(ROWS, filters({ status: "entrevista" }))),
    ).toEqual(["1", "3"]);
  });

  it("filtra solo por portal", () => {
    expect(
      ids(filterApplications(ROWS, filters({ portal: "infojobs" }))),
    ).toEqual(["2", "3"]);
  });

  it("filtra solo por texto contenido en la empresa", () => {
    expect(ids(filterApplications(ROWS, filters({ query: "cm" })))).toEqual([
      "3",
    ]);
  });

  it("el texto ignora mayúsculas y tildes en ambos lados", () => {
    expect(
      ids(filterApplications(ROWS, filters({ query: "telefonica" }))),
    ).toEqual(["1"]);
    expect(
      ids(filterApplications(ROWS, filters({ query: "TELEFÓNICA" }))),
    ).toEqual(["1"]);
    expect(ids(filterApplications(ROWS, filters({ query: "nandu" })))).toEqual([
      "2",
    ]);
    expect(ids(filterApplications(ROWS, filters({ query: "Ñandú" })))).toEqual([
      "2",
    ]);
  });

  it("recorta los espacios alrededor del texto", () => {
    expect(
      ids(filterApplications(ROWS, filters({ query: "  acme  " }))),
    ).toEqual(["3"]);
  });

  it("un texto solo con espacios no filtra", () => {
    expect(ids(filterApplications(ROWS, filters({ query: "   " })))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("combina los criterios con AND", () => {
    expect(
      ids(
        filterApplications(
          ROWS,
          filters({ status: "entrevista", portal: "infojobs" }),
        ),
      ),
    ).toEqual(["3"]);
    expect(
      ids(
        filterApplications(
          ROWS,
          filters({ status: "entrevista", portal: "linkedin", query: "tele" }),
        ),
      ),
    ).toEqual(["1"]);
  });

  it("devuelve una lista vacía si nada coincide", () => {
    expect(filterApplications(ROWS, filters({ status: "oferta" }))).toEqual([]);
    expect(
      filterApplications(
        ROWS,
        filters({ status: "enviada", portal: "linkedin" }),
      ),
    ).toEqual([]);
    expect(filterApplications(ROWS, filters({ query: "globex" }))).toEqual([]);
  });
});

describe("parseApplicationFilters", () => {
  it("sin parámetros no hay criterios", () => {
    expect(parseApplicationFilters({})).toEqual(NO_FILTERS);
  });

  it("lee estado, portal y texto válidos", () => {
    expect(
      parseApplicationFilters({
        status: "oferta",
        portal: "web_empresa",
        q: "acme",
      }),
    ).toEqual({ status: "oferta", portal: "web_empresa", query: "acme" });
  });

  it("ignora valores de enum inválidos o desconocidos", () => {
    expect(
      parseApplicationFilters({ status: "contratada", portal: "LinkedIn" }),
    ).toEqual(NO_FILTERS);
    expect(parseApplicationFilters({ status: "", portal: "" })).toEqual(
      NO_FILTERS,
    );
  });

  it("ignora parámetros que no son filtros", () => {
    expect(parseApplicationFilters({ page: "2", estado: "oferta" })).toEqual(
      NO_FILTERS,
    );
  });

  it("con parámetros repetidos usa solo el primero", () => {
    expect(
      parseApplicationFilters({
        status: ["entrevista", "oferta"],
        portal: ["indeed", "linkedin"],
        q: ["  uno ", "dos"],
      }),
    ).toEqual({ status: "entrevista", portal: "indeed", query: "uno" });
  });

  it("si el primero de un parámetro repetido es inválido, lo ignora", () => {
    expect(parseApplicationFilters({ status: ["x", "oferta"] })).toEqual(
      NO_FILTERS,
    );
  });

  it("una lista de valores vacía no filtra", () => {
    expect(parseApplicationFilters({ status: [], q: [] })).toEqual(NO_FILTERS);
  });

  it("recorta el texto y lo deja vacío si solo tiene espacios", () => {
    expect(parseApplicationFilters({ q: "  Telefónica " }).query).toBe(
      "Telefónica",
    );
    expect(parseApplicationFilters({ q: "   " }).query).toBe("");
  });
});

describe("filtersFromFormData", () => {
  it("lee los campos del formulario como la URL", () => {
    const formData = new FormData();
    formData.set("status", "entrevista");
    formData.set("portal", "");
    formData.set("q", " acme ");
    expect(filtersFromFormData(formData)).toEqual({
      status: "entrevista",
      portal: null,
      query: "acme",
    });
  });

  it("ignora los campos que no son texto o faltan", () => {
    const formData = new FormData();
    formData.set("q", new Blob(["acme"]));
    expect(filtersFromFormData(formData)).toEqual(NO_FILTERS);
  });
});

describe("hasActiveFilters", () => {
  it("es falso sin criterios o con texto solo de espacios", () => {
    expect(hasActiveFilters(NO_FILTERS)).toBe(false);
    expect(hasActiveFilters(filters({ query: "  " }))).toBe(false);
  });

  it("es verdadero con cualquier criterio", () => {
    expect(hasActiveFilters(filters({ status: "oferta" }))).toBe(true);
    expect(hasActiveFilters(filters({ portal: "otro" }))).toBe(true);
    expect(hasActiveFilters(filters({ query: "a" }))).toBe(true);
  });
});

describe("applicationFiltersHref", () => {
  it("sin criterios es la lista sin parámetros", () => {
    expect(applicationFiltersHref(NO_FILTERS)).toBe("/dashboard");
    expect(applicationFiltersHref(filters({ query: "   " }))).toBe(
      "/dashboard",
    );
  });

  it("incluye solo los criterios activos", () => {
    expect(applicationFiltersHref(filters({ status: "oferta" }))).toBe(
      "/dashboard?status=oferta",
    );
    expect(
      applicationFiltersHref({
        status: "en_proceso",
        portal: "web_empresa",
        query: " Telefónica & Co ",
      }),
    ).toBe(
      "/dashboard?status=en_proceso&portal=web_empresa&q=Telef%C3%B3nica+%26+Co",
    );
  });

  it("se vuelve a leer igual (ida y vuelta)", () => {
    const original: ApplicationFilters = {
      status: "rechazada_por_mi",
      portal: "referido",
      query: "Ñandú & Hijos",
    };
    const search = new URL(applicationFiltersHref(original), "http://x")
      .searchParams;
    expect(parseApplicationFilters(Object.fromEntries(search))).toEqual(
      original,
    );
  });
});

describe("applicationsCount", () => {
  it("usa el singular solo para una", () => {
    expect(applicationsCount(0)).toBe("0 candidaturas");
    expect(applicationsCount(1)).toBe("1 candidatura");
    expect(applicationsCount(2)).toBe("2 candidaturas");
  });
});

describe("resultsSummary", () => {
  it("sin filtros cuenta el total en singular o plural", () => {
    expect(resultsSummary(1, 1, false)).toBe("1 candidatura");
    expect(resultsSummary(3, 3, false)).toBe("3 candidaturas");
  });

  it("con filtros indica cuántas de cuántas", () => {
    expect(resultsSummary(0, 3, true)).toBe("0 de 3 candidaturas");
    expect(resultsSummary(1, 3, true)).toBe("1 de 3 candidaturas");
    expect(resultsSummary(1, 1, true)).toBe("1 de 1 candidatura");
  });
});
