import {
  buildIsolationReport,
  computeIsolationScore,
  formatIsolationReportText,
  DepMap,
} from "../dependency-isolation";

function makeDepMap(entries: Record<string, { version: string; deps?: string[] }>): DepMap {
  return new Map(Object.entries(entries));
}

describe("computeIsolationScore", () => {
  it("returns 100 when package has no transitive deps", () => {
    const allDeps = new Map([
      ["a", new Set(["x"])],
      ["b", new Set(["y"])],
    ]);
    expect(computeIsolationScore("c", new Set(), allDeps)).toBe(100);
  });

  it("returns 100 when no other package shares any dep", () => {
    const allDeps = new Map([
      ["a", new Set(["x"])],
      ["b", new Set(["y"])],
    ]);
    expect(computeIsolationScore("a", new Set(["x"]), allDeps)).toBe(100);
  });

  it("returns 0 when all other packages share at least one dep", () => {
    const allDeps = new Map([
      ["a", new Set(["shared"])],
      ["b", new Set(["shared"])],
      ["c", new Set(["shared"])],
    ]);
    expect(computeIsolationScore("a", new Set(["shared"]), allDeps)).toBe(0);
  });

  it("returns partial score for partial overlap", () => {
    const allDeps = new Map([
      ["a", new Set(["shared"])],
      ["b", new Set(["shared"])],
      ["c", new Set(["unique"])],
    ]);
    const score = computeIsolationScore("a", new Set(["shared"]), allDeps);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("buildIsolationReport", () => {
  it("reports correct totals", () => {
    const depMap = makeDepMap({
      lodash: { version: "4.17.21", deps: [] },
      react: { version: "18.0.0", deps: ["loose-envify"] },
      express: { version: "4.18.0", deps: ["body-parser"] },
    });
    const report = buildIsolationReport(depMap);
    expect(report.totalPackages).toBe(3);
    expect(report.isolatedCount).toBeGreaterThanOrEqual(1);
  });

  it("sorts entries by isolation score descending", () => {
    const depMap = makeDepMap({
      a: { version: "1.0.0", deps: ["shared"] },
      b: { version: "1.0.0", deps: ["shared"] },
      c: { version: "1.0.0", deps: [] },
    });
    const report = buildIsolationReport(depMap);
    expect(report.entries[0].isolationScore).toBeGreaterThanOrEqual(
      report.entries[report.entries.length - 1].isolationScore
    );
  });

  it("returns empty report for empty depMap", () => {
    const report = buildIsolationReport(new Map());
    expect(report.totalPackages).toBe(0);
    expect(report.isolatedCount).toBe(0);
  });
});

describe("formatIsolationReportText", () => {
  it("includes header and package entries", () => {
    const depMap = makeDepMap({
      lodash: { version: "4.17.21", deps: [] },
    });
    const report = buildIsolationReport(depMap);
    const text = formatIsolationReportText(report);
    expect(text).toContain("Dependency Isolation Report");
    expect(text).toContain("lodash@4.17.21");
    expect(text).toContain("score=");
  });

  it("shows isolated count in summary line", () => {
    const depMap = makeDepMap({
      alpha: { version: "1.0.0", deps: [] },
    });
    const report = buildIsolationReport(depMap);
    const text = formatIsolationReportText(report);
    expect(text).toContain("Fully isolated: 1");
  });
});
