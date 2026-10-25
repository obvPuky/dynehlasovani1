import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, sep, extname } from "node:path";

const siteRoot = resolve(fileURLToPath(new URL("../site/", import.meta.url)));
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

export function createSiteServer() {
  return createServer(async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    try {
      const url = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(url.pathname);
      let path = resolve(siteRoot, `.${pathname}`);
      if (
        !path.startsWith(siteRoot + sep) &&
        path !== siteRoot.replace(/\/$/, "")
      ) {
        res.writeHead(403).end("Zakázáno");
        return;
      }
      const info = await stat(path);
      if (info.isDirectory()) {
        if (!url.pathname.endsWith("/")) {
          res
            .writeHead(308, { Location: `${url.pathname}/${url.search}` })
            .end();
          return;
        }
        path = resolve(path, "index.html");
      }
      const data = await readFile(path);
      res.writeHead(200, {
        "Content-Type":
          contentTypes[extname(path)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch (error) {
      res
        .writeHead(
          error.code === "ENOENT" || error.code === "ENOTDIR" ? 404 : 400,
          { "Content-Type": "text/plain; charset=utf-8" },
        )
        .end("Stránka nenalezena");
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const port = Number(process.env.PORT || 4173);
  createSiteServer().listen(port, "0.0.0.0", () => {
    console.log(`Veselé dýně: vývojový server běží na portu ${port}.`);
  });
}
