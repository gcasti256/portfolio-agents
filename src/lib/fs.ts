import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";

export async function writeProjectFile(
  projectDir: string,
  filePath: string,
  content: string
): Promise<void> {
  const fullPath = path.join(projectDir, filePath);
  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content, "utf-8");
}

export async function readProjectFile(
  projectDir: string,
  filePath: string
): Promise<string | null> {
  const fullPath = path.join(projectDir, filePath);
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch {
    return null;
  }
}

export function exec(cmd: string, cwd?: string): string {
  return execSync(cmd, {
    cwd,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

export function execSafe(cmd: string, cwd?: string): string | null {
  try {
    return exec(cmd, cwd);
  } catch {
    return null;
  }
}

export function gitInit(dir: string): void {
  exec("git init", dir);
  exec("git add -A", dir);
  exec(
    `git commit -m "Initial commit" --author="George Castillo <gcasti256@users.noreply.github.com>"`,
    dir
  );
}

export function gitCommit(dir: string, message: string): void {
  exec("git add -A", dir);
  exec(
    `git commit -m "${message}" --author="George Castillo <gcasti256@users.noreply.github.com>"`,
    dir
  );
}

export function gitPush(dir: string, remote: string): void {
  exec(`git remote add origin ${remote}`, dir);
  exec("git push -u origin main", dir);
}
