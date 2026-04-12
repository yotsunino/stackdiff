import { diffWorkspaces, formatWorkspaceDiffText, WorkspacePackage } from "../workspace-diff";

function makeWorkspace(name: string, path: string, deps: Record<string, string>): WorkspacePackage {
  const depMap: Record<string, { version: string; resolved: string; dependencies: Record<string, unknown> }> = {};
  for (const [k, v] of Object.entries(deps)) {
    depMap[k] = { version: v, resolved: "", dependencies: {} };
  }
  return { name, path, deps: depMap };
}

describe("diffWorkspaces", () => {
  it("detects added dependency in a workspace", () => {
    const before = [makeWorkspace("pkg-a", "packages/a", { lodash: "4.17.0" })];
    const after = [makeWorkspace("pkg-a", "packages/a", { lodash: "4.17.0", axios: "1.0.0" })];
    const report = diffWorkspaces(before, after);
    expect(report.totalAdded).toBe(1);
    expect(report.entries[0].package).toBe("axios");
    expect(report.entries[0].changeType).toBe("added");
  });

  it("detects removed dependency in a workspace", () => {
    const before = [makeWorkspace("pkg-b", "packages/b", { react: "17.0.0" })];
    const after = [makeWorkspace("pkg-b", "packages/b", {})];
    const report = diffWorkspaces(before, after);
    expect(report.totalRemoved).toBe(1);
    expect(report.entries[0].changeType).toBe("removed");
    expect(report.entries[0].from).toBe("17.0.0");
  });

  it("detects changed dependency version", () => {
    const before = [makeWorkspace("pkg-c", "packages/c", { typescript: "4.0.0" })];
    const after = [makeWorkspace("pkg-c", "packages/c", { typescript: "5.0.0" })];
    const report = diffWorkspaces(before, after);
    expect(report.totalChanged).toBe(1);
    expect(report.entries[0].from).toBe("4.0.0");
    expect(report.entries[0].to).toBe("5.0.0");
  });

  it("returns empty report when no changes", () => {
    const before = [makeWorkspace("pkg-d", "packages/d", { express: "4.18.0" })];
    const after = [makeWorkspace("pkg-d", "packages/d", { express: "4.18.0" })];
    const report = diffWorkspaces(before, after);
    expect(report.entries).toHaveLength(0);
    expect(report.affectedWorkspaces).toHaveLength(0);
  });

  it("tracks affected workspaces correctly", () => {
    const before = [
      makeWorkspace("pkg-a", "packages/a", { lodash: "4.0.0" }),
      makeWorkspace("pkg-b", "packages/b", { axios: "0.27.0" }),
    ];
    const after = [
      makeWorkspace("pkg-a", "packages/a", { lodash: "4.1.0" }),
      makeWorkspace("pkg-b", "packages/b", { axios: "0.27.0" }),
    ];
    const report = diffWorkspaces(before, after);
    expect(report.affectedWorkspaces).toEqual(["packages/a"]);
  });
});

describe("formatWorkspaceDiffText", () => {
  it("returns no-change message for empty report", () => {
    const report = diffWorkspaces([], []);
    expect(formatWorkspaceDiffText(report)).toContain("No workspace");
  });

  it("formats a changed entry with arrow", () => {
    const before = [makeWorkspace("pkg-a", "packages/a", { jest: "28.0.0" })];
    const after = [makeWorkspace("pkg-a", "packages/a", { jest: "29.0.0" })];
    const report = diffWorkspaces(before, after);
    const text = formatWorkspaceDiffText(report);
    expect(text).toContain("28.0.0 → 29.0.0");
    expect(text).toContain("packages/a");
  });
});
