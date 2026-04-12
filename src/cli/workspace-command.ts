import * as fs from "fs";
import * as path from "path";
import { parsePackageLock } from "../parser";
import { diffWorkspaces, formatWorkspaceDiffText, WorkspacePackage } from "../diff/workspace-diff";
import { formatAsJson } from "../output";

export interface WorkspaceCommandOptions {
  beforeDir: string;
  afterDir: string;
  format?: "text" | "json";
  workspaces?: string[];
}

function loadWorkspacePackages(
  rootDir: string,
  workspaceGlobs: string[]
): WorkspacePackage[] {
  const results: WorkspacePackage[] = [];
  for (const relPath of workspaceGlobs) {
    const lockFile = path.join(rootDir, relPath, "package-lock.json");
    if (!fs.existsSync(lockFile)) continue;
    const content = fs.readFileSync(lockFile, "utf-8");
    try {
      const deps = parsePackageLock(content);
      results.push({ name: relPath, path: relPath, deps });
    } catch {
      // skip unparseable lockfiles
    }
  }
  return results;
}

export function runWorkspaceCommand(options: WorkspaceCommandOptions): string {
  const workspacePaths = options.workspaces ?? detectWorkspaces(options.beforeDir);

  const before = loadWorkspacePackages(options.beforeDir, workspacePaths);
  const after = loadWorkspacePackages(options.afterDir, workspacePaths);

  const report = diffWorkspaces(before, after);

  if (options.format === "json") {
    return formatAsJson({
      totalAdded: report.totalAdded,
      totalRemoved: report.totalRemoved,
      totalChanged: report.totalChanged,
      affectedWorkspaces: report.affectedWorkspaces,
      entries: report.entries,
    });
  }

  return formatWorkspaceDiffText(report);
}

function detectWorkspaces(rootDir: string): string[] {
  const pkgPath = path.join(rootDir, "package.json");
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    const ws: string[] = pkg.workspaces ?? [];
    return ws.map((w) => w.replace(/\*$/, "").replace(/\/$/, ""));
  } catch {
    return [];
  }
}
