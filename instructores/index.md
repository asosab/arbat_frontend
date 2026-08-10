---
title: "Instructores"
description: "Instructores de tiro con arco en arbat, Santa Cruz de la Sierra."
---

<div class="tile">
  <div class="wrap">
    <p class="section-label">Instructores</p>
    <div class="grid grid--3">
      {% for instructor in site.instructores %}
      <article class="card">
        {% if instructor.foto %}
        <div class="card__media">
          <img src="{{ instructor.foto | relative_url }}" alt="Foto de {{ instructor.nombre }}" loading="lazy">
        </div>
        {% else %}
        <div class="card__media card__media--placeholder" aria-hidden="true">{{ instructor.nombre | slice: 0, 1 }}</div>
        {% endif %}
        <div class="card__body">
          <h3 class="card__title"><a href="{{ instructor.url | relative_url }}">{{ instructor.nombre }}</a></h3>
          {% if instructor.instagram %}<p class="card__text">Instagram: @{{ instructor.instagram }}</p>{% endif %}
          <a class="btn-secondary" href="{{ instructor.url | relative_url }}">Ver perfil</a>
        </div>
      </article>
      {% endfor %}
    </div>
  </div>
</div>
