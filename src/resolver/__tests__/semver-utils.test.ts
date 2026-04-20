import {
  parseSemver,
  isCompatible,
  describeDelta,
  sortVersions,
} from "../semver-utils";

describe("parseSemver", () => {
  it("parses a plain version", () => {
    expect(parseSemver("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3, prerelease: undefined });
  });

  it("strips caret prefix", () => {
    expect(parseSemver("^2.0.0")).toEqual({ major: 2, minor: 0, patch: 0, prerelease: undefined });
  });

  it("strips tilde prefix", () => {
    expect(parseSemver("~3.1.4")).toEqual({ major: 3, minor: 1, patch: 4, prerelease: undefined });
  });

  it("parses prerelease tag", () => {
    expect(parseSemver("1.0.0-alpha.1")).toMatchObject({ prerelease: "alpha.1" });
  });

  it("returns null for invalid version", () => {
    expect(parseSemver("not-a-version")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSemver("")).toBeNull();
  });

  it("returns null for version with missing patch segment", () => {
    expect(parseSemver("1.2")).toBeNull();
  });
});

describe("isCompatible", () => {
  it("returns true for same major, higher minor", () => {
    expect(isCompatible("1.2.0", "1.3.0")).toBe(true);
  });

  it("returns false for different major", () => {
    expect(isCompatible("1.0.0", "2.0.0")).toBe(false);
  });

  it("returns false for lower patch on same minor", () => {
    expect(isCompatible("1.2.5", "1.2.3")).toBe(false);
  });

  it("returns true for identical versions", () => {
    expect(isCompatible("1.2.3", "1.2.3")).toBe(true);
  });
});

describe("describeDelta", () => {
  it("describes a major bump", () => {
    expect(describeDelta("1.0.0", "2.0.0")).toBe("major (1 → 2)");
  });

  it("describes a minor bump", () => {
    expect(describeDelta("1.2.0", "1.3.0")).toBe("minor (2 → 3)");
  });

  it("describes a patch bump", () => {
    expect(describeDelta("1.2.3", "1.2.9")).toBe("patch (3 → 9)");
  });

  it("returns none for identical versions", () => {
    expect(describeDelta("1.0.0", "1.0.0")).toBe("none");
  });
});

describe("sortVersions", () => {
  it("sorts versions in ascending order", () => {
    expect(sortVersions(["2.0.0", "1.0.0", "1.2.0", "1.1.5"])).toEqual([
      "1.0.0",
      "1.1.5",
      "1.2.0",
      "2.0.0",
    ]);
  });

  it("handles a single version", () => {
    expect(sortVersions(["3.1.4"])).toEqual(["3.1.4"]);
  });

  it("handles an empty array", () => {
    expect(sortVersions([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const original = ["2.0.0", "1.0.0"];
    sortVersions(original);
    expect(original).toEqual(["2.0.0", "1.0.0"]);
  });
});
