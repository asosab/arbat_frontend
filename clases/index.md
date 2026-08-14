---
title: "Clases de tiro con arco"
description: "Todas las clases de tiro con arco en arbat: niños, principiantes y entrenamiento deportivo. Equipo incluido y agenda previa."
---

<div class="tile" id="clases">
  <div class="wrap">
    <p class="section-label">Clases</p>
    <div class="grid">
      {% for clase in site.clases %}
      <article class="card">
        {% if clase.url contains "ninos" %}
        <div class="card__media card__media--video">
          <video src="{{ '/assets/images/ninos/nino01.mp4' | relative_url }}" autoplay muted loop playsinline aria-hidden="true" style="width:100%;height:100%;object-fit:cover;object-position:center center;"></video>
        </div>
        {% elsif clase.url contains "entrenamiento-deportivo" %}
        <div class="card__media">
          <img src="{{ '/assets/images/grupales/competencia01.jpg' | relative_url }}" alt="Entrenamiento deportivo de tiro con arco en arbat" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center center;">
        </div>
        {% elsif clase.url contains "principiantes" %}
        <div class="card__media">
          <img src="{{ '/assets/images/grupales/grupo01.png' | relative_url }}" alt="Grupo de principiantes practicando tiro con arco en arbat" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center center;">
        </div>
        {% elsif clase.url contains "individuales" %}
        <div class="card__media">
          <img src="{{ '/assets/images/grupales/dos_arqueros_2.jpg' | relative_url }}" alt="CLases individuales" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:center center;">
        </div>
        {% else %}
        <div class="card__media" aria-hidden="true"></div>
        {% endif %}
        <div class="card__body">
          <h3 class="card__title"><a href="{{ clase.url | relative_url }}">{{ clase.title }}</a></h3>
          <p class="card__text">{{ clase.description }}</p>
          <a class="btn-secondary" href="{{ clase.url | relative_url }}">Ver la clase</a>
        </div>
      </article>
      {% endfor %}
    </div>
  </div>
</div>

<div class="tile tile--cta">
  <div class="wrap">
    <p class="section-label">Reservá tu clase</p>
    <p>Coordinamos el día y el horario por WhatsApp, con el equipo listo para vos.</p>
    <div class="ctas">
      {% include whatsapp-cta.html texto="Reservar por WhatsApp" mensaje="Hola arbat, quiero reservar mi primera clase de tiro con arco." %}
      <a class="btn-secondary" href="{{ '/reservar/' | relative_url }}">Llenar el formulario de reserva</a>
    </div>
  </div>
</div>
