import { createApi, isConfigured } from "./api.js";
import { PUMPKIN_COUNT, palettes, pumpkinIllustration } from "./pumpkins.js";

const api = createApi();
const form = document.querySelector("#vote-form");
const grid = document.querySelector("#pumpkin-grid");
const submit = document.querySelector("#submit-vote");
const message = document.querySelector("#vote-message");
const dialog = document.querySelector("#confirm-dialog");
const TOKEN_KEY = "vesele-dyne:v1:token";
const VOTE_KEY = "vesele-dyne:v1:vote";
let selected = null;
let busy = false;
let completed = false;
let token;
let storageAvailable = true;

for (let number = 1; number <= PUMPKIN_COUNT; number++) {
  const label = document.createElement("label");
  label.className = "pumpkin-card";
  label.style.setProperty("--card-bg", palettes[number - 1][0]);
  label.innerHTML = `<input class="pumpkin-radio" type="radio" name="pumpkin" value="${number}" aria-label="Dýně ${number}"><div class="pumpkin-card-inner"><div class="pumpkin-image"><span class="card-number">${String(number).padStart(2, "0")}</span>${pumpkinIllustration(number)}</div><div class="pumpkin-card-footer"><span class="pumpkin-name">Dýně ${number}</span><span class="radio-indicator" aria-hidden="true">✓</span></div></div>`;
  grid.append(label);
}

function showSuccess(number, moveFocus = true) {
  completed = true;
  form.hidden = true;
  document.querySelector("#fair-note").hidden = true;
  document.querySelector("#selection-title").textContent =
    "Váš favorit už má o hlas víc.";
  document.querySelector(".section-hint").hidden = true;
  document.querySelector(".gallery-note").hidden = true;
  document.querySelector("#success-detail").textContent =
    `Váš hlas získala Dýně ${number}.`;
  const success = document.querySelector("#success-card");
  success.hidden = false;
  if (moveFocus) success.focus();
}

try {
  token = localStorage.getItem(TOKEN_KEY);
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token || "",
    )
  ) {
    token = crypto.randomUUID();
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(VOTE_KEY);
  }
  const previous = Number(localStorage.getItem(VOTE_KEY));
  if (Number.isInteger(previous) && previous >= 1 && previous <= PUMPKIN_COUNT)
    showSuccess(previous, false);
} catch {
  storageAvailable = false;
  message.textContent =
    "Pro hlasování povolte místní úložiště v prohlížeči a obnovte stránku.";
}

if (!isConfigured() && storageAvailable)
  message.textContent =
    "Hlasování se právě připravuje. Zkuste to prosím později.";

form.addEventListener("change", (event) => {
  if (busy || completed || event.target.name !== "pumpkin") return;
  selected = Number(event.target.value);
  document.querySelector("#selection-label").textContent =
    `Vaše favoritka: Dýně ${selected}`;
  document.querySelector("#selection-hint").textContent =
    "Je to ta pravá? Potvrďte svou volbu odesláním hlasu.";
  submit.disabled = !isConfigured() || !storageAvailable;
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!selected || busy || completed || !storageAvailable || !isConfigured())
    return;
  document.querySelector("#confirm-description").textContent =
    `Svůj jediný hlas posíláte dýni číslo ${selected}.`;
  dialog.showModal();
});

dialog.addEventListener("close", async () => {
  if (dialog.returnValue !== "confirm" || busy || completed) return;
  busy = true;
  submit.disabled = true;
  submit.textContent = "Odesíláme váš hlas…";
  message.textContent = "";
  grid.querySelectorAll("input").forEach((input) => {
    input.disabled = true;
  });
  try {
    const savedPumpkin = await api.vote(selected, token);
    try {
      localStorage.setItem(VOTE_KEY, String(savedPumpkin));
    } catch {
      /* Server potvrdil hlas i bez lokální účtenky. */
    }
    showSuccess(savedPumpkin);
  } catch (error) {
    message.textContent = error.message;
    submit.textContent = "Zkusit odeslat znovu";
    submit.disabled = false;
    grid.querySelectorAll("input").forEach((input) => {
      input.disabled = false;
    });
  } finally {
    busy = false;
  }
});

window.addEventListener("storage", (event) => {
  if (event.key === VOTE_KEY && !completed && event.newValue) {
    const number = Number(event.newValue);
    if (Number.isInteger(number) && number >= 1 && number <= PUMPKIN_COUNT) {
      if (dialog.open) dialog.close("cancel");
      showSuccess(number);
    }
  }
});
