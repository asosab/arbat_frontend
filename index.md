---
title: "Escuela de tiro con arco en Santa Cruz de la Sierra"
description: "Escuela de tiro con arco en Santa Cruz de la Sierra. Entrenamiento olímpico, recreativo, deportivo y competitivo con equipo incluido y agenda previa."
breadcrumb_hidden: true
hero: true
hero_eyebrow: "Escuela de tiro con arco — Santa Cruz de la Sierra"
hero_lema: "Sentio ergo attingo."
hero_sub: "Te enseñamos a tirar con arco, sea cual sea tu punto de partida. Si no tenés equipo, te prestamos uno — arco, flechas, protecciones — y arrancamos donde estés vos."
hero_cta_texto: "Probar una clase (Bs. 70)"
hero_cta_mensaje: "Hola arbat, quiero probar una primera clase de tiro con arco."
---

<div class="ring-divider" aria-hidden="true"></div>

<div class="tile">
  <div class="wrap">
    <p class="section-label">Clases</p>
    <div class="grid">
      {% for clase in site.clases %}
      <article class="card">
        <div class="card__media" aria-hidden="true"></div>
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

<div class="tile">
  <div class="wrap">
    <p class="section-label">Horarios</p>
    <ul class="list-diana">
      {% for bloque in site.arbat.horarios %}
      <li><strong>{{ bloque.dias }}:</strong> {{ bloque.turnos | join: ' y ' }}{% if bloque.duracion %} ({{ bloque.duracion }}){% endif %}</li>
      {% endfor %}
    </ul>
    <p>Trabajamos con <strong>agenda previa</strong> siempre. Mirá los <a href="{{ '/horarios/' | relative_url }}">horarios</a> y elegí el tuyo.</p>
  </div>
</div>

<div class="tile">
  <div class="wrap">
    <p class="section-label">Precios</p>
    <ul class="list-diana">
      <li>Primera clase / clase suelta: <strong>Bs. 70</strong></li>
      <li>Mensualidad 3x/semana: <strong>Bs. 500</strong></li>
      <li>Mensualidad 2x/semana: <strong>Bs. 350</strong></li>
      <li>Mensualidad 1x/semana: <strong>Bs. 180</strong></li>
      <li>Solo sábados: <strong>Bs. 200</strong></li>
    </ul>
    <p>Mirá cuánto cuesta cada modalidad en <a href="{{ '/precios/' | relative_url }}">precios</a>.</p>
  </div>
</div>

<div class="tile">
  <div class="wrap">
    <p class="section-label">Preguntas frecuentes</p>
    <ul class="list-diana">
      <li><strong>¿Necesito arco propio?</strong> No, te prestamos el equipo.</li>
      <li><strong>¿Soy zurdo, hay problema?</strong> No, tenemos equipo para diestros y zurdos.</li>
      <li><strong>¿Tengo que agendar?</strong> Sí, siempre con agenda previa.</li>
    </ul>
    <p>Ver todas las <a href="{{ '/preguntas-frecuentes/' | relative_url }}">preguntas frecuentes</a>.</p>
  </div>
</div>

<div class="tile">
  <div class="wrap">
    <p class="section-label">Ubicación</p>
    <p>{{ site.arbat.direccion }}. Ver <a href="{{ '/ubicacion/' | relative_url }}">ubicación</a>.</p>
  </div>
</div>

{% include schema/local-business.html %}
