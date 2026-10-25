# Veselé dýně

Česká webová aplikace pro školní hlasování o nejpovedenější dýni. Statický web běží na GitHub Pages, skutečné společné hlasy ukládá Supabase (PostgreSQL). Nepotřebuje placený hosting ani sestavení frontendu; platí limity aktuálního tarifu služeb.

- `/hlasovani/`: 16 očíslovaných dýní, výběr, potvrzení a poděkování. Bez odkazů na výsledky a bez zveřejněných počtů.
- `/vysledky/`: výsledky chráněné heslem, počet hlasů, procenta, pořadí, remízy a obnova každých 30 sekund.
- `/`: přesměrování na hlasování.

## 1. Připravte Supabase

1. Vytvořte projekt na [Supabase](https://supabase.com/).
2. V **SQL Editoru** spusťte celý soubor [`supabase/setup.sql`](supabase/setup.sql).
3. Pouze v SQL Editoru nastavte své silné, unikátní heslo příkazem `select public.set_results_password('VAŠE VLASTNÍ HESLO');`. Nahraďte text v uvozovkách skutečným heslem; nevkládejte ho do repozitáře. Minimum je 12 znaků, maximum 72 bajtů UTF-8. Pro apostrof uvnitř SQL řetězce použijte dva apostrofy. Heslo se ukládá jako bcrypt hash. SQL Editor může uchovávat historii dotazů, proto přístup k projektu ponechte jen správcům.
4. Z projektu zkopírujte **Project URL** a veřejný **publishable key** (`sb_publishable_…`) nebo veřejný **legacy anon key** (Settings → API / API Keys). Vložte je do [`site/assets/config.js`](site/assets/config.js). Nikdy nepoužívejte `service_role`, `sb_secret_…` ani databázové heslo.

Veřejný publishable / anon key může být v repozitáři: opravňuje pouze k odevzdání hlasu a k pokusu o přístup k výsledkům s heslem. Tabulky leží v privátním schématu, mají RLS a nemají oprávnění ke čtení pro návštěvníky. Bez hesla funkce výsledky nevrátí. Soubor SQL lze opakovat bez mazání hlasů a hesla. Pokud má váš starší projekt pgcrypto jinde než ve schématu `extensions`, zkontrolujte umístění před spuštěním; skript jej nepřesouvá.

## 2. GitHub Pages

1. Nahrajte tento projekt do větve `main` svého repozitáře.
2. V **Settings → Pages → Build and deployment → Source** vyberte **GitHub Actions**.
3. Workflow [pages.yml](.github/workflows/pages.yml) spustí testy a publikuje pouze adresář `site`.

Pro tento repozitář budou standardní adresy:

- Hlasování: `https://obvpuky.github.io/dynehlasovani1/hlasovani/`
- Výsledky: `https://obvpuky.github.io/dynehlasovani1/vysledky/`

Na vlastní doméně to bude `https://vase-domena.cz/hlasovani/` a `/vysledky/`. Relativní cesty fungují i v podadresáři projektu. Adresy bez koncového lomítka GitHub Pages přesměruje. Výsledky nejsou na hlasovací stránce ani v její navigaci zmíněny. Výsledková stránka má `noindex`, její skutečnou ochranu však zajišťuje serverové ověření hesla, nikoli utajení URL. Zdrojové soubory na veřejném GitHubu jsou veřejné.

## Místní vývoj a ověření

Vyžaduje Node.js 22 nebo novější; ověřeno na Node.js 24. Nejsou potřeba npm balíčky.

```sh
npm test
npm start
```

Vývojový server používá port 4173 (`PORT` jej může změnit). Stránky otevírejte přes HTTP server, ne jako soubory `file://`. Bez konfigurace databáze lze prohlížet galerii; odeslání hlasu je vypnuté a web o tom návštěvníka informuje. Aplikace nevyrábí lokální ani náhodné hlasy. Pro skutečné hlasování musí být dostupná nakonfigurovaná Supabase API.

`npm test` ověřuje výpočty, klientské API, chyby a HTTP obsluhu. Databázová sada [`tests/database.sql`](tests/database.sql) je určena pro **samostatnou testovací databázi**, nikdy pro živé hlasování. Po aplikaci setup.sql ji spustíte pomocí `psql -v ON_ERROR_STOP=1 -f tests/database.sql`. Pracuje v transakci a na konci vrací změny zpět. Používá role `anon`, `authenticated` a `postgres` dostupné v Supabase; při lokálním ověřování PostgreSQL je vytvořte předem.

## Fotografie a vzhled

Výchozí obrázky jsou vlastní ilustrační SVG, nikoli fotografie soutěžních výrobků. Na hlasovací stránce je to výslovně uvedeno. Čísla se vztahují k dýním na fyzické školní výstavě. Pro hlasování podle fotografií nahrajte fotky do `site/assets/` a nahraďte v `voting.js` SVG odpovídajícími obrázky; potom upravte upozornění o ilustracích. Na web se neposílají fotografie žáků ani jména.

## Co znamená jeden hlas

Prohlížeč si uloží náhodný UUID token. Databáze povolí k jednomu tokenu právě jeden hlas a při opakovaném požadavku vrátí původní volbu. Tím se zabrání dvojímu započtení při opakovaném kliknutí či výpadku spojení. Heslo pořadatele zůstává pouze v paměti stránky a neukládá se do prohlížečového úložiště ani do URL.

Toto je omezení **na prohlížeč, nikoli ověření osoby**: jiný prohlížeč, smazání úložiště či přímé požadavky s novými tokeny dovolí další hlas. Ve společné školní počítačové učebně se na stejném profilu prohlížeče započítá jen jeden hlas. Pro vynucení jednoho hlasu na žáka je potřeba další zadání, například jednorázové školní kódy nebo přihlášení. Pro veřejnou soutěž s odměnou přidejte také serverové omezení frekvence a ochranu proti automatizaci. Procenta vyjadřují podíl odevzdaných hlasů; bez počtu oprávněných žáků nelze určit procento účasti školy.

Odevzdané hlasy se změnou hesla nemažou. Pro novou soutěž zálohujte existující data a připravte samostatný projekt/databázi; aplikace záměrně nemá veřejné mazání či reset hlasů.
