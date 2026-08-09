// Toggle del menú de navegación en mobile.
// El nav ya está en el HTML (accesible sin JS); esto solo controla si se
// muestra u oculta con el botón hamburguesa. Sin dependencias.
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var toggle = document.getElementById("nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var abierto = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
    });

    // Cerrar el menú al elegir un link, para no tener que hacerlo a mano.
    nav.addEventListener("click", function (evento) {
      if (evento.target.tagName === "A") {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  });
})();
