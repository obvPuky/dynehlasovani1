import { cp, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// GitHub Pages může publikovat buď obsah site/ pomocí Actions,
// nebo kořen větve main. Obě varianty musí obsahovat stejný web.
const root = fileURLToPath(new URL("../", import.meta.url));
for (const name of ["index.html", "assets", "hlasovani", "vysledky"]) {
  await cp(`${root}site/${name}`, `${root}${name}`, { recursive: true });
}
await writeFile(`${root}.nojekyll`, "");
console.log("Statický web připraven i v kořeni repozitáře pro GitHub Pages.");
