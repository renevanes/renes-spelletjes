import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const file = new URL("../dist/index.html", import.meta.url);
const server = createServer(async (req, res) => {
  if (!["/", "/index.html"].includes(req.url)) {
    res.writeHead(404);
    res.end();
    return;
  }
  try {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(await readFile(file));
  } catch {
    res.writeHead(503);
    res.end("Run npm run build first.");
  }
});
server.listen(Number(process.env.PORT || 8765), "127.0.0.1", () =>
  console.log(`Local: http://127.0.0.1:${server.address().port}`),
);
