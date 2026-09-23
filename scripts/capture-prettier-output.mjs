import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const files=["apps/web/src/presentation/game-effects.ts","apps/web/src/screens/Game.ts","apps/web/style.css"];
execFileSync("./node_modules/.bin/prettier", ["--write", ...files], { stdio: "inherit" });
for (const file of files) {
  const content = readFileSync(file);
  process.stdout.write(`FORMAT_CAPTURE_BEGIN ${file}\n${content.toString("base64")}\nFORMAT_CAPTURE_END ${file}\n`);
}
process.exitCode = 1;
