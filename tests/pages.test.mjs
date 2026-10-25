import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";

test("publikování z kořene větve obsahuje stejný web a všechny jeho adresy", async () => {
  const root = new URL("../", import.meta.url);
  async function verify(relative) {
    const source = new URL(`site/${relative}`, root);
    const target = new URL(relative, root);
    const entries = await readdir(source, { withFileTypes: true });
    const publishedEntries = await readdir(target);
    assert.deepEqual(
      entries.map((entry) => entry.name).sort(),
      publishedEntries.sort(),
      relative,
    );
    for (const entry of entries) {
      const path = `${relative}${entry.name}`;
      if (entry.isDirectory()) await verify(`${path}/`);
      else
        assert.deepEqual(
          await readFile(new URL(`site/${path}`, root)),
          await readFile(new URL(path, root)),
          `Nesynchronizovaný soubor ${path}. Spusťte npm run prepare:pages.`,
        );
    }
  }
  assert.deepEqual(
    await readFile(new URL("site/index.html", root)),
    await readFile(new URL("index.html", root)),
  );
  await access(new URL(".nojekyll", root));
  for (const path of ["assets/", "hlasovani/", "vysledky/"]) await verify(path);
});
