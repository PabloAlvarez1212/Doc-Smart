// Bloqueo de scroll compartido por todos los modales.
//
// Con varios modales abiertos a la vez, cada uno guardaba el `overflow` "anterior" del <body>
// y lo restauraba al cerrarse: si se cerraban en otro orden, el valor guardado era el `hidden`
// de otro modal y el <body> quedaba bloqueado. Aquí solo se guarda el valor original una vez,
// se restaura al soltar el último bloqueo y no se deja un atributo `style` vacío en el <body>.

let bloqueos = 0;
let original = null;

export function bloquearScroll(body = document.body) {
  if (bloqueos++ === 0) {
    original = body.style.overflow;
    body.style.overflow = "hidden";
  }

  let liberado = false;
  return function liberarScroll() {
    if (liberado) return;
    liberado = true;
    if (--bloqueos > 0) return;
    bloqueos = 0;
    if (original) body.style.overflow = original;
    else body.style.removeProperty("overflow");
    if (!body.getAttribute("style")) body.removeAttribute("style");
    original = null;
  };
}
