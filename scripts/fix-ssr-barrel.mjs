#!/usr/bin/env node
/**
 * Rolldown/Nitro sometimes emits a broken SSR barrel:
 *   1. `export { ssr_exports as s }` with no binding — nitro loads `mod.s.fetch`
 *   2. ssr2.mjs <-> ssr.mjs circular import of `__exportAll`
 * Re-export the real server entry as `s`, and inline `__exportAll` into ssr2.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../.vercel/output/functions/__server.func/_ssr",
);
const ssr = join(dir, "ssr.mjs");
const ssr2 = join(dir, "ssr2.mjs");

if (existsSync(ssr)) {
  let src = readFileSync(ssr, "utf8");
  let next = src.replace(/\sssr_exports as s,/, " server_default as s,");
  if (next === src && !/server_default as s/.test(src)) {
    next = src.replace(
      "server_default as default,",
      "server_default as default, server_default as s,",
    );
  }
  if (next !== src) {
    writeFileSync(ssr, next);
    console.log("[fix-ssr] re-exported server_default as s");
  }
}

if (existsSync(ssr2)) {
  const helper = `var __exportAll$1 = (all, no_symbols) => {
	let target = {};
	for (var name in all) Object.defineProperty(target, name, {
		get: all[name],
		enumerable: true
	});
	if (!no_symbols) Object.defineProperty(target, Symbol.toStringTag, { value: "Module" });
	return target;
};
`;
  let src = readFileSync(ssr2, "utf8");
  const stripped = src.replace(
    /import \{ c as __exportAll\$1 \} from "\.\/ssr\.mjs";\n/,
    helper,
  );
  if (stripped !== src) {
    writeFileSync(ssr2, stripped);
    console.log("[fix-ssr] inlined __exportAll into ssr2");
  }
}
