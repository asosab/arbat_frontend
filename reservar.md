---
title: "Reservar una clase"
description: "Reservá tu primera clase de tiro con arco en ARBAT. Dejanos tu día, el nombre y la edad de cada persona y coordinamos por WhatsApp."
---
# {{ page.title }}

Para confirmarte un lugar necesitamos tres datos:

- El **día** en que querés venir.
- El **nombre** de cada persona.
- La **edad** de cada persona.

Completá el formulario y te mandamos la solicitud lista por WhatsApp.

<form class="formulario-reserva" id="formulario-reserva">
  <label for="reserva-dia">Día en que desean asistir
    <input type="date" id="reserva-dia" name="dia" required>
  </label>
  <label for="reserva-nombres">Nombre de cada persona
    <input type="text" id="reserva-nombres" name="nombres" placeholder="Ej.: Ana Pérez, Juan Pérez" required>
  </label>
  <label for="reserva-edades">Edad de cada persona
    <input type="text" id="reserva-edades" name="edades" placeholder="Ej.: 25, 7" required>
  </label>
  <button type="submit">Enviar por WhatsApp</button>
</form>

<script>
(function () {
  var numero = "{{ site.arbat.telefono_whatsapp | first | remove: '+' | remove: ' ' }}";
  var form = document.getElementById("formulario-reserva");
  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var dia = document.getElementById("reserva-dia").value;
    var nombres = document.getElementById("reserva-nombres").value;
    var edades = document.getElementById("reserva-edades").value;
    var mensaje = "Hola ARBAT, quiero reservar una primera clase.%0ADía: " + encodeURIComponent(dia) + "%0ANombre(s): " + encodeURIComponent(nombres) + "%0AEdad(es): " + encodeURIComponent(edades);
    window.open("https://wa.me/" + numero + "?text=" + mensaje, "_blank");
  });
})();
</script>

<p>¿Preferís elegir vos mismo un horario disponible?</p>

{% include calendar-citas-embed.html %}

<p>¿Preferís escribirnos directo?</p>
{% include whatsapp-cta.html texto="Escribir por WhatsApp" mensaje="Hola ARBAT, quiero reservar una clase de tiro con arco." %}
