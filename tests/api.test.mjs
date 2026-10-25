import test from "node:test";
import assert from "node:assert/strict";
import {
  createApi,
  isConfigured,
  summarizeResults,
} from "../site/assets/api.js";

const settings = {
  supabaseUrl: "https://example.supabase.co",
  supabaseKey: "public-test-key",
};
const token = "12345678-1234-4567-8901-123456789012";
const rows = () =>
  Array.from({ length: 16 }, (_, i) => ({ pumpkin: i + 1, votes: 0 }));
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("nepřipravená konfigurace neodešle síťový požadavek", async () => {
  assert.equal(isConfigured({ supabaseUrl: "", supabaseKey: "" }), false);
  assert.equal(isConfigured(settings), true);
  assert.equal(
    isConfigured({ ...settings, supabaseKey: "sb_secret_do-not-publish" }),
    false,
  );
  for (const url of [
    "http://example.com",
    "https://user:pass@example.com",
    "https://example.com/path",
    "https://example.com/?x=1",
  ]) {
    assert.equal(isConfigured({ ...settings, supabaseUrl: url }), false);
  }
  const api = createApi({}, () =>
    assert.fail("Síťový požadavek se nesmí odeslat"),
  );
  await assert.rejects(
    api.vote(1, token),
    (error) => error.kind === "configuration",
  );
});

test("hlas jde do RPC, potvrzená volba pochází ze serveru a token se nemění", async () => {
  const calls = [];
  const api = createApi(settings, async (url, options) => {
    calls.push({ url, options });
    return json(3);
  });
  assert.equal(await api.vote(3, token), 3);
  assert.equal(await api.vote(8, token), 3);
  assert.equal(
    calls[0].url,
    "https://example.supabase.co/rest/v1/rpc/submit_vote",
  );
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    p_pumpkin: 3,
    p_voter_token: token,
  });
  assert.equal(JSON.parse(calls[1].options.body).p_voter_token, token);
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(
    calls[0].options.headers.Authorization,
    "Bearer public-test-key",
  );
});

test("neplatné volby a tokeny se neodesílají", async () => {
  const api = createApi(settings, () =>
    assert.fail("Neplatný hlas se nesmí odeslat"),
  );
  for (const choice of [0, 17, -1, 1.5, "3", null])
    await assert.rejects(api.vote(choice, token));
  await assert.rejects(api.vote(1, "neplatný-token"));
});

test("nový publishable key se posílá jako API key, nikoli jako JWT", async () => {
  const api = createApi(
    { ...settings, supabaseKey: "sb_publishable_public-test-key" },
    async (url, options) => {
      assert.equal(options.headers.apikey, "sb_publishable_public-test-key");
      assert.equal(options.headers.Authorization, undefined);
      return json(1);
    },
  );
  assert.equal(await api.vote(1, token), 1);
});

test("chyby sítě a neplatné potvrzení nejsou úspěšný hlas", async () => {
  await assert.rejects(
    createApi(settings, async () => {
      throw new Error("offline");
    }).vote(2, token),
    (error) => error.kind === "network",
  );
  await assert.rejects(
    createApi(settings, async () => json(null)).vote(2, token),
    (error) => error.kind === "response",
  );
  await assert.rejects(
    createApi(settings, async () => json(17)).vote(2, token),
    (error) => error.kind === "response",
  );
  await assert.rejects(
    createApi(settings, async () => json({}, 429)).vote(2, token),
    (error) => error.kind === "rate-limit",
  );
});

test("výsledky rozlišují chybné heslo a chybu serveru", async () => {
  await assert.rejects(
    createApi(settings, async () => json({ code: "28000" }, 403)).results(
      "wrong",
    ),
    (error) => error.kind === "password",
  );
  await assert.rejects(
    createApi(settings, async () => json({}, 500)).results("password"),
    (error) => error.kind === "server",
  );
});

test("výsledky vyžadují všech 16 jedinečných dýní a nezáporné počty", async () => {
  assert.equal(
    (await createApi(settings, async () => json(rows())).results("password"))
      .length,
    16,
  );
  const duplicate = rows();
  duplicate[15].pumpkin = 1;
  const negative = rows();
  negative[4].votes = -1;
  const fractional = rows();
  fractional[0].votes = 1.1;
  for (const body of [
    [],
    rows().slice(0, 15),
    duplicate,
    negative,
    fractional,
  ]) {
    await assert.rejects(
      createApi(settings, async () => json(body)).results("password"),
      (error) => error.kind === "response",
    );
  }
});

test("počty a procenta včetně remíz a nulových výsledků", () => {
  const empty = summarizeResults(rows());
  assert.equal(empty.total, 0);
  assert.equal(empty.leaders.length, 0);
  assert.ok(empty.rows.every((row) => row.percent === 0));
  const data = rows();
  data[2].votes = 2;
  data[6].votes = 2;
  data[15].votes = 1;
  const result = summarizeResults(data);
  assert.equal(result.total, 5);
  assert.deepEqual(
    result.leaders.map((row) => row.pumpkin),
    [3, 7],
  );
  assert.deepEqual(
    result.rows.slice(0, 3).map((row) => row.rank),
    [1, 1, 3],
  );
  assert.deepEqual(
    result.rows.slice(0, 3).map((row) => row.percent),
    [40, 40, 20],
  );
  assert.equal(data[0].rank, undefined, "Vstupní data se nemění");
});
