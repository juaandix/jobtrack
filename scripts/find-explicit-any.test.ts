// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = join(import.meta.dirname, "find-explicit-any.sh");

let dir = "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "find-explicit-any-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Writes `source` to a file and returns the lines the script reports. */
function findAny(source: string, name = "sample.ts"): string[] {
  writeFileSync(join(dir, name), source);
  const result = spawnSync("bash", [SCRIPT, dir], { encoding: "utf8" });
  expect(result.status).toBe(0);
  return result.stdout
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => line.slice(line.indexOf(":", dir.length) + 1));
}

// The `any` below are written as data for the script, not as code.
const ANY = "any";

describe("find-explicit-any.sh (TS-02)", () => {
  it.each([
    [`let value: ${ANY};`],
    [`function f(input:${ANY}) {}`],
    [`const x = y as ${ANY};`],
    [`const list = new Array<${ANY}>();`],
    [`const items: ${ANY}[] = [];`],
    [`type T = Promise<${ANY}>;`],
    [`const ok = "https://example.com"; let v: ${ANY};`],
  ])("detecta %s", (line) => {
    expect(findAny(`${line}\n`)).toEqual([`1:${line}`]);
  });

  it.each([
    [`// Accepts ${ANY} value: ${ANY} string works`],
    [`/* returns: ${ANY} as ${ANY} <${ANY}> ${ANY}[] */`],
    [`const a = 1; // note: ${ANY}`],
    [`{/* JSX comment: ${ANY} */}`],
    [`const company = "Company"; const many: string[] = [];`],
    [`const anything: number = 1; const hasAny = true;`],
  ])("no da falso positivo con %s", (line) => {
    expect(findAny(`${line}\n`)).toEqual([]);
  });

  it("ignora los comentarios de bloque de varias líneas", () => {
    const source = [
      "/**",
      ` * Works with ${ANY} input: ${ANY} kind of value,`,
      ` * even as ${ANY} <${ANY}> or ${ANY}[].`,
      " */",
      `let real: ${ANY};`,
    ].join("\n");

    expect(findAny(source)).toEqual([`5:let real: ${ANY};`]);
  });

  it("detecta el código que sigue a un comentario de bloque en la misma línea", () => {
    expect(findAny(`/* ok */ let value: ${ANY};\n`)).toEqual([
      `1:/* ok */ let value: ${ANY};`,
    ]);
  });

  it("revisa .tsx y omite ficheros que no son código y rutas inexistentes", () => {
    writeFileSync(join(dir, "notes.md"), `value: ${ANY}\n`);
    expect(findAny(`const x = y as ${ANY};\n`, "view.tsx")).toEqual([
      `1:const x = y as ${ANY};`,
    ]);
    const missing = spawnSync("bash", [SCRIPT, join(dir, "nope")], {
      encoding: "utf8",
    });
    expect(missing.status).toBe(0);
    expect(missing.stdout).toBe("");
  });
});
