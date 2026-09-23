import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const file = "apps/web/style.css";
execFileSync("./node_modules/.bin/prettier", ["--write", file], { stdio: "inherit" });
process.stdout.write(`FORMAT_CAPTURE_BEGIN ${file}\n${readFileSync(file).toString("base64")}\nFORMAT_CAPTURE_END ${file}\n`);
process.exitCode = 1;
