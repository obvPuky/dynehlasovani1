export const PUMPKIN_COUNT = 16;
export const palettes = [
  ["#ede9d9", "#e89542", "#c46b2d"],
  ["#e7ebde", "#dcb777", "#bf945a"],
  ["#f1e6d9", "#eea555", "#d18038"],
  ["#e7e9df", "#abb985", "#8b9d67"],
  ["#e9ebdf", "#e79445", "#c47636"],
  ["#eee8dc", "#e9cb97", "#c5a26b"],
  ["#ede8df", "#d4884e", "#b86e3a"],
  ["#e8ecdf", "#b4bf91", "#8d9f6a"],
  ["#f0e7d9", "#e7a153", "#c67c36"],
  ["#eae8de", "#e9d4ad", "#c8ae80"],
  ["#e8eadd", "#d49b5d", "#b77e44"],
  ["#eee8de", "#d9914d", "#b87534"],
  ["#e9ecdf", "#a8b783", "#869a61"],
  ["#eee8dc", "#ebbd79", "#c79956"],
  ["#f0e6da", "#e89749", "#c87331"],
  ["#e9eadd", "#d8c399", "#b3a174"],
];

// Ilustrace jsou záměrně odlišeny od skutečných fotografií školních výrobků.
// Fotografie lze později použít místo tohoto SVG v voting.js.
export function pumpkinIllustration(number) {
  if (!Number.isInteger(number) || number < 1 || number > PUMPKIN_COUNT)
    throw new RangeError("Neplatné číslo dýně.");
  const [, body, shade] = palettes[number - 1];
  const variant = (number - 1) % 4;
  const tilt = [-5, 4, -3, 5][variant];
  const face = [
    '<path d="m77 90 14-9-1 17zm49-9 13 11-14 6zM86 115q24 18 46-1c-6 27-36 25-46 1Z" fill="#66452d"/><path d="m103 122 1 8 7-1 1-5" fill="' +
      body +
      '"/>',
    '<path d="M76 94q8-12 16 0m30 0q8-12 16 0m-42 25q13 16 27 0" stroke="#6c5338" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="77" cy="108" r="4" fill="#c88766"/><circle cx="138" cy="108" r="4" fill="#c88766"/>',
    '<path d="m78 85 12 9-14 2m63-11-12 9 14 2" fill="#62472f"/><path d="m89 118 8 6 9-6 10 6 10-8" stroke="#62472f" stroke-width="4" stroke-linecap="round" fill="none"/>',
    '<circle cx="85" cy="94" r="5" fill="#53603c"/><path d="m127 93 11 2m-42 20q14 17 27 0" stroke="#53603c" stroke-width="4" stroke-linecap="round" fill="none"/>',
  ][variant];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 170" aria-hidden="true" focusable="false"><ellipse cx="111" cy="151" rx="66" ry="7" fill="#676e44" opacity=".10"/><g transform="rotate(${tilt} 110 100)"><path d="M107 55c-3-19 0-29 10-35l9 11c-12 4-14 13-12 25" fill="#647449"/><path d="M115 36c-11-12-22-12-29-8 5 11 16 14 29 8" fill="#9aa777"/><ellipse cx="83" cy="102" rx="39" ry="48" fill="${shade}"/><ellipse cx="136" cy="102" rx="39" ry="48" fill="${shade}"/><ellipse cx="109" cy="103" rx="47" ry="51" fill="${body}"/><path d="M103 54c-14 24-18 67-6 96m20-96c14 26 17 68 6 97M76 61c-17 28-17 60-5 79m72-79c17 26 18 57 6 79" fill="none" stroke="${shade}" stroke-width="2" opacity=".55"/>${face}</g>${number % 3 === 0 ? '<path d="M158 148c11-16 23-16 31-11-5 12-15 15-31 11Z" fill="#a0ac7c"/>' : ""}</svg>`;
}
