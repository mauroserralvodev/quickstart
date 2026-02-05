import { existsSync } from "node:fs";
import { join } from "node:path";

export type AppRouterRoot = "app" | "src/app";

export function detectAppRouterRoot(cwd: string): AppRouterRoot {
  const srcApp = join(cwd, "src", "app");
  const app = join(cwd, "app");

  if (existsSync(srcApp)) return "src/app";
  if (existsSync(app)) return "app";

  throw new Error(
    "No Next.js App Router detected. Expected ./app or ./src/app in this project."
  );
}

export function detectNextProject(cwd: string): void {
  const pkg = join(cwd, "package.json");
  if (!existsSync(pkg)) throw new Error("No package.json found. Run inside a Node project.");

  // (Light check) Next config presence is optional; but package.json should exist.
}
