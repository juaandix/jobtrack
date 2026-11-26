import { describe, expect, it } from "vitest";
import {
  CHART_BACKGROUNDS,
  MIN_GRAPHIC_CONTRAST,
  STATUS_COLORS,
  WEEKLY_BAR_COLOR,
} from "./chart-theme";
import { APPLICATION_STATUSES } from "@/lib/validation/application";

/** WCAG 2.x relative luminance of a `#rrggbb` colour. */
function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`);
  const linear = (part: string): number => {
    const channel = parseInt(part, 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  };
  const red = linear(match[1] ?? "");
  const green = linear(match[2] ?? "");
  const blue = linear(match[3] ?? "");
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG 2.x contrast ratio between two `#rrggbb` colours. */
function contrastRatio(first: string, second: string): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("contrastRatio (test helper)", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5);
    // Colours rejected in round 1 of 7.1 + 7.2 against the dark background.
    expect(contrastRatio("#1d4ed8", "#09090b")).toBeLessThan(3);
    expect(contrastRatio("#52525b", "#09090b")).toBeLessThan(3);
  });

  it("rejects colours that are not #rrggbb", () => {
    expect(() => contrastRatio("blue", "#ffffff")).toThrow();
  });
});

describe("chart colours", () => {
  const series: [string, string][] = [
    ["semanal", WEEKLY_BAR_COLOR],
    ...APPLICATION_STATUSES.map((status): [string, string] => [
      status,
      STATUS_COLORS[status],
    ]),
  ];
  const backgrounds = Object.entries(CHART_BACKGROUNDS);

  it.each(series)(
    "%s (%s) reaches 3:1 on the light and dark backgrounds",
    (_name, color) => {
      for (const [, background] of backgrounds) {
        expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(
          MIN_GRAPHIC_CONTRAST,
        );
      }
    },
  );

  it("the dark background is the one used by the sections (zinc-950)", () => {
    expect(CHART_BACKGROUNDS.dark).toBe("#09090b");
    expect(CHART_BACKGROUNDS.light).toBe("#ffffff");
  });
});
