import { DependencyMap } from "../parser";

export interface WorkspacePackage {
  name: string;
  path: string;
  deps: DependencyMap;
}

export interface WorkspaceDiffEntry {
  package: string;
  workspacePath: string;
  from: string | null;
  to: string | null;
  changeType: "added" | "removed" | "changed" | "unchanged";
}

export interface WorkspaceDiffReport {
  entries: WorkspaceDiffEntry[];
  totalAdded: number;
  totalRemoved: number;
  totalChanged: number;
  affectedWorkspaces: string[];
}

export function diffWorkspaces(
  before: WorkspacePackage[],
  after: WorkspacePackage[]
): WorkspaceDiffReport {
  const entries: WorkspaceDiffEntry[] = [];
  const afterMap = new Map(after.map((w) => [w.name, w]));
  const beforeMap = new Map(before.map((w) => [w.name, w]));
  const allNames = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  for (const wsName of allNames) {
    const beforeWs = beforeMap.get(wsName);
    const afterWs = afterMap.get(wsName);
    const beforeDeps = beforeWs?.deps ?? {};
    const afterDeps = afterWs?.deps ?? {};
    const wsPath = afterWs?.path ?? beforeWs?.path ?? wsName;
    const allDeps = new Set([...Object.keys(beforeDeps), ...Object.keys(afterDeps)]);

    for (const dep of allDeps) {
      const fromVer = beforeDeps[dep]?.version ?? null;
      const toVer = afterDeps[dep]?.version ?? null;
      let changeType: WorkspaceDiffEntry["changeType"];
      if (!fromVer) changeType = "added";
      else if (!toVer) changeType = "removed";
      else if (fromVer !== toVer) changeType = "changed";
      else changeType = "unchanged";

      if (changeType !== "unchanged") {
        entries.push({ package: dep, workspacePath: wsPath, from: fromVer, to: toVer, changeType });
      }
    }
  }

  const totalAdded = entries.filter((e) => e.changeType === "added").length;
  const totalRemoved = entries.filter((e) => e.changeType === "removed").length;
  const totalChanged = entries.filter((e) => e.changeType === "changed").length;
  const affectedWorkspaces = [...new Set(entries.map((e) => e.workspacePath))];

  return { entries, totalAdded, totalRemoved, totalChanged, affectedWorkspaces };
}

export function formatWorkspaceDiffText(report: WorkspaceDiffReport): string {
  if (report.entries.length === 0) return "No workspace dependency changes detected.";
  const lines: string[] = [
    `Workspace Diff: +${report.totalAdded} added, -${report.totalRemoved} removed, ~${report.totalChanged} changed`,
    `Affected workspaces: ${report.affectedWorkspaces.join(", ")}`,
    "",
  ];
  for (const e of report.entries) {
    const arrow = e.changeType === "added" ? `+ ${e.to}` : e.changeType === "removed" ? `- ${e.from}` : `${e.from} → ${e.to}`;
    lines.push(`  [${e.workspacePath}] ${e.package}: ${arrow}`);
  }
  return lines.join("\n");
}
