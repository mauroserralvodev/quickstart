import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDirForFile(path: string) {
  mkdirSync(dirname(path), { recursive: true });
}

export function writeIfMissing(path: string, content: string) {
  if (existsSync(path)) return { written: false, reason: "exists" as const };
  ensureDirForFile(path);
  writeFileSync(path, content, "utf8");
  return { written: true, reason: "created" as const };
}

export function writeForce(path: string, content: string) {
  ensureDirForFile(path);
  writeFileSync(path, content, "utf8");
  return { written: true, reason: "overwritten" as const };
}

export function readText(path: string) {
  return readFileSync(path, "utf8");
}

export function exists(path: string) {
  return existsSync(path);
}
