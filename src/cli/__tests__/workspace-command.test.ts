import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { runWorkspaceCommand } from "../workspace-command";

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "stackdiff-ws-"));
}

function writeLock(dir: string, wsPath: string, deps: Record<string, string>): void {
  const full = path.join(dir, wsPath);
  fs.mkdirSync(full, { recursive: true });
  const packages: Record<string, unknown> = {};
  for (const [name, version] of Object.entries(deps)) {
    packages[`node_modules/${name}`] = { version, resolved: "", integrity: "" };
  }
  const lock = { name: wsPath, version: "1.0.0", lockfileVersion: 3, packages };
  fs.writeFileSync(path.join(full, "package-lock.json"), JSON.stringify(lock));
}

function writeRootPkg(dir: string, workspaces: string[]): void {
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "root", workspaces })
  );
}

describe("runWorkspaceCommand", () => {
  it("detects changed dependency across workspace", () => {
    const beforeDir = makeTempDir();
    const afterDir = makeTempDir();
    writeRootPkg(beforeDir, ["packages/a"]);
    writeRootPkg(afterDir, ["packages/a"]);
    writeLock(beforeDir, "packages/a", { lodash: "4.17.20" });
    writeLock(afterDir, "packages/a", { lodash: "4.17.21" });

    const output = runWorkspaceCommand({ beforeDir, afterDir });
    expect(output).toContain("lodash");
    expect(output).toContain("4.17.20");
    expect(output).toContain("4.17.21");
  });

  it("returns no-change message when deps are identical", () => {
    const beforeDir = makeTempDir();
    const afterDir = makeTempDir();
    writeRootPkg(beforeDir, ["packages/b"]);
    writeRootPkg(afterDir, ["packages/b"]);
    writeLock(beforeDir, "packages/b", { express: "4.18.0" });
    writeLock(afterDir, "packages/b", { express: "4.18.0" });

    const output = runWorkspaceCommand({ beforeDir, afterDir });
    expect(output).toContain("No workspace");
  });

  it("outputs JSON when format is json", () => {
    const beforeDir = makeTempDir();
    const afterDir = makeTempDir();
    writeRootPkg(beforeDir, ["packages/c"]);
    writeRootPkg(afterDir, ["packages/c"]);
    writeLock(beforeDir, "packages/c", { axios: "1.0.0" });
    writeLock(afterDir, "packages/c", { axios: "1.1.0" });

    const output = runWorkspaceCommand({ beforeDir, afterDir, format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.totalChanged).toBe(1);
    expect(parsed.entries[0].package).toBe("axios");
  });

  it("accepts explicit workspace list", () => {
    const beforeDir = makeTempDir();
    const afterDir = makeTempDir();
    writeLock(beforeDir, "apps/web", { react: "17.0.0" });
    writeLock(afterDir, "apps/web", { react: "18.0.0" });

    const output = runWorkspaceCommand({
      beforeDir,
      afterDir,
      workspaces: ["apps/web"],
    });
    expect(output).toContain("react");
    expect(output).toContain("17.0.0");
  });
});
