import {
  parseVersion,
  isBreakingChange,
  compareVersions,
  changeLabel,
} from "../version-resolver";

describe("parseVersion", () => {
  it("parses a plain semver string", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3, raw: "1.2.3" });
  });

  it("strips caret prefix", () => {
    const result = parseVersion("^2.0.0");
    expect(result?.major).toBe(2);
  });

  it("strips tilde prefix", () => {
    const result = parseVersion("~1.4.2");
    expect(result?.minor).toBe(4);
  });

  it("returns null for non-semver strings", () => {
    expect(parseVersion("latest")).toBeNull();
    expect(parseVersion("")).toBeNull();
  });
});

describe("isBreakingChange", () => {
  it("detects a major version bump as breaking", () => {
    expect(isBreakingChange("1.0.0", "2.0.0")).toBe(true);
  });

  it("does not flag a minor bump on stable major as breaking", () => {
    expect(isBreakingChange("1.2.0", "1.3.0")).toBe(false);
  });

  it("treats minor bump on 0.x as breaking", () => {
    expect(isBreakingChange("0.4.0", "0.5.0")).toBe(true);
  });

  it("returns false for same version", () => {
    expect(isBreakingChange("1.0.0", "1.0.0")).toBe(false);
  });
});

describe("compareVersions", () => {
  it("returns -1 when a is older", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
  });

  it("returns 1 when a is newer", () => {
    expect(compareVersions("3.1.0", "3.0.9")).toBe(1);
  });

  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });
});

describe("changeLabel", () => {
  it("labels a major bump correctly", () => {
    expect(changeLabel("1.0.0", "2.0.0")).toBe("major");
  });

  it("labels a minor bump correctly", () => {
    expect(changeLabel("1.0.0", "1.1.0")).toBe("minor");
  });

  it("labels a patch bump correctly", () => {
    expect(changeLabel("1.0.0", "1.0.1")).toBe("patch");
  });

  it("labels identical versions as none", () => {
    expect(changeLabel("2.3.4", "2.3.4")).toBe("none");
  });
});
