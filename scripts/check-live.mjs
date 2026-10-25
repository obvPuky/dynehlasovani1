import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { config } from "../site/assets/config.js";

const base = new URL(process.argv[2]);
if (base.protocol !== "https:")
  throw new Error("Veřejný web musí používat HTTPS.");
if (!base.pathname.endsWith("/")) base.pathname += "/";
const paths = [
  "",
  "hlasovani/",
  "vysledky/",
  "assets/voting.js",
  "assets/config.js",
];
const checks = await Promise.all(
  paths.map(async (path) => ({
    url: new URL(path, base),
    expected: await readFile(
      new URL(
        `../site/${path.endsWith("/") || !path ? path + "index.html" : path}`,
        import.meta.url,
      ),
      "utf8",
    ),
  })),
);

// Publikování z větve probíhá souběžně v samostatném GitHub workflow.
// Čekáme na skutečný obsah tohoto commitu, ne jen na úspěšný HTTP status.
let lastError;
let deployed = false;
for (let attempt = 0; attempt < 24; attempt++) {
  try {
    for (const check of checks) {
      const url = new URL(check.url);
      url.searchParams.set("verify", process.env.GITHUB_SHA || "local");
      const response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      assert.equal(
        response.status,
        200,
        `${check.url.pathname}: očekáváno HTTP 200`,
      );
      assert.equal(
        await response.text(),
        check.expected,
        `${check.url.pathname}: na serveru je jiná verze souboru`,
      );
    }
    deployed = true;
    break;
  } catch (error) {
    lastError = error;
    console.log(`Čekám na zveřejnění aktuálního webu (${attempt + 1}/24).`);
    if (attempt < 23)
      await new Promise((resolve) => setTimeout(resolve, 10000));
  }
}
if (!deployed) throw lastError;
console.log(
  "Ověřeno: veřejná úvodní stránka, hlasování, výsledky a JavaScript odpovídají aktuálnímu commitu.",
);

// Tyto dva neplatné požadavky nikdy nevytvářejí hlas ani nečtou výsledky.
for (const [name, args, expectedCode] of [
  ["submit_vote", { p_pumpkin: 0, p_voter_token: null }, "22023"],
  ["admin_results", { p_password: null }, "28000"],
]) {
  const response = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: config.supabaseKey },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.equal(
    data.code,
    expectedCode,
    `${name}: veřejný klíč nebo databázová funkce nejsou připravené`,
  );
}
console.log(
  "Ověřeno: Supabase přijímá veřejný klíč, kontroluje hlas a chrání výsledky. Žádný hlas nebyl přidán.",
);
