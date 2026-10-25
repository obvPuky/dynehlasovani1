import { config } from "./config.js";
import { PUMPKIN_COUNT } from "./pumpkins.js";

export class ApiError extends Error {
  constructor(message, kind = "unknown") {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

export function isConfigured(settings = config) {
  try {
    const url = new URL(settings.supabaseUrl);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      typeof settings.supabaseKey === "string" &&
      settings.supabaseKey.trim().length > 0 &&
      !settings.supabaseKey.startsWith("sb_secret_")
    );
  } catch {
    return false;
  }
}

export function createApi(settings = config, fetcher = globalThis.fetch) {
  async function rpc(name, args) {
    if (!isConfigured(settings))
      throw new ApiError(
        "Hlasování se právě připravuje. Zkuste to prosím později.",
        "configuration",
      );
    let response;
    try {
      response = await fetcher(
        `${settings.supabaseUrl.replace(/\/$/, "")}/rest/v1/rpc/${name}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: settings.supabaseKey,
            ...(settings.supabaseKey.startsWith("sb_publishable_")
              ? {}
              : { Authorization: `Bearer ${settings.supabaseKey}` }),
          },
          body: JSON.stringify(args),
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
          credentials: "omit",
          referrerPolicy: "no-referrer",
        },
      );
    } catch {
      throw new ApiError(
        "Spojení se nepodařilo. Zkontrolujte internet a zkuste to znovu.",
        "network",
      );
    }
    if (!response.ok) {
      let code;
      try {
        code = (await response.json()).code;
      } catch {
        /* Chyba proxy nemusí být JSON. */
      }
      if (name === "admin_results" && code === "28000")
        throw new ApiError("Heslo není správné.", "password");
      if (response.status === 429)
        throw new ApiError(
          "Příliš mnoho požadavků. Chvilku počkejte a zkuste to znovu.",
          "rate-limit",
        );
      throw new ApiError(
        "Požadavek se nepodařilo dokončit. Zkuste to prosím později.",
        "server",
      );
    }
    try {
      return await response.json();
    } catch {
      throw new ApiError(
        "Server vrátil neplatnou odpověď. Zkuste to znovu.",
        "response",
      );
    }
  }
  return {
    async vote(pumpkin, token) {
      if (!Number.isInteger(pumpkin) || pumpkin < 1 || pumpkin > PUMPKIN_COUNT)
        throw new ApiError("Vyberte jednu dýni.");
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          token,
        )
      )
        throw new ApiError("Prohlížeč nemohl připravit hlas. Obnovte stránku.");
      const savedPumpkin = await rpc("submit_vote", {
        p_pumpkin: pumpkin,
        p_voter_token: token,
      });
      if (
        !Number.isInteger(savedPumpkin) ||
        savedPumpkin < 1 ||
        savedPumpkin > PUMPKIN_COUNT
      )
        throw new ApiError(
          "Uložení hlasu nebylo potvrzeno. Zkuste odeslání zopakovat.",
          "response",
        );
      return savedPumpkin;
    },
    async results(password) {
      const rows = await rpc("admin_results", { p_password: password });
      if (!Array.isArray(rows) || rows.length !== PUMPKIN_COUNT)
        throw new ApiError(
          "Výsledky nejsou úplné. Zkuste je načíst znovu.",
          "response",
        );
      const seen = new Set();
      for (const row of rows) {
        if (
          !Number.isInteger(row.pumpkin) ||
          row.pumpkin < 1 ||
          row.pumpkin > PUMPKIN_COUNT ||
          seen.has(row.pumpkin) ||
          !Number.isSafeInteger(row.votes) ||
          row.votes < 0
        )
          throw new ApiError("Výsledky mají neplatný formát.", "response");
        seen.add(row.pumpkin);
      }
      return rows;
    },
  };
}

export function summarizeResults(rows) {
  const sorted = rows
    .map((row) => ({ ...row }))
    .sort((a, b) => b.votes - a.votes || a.pumpkin - b.pumpkin);
  const total = sorted.reduce((sum, row) => sum + row.votes, 0);
  if (!Number.isSafeInteger(total))
    throw new ApiError("Počet hlasů je mimo podporovaný rozsah.", "response");
  let previousVotes = null;
  let rank = 0;
  sorted.forEach((row, i) => {
    if (row.votes !== previousVotes) rank = i + 1;
    row.rank = rank;
    row.percent = total ? (row.votes / total) * 100 : 0;
    previousVotes = row.votes;
  });
  return {
    total,
    rows: sorted,
    leaders: total ? sorted.filter((row) => row.votes === sorted[0].votes) : [],
  };
}
