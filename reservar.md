---
title: "Reservar una clase"
description: "Reservá tu clase de tiro con arco en arbat. Dejanos tu día, el nombre y la edad de cada persona y coordinamos por WhatsApp."
---
# {{ page.title }}

<p class="sub">Elegí cómo preferís coordinar tu clase. Los tres caminos llegan al mismo lugar: coordinamos por WhatsApp.</p>

<div class="grid metodos-reserva">

<article class="card card--recomendado">
  <div class="card__body">
    <span class="metodo-badge">Recomendado</span>
    <span class="ring-icon" aria-hidden="true"></span>
    <h3 class="card__title">Completá el formulario</h3>
    <p class="card__text">Necesitamos el <strong>día</strong>, el <strong>nombre</strong> y la <strong>edad</strong> de cada persona. Te mandamos la solicitud lista por WhatsApp.</p>

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
      <button type="submit" class="btn-primary"><span class="ring-icon" aria-hidden="true"></span>Enviar por WhatsApp</button>
    </form>
  </div>
</article>

<article class="card">
  <div class="card__body">
    <span class="ring-icon" aria-hidden="true"></span>
    <h3 class="card__title">Elegí un horario</h3>
    <p class="card__text">Mirá los cupos disponibles y agendá vos mismo, sin esperar respuesta.</p>
    <details class="metodo-expand">
      <summary class="btn-secondary">Ver calendario disponible</summary>
      <div class="metodo-expand__content">
        {% include calendar-citas-embed.html %}
      </div>
    </details>
  </div>
</article>

<article class="card">
  <div class="card__body">
    <span class="ring-icon" aria-hidden="true"></span>
    <h3 class="card__title">Escribinos directo</h3>
    <p class="card__text">¿Tenés una duda antes de reservar? Escribinos y te respondemos.</p>
    {% include whatsapp-cta.html texto="Escribir por WhatsApp" mensaje="Hola arbat, quiero reservar una clase de tiro con arco." %}
  </div>
</article>

</div>

<script>
(function () {
  var numero = "{{ site.arbat.telefono_whatsapp_reservas | remove: '+' | remove: ' ' }}";
  var form = document.getElementById("formulario-reserva");
  form.addEventListener("submit", function (evento) {
    evento.preventDefault();
    var dia = document.getElementById("reserva-dia").value;
    var nombres = document.getElementById("reserva-nombres").value;
    var edades = document.getElementById("reserva-edades").value;
    var mensaje = "Hola arbat, quiero reservar una primera clase.%0ADía: " + encodeURIComponent(dia) + "%0ANombre(s): " + encodeURIComponent(nombres) + "%0AEdad(es): " + encodeURIComponent(edades);
    window.open("https://wa.me/" + numero + "?text=" + mensaje, "_blank");
  });
})();
</script>
