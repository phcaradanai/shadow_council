import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = [
  "packages/application/src/app.ts",
  "packages/application/src/bots/bot-policy.test.ts",
  "packages/application/src/bots/bot-policy.ts",
  "packages/domain/src/engine/decide.ts",
  "packages/domain/src/engine/engine.test.ts",
  "packages/protocol/src/parse.ts",
  "apps/server/src/transport/http-server.ts",
  "apps/web/src/components/ActionSelector.ts",
  "apps/web/src/components/EventLog.ts",
  "apps/web/src/components/ReactionPanel.ts",
  "apps/web/src/components/RevealPanel.ts",
  "apps/web/src/components/StatsDashboard.tsx",
  "apps/web/src/i18n/locales/en.ts",
  "apps/web/src/i18n/locales/th.ts",
  "apps/web/src/presentation/match-stats.ts",
  "apps/web/src/presentation/strike-planner.ts",
  "apps/web/src/screens/Game.ts",
  "apps/web/src/screens/Lobby.ts",
  "apps/web/style.css",
  "apps/web/tsconfig.json",
  "tests/e2e/localization.spec.ts"
];

execFileSync("./node_modules/.bin/prettier", ["--write", ...files], {
  stdio: "inherit",
});

for (const file of files) {
  const content = readFileSync(file);
  process.stdout.write(
    `FORMAT_CAPTURE_BEGIN ${file}\n${content.toString("base64")}\nFORMAT_CAPTURE_END ${file}\n`,
  );
}

process.exitCode = 1;
