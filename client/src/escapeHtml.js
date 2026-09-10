// Funktion som tar en sträng och ersätter HTML-känsliga tecken med deras säkra motsvarigheter
export default function escapeHtml(unsafe) {
  // Om värdet inte är en sträng returneras det oförändrat
  if (typeof unsafe !== "string") return unsafe;

  // Returnerar strängen där vissa tecken ersätts med HTML-entity-koder
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
