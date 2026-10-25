import { createApi, summarizeResults } from "./api.js";

const api = createApi();
const loginForm = document.querySelector("#login-form");
const loginMessage = document.querySelector("#login-message");
const resultsMessage = document.querySelector("#results-message");
const loginButton = document.querySelector("#login-button");
const refreshButton = document.querySelector("#refresh-results");
const passwordInput = document.querySelector("#results-password");
const numberFormat = new Intl.NumberFormat("cs-CZ");
const percentFormat = new Intl.NumberFormat("cs-CZ", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
let password = "";
let busy = false;
let timer;
let sessionVersion = 0;

function render(data) {
  const { total, rows, leaders } = summarizeResults(data);
  document.querySelector("#total-votes").textContent =
    numberFormat.format(total);
  document.querySelector("#leader-label").textContent =
    leaders.length > 1 ? "O první místo se dělí" : "Průběžně vede";
  document.querySelector("#leader-name").textContent =
    leaders.length === 1
      ? `Dýně ${leaders[0].pumpkin}`
      : leaders.length > 1
        ? `${leaders.length} ${leaders.length > 4 ? "dýní" : "dýně"}`
        : "Zatím nikdo";
  document.querySelector("#leader-detail").textContent =
    leaders.length === 1
      ? `${numberFormat.format(leaders[0].votes)} hlasů pro favoritku`
      : leaders.length > 1
        ? `Dýně ${leaders.map((row) => row.pumpkin).join(", ")}`
        : "Čekáme na první hlas";
  document.querySelector("#leader-percent").textContent = leaders.length
    ? `${percentFormat.format(leaders[0].percent)} %`
    : "0 %";
  document.querySelector("#leader-percent-note").textContent =
    leaders.length > 1
      ? "Podíl každé dýně na prvním místě"
      : "Ze všech odevzdaných hlasů";
  const fragment = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement("tr");
    if (total && row.rank === 1) tr.className = "winning-row";
    tr.innerHTML = `<td class="rank">${row.rank}.</td><td class="table-pumpkin">Dýně ${row.pumpkin}</td><td><div class="share-cell"><div class="share-track" aria-hidden="true"><div class="share-bar" style="width:${row.percent}%"></div></div><span class="share-value">${percentFormat.format(row.percent)} %</span></div></td><td>${numberFormat.format(row.votes)}</td>`;
    fragment.append(tr);
  }
  document.querySelector("#results-rows").replaceChildren(fragment);
  document.querySelector("#updated-at").textContent =
    `Aktualizováno v ${new Intl.DateTimeFormat("cs-CZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())} · obnova každých 30 s`;
}

async function loadResults(isLogin = false) {
  if (busy || !password) return;
  busy = true;
  loginButton.disabled = true;
  refreshButton.disabled = true;
  const message = isLogin ? loginMessage : resultsMessage;
  message.textContent = "";
  const requestVersion = sessionVersion;
  try {
    const rows = await api.results(password);
    if (requestVersion !== sessionVersion || !password) return;
    render(rows);
    document.querySelector("#login-section").hidden = true;
    document.querySelector("#results-content").hidden = false;
    passwordInput.value = "";
    if (!timer)
      timer = setInterval(() => {
        if (!document.hidden) loadResults();
      }, 30000);
  } catch (error) {
    if (requestVersion !== sessionVersion) return;
    message.textContent = error.message;
    if (error.kind === "password") {
      logout();
      loginMessage.textContent = error.message;
    }
  } finally {
    busy = false;
    loginButton.disabled = false;
    refreshButton.disabled = false;
  }
}

function logout() {
  sessionVersion++;
  password = "";
  clearInterval(timer);
  timer = undefined;
  passwordInput.value = "";
  document.querySelector("#results-content").hidden = true;
  document.querySelector("#login-section").hidden = false;
  document.querySelector("#results-rows").replaceChildren();
  loginMessage.textContent = "";
  resultsMessage.textContent = "";
  passwordInput.focus();
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (busy) return;
  password = passwordInput.value;
  loadResults(true);
});
refreshButton.addEventListener("click", () => loadResults());
document.querySelector("#logout").addEventListener("click", logout);
