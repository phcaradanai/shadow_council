import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const ignored = new Set(["node_modules", "dist", "coverage", ".git", "graft"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const results = [];

async function visit(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await visit(absolute);
    else if (extensions.has(path.extname(entry.name))) {
      const lineCount = (await fs.readFile(absolute, "utf8")).split(/\r?\n/).length;
      results.push({ file: path.relative(root, absolute), lineCount });
    }
  }
}

await visit(root);
const failures = results.filter(({ lineCount }) => lineCount > 500);
for (const { file, lineCount } of results.filter(({ lineCount }) => lineCount > 300)) {
  console.warn(`Source size review: ${file} (${lineCount} lines)`);
}
if (failures.length > 0) {
  console.error(
    failures.map(({ file, lineCount }) => `${file}: ${lineCount} lines exceeds 500`).join("\n"),
  );
  process.exit(1);
}
console.log("Source size checks passed.");
