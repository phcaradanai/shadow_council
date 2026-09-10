import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);
const ignored = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  "graft",
  "playwright-report",
  "test-results",
]);

async function filesIn(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(absolute)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

const violations = [];
const sourceFiles = await filesIn(root);
const sourceSet = new Set(sourceFiles.map((file) => path.normalize(file)));

const resolveRelative = (from, specifier) => {
  const base = path.resolve(path.dirname(from), specifier);
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".mjs", ".cjs"].map((extension) => `${base}${extension}`),
  ];
  candidates.push(
    ...["index.ts", "index.tsx", "index.js", "index.mjs"].map((name) => path.join(base, name)),
  );
  return candidates.find((candidate) => sourceSet.has(path.normalize(candidate)));
};

const graph = new Map();
for (const file of sourceFiles) {
  const rel = path.relative(root, file).replaceAll(path.sep, "/");
  if (rel.endsWith(".test.ts") || rel.endsWith(".spec.ts") || rel.startsWith("tests/")) continue;
  const source = await fs.readFile(file, "utf8");
  const dependencies = [];
  for (const match of source.matchAll(/(?:from\s+|import\s*\(\s*)["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (specifier?.startsWith(".")) {
      const target = resolveRelative(file, specifier);
      if (target !== undefined) dependencies.push(target);
    }
  }
  graph.set(path.normalize(file), dependencies);
}

const visiting = new Set();
const visited = new Set();
const cyclePaths = [];
const visit = (file, chain) => {
  const normalized = path.normalize(file);
  if (visiting.has(normalized)) {
    cyclePaths.push(
      [...chain, normalized]
        .map((entry) => path.relative(root, entry).replaceAll(path.sep, "/"))
        .join(" -> "),
    );
    return;
  }
  if (visited.has(normalized)) return;
  visiting.add(normalized);
  for (const dependency of graph.get(normalized) ?? []) visit(dependency, [...chain, normalized]);
  visiting.delete(normalized);
  visited.add(normalized);
};
for (const file of graph.keys()) visit(file, []);
for (const cycle of cyclePaths) violations.push(`dependency cycle: ${cycle}`);

for (const file of await filesIn(root)) {
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  if (
    relative.endsWith(".test.ts") ||
    relative.endsWith(".spec.ts") ||
    relative.startsWith("tests/")
  )
    continue;
  const source = await fs.readFile(file, "utf8");
  const isDomain = relative.startsWith("packages/domain/src/");
  const isApplication = relative.startsWith("packages/application/src/");
  const isProtocol = relative.startsWith("packages/protocol/src/");
  const isWeb = relative.startsWith("apps/web/src/");
  const forbidden = [];
  if (
    isDomain &&
    /from\s+["'](?:node:|@shadow-council\/|(?:react|vite|express|fastify|ws|http))/.test(source)
  )
    forbidden.push("domain imports an external/framework layer");
  if (isDomain && /Math\.random\s*\(|Date\.now\s*\(|new\s+Date\s*\(/.test(source))
    forbidden.push("domain uses ambient randomness or time");
  if (
    isApplication &&
    /from\s+["'](?:@shadow-council\/(?:protocol)|(?:apps\/|@shadow-council\/server|@shadow-council\/web))/.test(
      source,
    )
  )
    forbidden.push("application imports outward");
  if (isProtocol && /from\s+["'](?:@shadow-council\/|apps\/)/.test(source))
    forbidden.push("protocol imports a product layer");
  if (isWeb && /from\s+["'](?:@shadow-council\/(?:domain|application)|apps\/)/.test(source))
    forbidden.push("web imports a server/domain layer");
  if (/(^|[^\w])any([^\w]|$)/.test(source) && !/eslint-disable/.test(source))
    forbidden.push("explicit any");
  for (const reason of forbidden) violations.push(`${relative}: ${reason}`);
}
if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}
console.log("Architecture checks passed.");
