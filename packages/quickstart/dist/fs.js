import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
export function ensureDirForFile(path) {
    mkdirSync(dirname(path), { recursive: true });
}
export function writeIfMissing(path, content) {
    if (existsSync(path))
        return { written: false, reason: "exists" };
    ensureDirForFile(path);
    writeFileSync(path, content, "utf8");
    return { written: true, reason: "created" };
}
export function writeForce(path, content) {
    ensureDirForFile(path);
    writeFileSync(path, content, "utf8");
    return { written: true, reason: "overwritten" };
}
export function readText(path) {
    return readFileSync(path, "utf8");
}
export function exists(path) {
    return existsSync(path);
}
