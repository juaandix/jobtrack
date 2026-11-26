import { render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PortalStatusChart } from "./portal-status-chart";
import { WeeklyChart } from "./weekly-chart";
import { STATUS_LABELS } from "@/lib/applications/labels";
import { buildMetrics, type MetricsApplication } from "@/lib/metrics/metrics";
import { APPLICATION_STATUSES } from "@/lib/validation/application";

/*
 * jsdom has no layout: Recharts' ResponsiveContainer measures its box with
 * ResizeObserver and getBoundingClientRect. A minimal ResizeObserver that
 * reports a fixed size lets the SVG render as in a browser.
 */
const SIZE = { width: 600, height: 400 };

class FixedSizeResizeObserver implements ResizeObserver {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element): void {
    const entry: ResizeObserverEntry = {
      target,
      contentRect: DOMRect.fromRect(SIZE),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: [],
    };
    this.callback([entry], this);
  }
  unobserve(): void {}
  disconnect(): void {}
}

const applications: MetricsApplication[] = [
  { applied_at: "2026-11-24", status: "enviada", portal: "linkedin" },
  { applied_at: "2026-11-25", status: "entrevista", portal: "infojobs" },
];
const metrics = buildMetrics(applications, "2026-11-26", 4);

function chartWrapper(container: HTMLElement): HTMLElement {
  const wrapper = container.firstElementChild;
  if (!(wrapper instanceof HTMLElement)) throw new Error("no chart wrapper");
  return wrapper;
}

describe("gráficos de métricas", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", FixedSizeResizeObserver);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      DOMRect.fromRect(SIZE),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("el gráfico semanal se dibuja y queda oculto a los lectores de pantalla", () => {
    const { container } = render(<WeeklyChart weeks={metrics.weekly} />);

    const wrapper = chartWrapper(container);
    // The table next to it is the text alternative (A11Y-08).
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper.querySelector("svg")).not.toBeNull();
    // Without the accessibility layer the SVG is not a tab stop inside
    // an aria-hidden region.
    expect(wrapper.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
    expect(wrapper).toHaveTextContent(/nov/);
  });

  it("el gráfico por portal tiene leyenda con el nombre de cada estado", () => {
    const { container } = render(<PortalStatusChart rows={metrics.portals} />);

    const wrapper = chartWrapper(container);
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper.querySelector("svg")).not.toBeNull();
    expect(wrapper.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
    for (const status of APPLICATION_STATUSES) {
      expect(
        within(wrapper).getByText(STATUS_LABELS[status]),
      ).toBeInTheDocument();
    }
    // Same order as the table columns (the SQL enum), not alphabetical.
    const legend = wrapper.querySelector(".recharts-legend-wrapper");
    expect(legend?.textContent).toBe(
      APPLICATION_STATUSES.map((status) => STATUS_LABELS[status]).join(""),
    );
  });

  it("sin ResizeObserver (como en el servidor) no falla ni avisa", () => {
    vi.unstubAllGlobals();
    const warn = vi.spyOn(console, "warn");
    const { container } = render(
      <>
        <WeeklyChart weeks={metrics.weekly} />
        <PortalStatusChart rows={metrics.portals} />
      </>,
    );
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
  });
});
