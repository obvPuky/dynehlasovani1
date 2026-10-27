// Ukončené hlasování: vypne i ovládání ve starší stránce načtené z mezipaměti.
// Neodesílá žádné síťové požadavky.
document.querySelector("#confirm-dialog")?.close();
for (const element of document.querySelectorAll(
  "#vote-form, #confirm-dialog, #vyber, .hero-button, .hero-facts, .skip-link",
)) element.remove();
const heading = document.querySelector("#hero-title");
if (heading) heading.textContent = "Hlasování bylo ukončeno.";
const description = document.querySelector(".hero-description");
if (description) description.textContent = "Děkujeme všem, kteří se zapojili do soutěže Veselé dýně.";
