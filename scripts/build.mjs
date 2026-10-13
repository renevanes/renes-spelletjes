import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => readFile(resolve(root, "src", name), "utf8");
const files = [
  "persistence.js",
  "risk-engine.js",
  "risk-ui.js",
  "enhancements.js",
  "legacy.js",
];
const scripts = [];
for (const file of files) {
  const code = await read(file);
  new Script(code, { filename: file });
  if (/<\/script/i.test(code))
    throw new Error(`Unsafe inline script terminator in ${file}`);
  scripts.push(`<script>\n${code}\n</script>`);
}
let html = (await read("shell.html"))
  .replace(
    "<!-- EXTRA_STYLES -->",
    `<style>\n${await read("enhancements.css")}\n${await read("risk.css")}\n</style>`,
  )
  .replace(
    "<!-- EXTRA_SCREENS -->",
    `${await read("enhancements.html")}\n${await read("risk.html")}`,
  )
  .replace("<!-- APPLICATION_SCRIPTS -->", scripts.join("\n"));
if (/<!-- (EXTRA_|APPLICATION_)/.test(html))
  throw new Error("Unresolved build placeholder");
await mkdir(resolve(root, "dist"), { recursive: true });
await writeFile(resolve(root, "dist/index.html"), html);
console.log(
  `Built dist/index.html (${Buffer.byteLength(html)} bytes). Released signed files were not changed.`,
);
