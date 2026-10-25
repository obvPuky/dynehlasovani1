import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createSiteServer } from "../scripts/serve.mjs";
import { pumpkinIllustration } from "../site/assets/pumpkins.js";

test("web obslouží obě stránky, moduly i přesměrování podadresářů", async (t) => {
  const server = createSiteServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const path of [
    "/",
    "/hlasovani/",
    "/vysledky/",
    "/assets/config.js",
    "/assets/style.css",
    "/assets/hero.svg",
  ]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok((await response.text()).length > 0, path);
  }
  const redirect = await fetch(`${base}/hlasovani?x=1`, { redirect: "manual" });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get("location"), "/hlasovani/?x=1");
  assert.equal(
    (await fetch(`${base}/assets/voting.js`)).headers.get("content-type"),
    "text/javascript; charset=utf-8",
  );
  assert.equal((await fetch(`${base}/neni`)).status, 404);
  assert.equal((await fetch(`${base}/%2e%2e%2fpackage.json`)).status, 403);
  assert.equal(
    (await fetch(`${base}/hlasovani/`, { method: "POST" })).status,
    405,
  );
});

test("hlasovací stránka a její klientský kód neodkazují na výsledky", async () => {
  for (const path of [
    "site/hlasovani/index.html",
    "site/assets/voting.js",
    "site/index.html",
  ]) {
    const text = await readFile(new URL(`../${path}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /vysledky|výsledk|admin_results/i, path);
  }
});

test("všech 16 ilustrací je platně očíslovaných a různých", () => {
  const illustrations = Array.from({ length: 16 }, (_, index) =>
    pumpkinIllustration(index + 1),
  );
  assert.equal(new Set(illustrations).size, 16);
  for (const illustration of illustrations)
    assert.match(illustration, /^<svg /);
  assert.throws(() => pumpkinIllustration(17), RangeError);
});
