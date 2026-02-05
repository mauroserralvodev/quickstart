#!/usr/bin/env node
import pc from "picocolors";
import { init } from "./init.js";
async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];
    if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
        console.log(`
${pc.bold("Brinpage Quickstart")}
Usage:
  brinpage-quickstart init [--force]

Commands:
  init     Scaffold Brinpage quickstart files into current project
`);
        process.exit(0);
    }
    if (cmd === "init") {
        const force = args.includes("--force");
        await init({ force });
        return;
    }
    console.error(pc.red(`Unknown command: ${cmd}`));
    process.exit(1);
}
main().catch((e) => {
    console.error(pc.red(e instanceof Error ? e.message : String(e)));
    process.exit(1);
});
